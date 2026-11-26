// Réglages › Mes pastilles : modifier les stades et les constats proposés à la saisie, par
// culture. Toucher une pastille la renomme, ✕ la retire, « Ajouter » en crée une. Les observations
// déjà notées ne changent pas.

import { groupe, type Groupe } from '../agro/listes';
import { NOMS_GROUPES, listeDOrigine, listesDuGroupe, pastillesDe } from '../agro/pastilles';
import { el } from '../ui/dom';
import { icone } from '../ui/icones';
import { message, pastilles } from './commun';
import { enregistrerPastilles, etat, parcelles } from './etat';

let groupeChoisi: Groupe | null = null;
let listeOuverte = '';

export function blocMesPastilles(): HTMLElement {
  const bloc = el('details', { class: 'carte mes-pastilles' });
  bloc.append(el('summary', {}, 'Mes pastilles'));
  const contenu = el('div', {});
  bloc.append(contenu);
  // Groupes des cultures de l'exploitation d'abord, puis les autres.
  const presents = [...new Set(parcelles().map((p) => groupe(p.culture)))];
  const tous = [
    ...presents,
    ...(Object.keys(NOMS_GROUPES) as Groupe[]).filter((g) => !presents.includes(g)),
  ];
  groupeChoisi ??= tous[0] ?? 'cereale';

  const dessiner = () => {
    const g = groupeChoisi!;
    contenu.replaceChildren(
      el(
        'p',
        { class: 'doux' },
        'Les pastilles proposées à la saisie. Toucher une pastille pour la renommer, ✕ pour la retirer. Les observations déjà notées ne changent pas.',
      ),
      pastilles(
        tous.map((x) => NOMS_GROUPES[x]),
        [NOMS_GROUPES[g]],
        (c) => {
          const nouveau = tous.find((x) => NOMS_GROUPES[x] === c[0]);
          // Retoucher le groupe choisi ne le décoche pas.
          if (nouveau) groupeChoisi = nouveau;
          dessiner();
        },
      ),
      ...listesDuGroupe(g).map(({ cle, titre }) => liste(cle, titre, dessiner)),
    );
  };
  dessiner();
  return bloc;
}

function liste(cle: string, titre: string, redessiner: () => void): HTMLElement {
  const valeurs = pastillesDe(etat.pastilles, etat.habitudes, cle);
  const modifiee = cle in etat.pastilles;
  const changer = async (nouvelle: string[] | null) => {
    listeOuverte = cle;
    await enregistrerPastilles(cle, nouvelle);
    redessiner();
  };
  const champ = el('input', {
    type: 'text',
    placeholder: titre === 'Stades' ? 'Nouveau stade' : `Nouveau : ${titre.toLowerCase()}`,
    enterkeyhint: 'done',
  });
  const ajouter = () => {
    const v = champ.value.trim();
    if (!v) return;
    if (valeurs.some((x) => x.toLowerCase() === v.toLowerCase())) {
      message(`« ${v} » est déjà dans la liste.`, true);
      return;
    }
    void changer([...valeurs, v]);
  };
  champ.addEventListener('keydown', (e) => e.key === 'Enter' && (e.preventDefault(), ajouter()));

  const details = el(
    'details',
    { class: 'liste-pastilles' },
    el(
      'summary',
      {},
      titre,
      el('span', { class: 'compte' }, String(valeurs.length)),
      modifiee ? el('span', { class: 'doux' }, ' (modifiée)') : null,
    ),
    el(
      'div',
      { class: 'pastilles' },
      ...valeurs.map((v) =>
        el(
          'span',
          { class: 'pastille modifiable' },
          el(
            'button',
            {
              type: 'button',
              class: 'nom-pastille',
              onclick: () => {
                const nom = prompt('Nouveau nom :', v)?.trim();
                if (!nom || nom === v) return;
                if (valeurs.includes(nom))
                  return message(`« ${nom} » est déjà dans la liste.`, true);
                void changer(valeurs.map((x) => (x === v ? nom : x)));
              },
            },
            v,
          ),
          el(
            'button',
            {
              type: 'button',
              class: 'retirer-pastille',
              'aria-label': `Retirer ${v}`,
              onclick: () => void changer(valeurs.filter((x) => x !== v)),
            },
            icone('fermer', 16),
          ),
        ),
      ),
    ),
    el(
      'div',
      { class: 'ajout-autre' },
      champ,
      el('button', { type: 'button', class: 'bouton secondaire', onclick: ajouter }, 'Ajouter'),
    ),
    modifiee
      ? el(
          'button',
          {
            type: 'button',
            class: 'lien',
            onclick: () => {
              if (
                confirm(`Remettre la liste de l’appli (${listeDOrigine(cle).length} pastilles) ?`)
              )
                void changer(null);
            },
          },
          'Remettre la liste de l’appli',
        )
      : null,
  );
  details.open = listeOuverte === cle;
  details.addEventListener('toggle', () => {
    if (details.open) listeOuverte = cle;
  });
  return details;
}
