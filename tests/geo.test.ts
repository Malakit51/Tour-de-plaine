import { describe, expect, it } from 'vitest';
import { dessinContour, distanceParcelle } from '../src/registre/geo';
import type { ContourJalon } from '../src/registre/modele';

// Carré d'environ 222 m de côté (0,002° de latitude), avec un trou au milieu.
const carre: ContourJalon = {
  nom: 'Carré',
  exterieurs: [
    [
      [49, 4],
      [49, 4.003],
      [49.002, 4.003],
      [49.002, 4],
    ],
  ],
  exclus: [
    [
      [49.0009, 4.0014],
      [49.0009, 4.0016],
      [49.0011, 4.0016],
      [49.0011, 4.0014],
    ],
  ],
};

describe('position et parcelles', () => {
  it('0 dans la parcelle, distance au bord dehors', () => {
    expect(distanceParcelle([49.0005, 4.0005], carre)).toBe(0);
    const d = distanceParcelle([49.003, 4.0015], carre);
    expect(d).toBeGreaterThan(105);
    expect(d).toBeLessThan(118);
  });

  it('dans une zone exclue, on n’est pas dans la parcelle', () => {
    expect(distanceParcelle([49.001, 4.0015], carre)).toBeGreaterThan(0);
  });

  it('dessine le contour dans le carré demandé', () => {
    const d = dessinContour(carre, 100, [49.0005, 4.0005]);
    expect(d.chemins).toHaveLength(1);
    expect(d.position![0]).toBeGreaterThan(0);
    expect(d.position![0]).toBeLessThan(100);
    expect(dessinContour(carre, 100, [50, 5]).position).toBeNull();
  });
});
