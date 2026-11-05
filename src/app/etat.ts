// État de l'appli en mémoire, chargé depuis le téléphone au démarrage et réenregistré à chaque
// changement.

import type { Habitudes } from '../agro/habitudes';
import * as base from '../registre/base';
import { rapprocher } from '../registre/correspondance';
import type {
  ContourJalon,
  ContoursJalon,
  ImportGeofolia,
  Intervention,
  Note,
  Parcelle,
} from '../registre/modele';

export interface Reglages {
  /** Interventions prévues dans Geofolia (et plan de fumure) montrées dans les fiches. */
  afficherPrevu: boolean;
  /** Le GPS a été autorisé : la position est suivie quand l'appli est ouverte. */
  gps: boolean;
  /** Dernière sauvegarde dans un fichier (ISO). */
  sauvegardeLe: string;
  /** Écran Plaine : la liste des parcelles ou la carte. */
  vuePlaine: 'liste' | 'carte';
}

export const etat = {
  imports: [] as ImportGeofolia[],
  /** Campagne montrée (la plus récente par défaut). */
  campagne: 0,
  jalon: null as ContoursJalon | null,
  /** Contour de Jalon choisi à la main pour une parcelle (nom de Jalon, ou '' pour aucun). */
  choixContours: {} as Record<string, string>,
  notes: [] as Note[],
  habitudes: {} as Habitudes,
  reglages: { afficherPrevu: false, gps: false, sauvegardeLe: '', vuePlaine: 'liste' } as Reglages,
  /** Position GPS : [lat, lon] et précision (m). */
  position: null as { latLon: [number, number]; precision: number } | null,
};

const CLE_IMPORT = 'geofolia/';

export async function charger(): Promise<void> {
  const cles = await base.clesValeurs();
  const imports = await Promise.all(
    cles.filter((c) => c.startsWith(CLE_IMPORT)).map((c) => base.lireValeur<ImportGeofolia>(c)),
  );
  etat.imports = imports
    .filter((i): i is ImportGeofolia => !!i)
    .sort((a, b) => b.campagne - a.campagne);
  etat.campagne = etat.imports[0]?.campagne ?? 0;
  etat.jalon = (await base.lireValeur<ContoursJalon>('jalon')) ?? null;
  etat.choixContours = (await base.lireValeur<Record<string, string>>('choix-contours')) ?? {};
  etat.habitudes = (await base.lireValeur<Habitudes>('habitudes')) ?? {};
  etat.reglages = { ...etat.reglages, ...((await base.lireValeur<Reglages>('reglages')) ?? {}) };
  etat.notes = await base.toutesLesNotes();
  calculerRapprochement();
}

// ---------- Geofolia ----------

export function importCourant(): ImportGeofolia | null {
  return etat.imports.find((i) => i.campagne === etat.campagne) ?? etat.imports[0] ?? null;
}

export function parcelles(): Parcelle[] {
  return importCourant()?.parcelles ?? [];
}

export function parcelle(nom: string): Parcelle | undefined {
  return parcelles().find((p) => p.nom === nom);
}

export function interventions(): Intervention[] {
  return importCourant()?.interventions ?? [];
}

export function interventionsDe(nom: string): Intervention[] {
  return interventions().filter((i) => i.parcelles.some((p) => p.nom === nom));
}

/** Un nouvel import remplace la même campagne en entier ; les notes ne bougent pas. */
export async function enregistrerImports(imports: ImportGeofolia[]): Promise<void> {
  for (const i of imports) {
    await base.ecrireValeur(CLE_IMPORT + i.campagne, i);
    etat.imports = [...etat.imports.filter((x) => x.campagne !== i.campagne), i];
  }
  etat.imports.sort((a, b) => b.campagne - a.campagne);
  etat.campagne = etat.imports[0]?.campagne ?? 0;
  calculerRapprochement();
}

// ---------- Contours de Jalon ----------

let rapprochement = new Map<string, string>();

function calculerRapprochement(): void {
  rapprochement = rapprocher(
    parcelles().map((p) => p.nom),
    (etat.jalon?.contours ?? []).map((c) => c.nom),
    etat.choixContours,
  );
}

export function contourDe(nom: string): ContourJalon | undefined {
  const j = rapprochement.get(nom);
  return j ? etat.jalon?.contours.find((c) => c.nom === j) : undefined;
}

export async function enregistrerJalon(j: ContoursJalon): Promise<void> {
  etat.jalon = j;
  await base.ecrireValeur('jalon', j);
  calculerRapprochement();
}

export async function choisirContour(parcelle: string, jalon: string | null): Promise<void> {
  const choix = { ...etat.choixContours };
  if (jalon === null) delete choix[parcelle];
  else choix[parcelle] = jalon;
  etat.choixContours = choix;
  await base.ecrireValeur('choix-contours', choix);
  calculerRapprochement();
}

// ---------- Notes ----------

export function notesDe(nom: string): Note[] {
  return etat.notes.filter((n) => n.parcelle === nom);
}

export async function enregistrerNote(n: Note): Promise<void> {
  await base.ecrireNote(n);
  etat.notes = [...etat.notes.filter((x) => x.id !== n.id), n];
}

export async function supprimerNote(id: string): Promise<void> {
  const n = etat.notes.find((x) => x.id === id);
  for (const p of n?.photos ?? []) await base.effacerPhoto(p);
  await base.effacerNote(id);
  etat.notes = etat.notes.filter((x) => x.id !== id);
}

/** Notes à revoir (pas encore marquées vues), les plus urgentes d'abord. */
export function aRevoir(): Note[] {
  return etat.notes
    .filter((n) => n.aRevoir && !n.revu)
    .sort((a, b) => a.aRevoir.localeCompare(b.aRevoir));
}

// ---------- Réglages et habitudes ----------

export async function changerReglages(r: Partial<Reglages>): Promise<void> {
  etat.reglages = { ...etat.reglages, ...r };
  await base.ecrireValeur('reglages', etat.reglages);
}

export async function enregistrerHabitudes(h: Habitudes): Promise<void> {
  etat.habitudes = h;
  await base.ecrireValeur('habitudes', h);
}
