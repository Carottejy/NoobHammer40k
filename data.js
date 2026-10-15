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
    'Teste le Choc de Bataille des unités sous la moitié de leurs effectifs. Une unité déjà en Choc de Bataille doit réussir un test pour s\'en libérer.',
    'Rappel : une unité en Choc de Bataille a son OC réduit, ne peut faire aucune action et ne peut pas être ciblée par tes stratagèmes (donc Bravoure Insensée se joue AVANT le jet).',
  ],
  move: [
    'Mouvement normal, Avance (+D6″, pas de tir sauf Assaut) ou Retraite (pas de tir ni de charge).',
    'Les unités peuvent traverser librement tes unités amies et pivoter gratuitement.',
    'Cohésion : chaque figurine à 9″ ou moins de toutes les autres figurines de l\'unité (à vérifier dans la règle).',
    'Arrivées en réserve / infiltration : pense à tes unités en Frappe en profondeur.',
  ],
  shoot: [
    'Choisis les armes avec lesquelles l\'unité tire ; vérifie Avance/Assaut et Engagement/Pistolet.',
    'Couvert = −1 à la touche (plus de bonus à la sauvegarde). Tir plongeant (≥ 3″ plus haut) = +1 CT.',
    'Rappel : une unité ne peut bénéficier que d\'un stratagème par phase.',
  ],
  charge: [
    'Déclare la charge (ennemi à 12″), lance 2D6, puis choisis seulement ensuite la cible que tu peux atteindre (à vérifier dans la règle).',
    'Un Relance de Commandement sur une charge relance les DEUX dés.',
    'Intervention Héroïque / Tir d\'Alerte de l\'adversaire se jouent en réaction : pense à les anticiper.',
  ],
  fight: [
    'Le joueur actif active ses unités en premier ; Combat en premier (Frappe en Premier) change l\'ordre.',
    'mise en contact, attaques, puis consolidation.',
    'Rappel : Lance (+1 blessure) n\'agit que si l\'unité a chargé ce tour.',
  ],
};

/* Stratagèmes de base (Core). turn: 'mine' | 'opp' | 'either' */
const CORE_STRATS = [
  { id: 'command_reroll', name: 'Relance de Commandement', cp: 1, phases: ['command', 'move', 'shoot', 'charge', 'fight'], turn: 'either', verify: false,
    when: 'N\'importe quelle phase, juste après un jet d\'Avance, de Charge, de Dégâts, de danger, de Touche, de Blessure ou de Sauvegarde pour une unité/figurine amie, ou le nombre d\'attaques d\'une arme.',
    effect: 'Relance ce jet. Si plusieurs dés sont lancés ensemble, relance l\'un d\'eux (un jet de charge se relance en entier).',
    tip: 'Une même unité ne peut pas recevoir deux stratagèmes dans la même phase.' },
  { id: 'insane_bravery', name: 'Bravoure Insensée', cp: 1, phases: ['command'], turn: 'mine', verify: false,
    when: 'Étape de Choc de Bataille de ta phase de Commandement, juste avant un jet de Choc de Bataille pour une unité amie.',
    effect: 'Ce jet de Choc de Bataille réussit automatiquement.',
    tip: 'Une seule fois par bataille.' },
  { id: 'epic_challenge', name: 'Défi Épique', cp: 1, phases: ['fight'], turn: 'either', verify: false,
    when: 'Phase de Combat, juste après qu\'une unité PERSONNAGE amie est choisie pour combattre.',
    effect: 'Une figurine PERSONNAGE de l\'unité a [PRÉCISION] sur ses armes de mêlée jusqu\'à la fin de la phase.',
    tip: '' },
  { id: 'explosives', name: 'Explosifs', cp: 1, phases: ['shoot'], turn: 'mine', verify: false,
    when: 'Ta phase de Tir, avec une unité EXPLOSIFS/GRENADES non engagée, éligible pour tirer et sans Avance ce tour.',
    effect: 'Choisis une figurine EXPLOSIFS/GRENADES et une unité ennemie non engagée, visible et à 8" ou moins : lance 6D6, chaque 4+ inflige 1 blessure mortelle.',
    tip: '' },
  { id: 'rapid_ingress', name: 'Insertion Rapide', cp: 1, phases: ['move'], turn: 'opp', verify: false,
    when: 'À la fin de la phase de Mouvement ADVERSE, avec une unité amie en réserves stratégiques (hors AÉRONEF).',
    effect: 'L\'unité fait un mouvement d\'Insertion.',
    tip: 'Impossible au premier round.' },
  { id: 'fire_overwatch', name: 'Tir d\'Alerte', cp: 1, phases: ['move'], turn: 'opp', verify: false,
    when: 'À la fin de la phase de Mouvement ADVERSE, avec une unité amie non engagée (hors TITANESQUE).',
    effect: 'L\'unité tire en tir instinctif : une seule unité ennemie visible à 24", touche seulement sur 6 non modifié, pas de relance.',
    tip: 'Tir instinctif : seule une unité visible à 24" ou moins peut être ciblée.' },
  { id: 'smokescreen', name: 'Écran de Fumée', cp: 1, phases: ['shoot'], turn: 'opp', verify: false,
    when: 'Début de la phase de Tir ADVERSE, avec une unité amie FUMIGÈNES.',
    effect: 'Jusqu\'à la fin de la phase, la cible bénéficie du couvert contre les attaques si c\'est l\'unité FUMIGÈNES ou si elle n\'est pas entièrement visible à cause de figurines FUMIGÈNES.',
    tip: 'Inutile si l\'attaquant a [IGNORE LE COUVERT] ou [TORRENT].' },
  { id: 'heroic_intervention', name: 'Intervention Héroïque', cp: 1, phases: ['charge'], turn: 'opp', verify: false,
    when: 'À la fin de la phase de Charge ADVERSE, avec une unité amie non engagée à 12" ou moins d\'un ennemi (un VÉHICULE seulement s\'il est PERSONNAGE/WALKER).',
    effect: 'Résous une charge avec ton unité. Mode « Bondir à la défense » : seulement les unités ennemies qui ont chargé. Mode « Dans la mêlée » (+1 PC) : jet de charge plafonné à 6, toute unité ennemie à 6" ou moins.',
    tip: '' },
  { id: 'counteroffensive', name: 'Contre-offensive', cp: 2, phases: ['fight'], turn: 'opp', verify: false,
    when: 'Étape de combat de la phase de Combat ADVERSE, juste après qu\'une unité ennemie a résolu ses attaques.',
    effect: 'Une unité amie éligible pour combattre a Combat en Premier jusqu\'à la fin de la phase et doit être la prochaine unité que tu choisis pour combattre.',
    tip: 'Ne peut pas être utilisé pendant ton propre tour.' },
  { id: 'crushing_impact', name: 'Impact Écrasant', cp: 1, phases: ['charge'], turn: 'mine', verify: false,
    when: 'Ta phase de Charge, juste après qu\'une unité MONSTRE/VÉHICULE amie termine un mouvement de charge.',
    effect: 'Choisis une unité ennemie engagée et une figurine de ton unité engagée avec elle : lance autant de D6 que son Endurance ; chaque 5+ = 1 blessure mortelle à l\'ennemi (max 6), chaque 1 = 1 blessure mortelle à ton unité.',
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
