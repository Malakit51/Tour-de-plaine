# Tour de plaine — carnet des observations et interventions par parcelle

Nom de travail : « Tour de plaine » (pas de nom définitif choisi au 29/10/2026 ; le changer plus tard comme pour Jalon, sans toucher à l'identifiant `tour-de-plaine` du manifeste ni aux clés de stockage).

## Objectif

Appli web installable sur le téléphone Android de Maxime (Chrome, écran d'accueil), comme Jalon et Valeur engrais : tenir un registre, par parcelle, des observations faites au champ pendant un tour de plaine (stade, maladies, ravageurs, adventices, peuplement…) et retrouver en un coup d'œil les interventions importantes (variété, date de semis, traitements phyto avec doses, fertilisation).

Utilisateur : un agriculteur (Maxime), pas un développeur. Le tutoyer, dans la conversation comme dans l'appli. Explications concrètes.

## Décisions (conversation du 29/10/2026)

- **Phyto purement informatif** : pas de registre officiel, pas de n° AMM, pas de base E-Phy. La traçabilité réglementaire reste dans Geofolia. On montre produit, dose/ha, date, parcelles.
- **Interventions importées de Geofolia**, pour éviter la double saisie : export « Parcelles et interventions complet (ZIP) » (Field.Json + Action.Json). On réimporte le ZIP de toute la campagne quand on veut : il remplace la campagne en entier, les notes ne bougent pas.
- **Les contours viennent de Jalon, jamais de Geofolia** : les contours Geofolia ne sont pas à jour (Maxime les corrige d'abord dans Jalon). Un import Geofolia ne touche jamais aux contours. Deux chemins : la session de Jalon gardée sur le même téléphone (clé `contour-parcelle/session`, lisible car les deux applis sont sur malakit51.github.io), reprise toute seule à l'ouverture ; ou un TASKDATA.XML exporté par Jalon (alors pas de reprise automatique). Une parcelle sans contour Jalon n'a pas de contour (pas de repli sur Geofolia).
- **Noms Geofolia ↔ Jalon** rapprochés automatiquement (numéro + début des lettres, morceau « /n ») ; correction à la main en bas de la fiche parcelle, gardée.
- **Deux applis séparées** (Jalon reste l'outil d'atelier pour la console ; Tour de plaine est le carnet de tous les jours), qui partagent leurs données sur le téléphone.
- **Dictée rangée par Claude** (décidée le 05/11/2026, à la place de la piste « appli Claude + copier-coller ») : API Anthropic, compte à part de l'abonnement, payé à l'usage, clé collée par Maxime dans Réglages › Dictée avec Claude, gardée sur le téléphone (valeur `cle-api`, **jamais dans les sauvegardes**), appel direct depuis le navigateur (`dangerouslyAllowBrowser`, voulu : pas de serveur). Modèle au choix dans les Réglages, **Haiku par défaut** (Maxime, pour le coût) ; « Re-ranger avec Opus » sur une dictée mal comprise. Voix → texte par la reconnaissance vocale de Chrome (`src/ia/voix.ts`) ; texte → pastilles + synthèse par Claude en sortie structurée JSON (`src/ia/claude.ts`, schéma avec la liste des parcelles en `enum`, effort `low`, reprise `fallbacks: "default"` pour Sonnet et Opus). Sans réseau : dictée gardée, note « à ranger », rangée à la prochaine ouverture avec du réseau. Sans clé : la dictée va dans la remarque. Journal : « Résumer ce tour » (compte rendu de la journée, gardé dans `resume/AAAA-MM-JJ`). Le forfait Team de Maxime inclut 200 $ de crédits API par mois (écran de la Console, 05/11/2026) : rien à acheter, le coût n'est plus un frein (Opus possible). Notice pour Maxime : `docs/dictee-claude.md` (crédit : expire un an après l'achat, non remboursable, minimum non publié ; rechargement automatique à laisser coupé).
- **Hors réseau complet** : tout marche sans réseau au champ (service worker + IndexedDB).

## Format de l'export Geofolia (vérifié sur le ZIP de la SARL GMT51, 22/10/2026, campagne 2027)

- ZIP : `Field.Json`, `Action.Json`, `IdentificationCodes.json` (SIRET des 3 exploitations). JSON avec BOM UTF-8.
- `Field.Json` › `Fields[]` : `Id` (change chaque campagne), `Name`, `HarvestYear`, `Area` (m²), `CropName`, `VarietyName`, `City`, `SoilName`, `FarmIdentificationCode`, `NMinus1Crop`…`NMinus5Crop`, `Geography` (WKT Lambert 93, ignoré), `SowingDate` (prévisionnelle, pas fiable). Plusieurs morceaux peuvent porter le même nom (« 131usag » ×2, « Sous le blanc mont » ×3) : regroupés. « 030noue /1 », « /2 », « /3 » sont des noms différents : gardés séparés.
- `Action.Json` › `Activities[]` : `ActionId`, `HarvestYear`, `StartingDate`, `StatusName` (« Réalisée », « Prévisionnelle », « Plan de fumure »), `OperationCategory` (« Traitement », « Semis/Plantation », « Fertilisation », « Travail du sol », « Autre »), `OperationName`, `Comment`, `CropZoneIds[]` (`PlotId` → `Field.Id`, `WorkedSurface` m²), `ProductIds[]` (`SupplyName`, `Quantity`, `ReferentialUnitSymbol`), `ActionEquipments[]`. Aussi : salariés, matériel, composition des engrais.
- **Doses** : Geofolia répartit chaque produit entre les parcelles au prorata de la surface (une ligne de produit par parcelle, sans lien explicite) ; dose/ha = quantité totale du produit ÷ surface totale travaillée (vérifié : Kalea 20 L sur 23,84 ha = 0,84 L/ha).
- Semences céréales et colza en unité « U » : des doses de semences (unités SMI), confirmé par Maxime le 05/11/2026 ; affichées « dose(s)/ha ».
- Doublon constaté dans Geofolia : traitement Kalea + Pilot + Estamina sur 31berl/32berl saisi le 16/09 et le 17/09 avec les mêmes quantités. L'appli signale ces cas (« Doublon possible »).
- Le ZIP ne contient qu'une campagne d'interventions : pour l'historique, importer aussi les exports des campagnes passées (une entrée par campagne).

## Données : ne jamais les publier

Les exports Geofolia contiennent SIRET, noms des salariés, parcelles ; les TASKDATA l'adresse e-mail et la position des parcelles. Jamais dans le dépôt : `donnees_locales/` (ignoré) pour les essais ; `tests/geofolia-reel.test.ts` tourne sur les ZIP qui s'y trouvent. Les tests utilisent des données fictives (`tests/fixtures/jalon-exemple.xml` vient des tests de Jalon). Tout reste sur le téléphone ; sauvegarde par fichier (bouton Partager › Drive).

Attention : le `.gitignore` d'Assolmax-perso ignore tout dossier nommé `donnees/` — d'où `src/registre/`.

## Technique

Vite + TypeScript sans framework (comme Jalon), `npm run check` (prettier, tsc, vitest). IndexedDB (`src/registre/base.ts`) : notes, photos (réduites à 1600 px JPEG), valeurs (imports par campagne `geofolia/AAAA`, `jalon`, `choix-contours`, `habitudes`, `reglages`). Navigation par l'adresse (`#plaine`, `#parcelle/<nom>`, `#noter[/<nom>]`, `#note/<id>`, `#revoir`, `#journal`, `#reglages`) : le retour du téléphone fonctionne. Raccourcis sur l'icône (manifeste) : « Nouvelle note », « À revoir ».

Retouches du 05/11/2026 (Maxime, au champ) : un seul précédent dans la fiche ; onglet actif marqué d'une pastille verte ; historique de la fiche rangé par rubrique (Mes notes, Semis, Travail du sol, Engrais, Traitements, Autres) ; Plaine en deux vues, Liste ou Carte (`src/app/carte.ts` : photo IGN comme Jalon, parcelles colorées par culture, sans leur nom (demandé le 05/11/2026 : ça surchargeait), bord ambre si une note est à revoir, toucher = fiche).

Décision du 05/11/2026 : **l'appli est une appli d'observation, pas d'enregistrement des interventions.** La saisie ne propose plus de type (plus de Semis, Traitement, Fertilisation, Autre) : toute note est une observation (`type` reste dans le modèle pour les anciennes notes, remis à « Observation » quand on les modifie). Les interventions ne viennent que de Geofolia et ne se voient que dans la fiche parcelle. L'onglet Interventions (doublon des fiches) est remplacé par **Journal** (`src/app/journal.ts`) : la synthèse de tous les tours de plaine, une journée = un tour, avec le point des 7 derniers jours et les parcelles pas vues depuis 15 jours. Dans le Journal, une observation ne montre que des pastilles (stade, constats, gravité, à revoir, nombre de photos) ; remarque, dictée et photos sont repliées sous « Remarque » (demandé le 05/11/2026). Appui long sur une observation : menu Modifier / Supprimer.

Installation : le menu ⋮ de Chrome dit l'appli « déjà installée » (Jalon est installé à la même adresse malakit51.github.io). Comme dans Valeur engrais, la page propose elle-même « Installer » (bandeau en haut de Plaine et de Réglages, `src/app/installation.ts`, événement `beforeinstallprompt`) : cette fenêtre-là ne fait pas ce test.

Fichiers repris de Jalon : `src/sources/taskdata.ts` (lecture du TASKDATA, sans modification), `src/formats/dezip.ts`, `src/ui/dom.ts`, la direction visuelle « Plein champ ».

## Hébergement

Dépôt public Malakit51/Tour-de-plaine (créé le 05/11/2026), publié par GitHub Pages (`.github/workflows/publier.yml`, à chaque envoi sur `main`) : https://malakit51.github.io/Tour-de-plaine/. Même site que Jalon, d’où la lecture de sa session. La première version a été écrite dans Assolmax-perso (dossier `TourDePlaine/`), qui n’est plus à jour.

## Pistes notées, pas faites

- Bouton « Dicter à Claude » et import des notes de Claude (voir Décisions).
- Sauvegarde Google Drive automatique (reprendre `drive.ts` de Jalon, même ID client possible : même site).
- Recevoir le ZIP Geofolia par le bouton Partager d'Android (Web Share Target).
- Mode « Tour » : parcours enregistré et compte rendu des parcelles vues.
