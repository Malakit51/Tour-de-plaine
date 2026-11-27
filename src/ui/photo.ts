// Photo en plein écran : ✕ ou le bouton retour du téléphone ferme ; flèches pour passer aux
// autres photos de la même observation. On peut zoomer avec deux doigts.

import { el } from './dom';
import { icone } from './icones';

export function voirEnGrand(urls: readonly string[], depart = 0): void {
  document.querySelector('.voile-photo')?.remove();
  let i = Math.max(0, Math.min(depart, urls.length - 1));
  const image = el('img', { alt: 'Photo' });
  const compteur = el('span', { class: 'compteur-photo' });
  const montrer = () => {
    image.src = urls[i]!;
    compteur.textContent = urls.length > 1 ? `${i + 1} / ${urls.length}` : '';
  };
  const bouton = (
    classe: string,
    nom: string,
    ic: Parameters<typeof icone>[0],
    action: () => void,
  ) =>
    el(
      'button',
      { type: 'button', class: classe, 'aria-label': nom, onclick: action },
      icone(ic, 28),
    );
  const voile: HTMLElement = el(
    'div',
    { class: 'voile-photo', role: 'dialog', 'aria-label': 'Photo' },
    image,
    compteur,
    bouton('fermer-photo', 'Fermer', 'fermer', () => history.back()),
    urls.length > 1
      ? bouton('photo-precedente', 'Photo précédente', 'retour', () => {
          i = (i - 1 + urls.length) % urls.length;
          montrer();
        })
      : null,
    urls.length > 1
      ? bouton('photo-suivante', 'Photo suivante', 'retour', () => {
          i = (i + 1) % urls.length;
          montrer();
        })
      : null,
  );
  montrer();
  // Le bouton retour du téléphone ferme la photo au lieu de quitter l'écran : une étape
  // d'historique (même adresse) est ajoutée, et retirée en fermant.
  history.pushState({ photo: true }, '', location.href);
  const fermer = () => {
    voile.remove();
    removeEventListener('popstate', fermer);
  };
  addEventListener('popstate', fermer);
  document.body.append(voile);
}
