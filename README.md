# Tour de plaine

Appli web installable (téléphone Android, Chrome) : le carnet de tour de plaine. Pour chaque parcelle, les
observations notées au champ (stade, maladies, ravageurs, adventices, à revoir, photos) et les interventions
importées de Geofolia (semis, traitements avec dose par hectare, fertilisation). Tout reste sur le téléphone et
fonctionne sans réseau.

Contexte complet et décisions : [`CLAUDE.md`](CLAUDE.md).

## Utilisation

1. **Réglages › Importer le ZIP Geofolia** : export « Parcelles et interventions complet (ZIP) ». À refaire quand
   tu veux : le ZIP remplace la campagne, tes notes ne bougent pas.
2. **Réglages › Contours (Jalon)** : repris tout seuls de Jalon s'il est ouvert sur le même téléphone, sinon importer
   un TASKDATA.XML exporté par Jalon. Les contours de Geofolia ne sont jamais utilisés.
3. **Plaine › Me situer** : la parcelle où tu es apparaît en haut, « Noter ici ».
4. **Noter** (bouton rond) : parcelle, pastilles (type, stade, ce que tu vois, gravité, à revoir), remarque (micro du
   clavier pour dicter), photos.
5. **À revoir** : les parcelles à repasser voir, en retard d'abord.
6. **Interventions** : tous les traitements, semis, fertilisations de la campagne.
7. **Réglages › Enregistrer dans un fichier** de temps en temps (Partager › Drive) pour ne rien perdre.

Appui long sur l'icône de l'appli : « Nouvelle note » et « À revoir » directement.

## Données

Les vrais exports (ZIP Geofolia, TASKDATA) ne doivent **jamais** être committés. Les ranger dans `donnees_locales/`
(ignoré) : `npm test` les lit en plus des données fictives.

## Commandes

| Commande        | Effet                                                   |
| --------------- | ------------------------------------------------------- |
| `npm install`   | Installe les outils (une seule fois)                    |
| `npm run dev`   | Lance la page sur http://localhost:5173                 |
| `npm test`      | Lance les tests                                         |
| `npm run check` | Mise en forme, typage et tests (ce que vérifiera la CI) |
| `npm run build` | Construit le site dans `dist/`                          |

## Publication

GitHub Pages, depuis un dépôt public à part (comme Jalon) : `.github/workflows/publier.yml` vérifie, construit et
publie à chaque envoi sur `main` (Settings › Pages › Source : GitHub Actions).
