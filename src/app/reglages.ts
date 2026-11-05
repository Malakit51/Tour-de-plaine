// Réglages : imports (Geofolia, contours de Jalon), correspondance des noms, sauvegarde, thème.

import type { ContoursJalon } from '../registre/modele';
import { contoursFichier, contoursSession, lireSessionJalon } from '../sources/jalon';
import { lireZipGeofolia } from '../sources/geofolia';
import { el } from '../ui/dom';
import { icone } from '../ui/icones';
import { choisirFichier, dateCourte, jour, message, naviguer, pastilles, phrase } from './commun';
import {
  changerReglages,
  charger,
  contourDe,
  enregistrerImports,
  enregistrerJalon,
  etat,
  importCourant,
  parcelles,
} from './etat';
import { fabriquerSauvegarde, reprendreSauvegarde } from './sauvegarde';
import { choisirTheme, themeChoisi, type Theme } from './theme';

declare const __VERSION__: string;
declare const __DATE_VERSION__: string;

const rafraichir = () => naviguer(location.hash, true);

export async function importerGeofolia(fichier: File): Promise<void> {
  try {
    const imports = await lireZipGeofolia(new Uint8Array(await fichier.arrayBuffer()));
    await enregistrerImports(imports);
    const i = imports[0]!;
    const realisees = i.interventions.filter((x) => x.statut === 'realisee').length;
    message(
      `Campagne ${i.campagne} : ${i.parcelles.length} parcelles, ${realisees} interventions réalisées.`,
    );
  } catch (e) {
    message((e as Error).message, true);
  }
}

/** Contours de la session de Jalon sur ce téléphone (null s'il n'y en a pas). */
export function contoursDeJalonIci(): ContoursJalon | null {
  const brut = lireSessionJalon(localStorage);
  if (!brut) return null;
  const { date, contours } = contoursSession(brut);
  return { source: 'session', date: date || new Date().toISOString(), contours };
}

export function ecranReglages(): HTMLElement {
  const page = el(
    'main',
    { class: 'ecran' },
    el('header', { class: 'titre-accueil' }, el('h1', {}, 'Réglages')),
  );
  page.append(blocGeofolia(), blocJalon(), blocCorrespondances(), blocSauvegarde(), blocTheme());
  page.append(
    el(
      'p',
      { class: 'doux version' },
      `Tour de plaine, version ${__VERSION__} du ${__DATE_VERSION__}`,
    ),
  );
  return page;
}

function blocGeofolia(): HTMLElement {
  const imp = importCourant();
  return el(
    'section',
    { class: 'carte' },
    el('h2', {}, 'Geofolia'),
    imp
      ? el(
          'p',
          {},
          phrase(
            `Campagne ${imp.campagne} : ${imp.parcelles.length} parcelles, ${imp.interventions.length} interventions. Export du ${dateCourte(
              imp.exporteLe.slice(0, 10),
            )}, importé le ${dateCourte(imp.importeLe.slice(0, 10))}`,
          ),
        )
      : el('p', {}, 'Rien d’importé pour l’instant.'),
    el(
      'p',
      { class: 'doux' },
      'Dans Geofolia : export « Parcelles et interventions complet (ZIP) ». Réimporte le ZIP de toute la campagne quand tu veux : il remplace le précédent, tes notes ne bougent pas. Les contours de Geofolia sont ignorés.',
    ),
    el(
      'button',
      {
        class: 'bouton principal',
        onclick: async () => {
          const f = await choisirFichier('.zip,application/zip');
          if (!f) return;
          await importerGeofolia(f);
          rafraichir();
        },
      },
      icone('ouvrir', 20),
      'Importer le ZIP Geofolia',
    ),
  );
}

function blocJalon(): HTMLElement {
  const j = etat.jalon;
  let ici: ContoursJalon | null = null;
  try {
    ici = contoursDeJalonIci();
  } catch {
    ici = null;
  }
  const avecContour = parcelles().filter((p) => contourDe(p.nom)).length;
  return el(
    'section',
    { class: 'carte' },
    el('h2', {}, 'Contours (Jalon)'),
    j
      ? el(
          'p',
          {},
          `${j.contours.length} contours, ${j.source === 'session' ? 'repris de Jalon sur ce téléphone' : 'lus dans un TASKDATA.XML'} le ${dateCourte(
            j.date.slice(0, 10),
          )} ; ${avecContour} parcelles sur ${parcelles().length} ont leur contour.`,
        )
      : el('p', {}, 'Pas encore de contours.'),
    el(
      'p',
      { class: 'doux' },
      'Jalon fait foi pour les contours. Ils servent à reconnaître la parcelle où tu es et à la dessiner dans sa fiche.',
    ),
    ici
      ? el(
          'button',
          {
            class: 'bouton principal',
            onclick: async () => {
              await enregistrerJalon(contoursDeJalonIci()!);
              message('Contours repris de Jalon.');
              rafraichir();
            },
          },
          'Reprendre les contours de Jalon',
        )
      : el(
          'p',
          { class: 'doux' },
          'Jalon n’est pas ouvert sur ce téléphone (ou n’a pas de fichier en cours) : importe à la place un TASKDATA.XML exporté par Jalon.',
        ),
    el(
      'button',
      {
        class: 'bouton secondaire',
        onclick: async () => {
          const f = await choisirFichier('.xml,.XML,text/xml,application/xml');
          if (!f) return;
          try {
            const contours = contoursFichier(await f.text());
            await enregistrerJalon({ source: 'fichier', date: new Date().toISOString(), contours });
            message(`${contours.length} contours lus.`);
            rafraichir();
          } catch (e) {
            message((e as Error).message, true);
          }
        },
      },
      icone('ouvrir', 20),
      'Importer un TASKDATA.XML',
    ),
  );
}

function blocCorrespondances(): HTMLElement {
  const ps = parcelles();
  if (!etat.jalon || ps.length === 0) return el('div', {});
  const sans = ps.filter((p) => !contourDe(p.nom));
  return el(
    'details',
    { class: 'carte' },
    el(
      'summary',
      {},
      `Noms Geofolia ↔ Jalon${sans.length ? ` (${sans.length} sans contour)` : ''}`,
    ),
    el(
      'p',
      { class: 'doux' },
      'Rapprochés d’après les noms. Touche une parcelle pour corriger son contour (en bas de sa fiche).',
    ),
    el(
      'ul',
      { class: 'correspondances' },
      ...ps.map((p) =>
        el(
          'li',
          {},
          el('a', { href: `#parcelle/${encodeURIComponent(p.nom)}` }, p.nom),
          el(
            'span',
            { class: contourDe(p.nom) ? '' : 'doux' },
            contourDe(p.nom)?.nom ?? 'aucun contour',
          ),
        ),
      ),
    ),
  );
}

function blocSauvegarde(): HTMLElement {
  const le = etat.reglages.sauvegardeLe;
  return el(
    'section',
    { class: 'carte' },
    el('h2', {}, 'Sauvegarde'),
    el(
      'p',
      {},
      le
        ? phrase(`Dernière sauvegarde le ${dateCourte(le.slice(0, 10))}`)
        : 'Jamais sauvegardé dans un fichier.',
    ),
    el(
      'p',
      { class: 'doux' },
      'Tes notes et photos sont sur ce téléphone. Enregistre-les de temps en temps dans un fichier (par exemple dans Google Drive) pour ne rien perdre.',
    ),
    el(
      'button',
      {
        class: 'bouton principal',
        onclick: async () => {
          const blob = await fabriquerSauvegarde();
          const nom = `tour-de-plaine-sauvegarde-${jour()}.json`;
          const fichier = new File([blob], nom, { type: 'application/json' });
          // Sur le téléphone : « Partager » propose Drive, Gmail… ; sinon, téléchargement.
          if (navigator.canShare?.({ files: [fichier] })) {
            try {
              await navigator.share({ files: [fichier], title: nom });
            } catch {
              return;
            }
          } else {
            const a = el('a', { href: URL.createObjectURL(blob), download: nom });
            a.click();
          }
          await changerReglages({ sauvegardeLe: new Date().toISOString() });
          rafraichir();
        },
      },
      icone('sauvegarde', 20),
      'Enregistrer dans un fichier',
    ),
    el(
      'button',
      {
        class: 'bouton secondaire',
        onclick: async () => {
          const f = await choisirFichier('.json,application/json');
          if (!f) return;
          try {
            const r = await reprendreSauvegarde(await f.text());
            await charger();
            message(`Sauvegarde reprise : ${r.notes} notes, ${r.photos} photos.`);
            rafraichir();
          } catch (e) {
            message((e as Error).message, true);
          }
        },
      },
      icone('ouvrir', 20),
      'Reprendre une sauvegarde',
    ),
  );
}

function blocTheme(): HTMLElement {
  const noms: Record<Theme, string> = {
    auto: 'Comme le téléphone',
    clair: 'Clair',
    sombre: 'Sombre',
  };
  return el(
    'section',
    { class: 'carte' },
    el('h2', {}, 'Affichage'),
    pastilles(Object.values(noms), [noms[themeChoisi()]], (c) => {
      const t = (Object.keys(noms) as Theme[]).find((k) => noms[k] === c[0]) ?? 'auto';
      choisirTheme(t);
    }),
  );
}
