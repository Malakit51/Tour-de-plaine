// Stockage sur le téléphone (IndexedDB) : les notes, les photos, et des valeurs nommées (imports
// Geofolia, contours de Jalon, correspondances, réglages).

import type { Note } from './modele';

const NOM = 'tour-de-plaine';
const VERSION = 1;

export interface Photo {
  id: string;
  /** Photo réduite (JPEG). */
  image: Blob;
}

let ouverture: Promise<IDBDatabase> | null = null;

function base(): Promise<IDBDatabase> {
  ouverture ??= new Promise((resoudre, rejeter) => {
    const r = indexedDB.open(NOM, VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('valeurs')) db.createObjectStore('valeurs');
      if (!db.objectStoreNames.contains('notes')) db.createObjectStore('notes', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('photos'))
        db.createObjectStore('photos', { keyPath: 'id' });
    };
    r.onsuccess = () => resoudre(r.result);
    r.onerror = () => rejeter(r.error);
  });
  return ouverture;
}

type Magasin = 'valeurs' | 'notes' | 'photos';

async function requete<T>(
  magasin: Magasin,
  mode: IDBTransactionMode,
  action: (m: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const db = await base();
  return new Promise((resoudre, rejeter) => {
    const t = db.transaction(magasin, mode);
    const r = action(t.objectStore(magasin));
    t.oncomplete = () => resoudre(r.result as T);
    t.onerror = () => rejeter(t.error);
    t.onabort = () => rejeter(t.error);
  });
}

export const lireValeur = <T>(cle: string) =>
  requete<T | undefined>('valeurs', 'readonly', (m) => m.get(cle));
export const ecrireValeur = (cle: string, valeur: unknown) =>
  requete<void>('valeurs', 'readwrite', (m) => m.put(valeur, cle));
export const effacerValeur = (cle: string) =>
  requete<void>('valeurs', 'readwrite', (m) => m.delete(cle));
export const clesValeurs = () =>
  requete<IDBValidKey[]>('valeurs', 'readonly', (m) => m.getAllKeys()).then((c) => c.map(String));

export const toutesLesNotes = () => requete<Note[]>('notes', 'readonly', (m) => m.getAll());
export const ecrireNote = (n: Note) => requete<void>('notes', 'readwrite', (m) => m.put(n));
export const effacerNote = (id: string) => requete<void>('notes', 'readwrite', (m) => m.delete(id));

export const lirePhoto = (id: string) =>
  requete<Photo | undefined>('photos', 'readonly', (m) => m.get(id));
export const ecrirePhoto = (p: Photo) => requete<void>('photos', 'readwrite', (m) => m.put(p));
export const effacerPhoto = (id: string) =>
  requete<void>('photos', 'readwrite', (m) => m.delete(id));
export const clesPhotos = () =>
  requete<IDBValidKey[]>('photos', 'readonly', (m) => m.getAllKeys()).then((c) => c.map(String));
export const toutesLesPhotos = () => requete<Photo[]>('photos', 'readonly', (m) => m.getAll());

/** Demande au navigateur de ne pas effacer les données quand la place manque. */
export async function demanderStockageDurable(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

/** Identifiant unique (notes, photos). */
export function nouvelId(): string {
  return crypto.randomUUID();
}
