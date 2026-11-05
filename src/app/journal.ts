// Journal des observations : la synthèse de tous les tours de plaine. Une journée = un tour, la
// plus récente en haut, avec ce qui a été vu sur chaque parcelle. En tête, le point de la semaine
// et les parcelles pas vues depuis longtemps.

import { CATEGORIES } from '../agro/listes';
import type { Note } from '../registre/modele';
import { el } from '../ui/dom';
import { elementObservation } from './observation';
import {
  ajouterJours,
  dateCourte,
  dateLongue,
  jour,
  joursJusqua,
  message,
  pastilles,
} from './commun';
import { resumerTour } from '../ia/claude';
import { ecrireValeur, effacerValeur, lireValeur } from '../registre/base';
import { aRevoir, etat, parcelle, parcelles } from './etat';

/** Pas vue depuis ce nombre de jours : la parcelle est signalée. */
const OUBLI = 15;
let filtre = '';

export function ecranJournal(): HTMLElement {
  const page = el(
    'main',
    { class: 'ecran' },
    el('header', { class: 'titre-accueil' }, el('h1', {}, 'Journal')),
  );
  const notes = [...etat.notes].sort((a, b) => b.date.localeCompare(a.date));
  if (notes.length === 0) {
    page.append(
      el(
        'p',
        { class: 'carte vide' },
        'Pas encore d’observation. Chaque tour de plaine apparaîtra ici, jour par jour, avec ce que tu as vu sur chaque parcelle.',
      ),
    );
    return page;
  }
  page.append(synthese(notes));
  const liste = el('div', { class: 'journal' });
  const dessiner = () => {
    liste.replaceChildren();
    const visibles = notes.filter((n) => !filtre || n.categorie === filtre);
    if (visibles.length === 0) liste.append(el('p', { class: 'doux' }, 'Aucune observation.'));
    // Une journée = un tour de plaine.
    const tours = new Map<string, Note[]>();
    for (const n of visibles)
      tours.set(n.date.slice(0, 10), [...(tours.get(n.date.slice(0, 10)) ?? []), n]);
    for (const [j, observations] of tours) {
      const nbParcelles = new Set(observations.map((n) => n.parcelle)).size;
      liste.append(
        el(
          'section',
          { class: 'tour' },
          el(
            'h2',
            { class: 'titre-tour' },
            el('span', {}, dateLongue(j)),
            el('span', { class: 'doux' }, `${nbParcelles} parcelle${nbParcelles > 1 ? 's' : ''}`),
          ),
          etat.cleApi ? resume(j, observations) : null,
          // Dans la journée, dans l'ordre du tour.
          ...[...observations].reverse().map((n) => elementObservation(n, true)),
        ),
      );
    }
  };
  page.append(
    pastilles(CATEGORIES, filtre ? [filtre] : [], (c) => {
      filtre = c[0] ?? '';
      dessiner();
    }),
    liste,
  );
  dessiner();
  return page;
}

function synthese(notes: Note[]): HTMLElement {
  const debut = ajouterJours(jour(), -6);
  const semaine = notes.filter((n) => n.date.slice(0, 10) >= debut);
  const vues = new Set(semaine.map((n) => n.parcelle));
  const aIntervenir = semaine.filter((n) => n.gravite === 'Intervenir');
  const revoir = aRevoir().filter((n) => joursJusqua(n.aRevoir) <= 0);
  // Parcelles pas vues depuis OUBLI jours (ou jamais vues).
  const derniere = new Map<string, string>();
  for (const n of notes)
    if (!derniere.has(n.parcelle)) derniere.set(n.parcelle, n.date.slice(0, 10));
  const oubliees = parcelles().filter((p) => {
    const d = derniere.get(p.nom);
    return !d || joursJusqua(d) < -OUBLI;
  });
  return el(
    'section',
    { class: 'carte synthese' },
    el('h2', {}, '7 derniers jours'),
    el(
      'p',
      {},
      `${semaine.length} observation${semaine.length > 1 ? 's' : ''} sur ${vues.size} parcelle${vues.size > 1 ? 's' : ''}`,
      aIntervenir.length
        ? el('strong', { class: 'alerte' }, ` · ${aIntervenir.length} « intervenir »`)
        : null,
      revoir.length ? ` · ${revoir.length} à revoir` : null,
    ),
    oubliees.length
      ? el(
          'details',
          {},
          el(
            'summary',
            {},
            `${oubliees.length} parcelle${oubliees.length > 1 ? 's' : ''} pas vue${oubliees.length > 1 ? 's' : ''} depuis ${OUBLI} jours`,
          ),
          el(
            'ul',
            { class: 'oubliees' },
            ...oubliees.map((p) => {
              const d = derniere.get(p.nom);
              return el(
                'li',
                {},
                el('a', { href: `#parcelle/${encodeURIComponent(p.nom)}` }, p.nom),
                el('span', { class: 'doux' }, d ? `vue le ${dateCourte(d)}` : 'jamais vue'),
              );
            }),
          ),
        )
      : null,
  );
}

/** « Résumer ce tour » : compte rendu écrit par Claude, gardé pour ne pas le redemander. */
function resume(j: string, notes: Note[]): HTMLElement {
  const zone = el('div', { class: 'resume-tour' });
  const cle = `resume/${j}`;
  // Le résumé gardé est à refaire si les observations du jour ont changé depuis.
  const empreinte = notes
    .map((n) => n.id + n.modifieLe)
    .sort()
    .join('|');
  type Garde = { texte: string; empreinte: string; replie?: boolean };
  // Résumé repliable (le repli est gardé) et supprimable.
  const montrer = (r: Garde) => {
    const titre = `Tour de plaine du ${dateLongue(j)}`;
    const bloc = el(
      'details',
      { class: 'resume-replie' },
      el('summary', {}, 'Résumé du tour'),
      el('p', { class: 'texte-note' }, r.texte),
      el(
        'div',
        { class: 'actions-resume' },
        el(
          'button',
          {
            class: 'bouton secondaire',
            onclick: async () => {
              if (navigator.share)
                await navigator
                  .share({ title: titre, text: `${titre}\n\n${r.texte}` })
                  .catch(() => {});
              else
                await navigator.clipboard.writeText(r.texte).then(() => message('Résumé copié.'));
            },
          },
          'Partager',
        ),
        r.empreinte === empreinte
          ? null
          : el(
              'button',
              { class: 'lien', onclick: () => void demander() },
              'Refaire (observations modifiées)',
            ),
        el(
          'button',
          {
            class: 'lien danger',
            onclick: async () => {
              if (!confirm('Supprimer ce résumé ? Tu pourras en redemander un.')) return;
              await effacerValeur(cle);
              zone.replaceChildren(bouton());
            },
          },
          'Supprimer',
        ),
      ),
    );
    bloc.open = !r.replie;
    bloc.addEventListener('toggle', () => void ecrireValeur(cle, { ...r, replie: !bloc.open }));
    zone.replaceChildren(bloc);
  };
  const demander = async () => {
    zone.replaceChildren(el('p', { class: 'doux' }, 'Claude écrit le résumé du tour…'));
    try {
      const texte = await resumerTour(
        dateLongue(j),
        [...notes].reverse(),
        (nom) => parcelle(nom)?.culture ?? '',
        etat.cleApi,
        etat.reglages.modeleDictee,
      );
      const r: Garde = { texte, empreinte };
      await ecrireValeur(cle, r);
      montrer(r);
    } catch (e) {
      zone.replaceChildren(el('p', { class: 'doux' }, (e as Error).message), bouton());
    }
  };
  const bouton = () =>
    el('button', { class: 'bouton secondaire', onclick: () => void demander() }, 'Résumer ce tour');
  zone.append(bouton());
  void lireValeur<Garde>(cle).then((r) => {
    if (r) montrer(r);
  });
  return zone;
}
