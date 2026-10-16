/* Numéro de version + notes de version. À mettre à jour à chaque publication (sw.js s'en sert pour renouveler le cache). */
var APP_VERSION = '1.18.0';
var APP_RELEASES = [
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
