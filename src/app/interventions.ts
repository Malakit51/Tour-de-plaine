// Toutes les interventions de la campagne (Geofolia), filtrées par type : pour retrouver vite
// « qu'est-ce que j'ai passé, où, à quelle dose ».

import { el } from '../ui/dom';
import { dateCourte, moisLong, naviguer, pastilles, phrase } from './commun';
import { changerReglages, etat, importCourant, interventions } from './etat';
import { elementIntervention } from './fiche';
import { doublonsPossibles } from './resume';

const FILTRES: [string, RegExp][] = [
  ['Traitements', /traitement/i],
  ['Semis', /semis/i],
  ['Fertilisation', /fertili/i],
  ['Travail du sol', /sol/i],
];
let filtre = 'Traitements';

export function ecranInterventions(): HTMLElement {
  const page = el(
    'main',
    { class: 'ecran' },
    el('header', { class: 'titre-accueil' }, el('h1', {}, 'Interventions')),
  );
  const imp = importCourant();
  if (!imp) {
    page.append(
      el('p', { class: 'carte vide' }, 'Importe d’abord ton export Geofolia (Réglages).'),
    );
    return page;
  }
  page.append(
    el(
      'p',
      { class: 'doux' },
      phrase(
        `D’après l’export Geofolia du ${dateCourte(imp.exporteLe.slice(0, 10) || imp.importeLe.slice(0, 10))}`,
      ),
    ),
  );
  const liste = el('div', {});
  const prevu = el('input', { type: 'checkbox' });
  prevu.checked = etat.reglages.afficherPrevu;
  const dessiner = () => {
    const re = FILTRES.find(([f]) => f === filtre)?.[1];
    const toutes = interventions().filter(
      (i) => (!re || re.test(i.categorie)) && (prevu.checked || i.statut === 'realisee'),
    );
    const doublons = doublonsPossibles(toutes);
    liste.replaceChildren();
    if (toutes.length === 0) liste.append(el('p', { class: 'doux' }, 'Aucune intervention.'));
    let mois = '';
    for (const i of [...toutes].reverse()) {
      const m = moisLong(i.date);
      if (m !== mois) liste.append(el('h3', { class: 'mois' }, (mois = m)));
      const e = elementIntervention(i, null, doublons);
      e.addEventListener('click', (ev) => {
        // Toucher le nom d'une parcelle dans la ligne ouvre sa fiche s'il n'y en a qu'une.
        if (i.parcelles.length === 1 && !(ev.target as HTMLElement).closest('button')) {
          naviguer(`#parcelle/${encodeURIComponent(i.parcelles[0]!.nom)}`);
        }
      });
      liste.append(e);
    }
  };
  prevu.addEventListener('change', () => {
    void changerReglages({ afficherPrevu: prevu.checked });
    dessiner();
  });
  page.append(
    pastilles(
      FILTRES.map(([f]) => f),
      [filtre],
      (c) => {
        filtre = c[0] ?? '';
        dessiner();
      },
    ),
    el(
      'label',
      { class: 'ligne-champ case' },
      prevu,
      'Montrer aussi le prévu et le plan de fumure',
    ),
    liste,
  );
  dessiner();
  return page;
}
