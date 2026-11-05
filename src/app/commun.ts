// Morceaux d'écran partagés : dates, nombres, pastilles, barre du haut, message passager.

import { el } from '../ui/dom';
import { icone } from '../ui/icones';

// ---------- Dates (heure du téléphone) ----------

const deux = (n: number) => String(n).padStart(2, '0');

/** « 2026-10-29 » pour une date locale. */
export function jour(d = new Date()): string {
  return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;
}

/** « 2026-10-29T15:42 » (format des champs date et heure). */
export function maintenantLocal(d = new Date()): string {
  return `${jour(d)}T${deux(d.getHours())}:${deux(d.getMinutes())}`;
}

export function ajouterJours(j: string, n: number): string {
  const [a, m, d] = j.split('-').map(Number) as [number, number, number];
  return jour(new Date(a, m - 1, d + n));
}

/** Jours entre aujourd'hui et `j` (négatif s'il est passé). */
export function joursJusqua(j: string, aujourdhui = jour()): number {
  const t = (s: string) => {
    const [a, m, d] = s.split('-').map(Number) as [number, number, number];
    return Date.UTC(a, m - 1, d);
  };
  return Math.round((t(j) - t(aujourdhui)) / 86400000);
}

const MOIS = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];
const MOIS_LONGS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

/** « 29 oct. » (l'année seulement si ce n'est pas celle en cours). */
export function dateCourte(j: string): string {
  const [a, m, d] = j.slice(0, 10).split('-').map(Number) as [number, number, number];
  const annee = a !== new Date().getFullYear() ? ` ${a}` : '';
  return `${d} ${MOIS[m - 1]}${annee}`;
}

/** Termine une phrase par un point, sans doubler celui d'une abréviation (« 22 oct. »). */
export function phrase(s: string): string {
  return s.endsWith('.') ? s : s + '.';
}

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/** « mercredi 5 novembre » (l'année seulement si ce n'est pas celle en cours) : titre d'un tour. */
export function dateLongue(j: string): string {
  const [a, m, d] = j.slice(0, 10).split('-').map(Number) as [number, number, number];
  const annee = a !== new Date().getFullYear() ? ` ${a}` : '';
  return `${JOURS[new Date(a, m - 1, d).getDay()]} ${d} ${MOIS_LONGS[m - 1]}${annee}`;
}

/** « octobre 2026 » : titre d'un mois dans les frises. */
export function moisLong(j: string): string {
  const [a, m] = j.split('-').map(Number) as [number, number];
  return `${MOIS_LONGS[m - 1]} ${a}`;
}

/** « aujourd'hui », « demain », « dans 5 jours », « il y a 2 jours ». */
export function echeance(j: string): string {
  const n = joursJusqua(j);
  if (n === 0) return 'aujourd’hui';
  if (n === 1) return 'demain';
  if (n === -1) return 'hier';
  return n > 0 ? `dans ${n} jours` : `depuis ${-n} jours`;
}

// ---------- Nombres ----------

export function nombre(n: number, chiffres = 2): string {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: chiffres });
}

/** Dose lisible : « 0,84 L/ha », « 100 kg/ha ». */
export function dose(d: number, unite: string): string {
  const chiffres = d >= 10 ? 0 : d >= 0.1 ? 2 : 3;
  // « U » dans Geofolia : doses de semences (unités SMI).
  const u = unite === 'U' ? (d >= 2 ? 'doses' : 'dose') : unite || 'u';
  return `${nombre(d, chiffres)} ${u}/ha`;
}

// ---------- Navigation ----------

export function naviguer(adresse: string, remplacer = false): void {
  // Remplacer garde la marque de la première page (voir revenir).
  if (remplacer) history.replaceState(history.state, '', adresse);
  else history.pushState(null, '', adresse);
  dispatchEvent(new HashChangeEvent('hashchange'));
}

/** Revenir à l'écran précédent (ou à l'accueil si l'appli vient d'être ouverte ici). */
export function revenir(): void {
  if (history.state !== 'premier') history.back();
  else naviguer('#plaine', true);
}

// ---------- Composants ----------

/** Barre du haut d'un écran secondaire : retour, titre, et des boutons à droite. */
export function barreHaut(titre: string, ...droite: HTMLElement[]): HTMLElement {
  return el(
    'header',
    { class: 'barre-haut' },
    el(
      'button',
      { class: 'bouton-icone', 'aria-label': 'Retour', onclick: revenir },
      icone('retour'),
    ),
    el('h1', {}, titre),
    ...droite,
  );
}

/**
 * Rangée de pastilles. `multiple` : plusieurs choix possibles ; sinon un nouveau toucher sur la
 * pastille choisie la décoche.
 */
export function pastilles(
  options: readonly string[],
  choisies: readonly string[],
  surChoix: (choisies: string[]) => void,
  multiple = false,
): HTMLElement {
  const rangee = el('div', { class: 'pastilles' });
  let courant = [...choisies];
  for (const o of options) {
    const b = el('button', { type: 'button', class: 'pastille' }, o);
    b.setAttribute('aria-pressed', String(courant.includes(o)));
    b.addEventListener('click', () => {
      if (courant.includes(o)) courant = courant.filter((x) => x !== o);
      else courant = multiple ? [...courant, o] : [o];
      for (const autre of rangee.querySelectorAll('.pastille')) {
        autre.setAttribute('aria-pressed', String(courant.includes(autre.textContent ?? '')));
      }
      surChoix(courant);
    });
    rangee.append(b);
  }
  return rangee;
}

let minuteur = 0;

/** Message bref en bas de l'écran. */
export function message(texte: string, erreur = false): void {
  document.querySelector('.message')?.remove();
  const m = el('div', { class: erreur ? 'message erreur' : 'message', role: 'status' }, texte);
  document.body.append(m);
  clearTimeout(minuteur);
  minuteur = window.setTimeout(() => m.remove(), erreur ? 6000 : 3000);
}

/** Choisir un fichier (renvoie null si annulé). */
export function choisirFichier(accepte: string): Promise<File | null> {
  return new Promise((resoudre) => {
    const entree = el('input', { type: 'file', accept: accepte });
    entree.addEventListener('change', () => resoudre(entree.files?.[0] ?? null));
    entree.addEventListener('cancel', () => resoudre(null));
    entree.click();
  });
}
