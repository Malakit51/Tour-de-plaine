import { describe, expect, it } from 'vitest';
import { doublonsPossibles, semisRealise } from '../src/app/resume';
import type { Intervention } from '../src/registre/modele';

const inter = (id: string, date: string, extra: Partial<Intervention> = {}): Intervention => ({
  id,
  date,
  statut: 'realisee',
  categorie: 'Traitement',
  operation: 'Traitement phytosanitaire',
  parcelles: [{ nom: 'A', surfaceHa: 10 }],
  produits: [{ nom: 'Kalea', quantite: 10, unite: 'L', dose: 1 }],
  materiel: [],
  commentaire: '',
  ...extra,
});

describe('résumés', () => {
  it('signale une intervention répétée à quelques jours près', () => {
    const d = doublonsPossibles([
      inter('a', '2026-09-16'),
      inter('b', '2026-09-17'),
      inter('c', '2026-09-29'),
      inter('d', '2026-09-17', {
        produits: [{ nom: 'Kalea', quantite: 5, unite: 'L', dose: 0.5 }],
      }),
    ]);
    expect([...d]).toEqual(['b']);
  });

  it('trouve le semis de la culture, pas celui du couvert', () => {
    const s = semisRealise([
      inter('s', '2026-10-07', { categorie: 'Semis/Plantation', operation: 'Semis céréales' }),
      inter('c', '2026-10-09', { categorie: 'Semis/Plantation', operation: 'Semis cipan' }),
    ]);
    expect(s?.id).toBe('s');
  });
});
