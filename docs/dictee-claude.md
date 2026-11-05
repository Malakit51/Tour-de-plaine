# Régler la dictée avec Claude

À faire une seule fois, de préférence sur un ordinateur. Durée : une dizaine de minutes.

La dictée rangée par Claude passe par l'**API d'Anthropic**. C'est un compte **à part** de ton abonnement Claude
(Pro ou Team) : il se paie **à l'usage**, avec du crédit acheté d'avance. Une note dictée coûte une fraction de
centime avec Haiku, environ 2 centimes avec Opus.

Ce qui part chez Anthropic : le texte de tes dictées et la liste de tes parcelles (nom, culture, variété). Ni
photos, ni position GPS.

## 1. Créer le compte

1. Ouvre <https://platform.claude.com> (la « Console » d'Anthropic).
2. Connecte-toi : avec ton adresse e-mail, ou « Continuer avec Google ». Même si c'est la même adresse que ton
   abonnement Claude, c'est un compte d'API distinct.
3. Si on te demande le type de compte : **individuel**, pour ton propre usage.

## 2. Les crédits : forfait Team, ou achat

**Avec un forfait Claude Team** : la Console propose « Votre forfait Team inclut 200 $US de crédits API par mois ».
Touche **Associer et récupérer 200 $US** (lis les conditions affichées en dessous) : **rien à acheter**, passe
directement à l'étape 4. Ces crédits sont mensuels (ce qui n'est pas utilisé expire à la fin de la période) et
servent avant tout crédit acheté. 200 $ par mois couvrent très largement la dictée, même avec Opus.

**Sinon, acheter un peu de crédit :**

1. Menu **Settings › Billing** (ou « Facturation »).
2. Ajoute ta carte bancaire, puis **Buy credits** : le **plus petit montant proposé** suffit largement (avec
   Haiku, plusieurs années de notes).
3. **Laisse le rechargement automatique (« Auto-reload ») désactivé** : tu rachèteras seulement quand l'appli te
   dira « Crédit épuisé ».

À savoir (aide officielle d'Anthropic, vérifié le 05/11/2026) : le crédit **expire un an après l'achat** et
**n'est pas remboursable**. Le montant minimum n'est pas indiqué dans l'aide : la page Billing le montre.

## 3. Fixer un plafond (si la Console le propose)

Dans **Settings › Limits**, si une limite de dépense mensuelle est proposée, mets-la bas (par exemple 5 $). Avec le
crédit acheté d'avance et sans rechargement automatique, tu ne peux de toute façon pas dépenser plus que ce crédit.

## 4. Créer la clé

1. Menu **API Keys** (ou « Clés API ») › **Create Key**.
2. Nom : `Tour de plaine - téléphone`. **Expire** : choisis la durée la plus longue proposée (1 an, ou « Jamais »),
   sinon la dictée s'arrête au bout de 30 jours. Compte lié et portée : laisse ce qui est proposé.
3. **Copie la clé** : elle commence par `sk-ant-` et **ne s'affiche qu'une fois**. Envoie-la-toi (par exemple dans
   un mail à toi-même) pour la coller sur le téléphone, puis supprime ce mail.

Ne la donne à personne et ne la colle nulle part ailleurs que dans l'appli : avec elle, on dépense ton crédit.

## 5. La mettre dans l'appli

1. Sur le téléphone, ouvre Tour de plaine › **Réglages › Dictée avec Claude**.
2. Colle la clé, touche **Vérifier et garder la clé** : l'appli vérifie qu'Anthropic l'accepte (sans rien dépenser).
3. Modèle : **Haiku** pour commencer. Tu peux changer quand tu veux ; une note mal comprise se refait avec Opus d'un
   toucher (« Re-ranger avec Opus »).

La clé reste sur ce téléphone : elle n'est jamais mise dans les sauvegardes. Sur un nouveau téléphone, recolle-la.

## Utilisation

**Noter › Dicter** : parle, touche **Arrêter**. Claude range la dictée tout de suite (s'il y a du réseau) : les
pastilles s'allument, la remarque se remplit avec une courte synthèse, ta dictée est gardée en dessous. Vérifie,
corrige si besoin, **Enregistrer**.

Sans réseau, la dictée est enregistrée telle quelle, marquée « Dictée à ranger » : ouvre la note quand tu as du
réseau, Claude la range, tu enregistres. La liste est dans **Réglages › Dictée avec Claude**.

Dans le **Journal**, **Résumer ce tour** écrit le compte rendu de la journée, à partager (mail, SMS…).

## En cas de problème

- **« Clé refusée ou expirée »** : clé mal copiée, arrivée à expiration, ou supprimée dans la Console. Recrées-en une.
- **« Crédit épuisé »** : rachète du crédit (Settings › Billing).
- **Téléphone perdu** : dans la Console, **API Keys**, supprime la clé ; personne ne pourra plus s'en servir.
- **« La dictée vocale a besoin du réseau »** : la reconnaissance de la voix de Chrome ne marche pas toujours hors
  réseau. Utilise alors le micro du clavier dans le champ de la dictée.
