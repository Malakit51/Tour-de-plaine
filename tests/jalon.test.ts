import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contoursFichier, contoursSession } from '../src/sources/jalon';

const xml = readFileSync('tests/fixtures/jalon-exemple.xml', 'utf8');

describe('contours de Jalon', () => {
  it('lit un TASKDATA.XML : contour extérieur et zone exclue, anneaux ouverts', () => {
    const c = contoursFichier(xml);
    const p = c.find((x) => x.nom === '10 Est & Ouest')!;
    expect(p.exterieurs).toHaveLength(1);
    expect(p.exterieurs[0]).toHaveLength(4);
    expect(p.exclus).toHaveLength(1);
    expect(c.map((x) => x.nom)).toContain('11voisin');
  });

  it('lit la session de Jalon : points modifiés, renommage, parcelle retirée ou créée', () => {
    const session = {
      version: 1,
      enregistreLe: '2026-10-20T08:00:00Z',
      fichier: { nom: 'TASKDATA.XML', texte: xml },
      anneaux: [
        {
          parcelle: 0,
          anneau: 0,
          sommets: [
            [45, 2, 0],
            [45, 2.1, 1],
            [45.1, 2.1, 2],
          ],
        },
        {
          parcelle: 0,
          anneau: 1,
          sommets: [
            [45.01, 2.01, 0],
            [45.01, 2.02, 1],
            [45.02, 2.02, 2],
          ],
        },
        {
          parcelle: 1,
          anneau: 0,
          sommets: [
            [46, 3, 0],
            [46, 3.1, 1],
            [46.1, 3.1, 2],
          ],
        },
        {
          parcelle: 9,
          anneau: -1,
          type: 1,
          sommets: [
            [47, 4, null],
            [47, 4.1, null],
            [47.1, 4.1, null],
          ],
        },
      ],
      noms: [{ parcelle: 0, nom: '10 Est' }],
      supprimees: [1],
      zonesRetirees: [1],
      ajoutees: [{ parcelle: 9, nom: 'Nouvelle' }],
    };
    const { date, contours } = contoursSession(session);
    expect(date).toBe('2026-10-20T08:00:00Z');
    expect(contours.map((c) => c.nom)).toEqual(['10 Est', 'Nouvelle']);
    expect(contours[0]!.exterieurs[0]![1]).toEqual([45, 2.1]);
    expect(contours[0]!.exclus).toHaveLength(0);
  });

  it('refuse une session illisible', () => {
    expect(() => contoursSession({ version: 2 })).toThrow();
  });
});
