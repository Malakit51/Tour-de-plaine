// Consommation de Claude sur ce téléphone, mois par mois : jetons comptés par Anthropic à chaque
// réponse, convertis en dollars d'après les tarifs (estimation ; le décompte exact du compte est
// dans la Console d'Anthropic, illisible avec une clé ordinaire).

import { MODELES, suivreConsommation, type Modele } from '../ia/claude';
import { ecrireValeur, lireValeur } from '../registre/base';

type Compte = { appels: number; entree: number; sortie: number };
export type Consommation = Record<string, Partial<Record<Modele, Compte>>>; // par mois « AAAA-MM »

const CLE = 'consommation';
/** Crédits API inclus chaque mois dans le forfait Team de Maxime (écran de la Console, 05/11/2026). */
export const CREDIT_MENSUEL = 200;

const mois = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** Branche le comptage : à appeler au démarrage. */
export function compterConsommation(): void {
  // Les réponses peuvent arriver en même temps (dictée et résumé) : enregistrements à la file.
  let file = Promise.resolve();
  suivreConsommation((modele, entree, sortie) => {
    file = file.then(async () => {
      const c = (await lireValeur<Consommation>(CLE)) ?? {};
      const m = (c[mois()] ??= {});
      const x = (m[modele] ??= { appels: 0, entree: 0, sortie: 0 });
      x.appels++;
      x.entree += entree;
      x.sortie += sortie;
      await ecrireValeur(CLE, c);
    });
  });
}

/** Coût estimé (dollars) et nombre d'appels d'un mois. */
export function bilan(c: Consommation, m: string): { dollars: number; appels: number } {
  let dollars = 0;
  let appels = 0;
  for (const [modele, x] of Object.entries(c[m] ?? {}) as [Modele, Compte][]) {
    dollars += (x.entree * MODELES[modele].entree + x.sortie * MODELES[modele].sortie) / 1e6;
    appels += x.appels;
  }
  return { dollars, appels };
}

export const lireConsommation = async () => (await lireValeur<Consommation>(CLE)) ?? {};
export { mois as moisDe };
