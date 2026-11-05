// Reconnaissance vocale du navigateur (celle de Google dans Chrome, comme le micro du clavier) :
// la voix devient du texte sur le téléphone, Claude ne reçoit que le texte.

interface Resultat {
  isFinal: boolean;
  0: { transcript: string };
}
interface Reconnaissance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<Resultat> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

function constructeur(): (new () => Reconnaissance) | undefined {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    (new () => Reconnaissance) | undefined;
}

export const voixDisponible = () => constructeur() !== undefined;

/** Mot comparable : sans majuscule, accent ni ponctuation. */
const simple = (m: string) =>
  m
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');

/**
 * Ajoute un morceau renvoyé par la reconnaissance au texte déjà là, sans répéter de mots. Chrome
 * sur Android renvoie des morceaux cumulés (« colza », « colza 6 feuilles »…), répétés, ou repris
 * avec un mot corrigé au passage :
 * - un morceau qui recommence comme le texte (plus de la moitié des mots en commun au début) est
 *   la même phrase, revue : il remplace le texte s'il est au moins aussi long ;
 * - un morceau qui reprend la fin du texte n'en ajoute que la suite.
 * `revision` à faux : seulement le second cas (d'une écoute à la suivante, rien n'est « revu »).
 */
export function fusionner(texte: string, morceau: string, revision = true): string {
  const a = texte.split(' ').filter(Boolean);
  const b = morceau.trim().split(/\s+/).filter(Boolean);
  if (b.length === 0) return texte;
  if (a.length === 0) return b.join(' ');
  const sa = a.map(simple);
  const sb = b.map(simple);
  let debut = 0;
  while (debut < sa.length && debut < sb.length && sa[debut] === sb[debut]) debut++;
  if (revision && debut > 0 && debut * 2 >= Math.min(sa.length, sb.length)) {
    return b.length >= a.length ? b.join(' ') : a.join(' ');
  }
  // Plus long recouvrement entre la fin du texte et le début du morceau.
  for (let k = Math.min(sa.length, sb.length); k > 0; k--) {
    if (sa.slice(-k).join(' ') === sb.slice(0, k).join(' ')) return [...a, ...b.slice(k)].join(' ');
  }
  return [...a, ...b].join(' ');
}

/** Texte d'une écoute à partir de tous ses résultats, sans répétition. */
export function assembler(morceaux: readonly string[]): string {
  return morceaux.reduce((t, m) => fusionner(t, m), '');
}

/**
 * Écoute jusqu'à `arreter()`. `surTexte` reçoit tout le texte dicté depuis le début. Écoute
 * continue (l'écoute phrase par phrase, essayée le 05/11/2026, bipait et perdait des mots à chaque
 * relance) ; Chrome la coupe quand même après un long silence : elle est alors relancée.
 */
export function ecouter(
  depart: string,
  surTexte: (texte: string) => void,
  surFin: (erreur?: string) => void,
): { arreter: () => void } {
  const R = constructeur();
  if (!R) {
    surFin('La dictée vocale n’est pas disponible dans ce navigateur.');
    return { arreter: () => {} };
  }
  let acquis = depart.trim();
  let actif = true;
  let erreur: string | undefined;
  let r: Reconnaissance;
  const lancer = () => {
    r = new R();
    r.lang = 'fr-FR';
    r.continuous = true;
    r.interimResults = true;
    let session = '';
    r.onresult = (e) => {
      session = assembler(Array.from(e.results, (res) => res[0].transcript));
      surTexte(fusionner(acquis, session, false));
    };
    r.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      actif = false;
      // Signalée une seule fois, à la fin de l'écoute (onend suit toujours onerror).
      erreur =
        e.error === 'not-allowed'
          ? 'Micro refusé : autorise-le pour cette appli dans les réglages de Chrome.'
          : e.error === 'network'
            ? 'La dictée vocale a besoin du réseau sur ce téléphone : utilise le micro du clavier.'
            : `Dictée interrompue (${e.error}).`;
    };
    r.onend = () => {
      // Ce qui a été dit pendant cette écoute est acquis, une seule fois (sans répéter la fin de ce
      // qui l'était déjà, si Chrome la redit en reprenant).
      acquis = fusionner(acquis, session, false);
      session = '';
      if (actif) lancer();
      else surFin(erreur);
    };
    r.start();
  };
  lancer();
  return {
    arreter: () => {
      actif = false;
      r.stop();
    },
  };
}
