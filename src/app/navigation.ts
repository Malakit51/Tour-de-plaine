// Écrans et barre d'onglets. L'adresse (#plaine, #parcelle/022huss, #noter…) dit l'écran : le
// bouton retour du téléphone revient à l'écran précédent.

import { el } from '../ui/dom';
import { icone, type Icone } from '../ui/icones';
import { joursJusqua } from './commun';
import { aRevoir } from './etat';
import { ecranFiche } from './fiche';
import { ecranJournal } from './journal';
import { ecranPlaine } from './plaine';
import { ecranReglages } from './reglages';
import { ecranRevoir } from './revoir';
import { ecranSaisie } from './saisie';

const ONGLETS: [string, string, Icone][] = [
  ['#plaine', 'Plaine', 'plaine'],
  ['#revoir', 'À revoir', 'revoir'],
  ['#journal', 'Journal', 'journal'],
  ['#reglages', 'Réglages', 'reglages'],
];

function ecran(adresse: string): { page: HTMLElement; onglet: string | null } {
  const [route = '', ...reste] = adresse.slice(1).split('/');
  const param = reste.length ? decodeURIComponent(reste.join('/')) : null;
  switch (route) {
    case 'parcelle':
      // La fiche s'ouvre depuis la Plaine : l'onglet Plaine reste marqué.
      return { page: ecranFiche(param ?? ''), onglet: '#plaine' };
    case 'noter':
      return { page: ecranSaisie(param, null), onglet: null };
    case 'note':
      return { page: ecranSaisie(null, param), onglet: null };
    case 'revoir':
      return { page: ecranRevoir(), onglet: '#revoir' };
    case 'journal':
      return { page: ecranJournal(), onglet: '#journal' };
    case 'reglages':
      return { page: ecranReglages(), onglet: '#reglages' };
    default:
      return { page: ecranPlaine(), onglet: '#plaine' };
  }
}

function barreOnglets(actif: string): HTMLElement {
  const urgents = aRevoir().filter((n) => joursJusqua(n.aRevoir) <= 0).length;
  const barre = el('nav', { class: 'onglets' });
  ONGLETS.forEach(([adresse, nom, ic], i) => {
    if (i === 2) {
      barre.append(
        el(
          'a',
          { class: 'onglet noter', href: '#noter', 'aria-label': 'Nouvelle note' },
          el('span', { class: 'rond' }, icone('plus', 28)),
          el('span', {}, 'Noter'),
        ),
      );
    }
    const lien = el(
      'a',
      { class: 'onglet', href: adresse, ...(adresse === actif ? { 'aria-current': 'page' } : {}) },
      icone(ic, 24),
      el('span', {}, nom),
    );
    if (adresse === '#revoir' && urgents)
      lien.append(el('span', { class: 'pastille-nombre' }, String(urgents)));
    // Un onglet remplace l'écran courant : le retour du téléphone ne fait pas défiler les onglets.
    lien.addEventListener('click', (e) => {
      e.preventDefault();
      if (location.hash !== adresse) {
        history.replaceState(history.state, '', adresse);
        afficher();
      }
    });
    barre.append(lien);
  });
  return barre;
}

let derniereAdresse = '';

export function afficher(): void {
  const app = document.getElementById('app')!;
  const adresse = location.hash || '#plaine';
  // Même écran redessiné (après un changement) : on garde la position dans la page.
  const memeEcran = adresse === derniereAdresse;
  const defilement = memeEcran ? window.scrollY : 0;
  derniereAdresse = adresse;
  const { page, onglet } = ecran(adresse);
  app.replaceChildren(page);
  // La barre d'onglets reste toujours affichée (demandé le 05/11/2026), aussi pendant une saisie.
  app.append(barreOnglets(onglet ?? ''));
  document.body.classList.add('avec-onglets');
  window.scrollTo(0, defilement);
}
