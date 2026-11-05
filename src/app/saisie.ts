// Saisie d'une note au champ : la parcelle (proposée par le GPS), puis des pastilles (type,
// stade, ce qui est vu, gravité, à revoir), une remarque (dictée au micro du clavier) et des
// photos. Tout est facultatif sauf la parcelle.

import { noter, ordonner } from '../agro/habitudes';
import {
  CATEGORIES,
  DELAIS_REVOIR,
  GRAVITES,
  STADES,
  TYPES,
  constatsProposes,
  groupe,
} from '../agro/listes';
import { ecrirePhoto, lirePhoto, nouvelId } from '../registre/base';
import type { Gravite, Note, TypeNote } from '../registre/modele';
import { el } from '../ui/dom';
import { icone } from '../ui/icones';
import {
  ajouterJours,
  barreHaut,
  dateCourte,
  jour,
  maintenantLocal,
  message,
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
  page.append(barreHaut(existante ? 'Modifier la note' : 'Nouvelle note'));
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
        ordonner(etat.habitudes, `stade|${g}`, STADES[g]),
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

  // ---------- Observation (catégorie, constats, gravité) : seulement pour une observation ----------
  const zoneObservation = el(
    'section',
    { class: 'bloc' },
    el('h2', {}, 'Ce que tu vois'),
    pastilles(CATEGORIES, n.categorie ? [n.categorie] : [], (c) => {
      n.categorie = c[0] ?? '';
      n.constats = [];
      dessinerConstats();
    }),
    zoneConstats,
    el('h2', {}, 'Gravité'),
    pastilles(
      GRAVITES,
      n.gravite ? [n.gravite] : [],
      (c) => (n.gravite = (c[0] ?? '') as Gravite | ''),
    ),
  );
  const montrerObservation = () => (zoneObservation.hidden = n.type !== 'Observation');

  // ---------- À revoir ----------
  const libelles = DELAIS_REVOIR.map((j) => `${j} jours`);
  const delaiActuel = n.aRevoir
    ? libelles.find((_, i) => ajouterJours(jour(), DELAIS_REVOIR[i]!) === n.aRevoir)
    : undefined;
  const dateRevoir = el('input', { type: 'date', value: n.aRevoir, min: jour() });
  const zoneRevoir = el(
    'section',
    { class: 'bloc' },
    el('h2', {}, 'À revoir'),
    pastilles(libelles, delaiActuel ? [delaiActuel] : [], (c) => {
      const i = libelles.indexOf(c[0] ?? '');
      n.aRevoir = i >= 0 ? ajouterJours(jour(), DELAIS_REVOIR[i]!) : '';
      n.revu = false;
      dateRevoir.value = n.aRevoir;
    }),
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
    placeholder: 'Remarque (touche le micro du clavier pour dicter)',
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

  // ---------- Type ----------
  const zoneType = el(
    'section',
    { class: 'bloc' },
    el('h2', {}, 'Type'),
    pastilles(TYPES, [n.type], (c) => {
      n.type = (c[0] ?? 'Observation') as TypeNote;
      montrerObservation();
    }),
  );
  // Un type doit rester choisi : retoucher le type actif ne le décoche pas.
  zoneType.addEventListener('click', () =>
    zoneType
      .querySelectorAll('.pastille')
      .forEach((b) => b.setAttribute('aria-pressed', String(b.textContent === n.type))),
  );

  dessinerParcelle();
  montrerObservation();

  const enregistrer = async () => {
    if (!parcelle(n.parcelle)) {
      message('Choisis d’abord la parcelle.', true);
      zoneParcelle.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    n.modifieLe = new Date().toISOString();
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
    zoneType,
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
