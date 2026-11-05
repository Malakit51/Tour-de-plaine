// Service worker : il rend l'appli installable et l'ouvre sans réseau, au champ.
// La page vient d'Internet quand il y en a (version à jour), sinon de la copie gardée sur le
// téléphone. Les fichiers de l'appli (assets/, nommés d'après leur contenu) ne changent jamais :
// la copie gardée sert directement.
const CACHE = 'tour-de-plaine';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

async function depuisReseau(requete) {
  const cache = await caches.open(CACHE);
  try {
    const reponse = await fetch(requete);
    if (reponse.ok) await cache.put(requete, reponse.clone());
    return reponse;
  } catch (erreur) {
    const gardee = await cache.match(requete, { ignoreSearch: true, ignoreVary: true });
    if (gardee) return gardee;
    throw erreur;
  }
}

async function depuisCache(requete) {
  // ignoreVary : la page a gardé le fichier sans l'en-tête Origin qu'envoie un module.
  const gardee = await caches.match(requete, { ignoreVary: true });
  return gardee || depuisReseau(requete);
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (e.request.mode === 'navigate') {
    // Toujours la page de l'appli (l'adresse après # ne compte pas).
    e.respondWith(depuisReseau(new Request(new URL('./', self.registration.scope).href)));
  } else if (url.pathname.includes('/assets/')) {
    e.respondWith(depuisCache(e.request));
  } else {
    e.respondWith(depuisReseau(e.request));
  }
});
