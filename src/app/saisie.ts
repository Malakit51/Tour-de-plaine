// Saisie d'une observation au champ : la parcelle (proposée par le GPS), une dictée que Claude
// range dans les pastilles (si la dictée est réglée), puis les pastilles (stade, ce qui est vu,
// gravité, à revoir), une remarque et des photos. Tout est facultatif sauf la parcelle. L'appli n'enregistre que des observations : les
// interventions viennent de Geofolia (décision de Maxime, 05/11/2026).

import { noter, ordonner } from '../agro/habitudes';
import {
  CATEGORIES,
  DELAIS_REVOIR,
  GRAVITES,
  STADES,
  constatsProposes,
  groupe,
} from '../agro/listes';
import { MODELES, rangerDictee, type Rangement } from '../ia/claude';
import { contexteDictee } from '../ia/contexte';
import { ecouter, voixDisponible } from '../ia/voix';
import { ecrirePhoto, lirePhoto, nouvelId } from '../registre/base';
import type { Gravite, Note } from '../registre/modele';
import { el } from '../ui/dom';
import { icone } from '../ui/icones';
import {
  ajouterJours,
  barreHaut,
  dateCourte,
  jour,
  maintenantLocal,
  message,
  naviguer,
  pastilles,
  revenir,
} from './commun';
import {
  enregistrerHabitudes,
  enregistrerNote,
  etat,
  parcelle,
  parcelles,
  supprimerNote,
} from './etat';
import { reduirePhoto } from './photos';
import { distanceLisible, parcelleIci, parcellesProches } from './position';

function noteVide(nomParcelle: string): Note {
  const maintenant = new Date().toISOString();
  return {
    id: nouvelId(),
    parcelle: nomParcelle,
    date: maintenantLocal(),
    type: 'Observation',
    stade: '',
    categorie: '',
    constats: [],
    gravite: '',
    aRevoir: '',
    revu: false,
    texte: '',
    photos: [],
    creeLe: maintenant,
    modifieLe: maintenant,
  };
}

/** Nouvelle note (parcelle donnée, ou celle où l'on est), ou modification d'une note existante. */
export function ecranSaisie(nomParcelle: string | null, idNote: string | null): HTMLElement {
  const existante = idNote ? etat.notes.find((n) => n.id === idNote) : undefined;
  const n: Note = existante
    ? structuredClone(existante)
    : noteVide(nomParcelle ?? parcelleIci() ?? '');

  const page = el('main', { class: 'ecran saisie' });
  page.append(barreHaut(existante ? 'Modifier l’observation' : 'Nouvelle observation'));
  if (idNote && !existante) {
    page.append(el('p', { class: 'carte' }, 'Cette note n’existe plus.'));
    return page;
  }

  // ---------- Parcelle ----------
  const zoneParcelle = el('section', { class: 'bloc' });
  const zoneStade = el('div', {});
  const zoneConstats = el('div', {});
  const dessinerParcelle = () => {
    zoneParcelle.replaceChildren(el('h2', {}, 'Parcelle'));
    const p = parcelle(n.parcelle);
    if (p) {
      zoneParcelle.append(
        el(
          'div',
          { class: 'parcelle-choisie' },
          el('strong', {}, p.nom),
          el('span', { class: 'doux' }, [p.culture, p.variete].filter(Boolean).join(' · ')),
          el(
            'button',
            {
              type: 'button',
              class: 'lien',
              onclick: () => ((n.parcelle = ''), dessinerParcelle()),
            },
            'Changer',
          ),
        ),
      );
    } else {
      const proches = parcellesProches().slice(0, 4);
      if (proches.length) {
        zoneParcelle.append(
          el('p', { class: 'doux' }, 'Les plus proches :'),
          el(
            'div',
            { class: 'pastilles' },
            ...proches.map((x) =>
              el(
                'button',
                { type: 'button', class: 'pastille', onclick: () => choisir(x.nom) },
                `${x.nom} · ${distanceLisible(x.distance)}`,
              ),
            ),
          ),
        );
      }
      const liste = el('select', { class: 'choix-parcelle' });
      liste.append(el('option', { value: '' }, 'Choisir une parcelle…'));
      for (const x of parcelles())
        liste.append(el('option', { value: x.nom }, `${x.nom} · ${x.culture}`));
      liste.addEventListener('change', () => liste.value && choisir(liste.value));
      zoneParcelle.append(liste);
    }
    dessinerStade();
    dessinerConstats();
    dessinerObservation();
    dessinerRevoir();
  };
  const choisir = (nom: string) => {
    n.parcelle = nom;
    dessinerParcelle();
  };
  const culture = () => parcelle(n.parcelle)?.culture ?? '';

  // ---------- Stade, constats (selon la culture) ----------
  const dessinerStade = () => {
    const g = groupe(culture());
    zoneStade.replaceChildren(
      el('h2', {}, 'Stade'),
      pastilles(
        avec(ordonner(etat.habitudes, `stade|${g}`, STADES[g]), n.stade),
        n.stade ? [n.stade] : [],
        (c) => {
          n.stade = c[0] ?? '';
        },
      ),
    );
  };
  const dessinerConstats = () => {
    zoneConstats.replaceChildren();
    if (!n.categorie) return;
    const cle = `${n.categorie}|${groupe(culture())}`;
    const options = ordonner(etat.habitudes, cle, constatsProposes(n.categorie, culture()));
    for (const c of n.constats) if (!options.includes(c)) options.push(c);
    const autre = el('input', {
      type: 'text',
      class: 'autre',
      placeholder: 'Autre (taper puis Ajouter)',
      enterkeyhint: 'done',
    });
    const ajouter = () => {
      const v = autre.value.trim();
      if (!v) return;
      if (!n.constats.includes(v)) n.constats.push(v);
      dessinerConstats();
    };
    autre.addEventListener('keydown', (e) => e.key === 'Enter' && (e.preventDefault(), ajouter()));
    zoneConstats.append(
      pastilles(options, n.constats, (c) => (n.constats = c), true),
      el(
        'div',
        { class: 'ajout-autre' },
        autre,
        el('button', { type: 'button', class: 'bouton secondaire', onclick: ajouter }, 'Ajouter'),
      ),
    );
  };

  // ---------- Ce que tu vois (catégorie, constats) et gravité ----------
  const zoneCategorie = el('div', {});
  const zoneGravite = el('div', {});
  const dessinerObservation = () => {
    zoneCategorie.replaceChildren(
      pastilles(CATEGORIES, n.categorie ? [n.categorie] : [], (c) => {
        n.categorie = c[0] ?? '';
        n.constats = [];
        dessinerConstats();
      }),
    );
    zoneGravite.replaceChildren(
      pastilles(
        GRAVITES,
        n.gravite ? [n.gravite] : [],
        (c) => (n.gravite = (c[0] ?? '') as Gravite | ''),
      ),
    );
  };
  const zoneObservation = el(
    'section',
    { class: 'bloc' },
    el('h2', {}, 'Ce que tu vois'),
    zoneCategorie,
    zoneConstats,
    el('h2', {}, 'Gravité'),
    zoneGravite,
  );

  // ---------- À revoir ----------
  const libelles = DELAIS_REVOIR.map((j) => `${j} jours`);
  const dateRevoir = el('input', { type: 'date', value: n.aRevoir, min: jour() });
  const zoneDelais = el('div', {});
  const dessinerRevoir = () => {
    const delaiActuel = n.aRevoir
      ? libelles.find((_, i) => ajouterJours(jour(), DELAIS_REVOIR[i]!) === n.aRevoir)
      : undefined;
    dateRevoir.value = n.aRevoir;
    zoneDelais.replaceChildren(
      pastilles(libelles, delaiActuel ? [delaiActuel] : [], (c) => {
        const i = libelles.indexOf(c[0] ?? '');
        n.aRevoir = i >= 0 ? ajouterJours(jour(), DELAIS_REVOIR[i]!) : '';
        n.revu = false;
        dateRevoir.value = n.aRevoir;
      }),
    );
  };
  const zoneRevoir = el(
    'section',
    { class: 'bloc' },
    el('h2', {}, 'À revoir'),
    zoneDelais,
    el('label', { class: 'ligne-champ' }, 'ou le', dateRevoir),
  );
  dateRevoir.addEventListener('change', () => {
    n.aRevoir = dateRevoir.value;
    n.revu = false;
    for (const b of zoneRevoir.querySelectorAll('.pastille'))
      b.setAttribute('aria-pressed', 'false');
  });

  // ---------- Remarque et photos ----------
  const texte = el('textarea', {
    rows: '3',
    placeholder: etat.cleApi
      ? 'Remarque (Claude y met sa synthèse de la dictée)'
      : 'Remarque (touche le micro du clavier pour dicter)',
  });
  texte.value = n.texte;
  texte.addEventListener('input', () => (n.texte = texte.value));

  const vignettes = el('div', { class: 'vignettes' });
  const dessinerPhotos = () => {
    vignettes.replaceChildren();
    for (const id of n.photos) {
      const cadre = el('div', { class: 'cadre-vignette' });
      void lirePhoto(id).then((ph) => {
        if (!ph) return;
        cadre.prepend(
          el('img', { src: URL.createObjectURL(ph.image), alt: 'Photo', class: 'vignette' }),
        );
      });
      cadre.append(
        el(
          'button',
          {
            type: 'button',
            class: 'retirer',
            'aria-label': 'Retirer la photo',
            onclick: () => {
              n.photos = n.photos.filter((x) => x !== id);
              dessinerPhotos();
            },
          },
          icone('fermer', 16),
        ),
      );
      vignettes.append(cadre);
    }
  };
  const entreePhoto = el('input', {
    type: 'file',
    accept: 'image/*',
    capture: 'environment',
    hidden: '',
  });
  entreePhoto.addEventListener('change', async () => {
    for (const f of entreePhoto.files ?? []) {
      try {
        const id = nouvelId();
        await ecrirePhoto({ id, image: await reduirePhoto(f) });
        n.photos.push(id);
      } catch {
        message('Cette photo n’a pas pu être lue.', true);
      }
    }
    entreePhoto.value = '';
    dessinerPhotos();
  });
  dessinerPhotos();

  // ---------- Date ----------
  const champDate = el('input', { type: 'datetime-local', value: n.date });
  champDate.addEventListener('change', () => champDate.value && (n.date = champDate.value));

  // ---------- Dictée ----------
  // Avec une clé : la dictée a son propre champ, et Claude la range dans les pastilles. Sans clé :
  // la dictée va directement dans la remarque.
  const avecClaude = () => etat.cleApi !== '';
  const champDictee = el('textarea', {
    rows: '3',
    placeholder:
      'Ce que tu dictes s’écrit ici. Tu peux aussi toucher ici et dicter avec le micro du clavier.',
  });
  champDictee.value = n.dictee ?? '';
  const etatDictee = el('p', { class: 'doux etat-dictee' });
  const boutonDicter = el('button', { type: 'button', class: 'bouton dicter' });
  const boutonRanger = el(
    'button',
    { type: 'button', class: 'bouton principal' },
    'Ranger avec Claude',
  );
  const autreModele = el('div', {});
  let ecoute: { arreter: () => void } | null = null;
  let rangee = false;
  let derniereSynthese = '';

  const dessinerBoutonDicter = () => {
    boutonDicter.replaceChildren(icone('micro', 24), ecoute ? 'Arrêter' : 'Dicter');
    boutonDicter.classList.toggle('ecoute', ecoute !== null);
    boutonRanger.disabled = ecoute !== null || !champDictee.value.trim();
  };
  const cible = () => (avecClaude() ? champDictee : texte);
  boutonDicter.addEventListener('click', () => {
    if (ecoute) {
      ecoute.arreter();
      return;
    }
    const champ = cible();
    ecoute = ecouter(
      champ.value,
      (t) => {
        champ.value = t;
        if (champ === texte) n.texte = t;
        else n.dictee = t;
      },
      (erreur) => {
        ecoute = null;
        dessinerBoutonDicter();
        if (erreur) message(erreur, true);
        // Fin de la dictée : Claude range tout de suite s'il y a du réseau.
        else if (avecClaude() && champDictee.value.trim() && navigator.onLine) void ranger();
      },
    );
    etatDictee.textContent = 'Je t’écoute… touche « Arrêter » quand tu as fini.';
    dessinerBoutonDicter();
  });
  champDictee.addEventListener('input', () => {
    n.dictee = champDictee.value;
    rangee = false;
    dessinerBoutonDicter();
  });

  const appliquer = (r: Rangement) => {
    if (r.parcelle) n.parcelle = r.parcelle;
    n.stade = r.stade;
    n.categorie = r.categorie;
    n.constats = r.constats;
    n.gravite = r.gravite as Gravite | '';
    if (r.aRevoir) {
      n.aRevoir = r.aRevoir;
      n.revu = false;
    }
    // La synthèse remplace la précédente ; une remarque tapée à la main reste en dessous.
    const ancienne = n.texte.trim();
    n.texte =
      !ancienne || ancienne === derniereSynthese ? r.synthese : `${r.synthese}\n${ancienne}`;
    derniereSynthese = r.synthese;
    texte.value = n.texte;
    delete n.aRanger;
    rangee = true;
    dessinerParcelle();
  };
  const ranger = async (modele = etat.reglages.modeleDictee) => {
    const dictee = champDictee.value.trim();
    if (!dictee) return;
    etatDictee.textContent = `${MODELES[modele].nom} range ta dictée…`;
    boutonRanger.disabled = true;
    autreModele.replaceChildren();
    try {
      appliquer(await rangerDictee(dictee, contexteDictee(n.parcelle), etat.cleApi, modele));
      etatDictee.textContent = `Rangé par ${MODELES[modele].nom} : vérifie les pastilles, puis Enregistrer.`;
      if (modele !== 'opus') {
        autreModele.append(
          el(
            'button',
            { type: 'button', class: 'lien', onclick: () => void ranger('opus') },
            'Pas bien compris ? Re-ranger avec Opus',
          ),
        );
      }
    } catch (e) {
      etatDictee.textContent = (e as Error).message;
    } finally {
      dessinerBoutonDicter();
    }
  };
  boutonRanger.addEventListener('click', () => void ranger());

  const zoneDictee = el('section', { class: 'bloc zone-dictee' });
  if (voixDisponible() || avecClaude()) {
    zoneDictee.append(el('h2', {}, 'Dictée'));
    if (voixDisponible()) zoneDictee.append(boutonDicter);
    if (avecClaude()) {
      zoneDictee.append(champDictee, boutonRanger, etatDictee, autreModele);
    } else {
      zoneDictee.append(
        el(
          'p',
          { class: 'doux' },
          'Ta dictée va dans la remarque. Pour que Claude remplisse les pastilles tout seul : ',
          el(
            'button',
            { type: 'button', class: 'lien', onclick: () => naviguer('#reglages') },
            'régler la dictée',
          ),
          '.',
        ),
      );
    }
  }
  dessinerBoutonDicter();

  dessinerParcelle();
  // Dictée gardée sans être rangée (pas de réseau) : rangée dès l'ouverture s'il y a du réseau.
  if (existante?.aRanger && avecClaude() && navigator.onLine) void ranger();

  const enregistrer = async () => {
    if (!parcelle(n.parcelle)) {
      message('Choisis d’abord la parcelle.', true);
      zoneParcelle.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    ecoute?.arreter();
    // Dictée pas (encore) rangée par Claude : elle le sera plus tard.
    const dicteeNouvelle = (n.dictee ?? '') !== (existante?.dictee ?? '');
    if (avecClaude() && n.dictee?.trim() && !rangee && (n.aRanger || dicteeNouvelle))
      n.aRanger = true;
    if (!n.dictee?.trim()) delete n.dictee;
    n.modifieLe = new Date().toISOString();
    // Une note d'une ancienne version (« Semis », « Traitement »…) devient une observation.
    n.type = 'Observation';
    await enregistrerNote(n);
    // Habitudes : ce qui vient d'être choisi remonte en tête la prochaine fois.
    const g = groupe(culture());
    let h = noter(etat.habitudes, `stade|${g}`, [n.stade]);
    if (n.categorie) h = noter(h, `${n.categorie}|${g}`, n.constats);
    await enregistrerHabitudes(h);
    message(existante ? 'Note modifiée.' : `Noté sur ${n.parcelle}.`);
    revenir();
  };

  page.append(
    zoneParcelle,
    zoneDictee,
    el('section', { class: 'bloc' }, zoneStade),
    zoneObservation,
    zoneRevoir,
    el(
      'section',
      { class: 'bloc' },
      el('h2', {}, 'Remarque et photos'),
      texte,
      vignettes,
      el(
        'button',
        { type: 'button', class: 'bouton secondaire', onclick: () => entreePhoto.click() },
        icone('photo', 20),
        'Prendre une photo',
      ),
      entreePhoto,
    ),
    el(
      'section',
      { class: 'bloc' },
      el('label', { class: 'ligne-champ' }, 'Date et heure', champDate),
    ),
  );
  if (existante) {
    page.append(
      el(
        'button',
        {
          type: 'button',
          class: 'bouton danger',
          onclick: async () => {
            if (!confirm(`Supprimer cette note du ${dateCourte(existante.date)} ?`)) return;
            await supprimerNote(existante.id);
            message('Note supprimée.');
            revenir();
          },
        },
        icone('supprimer', 18),
        'Supprimer la note',
      ),
    );
  }
  page.append(
    el(
      'div',
      { class: 'barre-enregistrer' },
      el(
        'button',
        { type: 'button', class: 'bouton principal large', onclick: () => void enregistrer() },
        'Enregistrer',
      ),
    ),
  );
  return page;
}

/** Les pastilles proposées, plus la valeur choisie si elle n'y est pas (dite à Claude, par ex.). */
function avec(options: string[], valeur: string): string[] {
  return valeur && !options.includes(valeur) ? [...options, valeur] : options;
}
