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

/**
 * Texte d'une écoute à partir de tous ses résultats. Chrome sur Android renvoie souvent des
 * résultats cumulés (« colza », « colza 6 feuilles », « colza 6 feuilles altises ») et répète
 * les mêmes : un résultat qui reprend le texte déjà là le remplace au lieu de s'y ajouter.
 */
export function assembler(morceaux: readonly string[]): string {
  let texte = '';
  for (const brut of morceaux) {
    const m = brut.trim().replace(/\s+/g, ' ');
    if (!m) continue;
    const t = texte.toLowerCase();
    const n = m.toLowerCase();
    if (n.startsWith(t))
      texte = m; // même phrase, plus longue
    else if (t.endsWith(n))
      continue; // répétition de la fin
    else texte = `${texte} ${m}`.trim();
  }
  return texte;
}

const joindre = (a: string, b: string) => `${a} ${b}`.trim();

/**
 * Écoute jusqu'à `arreter()`. `surTexte` reçoit tout le texte dicté depuis le début. Chrome coupe
 * l'écoute après un silence : elle est relancée tant qu'on n'a pas arrêté. Sur Android, l'écoute
 * continue de Chrome répète des mots : on écoute phrase par phrase, relancée à chaque fois.
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
  const android = /Android/i.test(navigator.userAgent);
  let acquis = depart.trim();
  let actif = true;
  let erreur: string | undefined;
  let r: Reconnaissance;
  const lancer = () => {
    r = new R();
    r.lang = 'fr-FR';
    r.continuous = !android;
    r.interimResults = true;
    let session = '';
    r.onresult = (e) => {
      session = assembler(Array.from(e.results, (res) => res[0].transcript));
      surTexte(joindre(acquis, session));
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
      // Ce qui a été dit pendant cette écoute est acquis, une seule fois.
      acquis = joindre(acquis, session);
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
