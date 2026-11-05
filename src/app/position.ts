// Position GPS : suivie tant que l'appli est à l'écran, une fois le GPS autorisé. Elle sert à
// trouver la parcelle où l'on est et à ranger la liste par distance.

import { distanceParcelle } from '../registre/geo';
import { changerReglages, contourDe, etat, parcelles } from './etat';

let suivi: number | null = null;
const abonnes = new Set<() => void>();

/** Appelé à chaque nouvelle position. */
export function surPosition(f: () => void): () => void {
  abonnes.add(f);
  return () => abonnes.delete(f);
}

function demarrer(): void {
  if (suivi !== null || !('geolocation' in navigator)) return;
  suivi = navigator.geolocation.watchPosition(
    (p) => {
      etat.position = {
        latLon: [p.coords.latitude, p.coords.longitude],
        precision: p.coords.accuracy,
      };
      for (const f of abonnes) f();
    },
    () => {
      /* refus ou pas de signal : la liste reste dans l'ordre des noms */
    },
    { enableHighAccuracy: true, maximumAge: 15000, timeout: 30000 },
  );
}

function arreter(): void {
  if (suivi !== null) navigator.geolocation.clearWatch(suivi);
  suivi = null;
}

/** Premier toucher sur « Me situer » : le téléphone demande l'autorisation. */
export async function activerGps(): Promise<void> {
  await changerReglages({ gps: true });
  demarrer();
}

/** Au démarrage : reprend le suivi s'il avait été autorisé ; s'arrête quand l'appli est cachée. */
export function initialiserGps(): void {
  if (etat.reglages.gps) demarrer();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) arreter();
    else if (etat.reglages.gps) demarrer();
  });
}

/** Distance à chaque parcelle qui a un contour (m), la plus proche d'abord. */
export function parcellesProches(): { nom: string; distance: number }[] {
  const pos = etat.position?.latLon;
  if (!pos) return [];
  return parcelles()
    .flatMap((p) => {
      const c = contourDe(p.nom);
      return c ? [{ nom: p.nom, distance: distanceParcelle(pos, c) }] : [];
    })
    .sort((a, b) => a.distance - b.distance);
}

/** Parcelle où l'on se trouve (à la précision du GPS près), sinon null. */
export function parcelleIci(): string | null {
  const proche = parcellesProches()[0];
  const tolerance = Math.min(etat.position?.precision ?? 0, 25);
  return proche && proche.distance <= tolerance ? proche.nom : null;
}

export function distanceLisible(m: number): string {
  if (m === 0) return 'ici';
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  return `${(m / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`;
}
