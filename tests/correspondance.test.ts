import { describe, expect, it } from 'vitest';
import { rapprocher, ressemblance } from '../src/registre/correspondance';

describe('rapprochement des noms Geofolia et Jalon', () => {
  it('reconnaît les mêmes parcelles écrites différemment', () => {
    expect(ressemblance('022huss', '22 Huss')).toBeGreaterThan(0);
    expect(ressemblance('140blan', '140 Blanc')).toBeGreaterThan(0);
    expect(ressemblance('Sous le blanc mont', 'Sous le Blanc Mont')).toBeGreaterThan(0);
    expect(ressemblance('030noue /2', '30 Noue')).toBeGreaterThan(0);
  });

  it('ne confond pas deux parcelles voisines', () => {
    expect(ressemblance('022huss', '23 Huss')).toBe(0);
    expect(ressemblance('31berl', '33 Berl')).toBe(0);
    expect(ressemblance('030noue /1', '30 Noue /2')).toBe(0);
  });

  it('propose un contour par parcelle, le choix à la main l’emporte', () => {
    const geofolia = ['022huss', '023huss', '131usag', '030noue /1', 'Inconnue'];
    const jalon = ['22 Huss', '23 Huss', '131usag', '30 Noue', '132usag'];
    const r = rapprocher(geofolia, jalon, { '023huss': '' });
    expect(Object.fromEntries(r)).toEqual({
      '022huss': '22 Huss',
      '131usag': '131usag',
      '030noue /1': '30 Noue',
    });
    expect(rapprocher(['Inconnue'], jalon, { Inconnue: '132usag' }).get('Inconnue')).toBe(
      '132usag',
    );
  });

  it('ne choisit pas entre deux candidats aussi bons', () => {
    expect(rapprocher(['30noue'], ['30 Noue /1', '30 Noue /2']).size).toBe(0);
  });
});
