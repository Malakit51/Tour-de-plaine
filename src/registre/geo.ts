// Où suis-je ? Position GPS comparée aux contours de Jalon (calcul à plat, suffisant à l'échelle
// d'une exploitation).

import type { ContourJalon } from './modele';

type LatLon = [number, number];
const R = 6371000;

/** Coordonnées en mètres autour d'un point de référence. */
function versPlan(origine: LatLon): (p: LatLon) => [number, number] {
  const k = Math.cos((origine[0] * Math.PI) / 180);
  return ([lat, lon]) => [
    (((lon - origine[1]) * Math.PI) / 180) * R * k,
    (((lat - origine[0]) * Math.PI) / 180) * R,
  ];
}

function dansAnneau(x: number, y: number, pts: [number, number][]): boolean {
  let dedans = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]!;
    const [xj, yj] = pts[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dedans = !dedans;
  }
  return dedans;
}

function distanceSegment(x: number, y: number, a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l2)) : 0;
  return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
}

/** Distance en mètres entre la position et la parcelle (0 si on est dedans). */
export function distanceParcelle(position: LatLon, contour: ContourJalon): number {
  const plan = versPlan(position);
  const dedansExclu = contour.exclus.some((a) => dansAnneau(0, 0, a.map(plan)));
  let d = Infinity;
  for (const anneau of contour.exterieurs) {
    const pts = anneau.map(plan);
    if (pts.length < 3) continue;
    if (dansAnneau(0, 0, pts) && !dedansExclu) return 0;
    for (let i = 0; i < pts.length; i++) {
      d = Math.min(d, distanceSegment(0, 0, pts[i]!, pts[(i + 1) % pts.length]!));
    }
  }
  return d;
}

/** Contour dessiné dans un carré de `taille` (SVG), la position en plus si elle est proche. */
export function dessinContour(
  contour: ContourJalon,
  taille: number,
  position?: LatLon | null,
): { chemins: string[]; exclus: string[]; position: [number, number] | null } {
  const tous = contour.exterieurs.flat();
  const lat0 = tous.reduce((s, p) => s + p[0], 0) / tous.length;
  const lon0 = tous.reduce((s, p) => s + p[1], 0) / tous.length;
  const plan = versPlan([lat0, lon0]);
  const xy = tous.map(plan);
  let minX = Math.min(...xy.map((p) => p[0]));
  let maxX = Math.max(...xy.map((p) => p[0]));
  let minY = Math.min(...xy.map((p) => p[1]));
  let maxY = Math.max(...xy.map((p) => p[1]));
  // La position n'est montrée que si elle est à moins de 300 m : le dessin reste lisible.
  let pos: [number, number] | null = null;
  if (position && distanceParcelle(position, contour) < 300) {
    pos = plan(position);
    [minX, maxX] = [Math.min(minX, pos[0]), Math.max(maxX, pos[0])];
    [minY, maxY] = [Math.min(minY, pos[1]), Math.max(maxY, pos[1])];
  }
  const marge = taille * 0.06;
  const echelle = (taille - 2 * marge) / Math.max(maxX - minX, maxY - minY, 1);
  const decX = (taille - (maxX - minX) * echelle) / 2;
  const decY = (taille - (maxY - minY) * echelle) / 2;
  const ecran = ([x, y]: [number, number]): [number, number] => [
    Math.round((decX + (x - minX) * echelle) * 10) / 10,
    Math.round((taille - decY - (y - minY) * echelle) * 10) / 10,
  ];
  const chemin = (anneau: LatLon[]) =>
    'M' +
    anneau
      .map(plan)
      .map(ecran)
      .map(([x, y]) => `${x} ${y}`)
      .join('L') +
    'Z';
  return {
    chemins: contour.exterieurs.map(chemin),
    exclus: contour.exclus.map(chemin),
    position: pos ? ecran(pos) : null,
  };
}
