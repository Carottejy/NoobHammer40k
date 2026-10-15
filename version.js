/* Numéro de version + notes de version. À mettre à jour à chaque publication (sw.js s'en sert pour renouveler le cache). */
var APP_VERSION = '1.10.0';
var APP_RELEASES = [
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
