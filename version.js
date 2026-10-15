/* Numéro de version + notes de version. À mettre à jour à chaque publication (sw.js s'en sert pour renouveler le cache). */
var APP_VERSION = '1.7.1';
var APP_RELEASES = [
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
