// Lecture de l'export Geofolia « Parcelles et interventions complet (ZIP) » : Field.Json (les
// parcelles de la campagne) et Action.Json (les interventions). Les contours de Field.Json sont
// ignorés : ceux de Jalon font foi.

import { dezipper } from '../formats/dezip';
import type { ImportGeofolia, Intervention, Parcelle, Statut } from '../registre/modele';

export class ErreurGeofolia extends Error {
  override name = 'ErreurGeofolia';
}

// Seuls les champs utilisés sont décrits ; le reste du fichier est ignoré.
interface ChampGeofolia {
  Name?: string;
  HarvestYear?: number;
  Area?: number;
  CropName?: string | null;
  VarietyName?: string | null;
  City?: string | null;
  SoilName?: string | null;
  FarmIdentificationCode?: string | null;
  NMinus1Crop?: string | null;
  NMinus2Crop?: string | null;
  NMinus3Crop?: string | null;
  NMinus4Crop?: string | null;
  NMinus5Crop?: string | null;
  Id?: string;
}

interface ZoneGeofolia {
  PlotId?: string;
  WorkedSurface?: number;
  PlotActionOrder?: number;
}

interface ProduitGeofolia {
  SupplyName?: string;
  Quantity?: number;
  ReferentialUnitSymbol?: string | null;
}

interface ActiviteGeofolia {
  ActionId?: string;
  HarvestYear?: number;
  StartingDate?: string;
  StatusName?: string;
  OperationName?: string;
  OperationCategory?: string;
  Comment?: string | null;
  CropZoneIds?: ZoneGeofolia[] | null;
  ProductIds?: ProduitGeofolia[] | null;
  ActionEquipments?: { EquipmentName?: string }[] | null;
}

const texte = (v: string | null | undefined) => (v ?? '').trim();
const arrondi = (n: number, chiffres: number) => Math.round(n * 10 ** chiffres) / 10 ** chiffres;

function lireJson(octets: Uint8Array, nom: string): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(octets).replace(/^﻿/, ''));
  } catch {
    throw new ErreurGeofolia(`${nom} est illisible.`);
  }
}

function statut(nom: string | undefined): Statut {
  if (nom === 'Réalisée') return 'realisee';
  if (nom === 'Plan de fumure') return 'plan';
  return 'prevue';
}

/** Parcelles d'une campagne : les morceaux de même nom sont regroupés. */
function parcelles(champs: ChampGeofolia[]): Parcelle[] {
  const parNom = new Map<string, Parcelle>();
  for (const c of champs) {
    const nom = texte(c.Name);
    if (!nom) continue;
    const surface = (c.Area ?? 0) / 10000;
    const deja = parNom.get(nom);
    if (deja) {
      deja.surfaceHa += surface;
      deja.morceaux++;
      continue;
    }
    parNom.set(nom, {
      nom,
      surfaceHa: surface,
      culture: texte(c.CropName),
      variete: texte(c.VarietyName),
      precedents: [c.NMinus1Crop, c.NMinus2Crop, c.NMinus3Crop, c.NMinus4Crop, c.NMinus5Crop].map(
        texte,
      ),
      commune: texte(c.City),
      sol: texte(c.SoilName),
      exploitation: texte(c.FarmIdentificationCode),
      morceaux: 1,
    });
  }
  for (const p of parNom.values()) p.surfaceHa = arrondi(p.surfaceHa, 2);
  return [...parNom.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { numeric: true }));
}

/**
 * Intervention lisible. Geofolia répartit chaque produit entre les parcelles au prorata de leur
 * surface (une ligne de produit par parcelle) : la dose par hectare est la quantité totale du
 * produit divisée par la surface totale travaillée.
 */
function intervention(a: ActiviteGeofolia, nomDe: Map<string, string>): Intervention | null {
  const id = texte(a.ActionId);
  if (!id || !a.StartingDate) return null;
  const zones = [...(a.CropZoneIds ?? [])].sort(
    (x, y) => (x.PlotActionOrder ?? 0) - (y.PlotActionOrder ?? 0),
  );
  const surfaces = new Map<string, number>();
  for (const z of zones) {
    const nom = nomDe.get(z.PlotId ?? '');
    if (nom) surfaces.set(nom, (surfaces.get(nom) ?? 0) + (z.WorkedSurface ?? 0) / 10000);
  }
  const surfaceTotale = [...surfaces.values()].reduce((s, x) => s + x, 0);
  const produits = new Map<string, { quantite: number; unite: string }>();
  for (const p of a.ProductIds ?? []) {
    const nom = texte(p.SupplyName);
    if (!nom) continue;
    const deja = produits.get(nom);
    if (deja) deja.quantite += p.Quantity ?? 0;
    else produits.set(nom, { quantite: p.Quantity ?? 0, unite: texte(p.ReferentialUnitSymbol) });
  }
  return {
    id,
    date: a.StartingDate.slice(0, 10),
    statut: statut(a.StatusName),
    categorie: texte(a.OperationCategory),
    operation: texte(a.OperationName),
    parcelles: [...surfaces].map(([nom, s]) => ({ nom, surfaceHa: arrondi(s, 2) })),
    produits: [...produits].map(([nom, p]) => ({
      nom,
      quantite: arrondi(p.quantite, 3),
      unite: p.unite,
      dose: surfaceTotale > 0 ? arrondi(p.quantite / surfaceTotale, 3) : 0,
    })),
    materiel: [...new Set((a.ActionEquipments ?? []).map((m) => texte(m.EquipmentName)))].filter(
      Boolean,
    ),
    commentaire: texte(a.Comment),
  };
}

/** Lit le contenu des deux fichiers (déjà décodés) : une entrée par campagne trouvée. */
export function lireGeofolia(
  field: unknown,
  action: unknown,
  maintenant = new Date(),
): ImportGeofolia[] {
  const f = field as { Information?: { ExportDate?: string }; Fields?: ChampGeofolia[] };
  const a = action as { Activities?: ActiviteGeofolia[] };
  if (!Array.isArray(f?.Fields)) {
    throw new ErreurGeofolia('Field.Json ne contient pas de parcelles.');
  }
  const activites = Array.isArray(a?.Activities) ? a.Activities : [];
  const campagnes = [...new Set(f.Fields.map((c) => c.HarvestYear).filter((x) => !!x))] as number[];
  return campagnes
    .sort((x, y) => y - x)
    .map((campagne) => {
      const champs = f.Fields!.filter((c) => c.HarvestYear === campagne);
      const nomDe = new Map(champs.map((c) => [c.Id ?? '', texte(c.Name)]));
      const interventions = activites
        .filter((x) => x.HarvestYear === campagne)
        .map((x) => intervention(x, nomDe))
        .filter((x): x is Intervention => x !== null && x.parcelles.length > 0)
        .sort((x, y) => x.date.localeCompare(y.date));
      return {
        campagne,
        exporteLe: f.Information?.ExportDate ?? '',
        importeLe: maintenant.toISOString(),
        parcelles: parcelles(champs),
        interventions,
      };
    });
}

/** Ouvre le ZIP exporté par Geofolia. */
export async function lireZipGeofolia(octets: Uint8Array): Promise<ImportGeofolia[]> {
  let fichiers: Map<string, Uint8Array>;
  try {
    fichiers = await dezipper(octets);
  } catch {
    throw new ErreurGeofolia('Ce fichier n’est pas un ZIP lisible.');
  }
  const trouver = (fin: string) =>
    [...fichiers].find(([nom]) => nom.toLowerCase().endsWith(fin))?.[1];
  const field = trouver('field.json');
  const action = trouver('action.json');
  if (!field) {
    throw new ErreurGeofolia(
      'Field.Json absent : il faut l’export « Parcelles et interventions complet (ZIP) ».',
    );
  }
  return lireGeofolia(lireJson(field, 'Field.Json'), action ? lireJson(action, 'Action.Json') : {});
}
