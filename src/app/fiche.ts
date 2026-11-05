// Fiche d'une parcelle : ce qu'elle porte, son contour, et la frise de tout ce qui s'y est passé
// (notes du champ et interventions Geofolia), la plus récente en haut.

import { dessinContour } from '../registre/geo';
import type { Intervention, Note } from '../registre/modele';
import { el, svg } from '../ui/dom';
import { elementObservation } from './observation';
import { icone, iconeCategorie } from '../ui/icones';
import { barreHaut, dateCourte, dose, echeance, joursJusqua, naviguer, nombre } from './commun';
import {
  changerReglages,
  choisirContour,
  contourDe,
  enregistrerNote,
  etat,
  interventionsDe,
  notesDe,
  parcelle,
} from './etat';
import { doublonsPossibles, libelleStatut, semisRealise } from './resume';

export function ecranFiche(nom: string): HTMLElement {
  const p = parcelle(nom);
  const page = el('main', { class: 'ecran' });
  page.append(barreHaut(nom));
  if (!p) {
    page.append(
      el('p', { class: 'carte' }, 'Cette parcelle n’est pas dans le dernier import Geofolia.'),
    );
    return page;
  }
  const interventions = interventionsDe(nom);
  const semis = semisRealise(interventions);
  const contour = contourDe(nom);

  const infos = el(
    'dl',
    { class: 'infos' },
    ...ligne('Culture', [p.culture, p.variete].filter(Boolean).join(' · ') || '—'),
    ...ligne(
      'Surface',
      `${nombre(p.surfaceHa)} ha${p.morceaux > 1 ? ` (${p.morceaux} morceaux)` : ''}`,
    ),
    ...ligne(
      'Semis',
      semis
        ? `${dateCourte(semis.date)}${semis.produits.length ? ' · ' + semis.produits.map((x) => x.nom).join(', ') : ''}`
        : 'pas encore',
    ),
    ...ligne('Précédent', p.precedents[0] || '—'),
    ...ligne('Sol', p.sol || '—'),
  );
  page.append(
    el(
      'section',
      { class: 'carte entete-fiche' },
      el('div', { class: 'entete-texte' }, infos),
      contour ? dessin(contour) : null,
    ),
    el(
      'button',
      {
        class: 'bouton principal large',
        onclick: () => naviguer(`#noter/${encodeURIComponent(nom)}`),
      },
      icone('plus', 20),
      'Noter sur cette parcelle',
    ),
  );

  const notes = notesDe(nom);
  const aRevoir = notes
    .filter((n) => n.aRevoir && !n.revu)
    .sort((a, b) => a.aRevoir.localeCompare(b.aRevoir));
  for (const n of aRevoir) page.append(rappel(n));

  page.append(
    frise(
      notes,
      interventions.filter((i) => i.statut === 'realisee'),
      nom,
    ),
  );

  const prevues = interventions.filter((i) => i.statut !== 'realisee');
  if (prevues.length) {
    const details = el(
      'details',
      { class: 'carte prevu' },
      el('summary', {}, `Prévu dans Geofolia (${prevues.length})`),
      ...prevues.map((i) => elementIntervention(i, nom, new Set())),
    );
    details.open = etat.reglages.afficherPrevu;
    details.addEventListener('toggle', () => void changerReglages({ afficherPrevu: details.open }));
    page.append(details);
  }
  page.append(choixContour(nom));
  return page;
}

function ligne(titre: string, valeur: string): HTMLElement[] {
  return [el('dt', {}, titre), el('dd', {}, valeur)];
}

function dessin(contour: NonNullable<ReturnType<typeof contourDe>>): SVGSVGElement {
  const taille = 120;
  const d = dessinContour(contour, taille, etat.position?.latLon);
  const s = svg('svg', {
    viewBox: `0 0 ${taille} ${taille}`,
    class: 'dessin-contour',
    role: 'img',
  });
  s.setAttribute('aria-label', 'Contour de la parcelle (Jalon)');
  for (const c of d.chemins) s.append(svg('path', { d: c, class: 'contour' }));
  for (const c of d.exclus) s.append(svg('path', { d: c, class: 'exclu' }));
  if (d.position)
    s.append(svg('circle', { cx: d.position[0], cy: d.position[1], r: 5, class: 'moi' }));
  return s;
}

function rappel(n: Note): HTMLElement {
  const urgent = joursJusqua(n.aRevoir) <= 0;
  return el(
    'section',
    { class: urgent ? 'rappel urgent' : 'rappel' },
    el(
      'div',
      {},
      el('strong', {}, `À revoir ${echeance(n.aRevoir)}`),
      el('div', { class: 'doux' }, resume(n)),
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
  );
}

function resume(n: Note): string {
  return [n.stade, n.constats.join(', '), n.gravite].filter(Boolean).join(' · ') || n.texte;
}

/** Rubriques des interventions Geofolia dans l'historique, dans cet ordre (après « Mes notes »). */
const RUBRIQUES: [string, RegExp][] = [
  ['Semis', /semis/i],
  ['Travail du sol', /sol/i],
  ['Engrais', /fertili/i],
  ['Traitements', /traitement/i],
];

export function rubrique(categorie: string): string {
  return RUBRIQUES.find(([, re]) => re.test(categorie))?.[0] ?? 'Autres interventions';
}

/** Historique rangé par rubrique (notes, semis, travail du sol, engrais, traitements), le plus récent en haut. */
function frise(notes: Note[], interventions: Intervention[], nom: string): HTMLElement {
  const doublons = doublonsPossibles(interventions);
  const section = el('section', { class: 'frise' }, el('h2', {}, 'Historique'));
  if (notes.length === 0 && interventions.length === 0) {
    section.append(el('p', { class: 'doux' }, 'Rien de noté pour l’instant sur cette parcelle.'));
    return section;
  }
  const recentes = <T extends { date: string }>(l: T[]) =>
    [...l].sort((a, b) => b.date.localeCompare(a.date));
  const groupes: [string, HTMLElement[]][] = [
    ['Mes notes', recentes(notes).map((n) => elementObservation(n, false))],
    ...[...RUBRIQUES.map(([r]) => r), 'Autres interventions'].map((r): [string, HTMLElement[]] => [
      r,
      recentes(interventions.filter((i) => rubrique(i.categorie) === r)).map((i) =>
        elementIntervention(i, nom, doublons),
      ),
    ]),
  ];
  for (const [titre, elements] of groupes) {
    if (elements.length === 0) continue;
    const bloc = el(
      'details',
      { class: 'rubrique' },
      el('summary', {}, titre, el('span', { class: 'compte' }, String(elements.length))),
      ...elements,
    );
    // Mes notes dépliées ; les interventions Geofolia repliées (demandé le 05/11/2026).
    bloc.open = titre === 'Mes notes';
    section.append(bloc);
  }
  return section;
}

export function elementIntervention(
  i: Intervention,
  nom: string | null,
  doublons: Set<string>,
): HTMLElement {
  const autres = i.parcelles.filter((p) => p.nom !== nom).map((p) => p.nom);
  const statut = libelleStatut(i);
  return el(
    'article',
    { class: `element intervention${i.statut === 'realisee' ? '' : ' prevue'}` },
    el('div', { class: 'element-icone' }, icone(iconeCategorie(i.categorie), 20)),
    el(
      'div',
      { class: 'element-corps' },
      el(
        'div',
        { class: 'element-tete' },
        el('strong', {}, i.operation || i.categorie),
        el('span', { class: 'doux' }, dateCourte(i.date)),
        statut ? el('span', { class: 'badge' }, statut) : null,
      ),
      nom === null
        ? el('div', {}, i.parcelles.map((p) => `${p.nom} (${nombre(p.surfaceHa)} ha)`).join(', '))
        : null,
      i.produits.length
        ? el(
            'ul',
            { class: 'produits' },
            ...i.produits.map((p) =>
              el(
                'li',
                {},
                el('span', {}, p.nom),
                el('span', { class: 'dose' }, dose(p.dose, p.unite)),
              ),
            ),
          )
        : null,
      i.commentaire ? el('p', { class: 'texte-note' }, i.commentaire) : null,
      nom !== null && autres.length
        ? el('div', { class: 'doux' }, `Aussi sur ${autres.join(', ')}`)
        : null,
      doublons.has(i.id)
        ? el(
            'div',
            { class: 'avertissement' },
            'Doublon possible dans Geofolia : même intervention à quelques jours près.',
          )
        : null,
    ),
  );
}

function choixContour(nom: string): HTMLElement {
  const contours = etat.jalon?.contours ?? [];
  const actuel = contourDe(nom)?.nom ?? '';
  const choix = el('select', {});
  choix.append(el('option', { value: '' }, '— pas de contour —'));
  for (const c of [...contours].sort((a, b) =>
    a.nom.localeCompare(b.nom, 'fr', { numeric: true }),
  )) {
    const o = el('option', { value: c.nom }, c.nom);
    o.selected = c.nom === actuel;
    choix.append(o);
  }
  choix.addEventListener('change', async () => {
    await choisirContour(nom, choix.value);
    naviguer(location.hash, true);
  });
  return el(
    'details',
    { class: 'carte reglage-contour' },
    el('summary', {}, 'Contour Jalon : ', el('strong', {}, actuel || 'aucun')),
    contours.length
      ? el('label', {}, 'Parcelle de Jalon correspondante', choix)
      : el('p', { class: 'doux' }, 'Pas encore de contours de Jalon (voir Réglages).'),
    nom in etat.choixContours
      ? el(
          'button',
          {
            class: 'lien',
            onclick: async () => {
              await choisirContour(nom, null);
              naviguer(location.hash, true);
            },
          },
          'Revenir au choix automatique',
        )
      : null,
  );
}
