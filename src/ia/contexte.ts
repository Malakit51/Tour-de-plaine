// Ce que Claude reçoit avec une dictée : les parcelles et les pastilles de l'appli, pour qu'il
// reprenne les mêmes mots (et que ses réponses allument les bonnes pastilles).

import { cleConstats, cleStades, pastillesDe } from '../agro/pastilles';
import { CATEGORIES, GRAVITES, groupe } from '../agro/listes';
import { jour } from '../app/commun';
import { etat, parcelle, parcelles } from '../app/etat';
import type { Contexte } from './claude';

export function contexteDictee(parcelleChoisie: string): Contexte {
  const ps = parcelles();
  // Stades : un jeu par culture présente (« Blé », « Colza »…), dans l'ordre des habitudes.
  const stades: Record<string, string[]> = {};
  for (const p of ps) {
    if (!p.culture || stades[p.culture]) continue;
    const g = groupe(p.culture);
    stades[p.culture] = pastillesDe(etat.pastilles, etat.habitudes, cleStades(g));
  }
  // Constats : ceux de la culture de la parcelle choisie (sinon génériques).
  const culture = parcelle(parcelleChoisie)?.culture ?? '';
  const g = groupe(culture);
  const constats: Record<string, string[]> = {};
  for (const c of CATEGORIES)
    constats[c] = pastillesDe(etat.pastilles, etat.habitudes, cleConstats(c, g));
  return {
    aujourdhui: jour(),
    parcelleChoisie,
    parcelles: ps.map((p) => ({ nom: p.nom, culture: p.culture, variete: p.variete })),
    stades,
    categories: CATEGORIES,
    constats,
    gravites: GRAVITES,
  };
}
