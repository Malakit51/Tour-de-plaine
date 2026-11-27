// Photos prises au champ : réduites avant d'être gardées (1600 px au plus, JPEG), pour qu'une
// saison de photos tienne sur le téléphone et dans une sauvegarde.

import { clesPhotos, effacerPhoto, lirePhoto } from '../registre/base';
import { el } from '../ui/dom';
import { voirEnGrand } from '../ui/photo';
import type { Note } from '../registre/modele';

const COTE_MAX = 1600;

export async function reduirePhoto(fichier: Blob): Promise<Blob> {
  const image = await createImageBitmap(fichier, { imageOrientation: 'from-image' });
  const k = Math.min(1, COTE_MAX / Math.max(image.width, image.height));
  const toile = document.createElement('canvas');
  toile.width = Math.round(image.width * k);
  toile.height = Math.round(image.height * k);
  toile.getContext('2d')!.drawImage(image, 0, 0, toile.width, toile.height);
  image.close();
  return new Promise((resoudre, rejeter) =>
    toile.toBlob(
      (b) => (b ? resoudre(b) : rejeter(new Error('photo illisible'))),
      'image/jpeg',
      0.8,
    ),
  );
}

/** Retire les photos qu'aucune note ne garde (note abandonnée avant d'être enregistrée…). */
export async function nettoyerPhotos(notes: readonly Note[]): Promise<void> {
  const gardees = new Set(notes.flatMap((n) => n.photos));
  for (const id of await clesPhotos()) if (!gardees.has(id)) await effacerPhoto(id);
}

/**
 * Vignettes des photos d'une observation, dans l'ordre ; toucher une vignette ouvre la photo en
 * plein écran, avec les autres à côté. `apres` reçoit chaque vignette (bouton « retirer »…).
 */
export async function vignettesPhotos(
  ids: readonly string[],
  zone: HTMLElement,
  classe: string,
  apres?: (vignette: HTMLImageElement, id: string) => HTMLElement,
): Promise<void> {
  const photos = await Promise.all(ids.map((id) => lirePhoto(id)));
  const urls: string[] = [];
  const presentes: string[] = [];
  photos.forEach((ph, k) => {
    if (!ph) return;
    urls.push(URL.createObjectURL(ph.image));
    presentes.push(ids[k]!);
  });
  zone.replaceChildren(
    ...urls.map((url, k) => {
      const img = el('img', { src: url, alt: 'Photo', class: classe });
      img.addEventListener('click', () => voirEnGrand(urls, k));
      return apres ? apres(img, presentes[k]!) : img;
    }),
  );
}
