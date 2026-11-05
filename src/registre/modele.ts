// Ce que l'appli garde : les parcelles et interventions lues dans Geofolia, les contours repris
// de Jalon, et les notes prises au champ.

/** Parcelle d'une campagne, telle que Geofolia la décrit (morceaux de même nom regroupés). */
export interface Parcelle {
  /** Nom Geofolia (« 022huss », « 030noue /1 ») : c'est la clé de la parcelle dans l'appli. */
  nom: string;
  surfaceHa: number;
  culture: string;
  variete: string;
  /** Cultures des années précédentes, de N-1 à N-5 (vide si inconnue). */
  precedents: string[];
  commune: string;
  sol: string;
  /** SIRET de l'exploitation (le ZIP en contient plusieurs). */
  exploitation: string;
  /** Nombre de morceaux de même nom dans Geofolia. */
  morceaux: number;
}

export type Statut = 'realisee' | 'prevue' | 'plan';

export interface ProduitApplique {
  nom: string;
  /** Quantité totale sur toutes les parcelles de l'intervention. */
  quantite: number;
  unite: string;
  /** Quantité par hectare travaillé. */
  dose: number;
}

/** Intervention Geofolia (semis, traitement, fertilisation, travail du sol…). */
export interface Intervention {
  id: string;
  date: string; // AAAA-MM-JJ
  statut: Statut;
  /** Catégorie Geofolia : « Traitement », « Fertilisation », « Semis/Plantation »… */
  categorie: string;
  /** Opération : « Traitement phytosanitaire », « Semis céréales »… */
  operation: string;
  parcelles: { nom: string; surfaceHa: number }[];
  produits: ProduitApplique[];
  materiel: string[];
  commentaire: string;
}

/** Ce qu'un import Geofolia apporte pour une campagne (remplacé en entier au suivant). */
export interface ImportGeofolia {
  campagne: number;
  /** Date de l'export Geofolia (ISO). */
  exporteLe: string;
  /** Date de l'import dans l'appli (ISO). */
  importeLe: string;
  parcelles: Parcelle[];
  interventions: Intervention[];
}

export type TypeNote = 'Observation' | 'Semis' | 'Traitement' | 'Fertilisation' | 'Autre';
export type Gravite = 'Faible' | 'À surveiller' | 'Intervenir';

/** Note prise au champ. */
export interface Note {
  id: string;
  parcelle: string;
  /** Date et heure de l'observation (ISO local, « 2026-10-29T15:42 »). */
  date: string;
  type: TypeNote;
  stade: string;
  categorie: string;
  /** Ce qui a été vu : « Septoriose », « Grosses altises »… (plusieurs possibles). */
  constats: string[];
  gravite: Gravite | '';
  /** Date à laquelle repasser voir (AAAA-MM-JJ), vide sinon. */
  aRevoir: string;
  /** Rappel traité (« vu ») : la note sort de la liste « À revoir ». */
  revu: boolean;
  texte: string;
  /** Identifiants des photos (rangées à part). */
  photos: string[];
  creeLe: string;
  modifieLe: string;
}

/** Contour d'une parcelle de Jalon : anneau extérieur et zones exclues, en degrés. */
export interface ContourJalon {
  nom: string;
  exterieurs: [number, number][][]; // [lat, lon]
  exclus: [number, number][][];
}

export interface ContoursJalon {
  /** D'où viennent les contours : la session de Jalon sur ce téléphone, ou un TASKDATA.XML. */
  source: 'session' | 'fichier';
  /** Date de la session de Jalon ou de l'import du fichier (ISO). */
  date: string;
  contours: ContourJalon[];
}
