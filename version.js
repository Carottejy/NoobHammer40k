/* Numéro de version + notes de version. À mettre à jour à chaque publication (sw.js s'en sert pour renouveler le cache). */
var APP_VERSION = '1.41.1';
var APP_RELEASES = [
  { v: '1.41.1', date: '2026-10-19', notes: ['Creator : les unités sont repliées par défaut (ajout et réouverture de la liste).','Creator : le descriptif de l\'amélioration choisie s\'affiche, avec un bloc repliable pour lire toutes les améliorations disponibles avant de choisir.']},
  { v: '1.41.0', date: '2026-10-19', notes: ['Creator : choix des options d\'armement avec leurs restrictions (nombre de figurines, « pour chaque tranche de N », une option parmi plusieurs, armes déjà remplacées, conditions « si équipé de… »).','Armées : seules les armes et options réellement choisies sont affichées (équipement de base + remplacements) ; la liste des options possibles n\'y figure plus.']},
  { v: '1.40.1', date: '2026-10-18', notes: ['Données : équipements payants et paliers de points en double corrigés (Impulsor, Redemptor, Terminators, Desolation, Invader, Repulsor Executioner…).','Armées : chaque unité affiche ses options choisies (équipements payants, armes retirées) et la liste de ses options d\'armement possibles ; le Creator affiche aussi ces options dans le panneau ⚙️ Options.']},
  { v: '1.40.0', date: '2026-10-18', notes: ['Datasheets : ajout des « Options d\'armement » de chaque unité (remplacements et équipements possibles), en français et en anglais, visibles dans la base de données et dans le Creator.']},
  { v: '1.39.2', date: '2026-10-18', notes: ['Armées : chaque unité est suivie de ses meneurs et appuis rattachés (indentés).']},
  { v: '1.39.1', date: '2026-10-18', notes: ['Calculs : les Attaques fixées par une règle (ex. « ont D3+3 A ») remplacent maintenant celles de l\'arme, au lieu d\'être ignorées.']},
  { v: '1.39.0', date: '2026-10-18', notes: ['Stratagèmes : le résumé « Pris en compte dans le calcul » est refait pour les 1443 stratagèmes : filtres d\'armes (Torrent, armes nommées, sauf…), mêlée/tir, conditions, « à la place », choix d\'options.','Stratagèmes : les effets défensifs ou sur l\'adversaire sont séparés (🛡️) au lieu d\'être affichés comme des bonus.','Calculs : Anti multiples et « Anti-non-… », bonus « +1 pour toucher », conditions de Force/Endurance, de cible et de mots-clés mieux lues.']},
  { v: '1.38.1', date: '2026-10-18', notes: ['Calculs : les règles conditionnées par « Faction d\'armée est … » et par « Doctrine … active » sont maintenant évaluées automatiquement (avant, 60 % des Touches létales/soutenues/dévastatrices restaient décochées).','Calculs : « choisissez une unité ennemie » est coché par défaut (à confirmer) ; les choix d\'options (Pactes Sombres…) donnent une case par option.','Capacités accordées en liste à puces (« ont : • [Lance] ») prises en compte.'] },
  { v: '1.38.0', date: '2026-10-18', notes: ['Calculs : toutes les capacités d\'arme accordées par une règle, un meneur, un appui ou un stratagème sont lues (Torrent, Jumelé, Lourd, Tir rapide, Lance, Psychique, Précision…), avec leurs conditions de cible (« non-Monstre/Véhicule »).','Calculs : Touches soutenues D3, « Attaques bonus », Abattage, Tir rapide D6+3 et qualificatifs des Touches fatales / Blessures dévastatrices / Touches soutenues d\'une arme sont pris en compte.','Calculs : annulation du couvert (« ne peut pas bénéficier du Couvert »), couvert accordé à la cible, Furtivité de la cible.','Options « choisissez l\'une des capacités » : une option par ligne au lieu d\'un cumul.'] },
  { v: '1.37.1', date: '2026-10-17', notes: ['Partie : les règles identiques apportées par plusieurs unités (ex. Doctrines de combat) sont fusionnées, avec la liste des sources.','Calculs : « Touches Létales » (et non seulement « Fatales ») est maintenant reconnu, y compris quand il vient d\'un meneur ou d\'un appui rattaché.'] },
  { v: '1.37.0', date: '2026-10-17', notes: ['Option 🇬🇧 English : l\'onglet Règles est aussi disponible en anglais (résumé).'] },
  { v: '1.36.0', date: '2026-10-17', notes: ['Onglet Armées et Creator totalement indépendants de la partie en cours (toujours les listes de la bibliothèque).','Datasheets : coût en points affiché (fiche, listes et détail du Creator).','Option de langue : datasheets, détachements et stratagèmes en anglais d\'origine (boutons 🇫🇷 / 🇬🇧).','Modifier une liste ouvre directement le constructeur du Creator.'] },
  { v: '1.35.1', date: '2026-10-16', notes: ['Données : texte de « Brandir la Bannière » corrigé (Ancien, Gardelame, Terminator, Héros de Compagnie, Gardiens d\'Ultramar).'] },
  { v: '1.35.0', date: '2026-10-16', notes: ['Creator : « Voir le détail » de l\'unité directement dans le Creator (unités à ajouter et unités de la liste), sans changer d\'onglet.'] },
  { v: '1.34.1', date: '2026-10-16', notes: ['Creator : lien « Datasheet » aussi sur les unités à ajouter.'] },
  { v: '1.34.0', date: '2026-10-16', notes: ['Creator : points affichés sur les unités ajoutables, seules celles qui rentrent dans les points restants sont proposées (« Points insuffisants » sinon).','Creator : lien « Datasheet » sur chaque unité de la liste.'] },
  { v: '1.33.3', date: '2026-10-16', notes: ['Ouvrir une partie : plus de confirmation inutile (seulement si une partie en cours n\'est pas enregistrée).'] },
  { v: '1.33.2', date: '2026-10-16', notes: ['Liste adverse en partie : la flèche (et le retour du téléphone) revient à la partie en cours.'] },
  { v: '1.33.1', date: '2026-10-16', notes: ['Liste adverse : une ligne par unité (nom, points, E, Sv, effectif, PV), tout le reste dans « Voir le détail ».'] },
  { v: '1.33.0', date: '2026-10-16', notes: ['Partie : PC adverses affichés (lecture seule, partie en ligne).','« À ne pas oublier » : replié par défaut, placé au-dessus du choix d\'unité, rappels trop génériques retirés.'] },
  { v: '1.32.1', date: '2026-10-16', notes: ['Liste adverse : « Voir le détail » placé juste sous le nom de chaque unité.'] },
  { v: '1.32.0', date: '2026-10-16', notes: ['Partie : bouton « ⚔️ Adversaire » toujours en haut (onglet Adverse supprimé).','Partie locale : plus de bloc « Partie en ligne » ni d\'attente d\'adversaire, plus de message de création ni de bouton de sauvegarde auto (💾 conservé).'] },
  { v: '1.31.1', date: '2026-10-16', notes: ['Nouvelle partie : plus d\'adversaire fantôme resté d\'une partie précédente.'] },
  { v: '1.31.0', date: '2026-10-16', notes: ['Nouvelle partie locale : choix de la liste adverse (plus tard / import PDF ALN ou NoobHammer40k / une liste de l\'appli).','Les PDF exportés par NoobHammer40k contiennent la liste complète : ils se réimportent tels quels (adversaire ou onglet Armées).'] },
  { v: '1.30.1', date: '2026-10-16', notes: ['Datasheets : les noms d\'unités cités dans le texte des aptitudes sont aussi des liens.'] },
  { v: '1.30.0', date: '2026-10-16', notes: ['Datasheets : les unités citées (Peut rejoindre, Meneurs possibles) sont des liens ; « Retour » revient à la fiche précédente.'] },
  { v: '1.29.0', date: '2026-10-16', notes: ['Creator : bouton « Sauvegarder » (nouvelle liste ou modification) qui enregistre et revient à l\'accueil du Creator.'] },
  { v: '1.28.1', date: '2026-10-16', notes: ['Correction d\'une erreur de syntaxe de la v1.28.0.'] },
  { v: '1.28.0', date: '2026-10-16', notes: [
    'Creator : on arrive sur « Nouvelle liste / Modifier une armée », les options se déplient au clic.',
    'Creator : code YellowScribe retiré.'
  ] },
  { v: '1.27.1', date: '2026-10-16', notes: [
    'PDF : aptitudes complètes (plus de texte tronqué) ; les règles de déploiement / transport / téléportation sont ignorées.'
  ] },
  { v: '1.27.0', date: '2026-10-16', notes: [
    'PDF : toujours une seule page A4 (police la plus grande possible qui tient).',
    'PDF : colonne Aptitude = effets de jeu résumés (sans titres, sans Meneur / Doctrines / etc.).'
  ] },
  { v: '1.26.0', date: '2026-10-16', notes: [
    'PDF : police plus grande, colonnes chiffrées au plus étroit, « Nb » = 1 pour les figurines seules.',
    'PDF : équipements des sergents en rouge, aptitudes des chefs/appuis agissant sur leur unité en rouge, chefs et appuis gardés avec leur unité.',
    'PDF : colonne de droite avec les stratagèmes non génériques de la liste.'
  ] },
  { v: '1.25.0', date: '2026-10-16', notes: [
    'Export PDF repensé comme ton tableur Salamander : un bloc par unité (Pt, figurine, profil M/E/SV/PV/CD/CO, aptitudes) avec un tableau d\'armes aligné (P, A, C/T, F, PA, D, mots-clés d\'arme).',
    'Mots-clés sous chaque unité, chefs et appuis regroupés ; une seule page si possible, sinon armes condensées sur 2-3 pages.'
  ] },
  { v: '1.24.0', date: '2026-10-16', notes: [
    'Export PDF : une seule page A4 paysage, tout dans un tableau (une ligne par unité : figurines, points, profil, armes principales, aptitudes, mots-clés). Chefs et appuis regroupés sous leur unité. La taille du texte s\'adapte à la longueur de la liste.'
  ] },
  { v: '1.23.0', date: '2026-10-16', notes: [
    'Export PDF repensé : chefs et appuis regroupés avec l\'unité qu\'ils rejoignent, bandeau d\'unité, caractéristiques encadrées, mots-clés, tableau d\'armes aligné (portée, attaques, touche, force, PA, dégâts, capacités) et aptitudes dans des encarts séparés.'
  ] },
  { v: '1.22.0', date: '2026-10-16', notes: [
    'Armées : un seul encart « Importer une liste » avec trois onglets (PDF ALN, Texte / BBCode, JSON) ; le message bleu de confirmation est supprimé (les avertissements restent).',
    'Armées : bouton « 📄 PDF » sur chaque armée pour exporter la liste en PDF (détachements, règles, unités, équipement, armes, aptitudes).'
  ] },
  { v: '1.21.2', date: '2026-10-16', notes: [
    'Armées : suppression du message au-dessus de « Nouvelle liste » et de la mention « (autre appareil) » dans les noms.'
  ] },
  { v: '1.21.1', date: '2026-10-16', notes: [
    'Correctif : le message « partie rapide non enregistrée en cours » ne s\'affiche plus à tort dans l\'onglet Parties.'
  ] },
  { v: '1.21.0', date: '2026-10-16', notes: [
    'Parties : « Nouvelle partie » est un bouton. Il propose partie locale (liste adverse facultative) ou en ligne (par code ou en invitant un ami), le choix de ta liste, puis la création.',
    'Le bouton « Partie rapide » est supprimé. Rejoindre une partie par code ou invitation reste dans une carte à part.'
  ] },
  { v: '1.20.0', date: '2026-10-16', notes: [
    'Parties : c\'est la partie qui a une liste associée (et non l\'inverse). Elle s\'affiche en tête de la partie, et tu peux en changer depuis l\'onglet Armées pendant la partie.',
    'Les listes de la bibliothèque ne portent plus aucune mention de partie.'
  ] },
  { v: '1.19.0', date: '2026-10-16', notes: [
    'Armées : liste compacte (nom, faction, points). Touche une armée pour voir son détail : détachements, règles d\'armée et de détachement, puis unités repliées (nom, figurines, points) que tu dépliles pour voir profil, équipement, armes et aptitudes.'
  ] },
  { v: '1.18.0', date: '2026-10-16', notes: [
    'Amis : ajoute un ami par son pseudo, accepte les demandes, et invite-le à une partie en ligne en un clic (en plus du système de code). Les invitations apparaissent sur l\'accueil.',
    'Accueil : suppression des blocs « partie en cours ».'
  ] },
  { v: '1.17.1', date: '2026-10-16', notes: [
    'Le compte et la connexion sont maintenant sur la page d\'accueil.'
  ] },
  { v: '1.17.0', date: '2026-10-16', notes: [
    'Comptes (Infos) : crée un compte (pseudo, email, mot de passe) pour retrouver tes armées et tes parties sur tous tes appareils, avec fusion automatique. Prépare la future liste d\'amis.'
  ] },
  { v: '1.16.2', date: '2026-10-16', notes: [
    'Lisibilité : les mots-clés sélectionnés (orange sur orange) et les listes déroulantes (texte clair sur fond blanc) sont de nouveau lisibles.'
  ] },
  { v: '1.16.1', date: '2026-10-16', notes: [
    'Assistant : chaque unité propose son équipement de base, les options payantes retenues, la liste des armes (★ = armes utilisées en priorité) et toutes ses règles et aptitudes dépliables ; les règles et stratagèmes du détachement et le texte de l\'amélioration choisie sont consultables.',
    'Assistant : les options payantes retenues sont transmises à Creator avec la liste.'
  ] },
  { v: '1.16.0', date: '2026-10-16', notes: [
    'Assistant : plusieurs styles de jeu combinables, mots-clés à privilégier (✓) ou exclure (✗) avec filtre, et un champ libre en français (« beaucoup de Terminators, 2 Dreadnought, sans aéronefs… ») avec récapitulatif de ce qui a été compris.',
    'Assistant : réglages avancés (chefs, taille des escouades, doublons, héros épiques, aéronefs).',
    'Assistant : pour chaque unité, rôle, raisons du choix et objectif de jeu, avec profil et armes clés.'
  ] },
  { v: '1.15.0', date: '2026-10-16', notes: [
    'Nouvel onglet « Assistant » (sans IA générative) : choisis faction, chapitre, format, style de jeu, détachement et mot-clé ; l\'appli compose 3 listes (Ligne pour les objectifs, chefs rattachés, seigneur de bataille, améliorations) à ouvrir dans Creator ou à créer directement.',
    'Correctif : un détachement sans coût de points n\'affiche plus « ( pt) ».'
  ] },
  { v: '1.14.1', date: '2026-10-15', notes: [
    'Les imports (PDF, texte ALN, BBCode, JSON) restent dans l\'onglet « Armées » ; Creator ne garde que « Nouvelle liste » et « Modifier une armée ».'
  ] },
  { v: '1.14.0', date: '2026-10-15', notes: [
    'Armées : l\'onglet présente maintenant la liste de tes armées (choisir, modifier, supprimer) avec le détail de l\'armée choisie.',
    'Creator : trois modes — Construire, Importer (PDF, texte ALN, BBCode, JSON) et Modifier (unités, règles, renommer). Une liste construite peut être rouverte dans le constructeur et mise à jour.',
    'Accueil : titre en haut, encart « Comment ça marche » supprimé.'
  ] },
  { v: '1.13.0', date: '2026-10-15', notes: [
    'Onglets réordonnés : Accueil, Armées, Parties, Adverse, Creator, Datasheets, Stratagèmes, Règles, Infos (« Liste » devient « Creator », « Base » devient « Datasheets »).',
    'Nouvel onglet « Règles » : règles de base de la 11e édition résumées en français (concepts, phases, décor, objectifs, stratagèmes, actions, transports, unités rattachées, réserves, aéronefs, aptitudes de base) avec recherche.',
    'Stratagèmes de base mis à jour d\'après les règles de la 11e (Tir d\'Alerte en fin de Mouvement adverse, Intervention Héroïque, Contre-offensive, etc.).'
  ] },
  { v: '1.12.2', date: '2026-10-15', notes: [
    'Création de liste : choix du seigneur de bataille (👑), repris dans l\'armée et dans le code YellowScribe.',
    'Correctif : les descriptifs d\'aptitudes ne commencent plus par un titre parasite avec des chiffres (ex. « CHEF24.22 »).'
  ] },
  { v: '1.12.1', date: '2026-10-15', notes: [
    'Création de liste : zones repliables (réglages, chapitre, détachements, ajout, chaque unité) + « Tout replier / déplier ».',
    'Création de liste : les unités peuvent être renommées (le nom est repris dans l\'armée).',
    'Partie : les stratagèmes dont la cible ne correspond pas aux mots-clés de l\'unité sont masqués (bouton pour les afficher).',
    'Armées importées : détachements, règles, stratagèmes et améliorations traduits en français automatiquement.'
  ] },
  { v: '1.12.0', date: '2026-10-15', notes: [
    'Création de liste (Space Marines) : choix du chapitre ; les détachements et unités propres à un autre chapitre sont masqués.',
    'Mots-clés : affichés sur les unités, recherche par nom ou mot-clé, filtre par mot-clé (Création de liste et Base), touche un mot-clé d\'une fiche pour lister les unités qui l\'ont.',
    'Améliorations, stratagèmes : filtrés selon les mots-clés de l\'unité (« Figurine X uniquement », cible du stratagème).',
    'Traductions : noms de mots-clés, types de stratagèmes/aptitudes et textes de l\'appli (Choc de Bataille, Tir d\'Alerte, etc.) passés en français.'
  ] },
  { v: '1.11.1', date: '2026-10-15', notes: [
    'Traduction française complète des descriptifs Wahapedia (stratagèmes, améliorations, règles, capacités) : plus aucun texte en anglais dans la base.',
    'Traduction au mieux : la terminologie peut différer légèrement de la version française officielle.'
  ] },
  { v: '1.11.0', date: '2026-10-15', notes: [
    'Onglet « Base » rétabli (consultation des données Wahapedia).',
    'Création de liste : « Ajouter une unité » est maintenant au-dessus des unités ajoutées.',
    'Le code YellowScribe se trouve désormais dans l\'onglet « Armée ».',
    'Traductions : tous les noms (détachements, stratagèmes, améliorations, capacités) sont en français ; une grande partie des descriptifs aussi, le reste est signalé « EN ».'
  ] },
  { v: '1.10.1', date: '2026-10-15', notes: [
    'Correctif : l\'appli ne démarre plus sur « Liste » et ne recharge plus en boucle si les données de la base sont introuvables (message + bouton Réessayer).'
  ] },
  { v: '1.10.0', date: '2026-10-15', notes: [
    'Création de liste : générateur de texte YellowScribe (noms anglais, format application GW) avec bouton Copier.'
  ] },
  { v: '1.9.1', date: '2026-10-15', notes: [
    'Création de liste : points calculés automatiquement (taille de l\'unité, 1re/2e puis 3e+ unité identique) et équipements payants.'
  ] },
  { v: '1.9.0', date: '2026-10-15', notes: [
    'Nouvel onglet « Liste » (remplace « Base ») : crée une liste d\'armée en choisissant faction, format, détachements, unités, meneurs/appuis, améliorations, armes et aptitudes.',
    'Les stratagèmes et règles des détachements choisis sont ajoutés à l\'armée créée.',
    'Les points des unités sont à saisir (absents de la base) ; les améliorations ajoutent leur coût.'
  ] },
  { v: '1.8.1', date: '2026-10-15', notes: [
    'Base Wahapedia : ~1 800 noms d\'armes traduits en français (profils compris, ex. « Lance-missiles - krak »).',
    'Les noms et textes encore en anglais restent repérés « EN ».'
  ] },
  { v: '1.8.0', date: '2026-10-15', notes: [
    'Nouvel onglet « Base » : 1 501 fiches d\'unités Wahapedia (11e) avec profils, armes, aptitudes, mots-clés, meneurs possibles, et les détachements (règles, améliorations, stratagèmes).',
    'Utiliser une fiche comme cible, l\'ajouter à son armée, ou ajouter les stratagèmes d\'un détachement à son armée.',
    'À l\'import d\'un PDF ALN, les unités sans arme (ex. Custodiens Allarus) sont complétées automatiquement depuis la base.',
    'Traduction française en cours : les textes pas encore traduits sont repérés « EN ».'
  ] },
  { v: '1.7.1', date: '2026-10-15', notes: ['Les mises à jour s\'affichent dès la réouverture de l\'appli (chargement réseau d\'abord, cache hors connexion).'] },
  { v: '1.7.0', date: '2026-10-15', notes: [
    'Numéro de version et notes de version dans l\'onglet Infos.',
    'Unités détruites grisées (☠) dans les listes et non ciblables côté adverse.',
    'Section « Cible » masquée quand une armée adverse est chargée : la cible vient de sa liste.',
    'Armées liées aux parties : chaque partie a sa copie de ton armée et son adversaire ; ta bibliothèque reste intacte.',
    'Mise à jour automatique : bandeau « Nouvelle version disponible ».',
    'Import PDF ALN étendu à toutes les factions : meneurs/appuis rattachés, tableaux d\'armes complexes, stratagèmes de tous les détachements.',
    'Nouvelles formulations d\'effets reconnues dans les calculs (+N Attaques/Force/PA, −1 à la touche adverse…).'
  ] },
  { v: '1.0.0', date: '2026-10-01', notes: ['Première version : import ALN (texte, BBCode, PDF), calcul des jets, stratagèmes, armée adverse, parties, jeu en ligne.'] }
];
