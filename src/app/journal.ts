// Journal des observations : la synthèse de tous les tours de plaine. Une journée = un tour, la
// plus récente en haut, avec ce qui a été vu sur chaque parcelle. En tête, le point de la semaine
// et les parcelles pas vues depuis longtemps.

import { CATEGORIES } from '../agro/listes';
import { lirePhoto } from '../registre/base';
import type { Note } from '../registre/modele';
import { el } from '../ui/dom';
import { elementsDictee } from './dictee-note';
import {
  ajouterJours,
  dateCourte,
  dateLongue,
  jour,
  joursJusqua,
  message,
  naviguer,
  pastilles,
} from './commun';
import { resumerTour } from '../ia/claude';
import { ecrireValeur, lireValeur } from '../registre/base';
import { aRevoir, etat, parcelle, parcelles, supprimerNote } from './etat';

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
          ...[...observations].reverse().map(observation),
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

/**
 * Une observation du journal : seulement des pastilles (stade, ce qui est vu, gravité, à revoir).
 * La remarque, la dictée et les photos restent repliées. Toucher ouvre la fiche de la parcelle ;
 * un appui long propose de supprimer l'observation.
 */
function observation(n: Note): HTMLElement {
  const p = parcelle(n.parcelle);
  const gravite =
    n.gravite === 'Intervenir' ? 'forte' : n.gravite === 'À surveiller' ? 'moyenne' : 'aucune';
  const pastille = (texte: string, classe = '') =>
    el('span', { class: `etiquette-obs ${classe}` }, texte);
  const vus = n.constats.length ? n.constats : n.categorie ? [n.categorie] : [];
  const detail = n.texte || n.dictee || n.photos.length;
  const photos = el('div', { class: 'vignettes' });
  const replie = detail
    ? el(
        'details',
        { class: 'dictee-brute' },
        el('summary', {}, 'Remarque'),
        n.texte ? el('p', {}, n.texte) : null,
        ...elementsDictee(n),
        photos,
      )
    : null;
  // Photos chargées seulement quand on déplie.
  replie?.addEventListener(
    'toggle',
    () => {
      for (const id of n.photos) {
        void lirePhoto(id).then((ph) => {
          if (ph)
            photos.append(
              el('img', {
                src: URL.createObjectURL(ph.image),
                alt: 'Photo',
                class: 'vignette petite',
              }),
            );
        });
      }
    },
    { once: true },
  );
  const ligne = el(
    'article',
    { class: `element note obs-journal gravite-${gravite}` },
    el(
      'div',
      { class: 'element-corps' },
      el(
        'div',
        { class: 'element-tete' },
        el('strong', {}, n.parcelle),
        el(
          'span',
          { class: 'doux' },
          [p?.culture, n.date.slice(11, 16)].filter(Boolean).join(' · '),
        ),
      ),
      el(
        'div',
        { class: 'etiquettes-obs' },
        n.stade ? pastille(n.stade) : null,
        ...vus.map((v) => pastille(v)),
        n.gravite ? pastille(n.gravite, `gravite-${gravite}`) : null,
        n.aRevoir && !n.revu ? pastille(`À revoir le ${dateCourte(n.aRevoir)}`, 'revoir') : null,
        n.photos.length
          ? pastille(`${n.photos.length} photo${n.photos.length > 1 ? 's' : ''}`)
          : null,
        n.aRanger ? pastille('Dictée à ranger', 'revoir') : null,
      ),
      replie,
    ),
  );
  appuiLong(ligne, () => menuObservation(n));
  ligne.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('details'))
      naviguer(`#parcelle/${encodeURIComponent(n.parcelle)}`);
  });
  return ligne;
}

/**
 * Appui long (un peu plus d'une demi-seconde, sans bouger) : `action`, et le toucher qui suit
 * n'ouvre pas la fiche.
 */
function appuiLong(element: HTMLElement, action: () => void): void {
  let minuteur = 0;
  let depart: [number, number] | null = null;
  let declenche = false;
  const annuler = () => {
    clearTimeout(minuteur);
    depart = null;
  };
  element.addEventListener('pointerdown', (e) => {
    declenche = false;
    depart = [e.clientX, e.clientY];
    minuteur = window.setTimeout(() => {
      declenche = true;
      navigator.vibrate?.(30);
      action();
    }, 550);
  });
  element.addEventListener('pointermove', (e) => {
    if (depart && Math.hypot(e.clientX - depart[0], e.clientY - depart[1]) > 10) annuler();
  });
  element.addEventListener('pointerup', annuler);
  element.addEventListener('pointercancel', annuler);
  // Pas de menu du navigateur (copier, sélectionner…) sur l'appui long.
  element.addEventListener('contextmenu', (e) => e.preventDefault());
  element.addEventListener(
    'click',
    (e) => {
      if (!declenche) return;
      declenche = false;
      e.stopImmediatePropagation();
      e.preventDefault();
    },
    true,
  );
}

/** Menu de l'appui long : modifier ou supprimer l'observation. */
function menuObservation(n: Note): void {
  document.querySelector('.voile-menu')?.remove();
  const fermer = () => voile.remove();
  const voile: HTMLElement = el(
    'div',
    { class: 'voile-menu' },
    el(
      'div',
      { class: 'menu-bas', role: 'dialog', 'aria-label': 'Observation' },
      el('p', { class: 'doux' }, `${n.parcelle} · ${dateCourte(n.date)} ${n.date.slice(11, 16)}`),
      el(
        'button',
        { class: 'bouton secondaire large', onclick: () => (fermer(), naviguer(`#note/${n.id}`)) },
        'Modifier',
      ),
      el(
        'button',
        {
          class: 'bouton danger large',
          onclick: async () => {
            if (!confirm(`Supprimer l’observation sur ${n.parcelle} du ${dateCourte(n.date)} ?`))
              return;
            fermer();
            await supprimerNote(n.id);
            message('Observation supprimée.');
            naviguer(location.hash, true);
          },
        },
        'Supprimer',
      ),
      el('button', { class: 'lien', onclick: fermer }, 'Annuler'),
    ),
  );
  voile.addEventListener('click', (e) => e.target === voile && fermer());
  document.body.append(voile);
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
  const montrer = (texte: string, aJour: boolean) => {
    zone.replaceChildren(
      el('p', { class: 'texte-note' }, texte),
      el(
        'div',
        { class: 'actions-resume' },
        el(
          'button',
          {
            class: 'bouton secondaire',
            onclick: async () => {
              const titre = `Tour de plaine du ${dateLongue(j)}`;
              if (navigator.share)
                await navigator
                  .share({ title: titre, text: `${titre}\n\n${texte}` })
                  .catch(() => {});
              else await navigator.clipboard.writeText(texte).then(() => message('Résumé copié.'));
            },
          },
          'Partager',
        ),
        aJour
          ? null
          : el(
              'button',
              { class: 'lien', onclick: () => void demander() },
              'Refaire (observations modifiées)',
            ),
      ),
    );
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
      await ecrireValeur(cle, { texte, empreinte });
      montrer(texte, true);
    } catch (e) {
      zone.replaceChildren(el('p', { class: 'doux' }, (e as Error).message), bouton());
    }
  };
  const bouton = () =>
    el('button', { class: 'bouton secondaire', onclick: () => void demander() }, 'Résumer ce tour');
  zone.append(bouton());
  void lireValeur<{ texte: string; empreinte: string }>(cle).then((r) => {
    if (r) montrer(r.texte, r.empreinte === empreinte);
  });
  return zone;
}
