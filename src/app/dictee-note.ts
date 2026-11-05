// Une note dictée, dans le journal et la fiche : la dictée brute repliée sous la synthèse, et
// « à ranger » tant que Claude ne l'a pas rangée.

import type { Note } from '../registre/modele';
import { el } from '../ui/dom';

export function elementsDictee(n: Note): HTMLElement[] {
  if (!n.dictee) return [];
  if (n.aRanger) {
    return [
      el('div', { class: 'badge a-ranger' }, 'Dictée à ranger'),
      el('p', { class: 'texte-note' }, n.dictee),
    ];
  }
  const details = el(
    'details',
    { class: 'dictee-brute' },
    el('summary', {}, 'Dictée'),
    el('p', {}, n.dictee),
  );
  // Dans une ligne cliquable (journal), ouvrir la dictée ne doit pas ouvrir la fiche.
  details.addEventListener('click', (e) => e.stopPropagation());
  return [details];
}
