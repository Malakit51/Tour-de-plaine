import { describe, expect, it } from 'vitest';
import { noter } from '../src/agro/habitudes';
import { cleConstats, cleStades, listeDOrigine, pastillesDe } from '../src/agro/pastilles';

describe('pastilles modifiables', () => {
  const cle = cleConstats('Adventice', 'cereale');

  it('sans modification : la liste de l’appli, plus les constats tapés à la main', () => {
    const h = noter({}, cle, ['Folle-avoine', 'Pâturin']);
    const p = pastillesDe({}, h, cle);
    expect(p[0]).toBe('Folle-avoine'); // la plus utilisée en tête
    expect(p).toContain('Vulpin');
    expect(p).toContain('Pâturin');
    expect(pastillesDe({}, {}, cleStades('colza'))).toEqual(listeDOrigine(cleStades('colza')));
  });

  it('liste modifiée : elle seule, sans revenir aux pastilles retirées', () => {
    const h = noter({}, cle, ['Gaillet', 'Pâturin']);
    const p = pastillesDe({ [cle]: ['Vulpin', 'Ray-grass', 'Gaillet'] }, h, cle);
    expect(p).toEqual(['Gaillet', 'Vulpin', 'Ray-grass']);
  });

  it('retrouve la liste de l’appli pour chaque culture', () => {
    expect(listeDOrigine(cleConstats('Ravageur', 'colza'))).toContain('Grosses altises');
    expect(listeDOrigine(cleStades('cereale'))).toContain('Épi 1 cm');
  });
});
