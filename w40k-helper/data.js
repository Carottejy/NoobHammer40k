/* Données de règles pré-remplies (paraphrasées, 11e édition).
   `verify: true` = coût ou détail à confirmer dans l'appli officielle Warhammer 40,000. */
const PHASES = [
  { id: 'command', label: 'Commandement' },
  { id: 'move', label: 'Mouvement' },
  { id: 'shoot', label: 'Tir' },
  { id: 'charge', label: 'Charge' },
  { id: 'fight', label: 'Combat' },
];

const PHASE_REMINDERS = {
  command: [
    'Gagne tes PC et applique les capacités de début de Commandement.',
    'Teste le Battle-shock des unités sous la moitié de leurs effectifs. Une unité déjà en Battle-shock doit réussir un test pour s\'en libérer.',
    'Rappel : une unité en Battle-shock a son OC réduit, ne peut faire aucune action et ne peut pas être ciblée par tes stratagèmes (donc Insane Bravery se joue AVANT le jet).',
  ],
  move: [
    'Mouvement normal, Avance (+D6″, pas de tir sauf Assaut) ou Retraite (pas de tir ni de charge).',
    'Les unités peuvent traverser librement tes unités amies et pivoter gratuitement.',
    'Cohésion : chaque figurine à 9″ ou moins de toutes les autres figurines de l\'unité (à vérifier dans la règle).',
    'Arrivées en réserve / Ingress : pense à tes unités en Frappe en profondeur.',
  ],
  shoot: [
    'Choisis les armes avec lesquelles l\'unité tire ; vérifie Avance/Assaut et Engagement/Pistolet.',
    'Couvert = −1 à la touche (plus de bonus à la sauvegarde). Tir plongeant (≥ 3″ plus haut) = +1 CT.',
    'Rappel : une unité ne peut bénéficier que d\'un stratagème par phase.',
  ],
  charge: [
    'Déclare la charge (ennemi à 12″), lance 2D6, puis choisis seulement ensuite la cible que tu peux atteindre (à vérifier dans la règle).',
    'Un Command Re-roll sur une charge relance les DEUX dés.',
    'Heroic Intervention / Fire Overwatch de l\'adversaire se jouent en réaction : pense à les anticiper.',
  ],
  fight: [
    'Le joueur actif active ses unités en premier ; Combat en premier (Fights First) change l\'ordre.',
    'Pile-in, attaques, puis consolidation.',
    'Rappel : Lance (+1 blessure) n\'agit que si l\'unité a chargé ce tour.',
  ],
};

/* Stratagèmes de base (Core). turn: 'mine' | 'opp' | 'either' */
const CORE_STRATS = [
  { id: 'command_reroll', name: 'Command Re-roll', cp: 1, phases: ['command', 'move', 'shoot', 'charge', 'fight'], turn: 'either', verify: false,
    when: 'Juste après un jet d\'Avance, de Charge, de Dégâts, de Hazardous, de Touche, de Blessure, de Sauvegarde, ou le nombre d\'attaques d\'une arme.',
    effect: 'Relance UN dé (sur une charge : les deux dés, en entier).',
    tip: 'Ne se cumule pas avec un autre stratagème sur la même unité dans la même phase.' },
  { id: 'insane_bravery', name: 'Insane Bravery', cp: 1, phases: ['command'], turn: 'mine', verify: false,
    when: 'Phase de Commandement, juste avant le jet de Battle-shock d\'une de tes unités.',
    effect: 'Le test de Battle-shock est réussi automatiquement.',
    tip: 'Une seule fois par bataille. Ne peut pas servir à sortir une unité déjà en Battle-shock.' },
  { id: 'epic_challenge', name: 'Epic Challenge', cp: 1, phases: ['fight'], turn: 'either', verify: false,
    when: 'Phase de Combat, juste après qu\'une de tes unités PERSONNAGE a été sélectionnée pour combattre.',
    effect: 'Un modèle PERSONNAGE de l\'unité gagne Précision pour ses armes de mêlée jusqu\'à la fin de la phase.',
    tip: '' },
  { id: 'explosives', name: 'Explosives (ex-Grenades)', cp: 1, phases: ['shoot'], turn: 'mine', verify: true,
    when: 'Ta phase de Tir, avec une unité portant le mot-clé GRENADES (ou EXPLOSIVES).',
    effect: 'Inflige des blessures mortelles à une unité ennemie proche (voir le texte exact de la règle).',
    tip: '' },
  { id: 'rapid_ingress', name: 'Rapid Ingress', cp: 1, phases: ['move'], turn: 'opp', verify: true,
    when: 'À la fin de la phase de Mouvement ADVERSE.',
    effect: 'Une de tes unités en réserve effectue un mouvement d\'Ingress (arrivée). Ne peut plus cibler les Aéronefs.',
    tip: '' },
  { id: 'fire_overwatch', name: 'Fire Overwatch', cp: 1, phases: ['move', 'charge'], turn: 'opp', verify: true,
    when: 'Pendant le tour adverse (réaction à un mouvement/une charge, voir la règle).',
    effect: 'Tir de réaction (Snap Shooting) : tes armes ne touchent que sur 6 non modifié et tu ne peux pas relancer les touches. Torrent touche automatiquement.',
    tip: 'Les lance-flammes (Torrent) sont les meilleurs tireurs de réaction.' },
  { id: 'smokescreen', name: 'Smokescreen', cp: 1, phases: ['shoot'], turn: 'opp', verify: true,
    when: 'Phase de Tir adverse, quand une de tes unités FUMIGÈNES est ciblée.',
    effect: 'L\'unité gagne le bénéfice du couvert (−1 CT pour l\'attaquant). Les unités derrière elle en profitent aussi (voir la règle).',
    tip: 'Inutile si l\'attaquant a Ignore le couvert ou Torrent.' },
  { id: 'heroic_intervention', name: 'Heroic Intervention', cp: 2, phases: ['charge'], turn: 'opp', verify: true,
    when: 'À la fin de la phase de Charge ADVERSE.',
    effect: 'Une de tes unités fait un mouvement de contre-charge.',
    tip: '' },
  { id: 'counteroffensive', name: 'Counteroffensive', cp: 2, phases: ['fight'], turn: 'opp', verify: true,
    when: 'Phase de Combat, pendant le tour de l\'adversaire.',
    effect: 'Une de tes unités gagne Fights First temporairement.',
    tip: 'Ne peut pas être utilisé pendant ton propre tour.' },
  { id: 'crushing_impact', name: 'Crushing Impact (ex-Tank Shock)', cp: 1, phases: ['charge'], turn: 'mine', verify: true,
    when: 'Ta phase de Charge, avec un MONSTRE ou un VÉHICULE.',
    effect: 'Inflige des blessures mortelles à l\'ennemi chargé ; sur un 1, ton propre modèle en subit aussi.',
    tip: '' },
];

const UNIT_ABILITY_PHASES = [
  { id: 'all', label: 'Toujours' }, { id: 'command', label: 'Cmd' }, { id: 'move', label: 'Mvt' },
  { id: 'shoot', label: 'Tir' }, { id: 'charge', label: 'Charge' }, { id: 'fight', label: 'Combat' },
  { id: 'def', label: 'Défense' },
];

const TARGET_KEYWORDS = [
  ['infantry', 'Infanterie'], ['vehicle', 'Véhicule'], ['monster', 'Monstre'], ['character', 'Personnage'],
  ['swarm', 'Nuée'], ['fly', 'Volant'], ['titanic', 'Titanesque'],
];
