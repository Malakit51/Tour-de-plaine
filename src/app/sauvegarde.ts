// Sauvegarde dans un fichier : tout ce que l'appli garde (notes, photos, imports, contours,
// correspondances, habitudes), pour changer de téléphone ou ne rien perdre.

import * as base from '../registre/base';
import { CLE_API } from './etat';
import type { Note } from '../registre/modele';

const FORMAT = 'tour-de-plaine';

interface FichierSauvegarde {
  format: typeof FORMAT;
  version: 1;
  enregistreLe: string;
  valeurs: Record<string, unknown>;
  notes: Note[];
  photos: { id: string; type: string; base64: string }[];
}

async function versBase64(b: Blob): Promise<string> {
  const octets = new Uint8Array(await b.arrayBuffer());
  let binaire = '';
  for (let i = 0; i < octets.length; i += 0x8000) {
    binaire += String.fromCharCode(...octets.subarray(i, i + 0x8000));
  }
  return btoa(binaire);
}

function depuisBase64(s: string, type: string): Blob {
  const binaire = atob(s);
  const octets = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
  return new Blob([octets], { type });
}

export async function fabriquerSauvegarde(maintenant = new Date()): Promise<Blob> {
  const valeurs: Record<string, unknown> = {};
  // La clé de l'API reste sur le téléphone : un fichier de sauvegarde se partage (Drive, mail).
  for (const cle of await base.clesValeurs())
    if (cle !== CLE_API) valeurs[cle] = await base.lireValeur(cle);
  const photos = [];
  for (const id of await base.clesPhotos()) {
    const p = await base.lirePhoto(id);
    if (p)
      photos.push({ id, type: p.image.type || 'image/jpeg', base64: await versBase64(p.image) });
  }
  const s: FichierSauvegarde = {
    format: FORMAT,
    version: 1,
    enregistreLe: maintenant.toISOString(),
    valeurs,
    notes: await base.toutesLesNotes(),
    photos,
  };
  return new Blob([JSON.stringify(s)], { type: 'application/json' });
}

/**
 * Reprend une sauvegarde : ses notes et photos s'ajoutent à celles du téléphone (une note de même
 * identifiant est remplacée par la plus récemment modifiée) ; ses valeurs remplacent les autres.
 */
export async function reprendreSauvegarde(
  texte: string,
): Promise<{ notes: number; photos: number }> {
  let s: FichierSauvegarde;
  try {
    s = JSON.parse(texte) as FichierSauvegarde;
  } catch {
    throw new Error('Ce fichier n’est pas une sauvegarde de Tour de plaine.');
  }
  if (s?.format !== FORMAT || s.version !== 1 || !Array.isArray(s.notes)) {
    throw new Error('Ce fichier n’est pas une sauvegarde de Tour de plaine.');
  }
  for (const [cle, v] of Object.entries(s.valeurs ?? {}))
    if (cle !== CLE_API) await base.ecrireValeur(cle, v);
  const actuelles = new Map((await base.toutesLesNotes()).map((n) => [n.id, n]));
  let notes = 0;
  for (const n of s.notes) {
    const a = actuelles.get(n.id);
    if (a && a.modifieLe >= n.modifieLe) continue;
    await base.ecrireNote(n);
    notes++;
  }
  for (const p of s.photos ?? [])
    await base.ecrirePhoto({ id: p.id, image: depuisBase64(p.base64, p.type) });
  return { notes, photos: s.photos?.length ?? 0 };
}
