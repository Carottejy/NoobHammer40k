# Mettre NoobHammer40k en ligne (gratuit, ~10 minutes)

Pour la **partie en ligne**, l'appli doit être accessible par une adresse https://… (et non ouverte depuis un fichier du PC). GitHub Pages le fait gratuitement. Tu n'as rien à installer.

## 1. Créer un compte GitHub
Va sur https://github.com, « Sign up », crée un compte gratuit (pseudo, e-mail, mot de passe).

## 2. Créer un dépôt
1. Clique sur le « + » en haut à droite → **New repository**.
2. *Repository name* : `noobhammer40k`
3. Coche **Public**.
4. Clique **Create repository**.

## 3. Envoyer les fichiers
1. Dézippe `noobhammer40k.zip` sur ton PC : tu obtiens un dossier `w40k-helper`.
2. Sur la page du dépôt vide, clique sur le lien **uploading an existing file**.
3. Ouvre le dossier `w40k-helper` et **sélectionne tout son contenu** (les fichiers `index.html`, `app.js`, … ET les dossiers `icons` et `lib`).
4. Glisse-les dans la page GitHub, attends la fin du chargement.
5. En bas, clique **Commit changes**.

## 4. Activer l'hébergement
1. Onglet **Settings** du dépôt → menu **Pages** (à gauche).
2. *Source* : **Deploy from a branch**. *Branch* : **main**, dossier **/ (root)** → **Save**.
3. Attends 1 à 2 minutes, recharge la page : l'adresse apparaît en haut, de la forme
   `https://TON-PSEUDO.github.io/noobhammer40k/`

## 5. Utiliser l'appli
- Ouvre l'adresse sur ton téléphone. Android (Chrome) : menu ⋮ → « Installer l'application ». iPhone (Safari) : Partager → « Sur l'écran d'accueil ».
- Envoie la même adresse à ton adversaire pour qu'il l'installe aussi.
- Onglet **Partie** → **Créer une partie en ligne** : un code de 5 caractères s'affiche. Ton adversaire le saisit dans **Rejoindre avec un code**.
- Tes listes d'armée restent sur ton téléphone : elles ne sont pas sur GitHub, seulement échangées en direct entre vous deux pendant la partie.

## Mettre à jour plus tard
Sur le dépôt : **Add file → Upload files**, glisse les nouveaux fichiers (ils remplacent les anciens), **Commit changes**. L'appli se met à jour à la prochaine ouverture avec internet.
