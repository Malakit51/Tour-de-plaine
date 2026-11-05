// Une observation, telle que le Journal et la fiche parcelle la montrent : seulement des
// pastilles (stade, ce qui est vu, gravité, à revoir) ; la remarque, la dictée et les photos sont
// repliées. Toucher ouvre l'observation ; un appui long propose de la supprimer.

import { lirePhoto } from '../registre/base';
import type { Note } from '../registre/modele';
import { el } from '../ui/dom';
import { dateCourte, message, naviguer } from './commun';
import { elementsDictee } from './dictee-note';
import { parcelle, supprimerNote } from './etat';

/**
 * `avecParcelle` : dans le Journal, la parcelle et sa culture en tête ; dans la fiche (déjà celle
 * de la parcelle), la date.
 */
export function elementObservation(n: Note, avecParcelle: boolean): HTMLElement {
  const gravite =
    n.gravite === 'Intervenir' ? 'forte' : n.gravite === 'À surveiller' ? 'moyenne' : 'aucune';
  const pastille = (texte: string, classe = '') =>
    el('span', { class: `etiquette-obs ${classe}` }, texte);
  const vus = n.constats.length ? n.constats : n.categorie ? [n.categorie] : [];
  const heure = n.date.slice(11, 16);
  const tete = avecParcelle
    ? [
        el('strong', {}, n.parcelle),
        el(
          'span',
          { class: 'doux' },
          [parcelle(n.parcelle)?.culture, heure].filter(Boolean).join(' · '),
        ),
      ]
    : [el('strong', {}, dateCourte(n.date)), el('span', { class: 'doux' }, heure)];

  const photos = el('div', { class: 'vignettes' });
  const replie =
    n.texte || n.dictee || n.photos.length
      ? el(
          'details',
          { class: 'dictee-brute' },
          el('summary', {}, 'Remarque'),
          n.texte ? el('p', {}, n.texte) : null,
          ...elementsDictee(n),
          photos,
        )
      : null;
  // Photos chargées seulement quand on déplie ; toucher une photo l'agrandit.
  replie?.addEventListener(
    'toggle',
    () => {
      for (const id of n.photos) {
        void lirePhoto(id).then((ph) => {
          if (!ph) return;
          const url = URL.createObjectURL(ph.image);
          photos.append(
            el('img', {
              src: url,
              alt: 'Photo',
              class: 'vignette petite',
              onclick: () => agrandir(url),
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
      el('div', { class: 'element-tete' }, ...tete),
      el(
        'div',
        { class: 'etiquettes-obs' },
        n.stade ? pastille(n.stade) : null,
        ...vus.map((v) => pastille(v)),
        n.gravite ? pastille(n.gravite, `gravite-${gravite}`) : null,
        n.aRevoir && !n.revu ? pastille(`À revoir le ${dateCourte(n.aRevoir)}`, 'revoir') : null,
        n.aRevoir && n.revu ? pastille('Revu') : null,
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
    // Un toucher sur « Remarque » la déplie sur place (la rubrique de la fiche, elle aussi
    // repliable, contient l'observation : seul le repli de l'observation compte).
    const replieTouche = (e.target as HTMLElement).closest('details');
    if (!replieTouche || !ligne.contains(replieTouche)) naviguer(`#note/${n.id}`);
  });
  return ligne;
}

/**
 * Appui long (un peu plus d'une demi-seconde, sans bouger) : `action`, et le toucher qui suit
 * n'ouvre pas l'observation.
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

/** Menu de l'appui long : supprimer l'observation. */
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

function agrandir(url: string): void {
  const voile: HTMLElement = el(
    'div',
    { class: 'voile-photo' },
    el('img', { src: url, alt: 'Photo' }),
  );
  voile.addEventListener('click', () => voile.remove());
  document.body.append(voile);
}
