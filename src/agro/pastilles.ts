// Pastilles modifiables (Réglages › Mes pastilles) : stades par culture, constats par catégorie et
// par culture. Une liste modifiée remplace celle de l'appli ; sinon on garde celle de l'appli, plus
// les constats tapés à la main dans une saisie. Les plus utilisées passent toujours en tête.

import type { Habitudes } from './habitudes';
import { CATEGORIES, STADES, constatsProposes, type Groupe } from './listes';

/** Listes modifiées, par clé (les mêmes que les habitudes : « stade|cereale », « Maladie|colza »). */
export type Personnalisees = Record<string, string[]>;

export const cleStades = (g: Groupe) => `stade|${g}`;
export const cleConstats = (categorie: string, g: Groupe) => `${categorie}|${g}`;

/** Une culture représentative de chaque groupe, pour retrouver les constats proposés. */
const EXEMPLE: Record<Groupe, string> = {
  cereale: 'Blé',
  colza: 'Colza',
  betterave: 'Betteraves',
  mais: 'Maïs',
  oeillette: 'Oeillette', // « Œ » ne se décompose pas en « oe » : groupe() ne le reconnaîtrait pas
  luzerne: 'Luzerne',
  proteagineux: 'Pois',
  autre: '',
};

export const NOMS_GROUPES: Record<Groupe, string> = {
  cereale: 'Céréales',
  colza: 'Colza',
  betterave: 'Betteraves',
  mais: 'Maïs',
  oeillette: 'Œillette',
  luzerne: 'Luzerne',
  proteagineux: 'Protéagineux',
  autre: 'Autres cultures',
};

/** La liste de l'appli, sans modification. */
export function listeDOrigine(cle: string): string[] {
  const [quoi = '', g = 'autre'] = cle.split('|') as [string, Groupe];
  if (quoi === 'stade') return STADES[g] ?? STADES.autre;
  return constatsProposes(quoi, EXEMPLE[g] ?? '');
}

/**
 * Pastilles d'une liste, dans l'ordre d'affichage : la liste modifiée telle quelle (l'ordre suit
 * seulement les usages) ; sinon celle de l'appli, plus les constats tapés à la main.
 */
export function pastillesDe(perso: Personnalisees, h: Habitudes, cle: string): string[] {
  const compte = h[cle] ?? {};
  const modifiee = perso[cle];
  const base = modifiee ?? listeDOrigine(cle);
  const toutes = modifiee
    ? base
    : [...base, ...Object.keys(compte).filter((v) => !base.includes(v))];
  return toutes
    .map((v, i) => ({ v, i, n: compte[v] ?? 0 }))
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .map((x) => x.v);
}

/** Les listes qu'on peut modifier pour un groupe : les stades, puis une par catégorie. */
export function listesDuGroupe(g: Groupe): { cle: string; titre: string }[] {
  return [
    { cle: cleStades(g), titre: 'Stades' },
    ...CATEGORIES.map((c) => ({ cle: cleConstats(c, g), titre: c })),
  ];
}
