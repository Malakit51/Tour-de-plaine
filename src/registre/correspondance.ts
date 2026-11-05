// Rapprochement des noms de Geofolia (« 022huss », « 030noue /1 ») et de Jalon (« 22 Huss »,
// « 30 Noue ») : proposé automatiquement, corrigeable à la main dans la fiche de la parcelle.

interface Cle {
  numero: number | null;
  lettres: string;
  morceau: number | null;
}

/** Numéro, lettres et morceau (« /2 ») d'un nom, sans accents ni majuscules. */
export function cle(nom: string): Cle {
  const simple = nom
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const morceau = /\/\s*(\d+)\s*$/.exec(simple);
  const sans = morceau ? simple.slice(0, morceau.index) : simple;
  const numero = /\d+/.exec(sans);
  return {
    numero: numero ? Number(numero[0]) : null,
    lettres: sans.replace(/[^a-z]/g, ''),
    morceau: morceau ? Number(morceau[1]) : null,
  };
}

/** Ressemblance de deux noms : 0 si ce n'est pas la même parcelle, plus c'est grand mieux c'est. */
export function ressemblance(geofolia: string, jalon: string): number {
  const g = cle(geofolia);
  const j = cle(jalon);
  if (g.numero !== j.numero) return 0;
  if (g.morceau !== null && j.morceau !== null && g.morceau !== j.morceau) return 0;
  const [court, long] =
    g.lettres.length <= j.lettres.length ? [g.lettres, j.lettres] : [j.lettres, g.lettres];
  if (court.length < 3 && court !== long) return 0;
  if (!long.startsWith(court)) return 0;
  // Même nom aux espaces et majuscules près : le mieux ; puis même morceau ; puis préfixe.
  return 10 + court.length / long.length + (g.morceau === j.morceau ? 1 : 0);
}

/**
 * Contour de Jalon proposé pour chaque parcelle de Geofolia. `choix` (fait à la main) l'emporte :
 * un nom de Jalon, ou '' pour « pas de contour ».
 */
export function rapprocher(
  geofolia: readonly string[],
  jalon: readonly string[],
  choix: Readonly<Record<string, string>> = {},
): Map<string, string> {
  const resultat = new Map<string, string>();
  for (const g of geofolia) {
    if (g in choix) {
      const c = choix[g]!;
      if (c && jalon.includes(c)) resultat.set(g, c);
      continue;
    }
    let meilleur = '';
    let score = 0;
    let exaequo = false;
    for (const j of jalon) {
      const s = ressemblance(g, j);
      if (s > score) [meilleur, score, exaequo] = [j, s, false];
      else if (s > 0 && s === score) exaequo = true;
    }
    if (meilleur && !exaequo) resultat.set(g, meilleur);
  }
  return resultat;
}
