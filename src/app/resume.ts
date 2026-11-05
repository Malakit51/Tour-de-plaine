// Ce qu'on montre en une ligne : une note, la dernière visite, le semis réel, les doublons
// possibles dans Geofolia.

import type { Intervention, Note } from '../registre/modele';

/** « 6 feuilles · Grosses altises · À surveiller » (ou le début de la remarque). */
export function resumeNote(n: Note): string {
  const morceaux = [n.stade, n.constats.join(', '), n.gravite].filter(Boolean);
  if (morceaux.length === 0 && n.texte)
    return n.texte.length > 70 ? n.texte.slice(0, 68) + '…' : n.texte;
  if (n.type !== 'Observation') morceaux.unshift(n.type);
  return morceaux.join(' · ');
}

/** Note la plus récente d'une liste. */
export function derniere(notes: readonly Note[]): Note | undefined {
  return notes.reduce<Note | undefined>((d, n) => (!d || n.date > d.date ? n : d), undefined);
}

/** Semis réalisé d'une parcelle (hors couverts) : date et produits, le plus récent. */
export function semisRealise(interventions: readonly Intervention[]): Intervention | undefined {
  return interventions
    .filter(
      (i) =>
        i.statut === 'realisee' &&
        /semis/i.test(i.categorie) &&
        !/cipan|couvert/i.test(i.operation),
    )
    .at(-1);
}

/**
 * Interventions qui en répètent une autre à trois jours près (mêmes parcelles, mêmes produits,
 * mêmes quantités) : probablement saisies deux fois dans Geofolia.
 */
export function doublonsPossibles(interventions: readonly Intervention[]): Set<string> {
  const signature = (i: Intervention) =>
    [
      i.categorie,
      i.statut,
      i.parcelles
        .map((p) => p.nom)
        .sort()
        .join('+'),
      i.produits
        .map((p) => `${p.nom}:${p.quantite}`)
        .sort()
        .join('+'),
    ].join('|');
  const doublons = new Set<string>();
  const vus = new Map<string, Intervention[]>();
  for (const i of [...interventions].sort((a, b) => a.date.localeCompare(b.date))) {
    if (i.produits.length === 0) continue;
    const s = signature(i);
    const avant = vus.get(s) ?? [];
    const t = Date.parse(i.date);
    if (avant.some((a) => Math.abs(t - Date.parse(a.date)) <= 3 * 86400000)) doublons.add(i.id);
    vus.set(s, [...avant, i]);
  }
  return doublons;
}

/** Libellé court d'une intervention : « Traitement phytosanitaire », « Semis céréales »… */
export function libelleStatut(i: Intervention): string {
  if (i.statut === 'prevue') return 'prévu';
  if (i.statut === 'plan') return 'plan de fumure';
  return '';
}
