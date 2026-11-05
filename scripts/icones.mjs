// Génère les icônes de l'application (public/icone-*.png) à partir de scripts/icone.svg, dessinées
// par Chromium (comme pour Jalon). À relancer seulement pour changer le dessin :
//   node scripts/icones.mjs   (Playwright doit être installé)
import { copyFileSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');
const svg = readFileSync('scripts/icone.svg', 'utf8');
const navigateur = await chromium.launch();
for (const [taille, nom] of [
  [192, 'icone-192.png'],
  [512, 'icone-512.png'],
  [180, 'icone-apple.png'],
]) {
  const page = await navigateur.newPage({ viewport: { width: taille, height: taille } });
  await page.setContent(
    `<style>html,body{margin:0}svg{display:block;width:${taille}px;height:${taille}px}</style>${svg}`,
  );
  await page.screenshot({ path: `public/${nom}` });
  await page.close();
}
await navigateur.close();
copyFileSync('scripts/icone.svg', 'public/icone.svg');
