// Installation proposée par la page elle-même (comme Valeur engrais, 29/10/2026) : le menu ⋮ de
// Chrome dit l'appli « déjà installée » parce que d'autres applis (Jalon…) sont installées à la
// même adresse (malakit51.github.io) ; la fenêtre d'installation que la page déclenche ne fait pas
// ce test. Chrome ne la permet que s'il juge l'appli installable et pas encore installée
// (événement beforeinstallprompt).

import { el } from '../ui/dom';
import { icone } from '../ui/icones';
import { message } from './commun';

interface Invitation extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let invitation: Invitation | null = null;
let redessiner = () => {};

/** À appeler tôt au démarrage : l'événement peut arriver avant le premier écran. */
export function ecouterInstallation(afficher: () => void): void {
  redessiner = afficher;
  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    invitation = e as Invitation;
    redessiner();
  });
  addEventListener('appinstalled', () => {
    invitation = null;
    message('Appli installée : elle est sur ton écran d’accueil.');
    redessiner();
  });
}

/** Bandeau « Installer sur ton téléphone », seulement quand Chrome le permet. */
export function bandeauInstallation(): HTMLElement | null {
  if (!invitation) return null;
  return el(
    'section',
    { class: 'carte installer' },
    icone('sauvegarde', 26),
    el(
      'span',
      {},
      el('strong', {}, 'Installer sur ton téléphone'),
      el('br'),
      'Une icône sur l’écran d’accueil, en plein écran, même sans réseau.',
    ),
    el('button', { class: 'bouton principal', onclick: () => void installer() }, 'Installer'),
  );
}

async function installer(): Promise<void> {
  const ev = invitation;
  if (!ev) {
    message('Chrome ne propose pas l’installation ici.', true);
    return;
  }
  invitation = null;
  await ev.prompt();
  const choix = await ev.userChoice.catch(() => null);
  if (choix?.outcome !== 'accepted') message('Installation annulée.');
  redessiner();
}
