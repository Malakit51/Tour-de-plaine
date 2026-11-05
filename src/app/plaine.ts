// Accueil : où je suis, et la liste des parcelles (la plus proche d'abord quand le GPS est
// actif), avec la dernière note et ce qui est à revoir.

import { el } from '../ui/dom';
import { icone } from '../ui/icones';
import { dateCourte, joursJusqua, naviguer, nombre, pastilles } from './commun';
import { bandeauInstallation } from './installation';
import { aRevoir, etat, importCourant, notesDe, parcelles } from './etat';
import {
  activerGps,
  distanceLisible,
  parcelleIci,
  parcellesProches,
  surPosition,
} from './position';
import { derniere, resumeNote } from './resume';

let recherche = '';
let culture = '';

export function ecranPlaine(): HTMLElement {
  const imp = importCourant();
  const page = el('main', { class: 'ecran' });
  page.append(
    el(
      'header',
      { class: 'titre-accueil' },
      el('h1', {}, 'Tour de plaine'),
      imp
        ? el(
            'p',
            { class: 'doux' },
            `Campagne ${imp.campagne} · ${imp.parcelles.length} parcelles · ${nombre(
              imp.parcelles.reduce((s, p) => s + p.surfaceHa, 0),
              0,
            )} ha`,
          )
        : null,
    ),
  );
  const installer = bandeauInstallation();
  if (installer) page.append(installer);
  if (!imp) {
    page.append(
      el(
        'section',
        { class: 'carte vide' },
        el('h2', {}, 'Pour commencer'),
        el(
          'p',
          {},
          'Importe ton export Geofolia « Parcelles et interventions complet (ZIP) » : l’appli y prend tes parcelles, cultures, variétés et interventions.',
        ),
        el(
          'button',
          { class: 'bouton principal', onclick: () => naviguer('#reglages') },
          'Importer depuis Geofolia',
        ),
      ),
    );
    return page;
  }

  const bandeau = el('section', { class: 'bandeau-gps' });
  const liste = el('ul', { class: 'liste-parcelles' });
  const dessiner = () => {
    dessinerBandeau(bandeau);
    dessinerListe(liste);
  };
  dessiner();

  const champRecherche = el('input', {
    type: 'search',
    class: 'recherche',
    placeholder: 'Chercher une parcelle, une culture, une variété',
    value: recherche,
  });
  champRecherche.addEventListener('input', () => {
    recherche = champRecherche.value;
    dessinerListe(liste);
  });
  const cultures = [
    ...new Set(
      parcelles()
        .map((p) => p.culture)
        .filter(Boolean),
    ),
  ].sort();

  page.append(
    bandeau,
    el('div', { class: 'champ-recherche' }, icone('chercher', 18), champRecherche),
  );
  if (cultures.length > 1) {
    // Une seule rangée de cultures, qui défile de côté : la liste reste visible.
    const filtres = pastilles(cultures, culture ? [culture] : [], (c) => {
      culture = c[0] ?? '';
      dessinerListe(liste);
    });
    filtres.classList.add('defile');
    page.append(filtres);
  }
  page.append(liste);
  // Nouvelle position : bandeau et ordre de la liste à jour (tant que l'écran est affiché).
  const desabonner = surPosition(() => (page.isConnected ? dessiner() : desabonner()));
  return page;
}

function dessinerBandeau(bandeau: HTMLElement): void {
  bandeau.replaceChildren();
  if (!etat.reglages.gps) {
    bandeau.append(
      el(
        'button',
        { class: 'bouton secondaire', onclick: () => void activerGps() },
        icone('gps', 20),
        'Me situer dans la plaine',
      ),
    );
    return;
  }
  if (!etat.jalon) {
    bandeau.append(
      el(
        'p',
        { class: 'doux' },
        'Pas encore de contours de Jalon : la parcelle où tu es ne peut pas être reconnue. ',
      ),
      el(
        'button',
        { class: 'lien', onclick: () => naviguer('#reglages') },
        'Reprendre les contours',
      ),
    );
    return;
  }
  if (!etat.position) {
    bandeau.append(el('p', { class: 'doux' }, 'Recherche de ta position…'));
    return;
  }
  const ici = parcelleIci();
  const proche = parcellesProches()[0];
  if (ici) {
    bandeau.append(
      el('p', {}, 'Tu es dans ', el('strong', {}, ici)),
      el(
        'button',
        { class: 'bouton principal', onclick: () => naviguer(`#noter/${encodeURIComponent(ici)}`) },
        icone('plus', 20),
        'Noter ici',
      ),
    );
  } else if (proche) {
    bandeau.append(
      el(
        'p',
        {},
        'Plus proche : ',
        el('strong', {}, proche.nom),
        ` à ${distanceLisible(proche.distance)}`,
      ),
    );
  }
}

function dessinerListe(liste: HTMLElement): void {
  const distances = new Map(parcellesProches().map((p) => [p.nom, p.distance]));
  const revoir = new Map(aRevoir().map((n) => [n.parcelle, n]));
  const sansAccent = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const cherche = sansAccent(recherche).trim();
  const visibles = parcelles()
    .filter((p) => !culture || p.culture === culture)
    .filter((p) => !cherche || sansAccent(`${p.nom} ${p.culture} ${p.variete}`).includes(cherche))
    .sort((a, b) => (distances.get(a.nom) ?? Infinity) - (distances.get(b.nom) ?? Infinity));
  liste.replaceChildren(
    ...visibles.map((p) => {
      const d = derniere(notesDe(p.nom));
      const r = revoir.get(p.nom);
      const distance = distances.get(p.nom);
      return el(
        'li',
        {},
        el(
          'a',
          { class: 'ligne-parcelle', href: `#parcelle/${encodeURIComponent(p.nom)}` },
          el(
            'div',
            { class: 'ligne-tete' },
            el('strong', {}, p.nom),
            distance !== undefined
              ? el('span', { class: 'distance' }, distanceLisible(distance))
              : null,
            r
              ? el(
                  'span',
                  { class: joursJusqua(r.aRevoir) <= 0 ? 'badge urgent' : 'badge' },
                  `à revoir ${dateCourte(r.aRevoir)}`,
                )
              : null,
          ),
          el(
            'div',
            { class: 'doux' },
            [p.culture, p.variete, `${nombre(p.surfaceHa)} ha`].filter(Boolean).join(' · '),
          ),
          d ? el('div', { class: 'derniere' }, `${dateCourte(d.date)} : ${resumeNote(d)}`) : null,
        ),
      );
    }),
  );
  if (visibles.length === 0)
    liste.append(el('li', { class: 'doux vide' }, 'Aucune parcelle ne correspond.'));
}
