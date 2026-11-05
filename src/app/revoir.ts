// Les parcelles à revoir : en retard d'abord, puis aujourd'hui, puis à venir.

import { el } from '../ui/dom';
import { icone } from '../ui/icones';
import { dateCourte, echeance, joursJusqua, naviguer } from './commun';
import { aRevoir, enregistrerNote, parcelle } from './etat';
import { resumeNote } from './resume';

export function ecranRevoir(): HTMLElement {
  const page = el(
    'main',
    { class: 'ecran' },
    el('header', { class: 'titre-accueil' }, el('h1', {}, 'À revoir')),
  );
  const notes = aRevoir();
  if (notes.length === 0) {
    page.append(
      el(
        'p',
        { class: 'carte vide' },
        'Rien à revoir. Quand tu notes quelque chose, choisis « À revoir » dans 3, 7, 10 ou 15 jours : la parcelle apparaîtra ici.',
      ),
    );
    return page;
  }
  const groupes: [string, typeof notes][] = [
    ['En retard', notes.filter((n) => joursJusqua(n.aRevoir) < 0)],
    ['Aujourd’hui', notes.filter((n) => joursJusqua(n.aRevoir) === 0)],
    ['Plus tard', notes.filter((n) => joursJusqua(n.aRevoir) > 0)],
  ];
  for (const [titre, liste] of groupes) {
    if (liste.length === 0) continue;
    page.append(el('h2', { class: 'mois' }, titre));
    for (const n of liste) {
      const p = parcelle(n.parcelle);
      page.append(
        el(
          'article',
          { class: joursJusqua(n.aRevoir) <= 0 ? 'rappel urgent' : 'rappel' },
          el(
            'a',
            { class: 'rappel-texte', href: `#parcelle/${encodeURIComponent(n.parcelle)}` },
            el('strong', {}, n.parcelle),
            p ? el('span', { class: 'doux' }, ` · ${p.culture}`) : null,
            el('div', {}, resumeNote(n)),
            el(
              'div',
              { class: 'doux' },
              `Noté le ${dateCourte(n.date)} · à revoir ${echeance(n.aRevoir)}`,
            ),
          ),
          el(
            'button',
            {
              class: 'bouton secondaire',
              onclick: async () => {
                await enregistrerNote({ ...n, revu: true, modifieLe: new Date().toISOString() });
                naviguer(location.hash, true);
              },
            },
            icone('vu', 18),
            'Vu',
          ),
        ),
      );
    }
  }
  return page;
}
