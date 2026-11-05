// Thème clair ou sombre : celui du téléphone (automatique) ou imposé dans les Réglages (comme
// dans Jalon).

export type Theme = 'auto' | 'clair' | 'sombre';
const CLE_THEME = 'tour-de-plaine/theme';
// Fond de la page dans chaque thème (barre d'état du téléphone de la même couleur).
const FOND = { clair: '#f4f2ec', sombre: '#121614' };

function lire(): string | null {
  try {
    return localStorage.getItem(CLE_THEME);
  } catch {
    return null;
  }
}

export function themeChoisi(): Theme {
  const t = lire();
  return t === 'clair' || t === 'sombre' ? t : 'auto';
}

/** Pose le thème sur la page (attribut `data-theme` lu par la feuille de style). */
export function appliquerTheme(theme: Theme = themeChoisi()): void {
  const racine = document.documentElement;
  if (theme === 'auto') racine.removeAttribute('data-theme');
  else racine.setAttribute('data-theme', theme);
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    const sombre = m.media.includes('dark');
    m.content = theme === 'auto' ? FOND[sombre ? 'sombre' : 'clair'] : FOND[theme];
  });
}

export function choisirTheme(theme: Theme): void {
  try {
    if (theme === 'auto') localStorage.removeItem(CLE_THEME);
    else localStorage.setItem(CLE_THEME, theme);
  } catch {
    // pas de stockage : le thème vaut pour cette fois
  }
  appliquerTheme(theme);
}
