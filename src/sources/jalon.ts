// Contours des parcelles repris de Jalon, qui fait foi (ceux de Geofolia ne sont pas à jour).
// Deux chemins : la session de Jalon gardée sur ce téléphone (même site malakit51.github.io, donc
// même stockage), ou un TASKDATA.XML exporté par Jalon.

import type { ContourJalon } from '../registre/modele';
import { lireTaskData, type TaskData } from './taskdata';

/** Clé de la session de Jalon sur l'appareil (Contour-parcelle, src/sauvegarde/session.ts). */
export const CLE_SESSION_JALON = 'contour-parcelle/session';

type LatLon = [number, number];

/** Anneau ouvert (sans le point de fermeture répété). */
function ouvert(points: LatLon[]): LatLon[] {
  const p = points[0];
  const d = points.at(-1);
  return points.length > 1 && p && d && p[0] === d[0] && p[1] === d[1]
    ? points.slice(0, -1)
    : points;
}

function ajouter(contours: Map<number, ContourJalon>, i: number, nom: string): ContourJalon {
  let c = contours.get(i);
  if (!c) contours.set(i, (c = { nom, exterieurs: [], exclus: [] }));
  return c;
}

function garder(contours: Map<number, ContourJalon>): ContourJalon[] {
  return [...contours.values()].filter((c) => c.exterieurs.some((a) => a.length >= 3));
}

/** Contours d'un TASKDATA.XML. */
export function contoursTaskData(td: TaskData): ContourJalon[] {
  const contours = new Map<number, ContourJalon>();
  td.parcelles.forEach((p, i) => {
    for (const a of p.anneaux) {
      const c = ajouter(contours, i, p.nom);
      (a.type === 1 ? c.exterieurs : c.exclus).push(
        ouvert(a.points.map((pt): LatLon => [pt.lat, pt.lon])),
      );
    }
  });
  return garder(contours);
}

export function contoursFichier(texte: string): ContourJalon[] {
  return contoursTaskData(lireTaskData(texte));
}

// Ce qui est lu de la session de Jalon (voir SessionEnregistree dans Jalon).
interface SessionJalon {
  version: number;
  enregistreLe?: string;
  fichier: { texte: string };
  anneaux: {
    parcelle: number;
    anneau: number;
    type?: 1 | 2;
    sommets: [number, number, unknown][];
  }[];
  ajoutees?: { parcelle: number; nom: string }[];
  noms?: { parcelle: number; nom: string }[];
  supprimees?: number[];
  zonesRetirees?: number[];
}

/**
 * Contours de la session de Jalon : les points modifiés dans Jalon, les parcelles renommées,
 * créées ou retirées, comme Jalon les montre.
 */
export function contoursSession(brut: unknown): { date: string; contours: ContourJalon[] } {
  const s = brut as SessionJalon;
  if (!s || s.version !== 1 || typeof s.fichier?.texte !== 'string' || !Array.isArray(s.anneaux)) {
    throw new Error('Session de Jalon illisible ou d’une version inconnue.');
  }
  const td = lireTaskData(s.fichier.texte);
  const noms = new Map<number, string>(td.parcelles.map((p, i) => [i, p.nom]));
  for (const a of s.ajoutees ?? []) noms.set(a.parcelle, a.nom);
  for (const n of s.noms ?? []) if (n.nom.trim()) noms.set(n.parcelle, n.nom.trim());
  const supprimees = new Set(s.supprimees ?? []);
  const retirees = new Set(s.zonesRetirees ?? []);
  const contours = new Map<number, ContourJalon>();
  s.anneaux.forEach((a, k) => {
    const nom = noms.get(a.parcelle);
    if (nom === undefined || supprimees.has(a.parcelle) || retirees.has(k)) return;
    const type = a.anneau < 0 ? (a.type ?? 2) : td.parcelles[a.parcelle]?.anneaux[a.anneau]?.type;
    if (!type) return;
    const c = ajouter(contours, a.parcelle, nom);
    (type === 1 ? c.exterieurs : c.exclus).push(
      ouvert(a.sommets.map(([lat, lon]): LatLon => [lat, lon])),
    );
  });
  return { date: s.enregistreLe ?? '', contours: garder(contours) };
}

/** Session de Jalon sur ce téléphone, ou null s'il n'y en a pas. */
export function lireSessionJalon(stockage: Pick<Storage, 'getItem'> | null): unknown {
  try {
    const brut = stockage?.getItem(CLE_SESSION_JALON);
    return brut ? JSON.parse(brut) : null;
  } catch {
    return null;
  }
}
