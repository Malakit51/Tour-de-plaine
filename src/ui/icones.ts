// Icônes à traits (SVG), dessinées avec la couleur du texte qui les contient (comme dans Jalon).

const NS = 'http://www.w3.org/2000/svg';

const TRACES = {
  plaine: '<path d="M3 20l5-14 4 8 3-5 6 11z"/>',
  revoir: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
  journal: '<path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h11M9 8h6"/>',
  reglages:
    '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  retour: '<path d="M15 5l-7 7 7 7"/>',
  gps: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  photo: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  vu: '<path d="M5 12l4 4 10-10"/>',
  supprimer: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
  fermer: '<path d="M6 6l12 12M18 6L6 18"/>',
  chercher: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  observation:
    '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  semis: '<path d="M12 21v-9M12 12c0-4 3-7 7-7 0 4-3 7-7 7zM12 15c0-3-2-5-6-5 0 3 2 5 6 5z"/>',
  traitement: '<path d="M7 4h6v4H7zM10 8v3M5 11h10v9H5zM15 13l5-2M15 16l5 1"/>',
  fertilisation: '<path d="M6 21l2-9h8l2 9zM9 12V8a3 3 0 016 0v4"/>',
  sol: '<path d="M3 17c3-2 6-2 9 0s6 2 9 0M3 12c3-2 6-2 9 0s6 2 9 0"/>',
  autre: '<circle cx="12" cy="12" r="8"/><path d="M12 8v5M12 16v.5"/>',
  sauvegarde: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  ouvrir: '<path d="M4 6h6l2 2h8v11H4z"/>',
  micro: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>',
  liste: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  carte: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14"/>',
} as const;

export type Icone = keyof typeof TRACES;

export function icone(nom: Icone, taille = 22): SVGSVGElement {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('width', String(taille));
  s.setAttribute('height', String(taille));
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('class', 'icone');
  s.innerHTML = TRACES[nom];
  return s;
}

/** Icône d'une intervention Geofolia selon sa catégorie. */
export function iconeCategorie(categorie: string): Icone {
  if (/traitement/i.test(categorie)) return 'traitement';
  if (/semis/i.test(categorie)) return 'semis';
  if (/fertili/i.test(categorie)) return 'fertilisation';
  if (/sol/i.test(categorie)) return 'sol';
  return 'autre';
}
