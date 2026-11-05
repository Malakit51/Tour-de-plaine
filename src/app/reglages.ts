// Réglages : imports (Geofolia, contours de Jalon), correspondance des noms, sauvegarde, thème.

import { MODELES, nettoyerCle, verifierCle, type Modele } from '../ia/claude';
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
  enregistrerCleApi,
  enregistrerImports,
  enregistrerJalon,
  etat,
  importCourant,
  parcelles,
} from './etat';
import { bandeauInstallation } from './installation';
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
  const installer = bandeauInstallation();
  if (installer) page.append(installer);
  page.append(
    blocGeofolia(),
    blocJalon(),
    blocCorrespondances(),
    blocDictee(),
    blocSauvegarde(),
    blocTheme(),
  );
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

const NOTICE = 'https://github.com/Malakit51/Tour-de-plaine/blob/main/docs/dictee-claude.md';

function blocDictee(): HTMLElement {
  const champ = el('input', {
    type: 'password',
    placeholder: 'sk-ant-…',
    autocomplete: 'off',
    spellcheck: 'false',
  });
  champ.value = etat.cleApi;
  const aRanger = etat.notes.filter((n) => n.aRanger);
  const enregistrerCle = async () => {
    const cle = nettoyerCle(champ.value);
    if (!cle) {
      await enregistrerCleApi('');
      message('Clé retirée : la dictée va dans la remarque, sans Claude.');
      rafraichir();
      return;
    }
    try {
      await verifierCle(cle, etat.reglages.modeleDictee);
    } catch (e) {
      message((e as Error).message, true);
      return;
    }
    await enregistrerCleApi(cle);
    message('Clé vérifiée et gardée sur ce téléphone.');
    rafraichir();
  };
  const noms = (Object.keys(MODELES) as Modele[]).map(
    (m) => `${MODELES[m].nom} (${MODELES[m].detail})`,
  );
  return el(
    'section',
    { class: 'carte' },
    el('h2', {}, 'Dictée avec Claude'),
    el(
      'p',
      {},
      etat.cleApi
        ? `Réglée : Claude range tes dictées dans les pastilles (modèle ${MODELES[etat.reglages.modeleDictee].nom}).`
        : 'Pas réglée : la dictée va dans la remarque, sans pastilles.',
    ),
    el(
      'p',
      { class: 'doux' },
      'Il faut une clé de l’API Anthropic (compte à part de l’abonnement Claude, payé à l’usage). ',
      el('a', { href: NOTICE, target: '_blank', rel: 'noopener' }, 'Comment l’obtenir'),
      '. La clé reste sur ce téléphone (jamais dans une sauvegarde). Seul le texte de tes dictées part chez Anthropic, avec la liste de tes parcelles.',
    ),
    el('label', {}, 'Clé de l’API', champ),
    el(
      'button',
      { class: 'bouton principal', onclick: () => void enregistrerCle() },
      'Vérifier et garder la clé',
    ),
    el('h3', {}, 'Modèle'),
    pastilles(
      noms,
      [noms[(Object.keys(MODELES) as Modele[]).indexOf(etat.reglages.modeleDictee)]!],
      (c) => {
        const i = noms.indexOf(c[0] ?? '');
        const m = (Object.keys(MODELES) as Modele[])[i];
        // Retoucher le modèle choisi ne le décoche pas : il en faut toujours un.
        if (!m) return rafraichir();
        void changerReglages({ modeleDictee: m }).then(rafraichir);
      },
    ),
    aRanger.length
      ? el(
          'details',
          {},
          el('summary', {}, `${aRanger.length} dictée${aRanger.length > 1 ? 's' : ''} à ranger`),
          el(
            'p',
            { class: 'doux' },
            'Ouvre-les avec du réseau : Claude les range, tu vérifies, tu enregistres.',
          ),
          el(
            'ul',
            { class: 'correspondances' },
            ...aRanger.map((n) =>
              el(
                'li',
                {},
                el('a', { href: `#note/${n.id}` }, n.parcelle || 'Parcelle à choisir'),
                el('span', { class: 'doux' }, dateCourte(n.date)),
              ),
            ),
          ),
        )
      : null,
  );
}
