import { describe, expect, it } from 'vitest';
import { noter, ordonner } from '../src/agro/habitudes';
import { constatsProposes, groupe } from '../src/agro/listes';

describe('pastilles', () => {
  it('reconnaît le groupe de culture', () => {
    expect(groupe('Blé')).toBe('cereale');
    expect(groupe('Escourgeon')).toBe('cereale');
    expect(groupe('Betteraves')).toBe('betterave');
    expect(groupe('Oeillette')).toBe('oeillette');
    expect(groupe('Mais')).toBe('mais');
    expect(constatsProposes('Ravageur', 'Colza')).toContain('Grosses altises');
  });

  it('les plus utilisées remontent, les ajoutées s’ajoutent', () => {
    let h = noter({}, 'Ravageur|colza', ['Méligèthes']);
    h = noter(h, 'Ravageur|colza', ['Méligèthes', 'Tenthrède']);
    const o = ordonner(h, 'Ravageur|colza', ['Grosses altises', 'Méligèthes']);
    expect(o).toEqual(['Méligèthes', 'Tenthrède', 'Grosses altises']);
  });
});
