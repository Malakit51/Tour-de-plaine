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
 * Écoute jusqu'à `arreter()`. `surTexte` reçoit tout le texte dicté depuis le début (phrases
 * terminées et phrase en cours). Chrome coupe l'écoute après un silence : elle est relancée
 * tant qu'on n'a pas arrêté.
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
    let enCours = '';
    r.onresult = (e) => {
      enCours = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]!;
        if (res.isFinal) acquis = `${acquis} ${res[0].transcript}`.trim();
        else enCours += res[0].transcript;
      }
      surTexte(`${acquis} ${enCours}`.trim());
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
