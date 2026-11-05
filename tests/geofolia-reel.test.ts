// Contrôle sur un vrai export Geofolia, s'il est rangé dans donnees_locales/ (jamais committé).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lireZipGeofolia } from '../src/sources/geofolia';

const dossier = 'donnees_locales';
const zips = existsSync(dossier) ? readdirSync(dossier).filter((f) => f.endsWith('.zip')) : [];

describe.skipIf(zips.length === 0)('export Geofolia réel', () => {
  it.each(zips)('%s se lit', async (nom) => {
    const imports = await lireZipGeofolia(new Uint8Array(readFileSync(`${dossier}/${nom}`)));
    expect(imports.length).toBeGreaterThan(0);
    for (const i of imports) {
      expect(i.parcelles.length).toBeGreaterThan(0);
      for (const it of i.interventions) {
        for (const p of it.parcelles) expect(i.parcelles.some((q) => q.nom === p.nom)).toBe(true);
      }
      if (process.env.MONTRER) {
        console.log(
          i.campagne,
          i.parcelles.length,
          'parcelles',
          i.interventions.length,
          'interventions',
        );
        for (const it of i.interventions.filter((x) => x.categorie === 'Traitement'))
          console.log(JSON.stringify(it));
        console.log(JSON.stringify(i.parcelles.slice(0, 2)));
      }
    }
  });
});
