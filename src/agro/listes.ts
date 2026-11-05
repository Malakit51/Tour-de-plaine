// Pastilles proposées à la saisie : stades et constats selon la culture. Les choix faits souvent
// remontent en tête (voir habitudes.ts), et un constat tapé à la main est gardé pour la suite.

import type { Gravite, TypeNote } from '../registre/modele';

export type Groupe =
  'cereale' | 'colza' | 'betterave' | 'mais' | 'oeillette' | 'luzerne' | 'proteagineux' | 'autre';

export function groupe(culture: string): Groupe {
  const c = culture
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (/ble|orge|escourgeon|seigle|avoine|triticale|epeautre/.test(c)) return 'cereale';
  if (/colza/.test(c)) return 'colza';
  if (/better/.test(c)) return 'betterave';
  if (/mais/.test(c)) return 'mais';
  if (/oeillette|pavot/.test(c)) return 'oeillette';
  if (/luzerne/.test(c)) return 'luzerne';
  if (/pois|feverole|lentille|soja/.test(c)) return 'proteagineux';
  return 'autre';
}

export const TYPES: TypeNote[] = ['Observation', 'Semis', 'Traitement', 'Fertilisation', 'Autre'];
export const GRAVITES: Gravite[] = ['Faible', 'À surveiller', 'Intervenir'];
export const CATEGORIES = [
  'Maladie',
  'Ravageur',
  'Adventice',
  'Peuplement',
  'Sol',
  'État général',
] as const;
export type Categorie = (typeof CATEGORIES)[number];

export const STADES: Record<Groupe, string[]> = {
  cereale: [
    'Levée',
    '1 feuille',
    '3 feuilles',
    'Début tallage',
    'Plein tallage',
    'Épi 1 cm',
    '1 nœud',
    '2 nœuds',
    'Dernière feuille',
    'Gonflement',
    'Épiaison',
    'Floraison',
    'Grain laiteux',
    'Maturité',
  ],
  colza: [
    'Levée',
    '2 feuilles',
    '4 feuilles',
    '6 feuilles',
    'Rosette',
    'Reprise',
    'Boutons accolés',
    'Boutons séparés',
    'Floraison',
    'Chute des pétales',
    'Maturité',
  ],
  betterave: ['Levée', '2 feuilles', '4 feuilles', '6-8 feuilles', 'Couverture', 'Récolte'],
  mais: [
    'Levée',
    '4 feuilles',
    '6 feuilles',
    '8-10 feuilles',
    'Floraison',
    'Grain laiteux',
    'Maturité',
  ],
  oeillette: ['Levée', 'Rosette', 'Élongation', 'Boutons', 'Floraison', 'Capsules', 'Maturité'],
  luzerne: ['Repousse', 'Végétatif', 'Bourgeonnement', 'Floraison', 'Coupe'],
  proteagineux: ['Levée', '3 feuilles', '6 feuilles', 'Floraison', 'Gousses', 'Maturité'],
  autre: ['Levée', 'Végétatif', 'Floraison', 'Maturité'],
};

const MALADIES: Record<Groupe, string[]> = {
  cereale: [
    'Septoriose',
    'Rouille jaune',
    'Rouille brune',
    'Oïdium',
    'Helminthosporiose',
    'Rhynchosporiose',
    'Piétin-verse',
    'Fusariose',
    'JNO',
  ],
  colza: ['Phoma', 'Sclérotinia', 'Cylindrosporiose', 'Oïdium', 'Alternaria'],
  betterave: ['Cercosporiose', 'Oïdium', 'Rouille', 'Ramulariose', 'Jaunisse'],
  mais: ['Helminthosporiose', 'Charbon', 'Fusariose'],
  oeillette: ['Mildiou', 'Helminthosporiose', 'Oïdium'],
  luzerne: ['Verticilliose', 'Anthracnose'],
  proteagineux: ['Anthracnose', 'Botrytis', 'Rouille', 'Mildiou'],
  autre: ['Oïdium', 'Rouille'],
};

const RAVAGEURS: Record<Groupe, string[]> = {
  cereale: [
    'Pucerons',
    'Cicadelles',
    'Limaces',
    'Zabre',
    'Mouche grise',
    'Criocères',
    'Cécidomyies',
  ],
  colza: [
    'Grosses altises',
    'Petites altises',
    'Charançon du bourgeon terminal',
    'Charançon de la tige',
    'Méligèthes',
    'Pucerons cendrés',
    'Limaces',
  ],
  betterave: ['Pucerons verts', 'Atomaires', 'Pégomyies', 'Teignes', 'Noctuelles', 'Limaces'],
  mais: ['Taupins', 'Pyrale', 'Corvidés', 'Limaces'],
  oeillette: ['Charançon', 'Pucerons', 'Limaces'],
  luzerne: ['Sitones', 'Apions', 'Campagnols'],
  proteagineux: ['Sitones', 'Pucerons verts', 'Bruches', 'Tordeuses'],
  autre: ['Pucerons', 'Limaces'],
};

const ADVENTICES = [
  'Vulpin',
  'Ray-grass',
  'Brome',
  'Folle-avoine',
  'Gaillet',
  'Coquelicot',
  'Matricaire',
  'Chardon',
  'Chénopode',
  'Renouée',
  'Repousses de colza',
  'Repousses de céréales',
];

const COMMUNS: Record<Exclude<Categorie, 'Maladie' | 'Ravageur' | 'Adventice'>, string[]> = {
  Peuplement: [
    'Levée irrégulière',
    'Manques',
    'Densité faible',
    'Densité forte',
    'Dégâts de gibier',
  ],
  Sol: ['Battance', 'Excès d’eau', 'Tassement', 'Érosion', 'Sec'],
  'État général': ['Bon', 'Moyen', 'Faible', 'Faim d’azote', 'Carence soufre', 'Gel', 'Verse'],
};

/** Constats proposés pour une catégorie et une culture, avant les habitudes. */
export function constatsProposes(categorie: string, culture: string): string[] {
  const g = groupe(culture);
  if (categorie === 'Maladie') return MALADIES[g];
  if (categorie === 'Ravageur') return RAVAGEURS[g];
  if (categorie === 'Adventice') return ADVENTICES;
  return COMMUNS[categorie as keyof typeof COMMUNS] ?? [];
}

/** Délais proposés pour repasser voir (jours). */
export const DELAIS_REVOIR = [3, 7, 10, 15];
