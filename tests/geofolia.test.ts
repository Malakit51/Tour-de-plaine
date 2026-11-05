import { describe, expect, it } from 'vitest';
import { lireGeofolia } from '../src/sources/geofolia';

// Export fictif, construit comme celui de Geofolia (seuls les champs lus).
const champ = (Id: string, Name: string, Area: number, extra = {}) => ({
  Id,
  Name,
  HarvestYear: 2027,
  Area,
  CropName: 'Colza',
  VarietyName: 'Exemple',
  City: 'Village',
  SoilName: 'Craie',
  FarmIdentificationCode: '1',
  NMinus1Crop: 'Blé',
  NMinus2Crop: null,
  ...extra,
});
const field = {
  Information: { ExportDate: '2026-10-22T20:10:04Z' },
  Fields: [
    champ('a', '10 Haut', 120000),
    champ('b', '11 Bas', 80000),
    champ('c', 'Morceaux', 30000),
    champ('d', 'Morceaux', 20000),
    champ('z', '10 Haut', 1, { HarvestYear: 2026 }),
  ],
};
const action = {
  Activities: [
    {
      ActionId: 't1',
      HarvestYear: 2027,
      StartingDate: '2026-09-16T00:00:00',
      StatusName: 'Réalisée',
      OperationCategory: 'Traitement',
      OperationName: 'Traitement phytosanitaire',
      Comment: null,
      CropZoneIds: [
        { PlotId: 'a', WorkedSurface: 120000, PlotActionOrder: 0 },
        { PlotId: 'b', WorkedSurface: 80000, PlotActionOrder: 1 },
      ],
      // Geofolia répartit chaque produit entre les parcelles au prorata de la surface.
      ProductIds: [
        { SupplyName: 'Herbicide', Quantity: 6, ReferentialUnitSymbol: 'L' },
        { SupplyName: 'Herbicide', Quantity: 4, ReferentialUnitSymbol: 'L' },
      ],
      ActionEquipments: [{ EquipmentName: 'Pulvé' }, { EquipmentName: 'Pulvé' }],
    },
    {
      ActionId: 's1',
      HarvestYear: 2027,
      StartingDate: '2026-08-30T00:00:00',
      StatusName: 'Plan de fumure',
      OperationCategory: 'Fertilisation',
      OperationName: 'Fertilisation minérale P K Mg',
      CropZoneIds: [{ PlotId: 'c', WorkedSurface: 30000 }],
      ProductIds: '',
    },
    {
      ActionId: 'x',
      HarvestYear: 2027,
      StartingDate: '2026-08-01T00:00:00',
      StatusName: 'Prévisionnelle',
      OperationCategory: 'Autre',
      CropZoneIds: [{ PlotId: 'inconnue', WorkedSurface: 1 }],
    },
  ],
};

describe('lecture Geofolia', () => {
  const [imp, ancien] = lireGeofolia(field, action, new Date('2026-10-29T10:00:00Z'));

  it('une entrée par campagne, la plus récente d’abord', () => {
    expect(imp!.campagne).toBe(2027);
    expect(ancien!.campagne).toBe(2026);
    expect(imp!.exporteLe).toBe('2026-10-22T20:10:04Z');
  });

  it('regroupe les morceaux de même nom', () => {
    expect(imp!.parcelles.map((p) => p.nom)).toEqual(['10 Haut', '11 Bas', 'Morceaux']);
    const m = imp!.parcelles.find((p) => p.nom === 'Morceaux')!;
    expect(m.surfaceHa).toBe(5);
    expect(m.morceaux).toBe(2);
    expect(imp!.parcelles[0]!.precedents).toEqual(['Blé', '', '', '', '']);
  });

  it('calcule la dose par hectare travaillé', () => {
    const t = imp!.interventions.find((i) => i.id === 't1')!;
    expect(t.statut).toBe('realisee');
    expect(t.parcelles).toEqual([
      { nom: '10 Haut', surfaceHa: 12 },
      { nom: '11 Bas', surfaceHa: 8 },
    ]);
    expect(t.produits).toEqual([{ nom: 'Herbicide', quantite: 10, unite: 'L', dose: 0.5 }]);
    expect(t.materiel).toEqual(['Pulvé']);
  });

  it('garde le statut, écarte les interventions sans parcelle connue', () => {
    expect(imp!.interventions.map((i) => [i.id, i.statut])).toEqual([
      ['s1', 'plan'],
      ['t1', 'realisee'],
    ]);
  });

  it('refuse un fichier sans parcelles', () => {
    expect(() => lireGeofolia({}, {})).toThrow(/parcelles/);
  });
});
