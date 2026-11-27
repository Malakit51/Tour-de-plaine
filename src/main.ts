// Tour de plaine : carnet des observations et des interventions de chaque parcelle.

import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './style.css';
import { demanderStockageDurable } from './registre/base';
import { message } from './app/commun';
import { compterConsommation } from './app/consommation';
import { charger, enregistrerJalon, etat } from './app/etat';
import { ecouterInstallation } from './app/installation';
import { afficher } from './app/navigation';
import { nettoyerPhotos } from './app/photos';
import { initialiserGps } from './app/position';
import { contoursDeJalonIci } from './app/reglages';
import { appliquerTheme } from './app/theme';

/** Contours de Jalon à jour : repris tout seuls si Jalon a été modifié sur ce téléphone. */
async function suivreJalon(): Promise<void> {
  if (etat.jalon?.source === 'fichier') return;
  try {
    const ici = contoursDeJalonIci();
    if (ici && (!etat.jalon || ici.date > etat.jalon.date)) await enregistrerJalon(ici);
  } catch {
    // session de Jalon illisible : on garde les contours déjà repris
  }
}

/** Garde la page et ses fichiers pour ouvrir l'appli sans réseau (voir public/sw.js). */
async function garderHorsReseau(): Promise<void> {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  await navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' });
  const fichiers = performance
    .getEntriesByType('resource')
    .map((r) => r.name)
    .filter((u) => u.startsWith(location.origin + location.pathname.replace(/[^/]*$/, '')));
  const cache = await caches.open('tour-de-plaine');
  await cache
    .addAll([new URL('./', location.href).href, ...new Set(fichiers)])
    .catch(() => undefined);
}

let pret = false;
// Tout de suite : Chrome peut proposer l'installation avant que les données soient chargées.
ecouterInstallation(() => pret && afficher());

async function demarrer(): Promise<void> {
  appliquerTheme();
  // Première page de l'appli : marquée, pour que « Retour » n'en sorte pas (voir revenir()).
  history.replaceState('premier', '', location.hash || '#plaine');
  try {
    await charger();
  } catch {
    document.getElementById('app')!.textContent =
      'Le stockage du téléphone est inaccessible (navigation privée ?) : l’appli ne peut pas garder tes notes.';
    return;
  }
  await suivreJalon();
  compterConsommation();
  initialiserGps();
  addEventListener('hashchange', () => {
    // Lecture du résumé en cours : elle s'arrête quand on change d'écran.
    if (!location.hash.startsWith('#journal')) window.speechSynthesis?.cancel();
    afficher();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden)
      void suivreJalon().then(
        () =>
          !location.hash.startsWith('#noter') && !location.hash.startsWith('#note/') && afficher(),
      );
  });
  afficher();
  pret = true;
  void demanderStockageDurable();
  void nettoyerPhotos(etat.notes);
  void garderHorsReseau().catch(() => undefined);
}

// Appli restée ouverte pendant une mise à jour : un fichier de l'ancienne version manque en ligne.
// On recharge une fois (la nouvelle version arrive), au lieu d'afficher une erreur.
addEventListener('vite:preloadError', (e) => {
  try {
    if (sessionStorage.getItem('tour-de-plaine/recharge')) return;
    sessionStorage.setItem('tour-de-plaine/recharge', '1');
  } catch {
    return;
  }
  e.preventDefault();
  location.reload();
});
addEventListener('load', () =>
  setTimeout(() => {
    try {
      sessionStorage.removeItem('tour-de-plaine/recharge');
    } catch {
      // pas de stockage : tant pis
    }
  }, 10000),
);
addEventListener('unhandledrejection', (e) =>
  message(String((e.reason as Error)?.message ?? e.reason), true),
);
void demarrer();
