import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { fabriquerSauvegarde, reprendreSauvegarde } from '../src/app/sauvegarde';
import * as base from '../src/registre/base';
import type { Note } from '../src/registre/modele';

const note = (id: string, modifieLe: string, texte: string): Note => ({
  id,
  parcelle: '31berl',
  date: '2026-10-29T15:42',
  type: 'Observation',
  stade: '6 feuilles',
  categorie: 'Ravageur',
  constats: ['Grosses altises'],
  gravite: 'À surveiller',
  aRevoir: '2026-11-05',
  revu: false,
  texte,
  photos: ['p1'],
  creeLe: modifieLe,
  modifieLe,
});

describe('sauvegarde dans un fichier', () => {
  it('rend les notes, les photos et les réglages, sans écraser une note plus récente', async () => {
    await base.ecrireNote(note('n1', '2026-10-29T10:00:00Z', 'ancienne'));
    await base.ecrirePhoto({
      id: 'p1',
      image: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }),
    });
    await base.ecrireValeur('choix-contours', { '31berl': '31 Berl' });
    const fichier = await (await fabriquerSauvegarde()).text();

    await base.ecrireNote(note('n1', '2026-10-30T10:00:00Z', 'plus récente'));
    await base.effacerPhoto('p1');
    await base.ecrireValeur('choix-contours', {});
    const r = await reprendreSauvegarde(fichier);

    expect(r).toEqual({ notes: 0, photos: 1 });
    expect((await base.toutesLesNotes())[0]!.texte).toBe('plus récente');
    const photo = await base.lirePhoto('p1');
    expect([...new Uint8Array(await photo!.image.arrayBuffer())]).toEqual([1, 2, 3]);
    expect(await base.lireValeur('choix-contours')).toEqual({ '31berl': '31 Berl' });
  });

  it('refuse un autre fichier', async () => {
    await expect(reprendreSauvegarde('{"format":"autre"}')).rejects.toThrow(/sauvegarde/);
    await expect(reprendreSauvegarde('pas du json')).rejects.toThrow(/sauvegarde/);
  });
});
