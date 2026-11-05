// Habitudes de saisie : ce qui est choisi souvent remonte en tête des pastilles, et un constat
// tapé à la main devient une pastille.

export type Habitudes = Record<string, Record<string, number>>;

/** Ajoute un usage de chaque valeur sous `cle` (« stade|cereale », « Maladie|colza »…). */
export function noter(h: Habitudes, cle: string, valeurs: readonly string[]): Habitudes {
  const compte = { ...(h[cle] ?? {}) };
  for (const v of valeurs) if (v) compte[v] = (compte[v] ?? 0) + 1;
  return { ...h, [cle]: compte };
}

/** Pastilles dans l'ordre : les plus utilisées d'abord, puis celles proposées, puis les ajoutées. */
export function ordonner(h: Habitudes, cle: string, proposees: readonly string[]): string[] {
  const compte = h[cle] ?? {};
  const toutes = [...proposees, ...Object.keys(compte).filter((v) => !proposees.includes(v))];
  return toutes
    .map((v, i) => ({ v, i, n: compte[v] ?? 0 }))
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .map((x) => x.v);
}
