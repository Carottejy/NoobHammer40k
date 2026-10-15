/* Règles de base de la 11e édition — résumé paraphrasé en français (pas le texte officiel).
   Format : { n:'01', g:'groupe', t:'Titre', s:[ { n:'01.01', t:'Titre', p:[ lignes ] } ] }
   Une ligne commençant par "- " est une puce, "## " un sous-titre, "| a | b |" une ligne de tableau, "! " un rappel/FAQ. */
const RULES11 = [];
RULES11.push(
{ n: '01', g: 'Règles de base', t: 'Concepts de base', s: [
  { n: '01.01', t: 'Armées', p: [
    '- Chaque joueur commande une armée composée d\'unités de figurines et contrôle toutes ses figurines.',
    '- Le « joueur qui contrôle » est celui qui contrôle les figurines concernées par une règle.' ] },
  { n: '01.02', t: 'Unités et figurines', p: [
    '- Une unité compte une ou plusieurs figurines qui se déplacent et combattent ensemble.',
    '- La plupart des figurines ont un socle ; il fait partie de la figurine pour toutes les règles.',
    '- Amies = de ton armée. Ennemies = de l\'armée adverse. Une règle qui ne précise ni l\'un ni l\'autre vise n\'importe quelle unité, quelle que soit l\'armée.',
    '- Un effet appliqué à une unité s\'applique à chacune de ses figurines.' ] },
  { n: '01.03', t: 'Joueur actif et joueur adverse', p: [
    '- Un joueur est actif, l\'autre est adverse ; les rôles s\'échangent quand l\'autre devient actif.',
    '- Hors du tour d\'un joueur (début/fin de round), le joueur qui joue en premier ce round est l\'actif.',
    '- Pendant son tour, un joueur est actif, sauf : quand une unité est choisie pour se déplacer, son propriétaire est actif jusqu\'à la fin du mouvement ; quand une unité est choisie pour tirer ou combattre, son propriétaire est actif jusqu\'à la résolution de ses attaques.' ] },
  { n: '01.04', t: 'Mesurer les distances', p: [
    '- Les distances se mesurent en pouces (").',
    '- Tu peux mesurer à tout moment.',
    '- Sauf indication contraire, on mesure depuis/vers la partie la plus proche du socle de la figurine.' ] },
  { n: '01.05', t: 'Dés', p: [
    '- Dés à six faces (D6).',
    '- Notations : X+ = résultat de X ou plus ; A-B = tout résultat entre A et B ; XD6 = lancer X D6 et additionner ; D3 = lancer un D6 et diviser par 2 en arrondissant au supérieur ; D6+1, 2D6+3… = additionner la valeur fixe.',
    '- Les sous-règles couvrent : réussite automatique, relances, modificateurs, ignorer les modificateurs, jets de départage (roll-off), doubles/triples, résultat le plus haut/bas, résultat « traité comme » ou « fixé à ».' ] },
  { n: '01.06', t: 'Jet de Commandement', p: [
    '- Le propriétaire lance 2D6.',
    '- Réussite si le résultat est supérieur ou égal à au moins une caractéristique Cd de l\'unité ; sinon échec.',
    '- La règle qui demande le jet définit les effets de la réussite et de l\'échec. « Test de Commandement » = « jet de Commandement ».' ] },
  { n: '01.07', t: 'Jet de Choc de Bataille', p: [
    '- C\'est un jet de Commandement fait pour une unité par son propriétaire. Réussite : l\'unité ne subit rien. Échec : l\'unité et chacune de ses figurines sont en Choc de Bataille.',
    '- Une unité en Choc de Bataille : le CO de toutes ses figurines devient « - » ; son propriétaire ne peut pas la cibler avec des stratagèmes ; elle ne peut pas commencer d\'action et celles déjà commencées ne peuvent pas être terminées.',
    '! Une unité qui passe en Choc de Bataille après avoir commencé une action arrête cette action. Une unité autorisée à commencer une action en Choc de Bataille peut poursuivre celle commencée avant.' ] }
] },
{ n: '02', g: 'Règles de base', t: 'Fiches techniques (datasheets)', s: [
  { n: '02.02', t: 'Profils', p: [
    '- Mouvement (M) : vitesse sur le champ de bataille. M « - » : la figurine peut être posée mais pas déplacée.',
    '- Endurance (E) : résistance aux dégâts.',
    '- Sauvegarde (Sv) : protection d\'armure, en cible de dé (ex. 4+).',
    '- Sauvegarde invulnérable (SvI) : protection hors armure, indiquée seulement si la figurine en a une.',
    '- Points de vie (PV) : dégâts que la figurine peut encaisser. À 0 ou moins, elle est détruite.',
    '- Commandement (Cd) : courage et maîtrise de soi, en cible de dé (ex. 7+).',
    '- Contrôle d\'Objectif (CO) : capacité à tenir les objectifs. CO « - » : ne peut pas contrôler d\'objectif.',
    '! Si une règle met les Dégâts d\'une attaque entrante à 0, le changement s\'applique après les jets de sauvegarde.',
    '! Les modificateurs au jet de charge ou à la distance maximale de charge (ex. Prendre son Envol) déterminent quelles cibles peuvent être choisies. Exemple : un jet de 7" avec +1 donne 8" max ; une unité volante qui prend son envol et fait 9" a 7" max (2" retirés). Si un modificateur appliqué après le choix met une cible hors de portée, il faut choisir de nouvelles cibles.' ] },
  { n: '02.03', t: 'Aptitudes', p: [
    '- La fiche liste les aptitudes de l\'unité. Catégories : aptitudes d\'aura (22.01), de faction (22.02), psychiques (22.03), d\'équipement (22.04).' ] },
  { n: '02.04', t: 'Armes', p: [
    '- Portée (P) : portée de tir. Portée « Mêlée » = arme de mêlée.',
    '- Attaques (A) : nombre de dés d\'attaque lancés à chaque utilisation.',
    '- Capacité de Tir (CT) : cible de touche des armes à distance (ex. 4+).',
    '- Capacité de Combat (CC) : cible de touche des armes de mêlée.',
    '- Force (F) : plus elle est haute, plus on blesse facilement.',
    '- Pénétration (PA) : modificateur au jet de sauvegarde (ex. -1). Plus il est grand, mieux l\'armure est percée.',
    '- Dégâts (D) : dégâts infligés par chaque attaque réussie.',
    '! Un bonus « +1 A » aux attaques à distance augmente de 1 la caractéristique A de chaque arme à distance ; il n\'ajoute pas un dé d\'attaque supplémentaire à chaque attaque.' ] },
  { n: '02.05', t: 'Mots-clés', p: [
    '- Deux groupes : mots-clés de faction (utilisés pour construire l\'armée) et autres mots-clés. Pour le reste, ils fonctionnent pareil.',
    '- Une règle qui vise un mot-clé n\'affecte que les unités qui l\'ont. Singulier et pluriel sont équivalents.',
    '! Un mot-clé composé ne contient pas le mot-clé de base : une règle sur COMMISSAIRE n\'affecte pas COMMISSAIRE GRAVES.' ] },
  { n: '02.06', t: 'Composition d\'unité et autres règles', p: [
    '- Indique le nombre et le type de figurines, leur équipement par défaut, et d\'autres règles (quelles unités un meneur peut rejoindre, qui peut embarquer dans un TRANSPORT…).',
    '! Si le Munitorum Field Manual donne d\'autres options de rattachement que la fiche, c\'est lui qui fait foi.' ] },
  { n: '02.07', t: 'Options d\'équipement', p: [
    '- Certaines fiches listent des options : tu peux les utiliser à la création de l\'armée pour changer armes et équipements.' ] }
] },
{ n: '03', g: 'Règles de base', t: 'Mouvement', s: [
  { n: '03.01', t: 'Déplacer des unités', p: [
    '- Chaque type de mouvement définit qui peut le faire, sa distance maximale (ou de mise en place) et ses conditions.',
    '- Tu déplaces les figurines une par une, en lignes droites et/ou rotations, autant que tu veux.',
    '- Sauf indication contraire, une figurine peut traverser les figurines amies et tout passage où son socle tient ; elle ne peut pas traverser de figurine ennemie ni sortir du champ de bataille ; elle doit respecter les conditions « pendant le mouvement ».',
    '- Ligne droite : horizontale, mesurée depuis le même point du socle au début et à la fin. Chaque ligne droite s\'ajoute au total ; il ne peut pas dépasser la distance maximale.',
    '- Rotation : autour du centre du socle, à plat ; elle ne compte pas dans la distance.',
    '- Fin du mouvement, vérifier : l\'unité est en cohésion ; aucune figurine n\'est sur une autre ni à cheval sur une surface de décor (mur, plafond) ; toutes les conditions « après le mouvement » sont remplies. Sinon le mouvement est impossible et les figurines reviennent à leur position de départ.',
    '- Types de mouvement : Avance (09.06), Charge (11.04), Consolidation (12.08), Débarquement (18.04), Débarquement d\'urgence (18.05), Retraite (09.07), Insertion (20.04), Normal (09.05), Mise au contact (12.03), Éclaireurs (24.32), Élan (21.02).' ] },
  { n: '03.02', t: 'Mise en place', p: [
    '- Une unité doit être posée sur le champ de bataille avant de bouger ou d\'attaquer (en général au déploiement, parfois ailleurs).',
    '- À la pose : l\'unité est en cohésion, non engagée, et respecte toutes les autres exigences.',
    '- Si toutes les figurines ne peuvent pas être posées, l\'unité est retirée et retourne à son emplacement d\'origine (réserves stratégiques, transport…).',
    '- Si l\'unité ne peut pas être posée pendant un mouvement : ses figurines reviennent à leur position précédente, elle n\'est pas considérée comme choisie pour ce mouvement ; elle peut retenter ou rester immobile (09.04).' ] },
  { n: '03.03', t: 'Cohésion', p: [
    '- Une unité de plusieurs figurines doit être posée et finir chaque mouvement en cohésion.',
    '- Chaque figurine doit être à 2" horizontalement et 5" verticalement d\'au moins une autre figurine de l\'unité, ET à 9" horizontalement et 5" verticalement de toutes les autres figurines de l\'unité.',
    '- Retrouver la cohésion : à l\'étape de fin de tour de chaque joueur, le propriétaire retire une à une des figurines des unités hors cohésion jusqu\'à la retrouver. Elles sont détruites, sans déclencher les règles de « figurine détruite ».',
    '! Ces figurines comptent pour les objectifs de mission. L\'unité doit former un seul groupe d\'un seul tenant. Une obligation de mouvement ne peut pas forcer l\'unité à finir hors cohésion.' ] },
  { n: '03.04', t: 'Engagement', p: [
    '- La portée d\'engagement d\'une figurine = 2" horizontalement et 5" verticalement.',
    '- Quand une figurine amie est dans la portée d\'engagement de figurines ennemies, ces figurines et leurs unités sont engagées l\'une avec l\'autre.',
    '- Une unité sans figurine engagée est non engagée.',
    '! Traverser la portée d\'engagement d\'une unité ennemie ne rend pas engagé.' ] }
] },
{ n: '04', g: 'Règles de base', t: 'Effectuer des attaques', s: [
  { n: '04', t: 'Déroulement général', p: [
    '- Quand une unité tire ou combat, le joueur actif suit trois étapes : choisir les armes, choisir les cibles, résoudre les attaques.' ] },
  { n: '04.01', t: '1. Choisir les armes', p: [
    '- Pour chaque figurine de l\'unité attaquante, choisis les armes utilisées.',
    '- Tir : une ou plusieurs armes à distance. Combat : une seule arme de mêlée obligatoirement.',
    '- Une figurine sans arme à distance ne peut pas tirer ; sans arme de mêlée, elle ne peut pas frapper.',
    '- Exception : armes [COMBAT RAPPROCHÉ] avec d\'autres armes à feu (voir 04.01.02, armes de poing).' ] },
  { n: '04.02', t: '2. Choisir les cibles', p: [
    '- Choisis une cible pour chaque arme.',
    '- Tir : une unité ennemie qui doit, sauf indication contraire, être visible de la figurine qui porte l\'arme, à portée de l\'arme, et non engagée.',
    '- Combat : une ou plusieurs unités ennemies, chacune engagée avec la figurine qui porte l\'arme. Pas plus de cibles que la caractéristique A de l\'arme.',
    '- Des armes différentes peuvent avoir des cibles différentes. Si aucune cible n\'est possible, ou si tu choisis de ne pas en prendre pour une arme à distance, elle ne fait aucune attaque.',
    '! La figurine visible et la figurine à portée peuvent être différentes dans l\'unité cible. Une figurine peut être à portée sans être visible.' ] },
  { n: '04.03', t: '3. Résoudre les attaques', p: [
    'Répéter jusqu\'à ce que toutes les armes aient fait toutes leurs attaques :',
    '- 1. Choisir une unité ennemie ciblée par une ou plusieurs armes.',
    '- 2. Rassembler les dés d\'attaque : choisis une arme qui cible cette unité et n\'a pas encore attaqué ; rassemble autant de D6 que sa caractéristique A (chaque dé = un dé d\'attaque). Les autres armes qui font des attaques identiques contre cette unité attaquent aussi maintenant et leurs dés sont ajoutés.',
    '- 3. Résoudre ces dés avec la séquence d\'attaque (section 05).',
    '- 4. S\'il reste des armes non résolues contre la même unité, retour à 2 ; sinon contre une autre unité, retour à 1 ; sinon c\'est fini.',
    '## Attaques identiques (04.03.01)',
    '- Même CT/CC, F, PA et D, et mêmes aptitudes/règles applicables.',
    '## Répartir les attaques de mêlée (04.03.02)',
    '- Si une arme de mêlée cible plusieurs unités, ses attaques sont réparties : annonce combien d\'attaques vont à chaque cible (au moins une par unité) et ne rassemble que ce nombre de dés par cible.',
    '! Si une partie des attaquants vise une unité bénéficiant du couvert et pas les autres, on rassemble les dés séparément. Des armes identiques dont certaines ont [PRÉCISION] se lancent ensemble contre une cible sans le mot-clé PERSONNAGE, car PRÉCISION ne s\'y applique pas.' ] }
] },
{ n: '05', g: 'Règles de base', t: 'Séquence d\'attaque', s: [
  { n: '05', t: 'Principe', p: [
    '- Le joueur actif résout la séquence ci-dessous. Si une étape demande plusieurs dés, on les lance tous ensemble.',
    '- La séquence d\'une attaque s\'arrête dès qu\'elle échoue ou qu\'elle inflige des dégâts.' ] },
  { n: '05.01', t: '1. Jet de touche', p: [
    '- Un D6 par dé d\'attaque. Un 1 non modifié rate. Un 6 non modifié est une touche critique.',
    '- Tout autre résultat qui égale ou dépasse la CT/CC de l\'attaquant touche ; sinon c\'est raté.',
    '- Une touche critique reste une touche et peut déclencher [TOUCHES LÉTALES], etc.',
    '- Tir instinctif (Tir d\'Alerte, etc.) : sauf indication contraire, les attaques ne touchent que sur 6 ; une règle qui donne des critiques sur 4+ ne s\'applique pas.' ] },
  { n: '05.02', t: '2. Jet de blessure', p: [
    '- Un D6 par touche. Un 1 non modifié rate. Un 6 non modifié est une blessure critique.',
    '- Compare la Force (F) de l\'attaque à l\'Endurance (E) de la cible :',
    '| F contre E | Jet requis |',
    '| F ≥ 2 × E | 2+ |',
    '| F > E | 3+ |',
    '| F = E | 4+ |',
    '| F < E | 5+ |',
    '| F ≤ E / 2 | 6+ |',
    '- Une blessure critique reste une blessure et peut déclencher [BLESSURES DÉVASTATRICES], etc.' ] },
  { n: '05.03', t: '3. Jets de sauvegarde', p: [
    'Étape résolue par le joueur adverse :',
    '- 1. Former des groupes : un groupe par figurine PERSONNAGE, et un groupe pour toutes les autres figurines partageant les mêmes PV, Sv et SvI.',
    '- 2. Ordre d\'attribution : un groupe non-PERSONNAGE contenant une figurine blessée passe en premier ; aucun groupe PERSONNAGE ne passe avant un groupe non-PERSONNAGE ; les groupes PERSONNAGE avec figurines blessées passent avant ceux sans ; à égalité, ordre libre.',
    '- 3. Lancer un D6 pour chaque attaque qui a blessé.',
    '- On ne peut pas attribuer de blessure à une figurine détruite. Un modificateur peut rendre une sauvegarde pire que 6+ : l\'attaque peut alors être attribuée à d\'autres figurines de l\'unité qui ont une meilleure sauvegarde.',
    '- « Jet de sauvegarde » = « test de sauvegarde ». Si les résultats de touche ou de blessure changent le profil d\'une attaque, on forme de nouveaux lots ; le joueur actif choisit l\'ordre de résolution des lots.' ] },
  { n: '05.04', t: '4. Infliger les dégâts', p: [
    'Le joueur adverse traite chaque jet de sauvegarde, du plus bas au plus haut, jusqu\'à ce que toutes les attaques soient résolues ou que l\'unité soit détruite. Les attaques en excès sont perdues.',
    '- 1. Choisir une figurine du groupe courant (blessée si possible).',
    '- 2. Vérifier la sauvegarde : l\'attaque échoue (aucun dégât) si le groupe a une SvI et que le dé non modifié l\'égale ou la dépasse, OU si, après application de la PA (ex. PA -1 transforme un 3 en 2), le résultat égale ou dépasse la Sv. Sinon des dégâts sont infligés.',
    '- 3. Résoudre les dégâts : la figurine perd autant de PV que le D de l\'attaque ; à 0 ou moins, elle est détruite.',
    '- Le premier groupe de l\'ordre est le groupe courant ; quand toutes ses figurines sont détruites, le suivant le devient.',
    '- Une attaque qui atteint « résoudre les dégâts » compte comme ayant fait subir des dégâts, même si la figurine ignore ensuite les blessures (Ignore la Douleur se lance à cette étape).',
    '- Mort au combat (Fight On Death) : les figurines en attente restent sur le champ de bataille pour toutes les règles (mesure, visibilité, aptitudes, stratagèmes, engagement) jusqu\'à ce que leur unité ait attaqué ou que la phase se termine.' ] }
] },
{ n: '06', g: 'Règles de base', t: 'Autres notions', s: [
  { n: '06.01', t: 'Visibilité', p: [
    '- Ligne de vue : une ligne droite imaginaire de 1 mm de large peut être tracée de n\'importe quelle partie de la figurine qui observe à n\'importe quelle partie de la figurine observée. On ignore les figurines de l\'unité qui observe et de l\'unité observée.',
    '- Figurine visible : une partie quelconque est visible. Figurine entièrement visible : toute la partie tournée vers l\'observateur est visible (seule la figurine elle-même peut bloquer).',
    '- Unité visible : au moins une figurine l\'est. Unité entièrement visible : toutes ses figurines le sont (l\'observateur voit à travers les autres figurines de la même unité).',
    '- Le décor ajoute des règles de visibilité (13.07).',
    '! Une règle qui dit « visible » sans nommer l\'observateur désigne l\'unité qui utilise la règle. Exemple : un stratagème sur une unité amie qui choisit « une unité ennemie visible » exige qu\'elle soit visible de l\'unité amie ciblée.' ] },
  { n: '06.02', t: 'Blessures mortelles', p: [
    '- Chaque blessure mortelle est appliquée à tour de rôle jusqu\'à ce que toutes soient infligées ou que l\'unité soit détruite. Pour chacune, son propriétaire choisit une figurine avec la première option applicable : 1) une figurine non-PERSONNAGE blessée ; 2) sinon une non-PERSONNAGE ; 3) sinon un PERSONNAGE blessé ; 4) sinon un PERSONNAGE.',
    '- La figurine perd 1 PV et est détruite à 0.',
    '- Si une attaque inflige des dégâts normaux et des blessures mortelles, résoudre d\'abord les dégâts normaux, puis les blessures mortelles.' ] },
  { n: '06.03', t: 'Jets de danger (Dangereux)', p: [
    '- Lance un D6 : sur 1-2 le jet échoue et l\'unité subit 1 blessure mortelle. Si toutes les figurines de l\'unité sont MONSTRE ou VÉHICULE : 3 blessures mortelles à la place.',
    '- Si plusieurs jets de danger sont nécessaires pour une unité, on les fait tous d\'un coup.',
    '! Les blessures mortelles d\'un jet [DANGEREUX] raté sont réparties dans l\'unité (06.02), pas seulement parmi les porteurs de l\'arme. Une unité fait un seul jet de danger quel que soit son nombre de figurines. « Test de Dangereux » = « jet de danger ».' ] }
] }
);
RULES11.push(
{ n: '07', g: 'Le round de bataille', t: 'Le round de bataille', s: [
  { n: '07', t: 'Déroulement', p: [
    'Un round comporte trois étapes : début de round, tours des joueurs, fin de round.',
    '- 1. Début du round : résoudre les règles qui se déclenchent à ce moment, avant les tours.',
    '- 2. Tours des joueurs : chaque joueur joue un tour. C\'est toujours le même joueur qui joue en premier (défini par la mission). Chaque tour comprend, dans l\'ordre : étape de début de tour ; phase de Commandement ; phase de Mouvement (les unités bougent, les réserves stratégiques arrivent) ; phase de Tir ; phase de Charge ; phase de Combat (les unités des deux joueurs frappent) ; étape de fin de tour.',
    '- Fin de tour : d\'abord les règles qui se déclenchent à ce moment (hors règles de mission), puis chaque joueur consulte sa mission et résout ce qu\'il a accompli.',
    '- 3. Fin du round : même ordre (règles hors mission, puis mission). La bataille s\'arrête si la limite de rounds de la mission est atteinte ; sinon le round suivant commence.' ] }
] },
{ n: '08', g: 'Le round de bataille', t: 'Phase de Commandement', s: [
  { n: '08', t: 'Déroulement', p: [
    'Les deux joueurs gagnent des Points de Commandement (PC), vérifient le moral de leurs unités et utilisent leurs aptitudes stratégiques.',
    '- 1. Début de la phase : résoudre les règles déclenchées à ce moment.',
    '- 2. Gain de PC de base : les deux joueurs gagnent 1 PC.',
    '- 3. Étape de Choc de Bataille : le joueur actif fait un jet de Choc de Bataille pour chaque unité de son armée qui est en Choc de Bataille ou à la moitié (ou moins) de ses effectifs de départ. Une unité en Choc de Bataille qui réussit n\'y est plus. Un échec met l\'unité et ses figurines en Choc de Bataille (voir 01.07).',
    '- 4. Aptitudes de commandement : résoudre les règles déclenchées pendant la phase (hors début/fin, gain de PC et jets de Choc de Bataille).',
    '- 5. Fin de la phase : règles hors mission, puis mission.',
    '## Exemples de Choc de Bataille',
    '- Effectif de départ 3, au-dessus de la moitié mais en Choc de Bataille : jet obligatoire (réussir = fin du Choc).',
    '- Effectif de départ 10, 5 figurines restantes : à la moitié, jet obligatoire.',
    '- Effectif de départ 5, 2 figurines restantes : sous la moitié, jet obligatoire.',
    '- Véhicule d\'effectif 1, PV 11, à 3 PV restants : sous la moitié, jet obligatoire.' ] }
] },
{ n: '09', g: 'Le round de bataille', t: 'Phase de Mouvement', s: [
  { n: '09.01', t: 'Déroulement', p: [
    '- Début de phase : résoudre les règles déclenchées. Étape « Déplacer les unités » (09.02). Fin de phase : résoudre les règles déclenchées.',
    '- Étape Déplacer les unités : le joueur actif déplace ses unités une par une. Choisis une unité amie pas encore choisie ce tour (sur le champ de bataille, en réserves stratégiques ou embarquée dans un TRANSPORT), puis un type de mouvement qu\'elle peut faire et résous-le. Types : Rester immobile, Mouvement normal, Avance, Retraite, Débarquement, Insertion, et tout autre type présenté ailleurs.',
    '- À la fin de l\'étape, toutes les unités de l\'armée (réserves comprises) doivent avoir été choisies, même pour rester immobiles.' ] },
  { n: '09.04', t: 'Rester immobile', p: [
    '- Distance maximale : aucune. Éligible : toute unité.',
    '- Aucune figurine ne bouge ni ne pivote. Une unité immobile ne déclenche pas les règles qui s\'activent quand une unité commence ou finit un mouvement.' ] },
  { n: '09.05', t: 'Mouvement normal', p: [
    '- Distance maximale : la caractéristique M. Éligible : unité sur le champ de bataille et non engagée.',
    '- Après : l\'unité doit être non engagée. Pas plus d\'un mouvement normal par phase.' ] },
  { n: '09.06', t: 'Avance', p: [
    '- Distance maximale : jet d\'Avance (1D6) + M. Éligible : sur le champ de bataille et non engagée.',
    '- Avant : lancer 1D6 (jet d\'Avance). Après : unité non engagée ; jusqu\'à la fin du tour, sauf indication contraire, elle ne peut ni déclarer de charge ni commencer d\'action.' ] },
  { n: '09.07', t: 'Retraite', p: [
    '- Distance maximale : M. Éligible : l\'unité est engagée.',
    '- Avant de bouger, choisir un mode : Retraite Ordonnée (si l\'unité n\'est pas en Choc de Bataille) ou Fuite Désespérée (obligatoire si l\'unité est en Choc de Bataille) : fais un jet de danger pour chaque figurine de l\'unité (06.03).',
    '- Pendant : en Fuite Désespérée, les figurines peuvent traverser les figurines ennemies.',
    '- Après : l\'unité doit être non engagée ; jusqu\'à la fin du tour, sauf indication contraire, elle ne peut ni tirer, ni déclarer de charge, ni commencer d\'action. En Fuite Désespérée, si elle n\'est pas en Choc de Bataille, elle doit faire un jet de Choc de Bataille.',
    '## Test de Fuite Désespérée (09.07.01)',
    '- « Test de Fuite Désespérée » désigne les jets de danger faits pour ce mode. Un malus à ce test s\'applique à ces jets de danger (ex. une unité en Choc de Bataille qui fuit devant des Saigneurs avec Fléau des Lâches : -1 à ses jets).',
    '- Si un stratagème ou une aptitude force une unité à faire un test de Fuite Désespérée : un jet de danger par figurine + un jet de Choc de Bataille.' ] },
  { n: '09.02.02', t: 'Choix des modes', p: [
    '- Les modes s\'excluent mutuellement ; évalue-les dans l\'ordre de présentation.',
    '- Si l\'unité ne remplit les conditions d\'aucun mode, elle ne peut pas faire ce mouvement.',
    '- Certains modes sont obligatoires quand ils s\'appliquent (modes de consolidation, 12.08). La Retraite Ordonnée ne l\'est pas : on peut choisir la Fuite Désespérée.',
    '- Une condition « pendant/après le mouvement » portant le nom d\'un mode ne s\'applique que si ce mode a été choisi ; sans nom de mode, elle s\'applique toujours.' ] },
  { n: '24.32 · 21.02', t: 'Autres types de mouvement', p: [
    '## Mouvement d\'Éclaireurs',
    '- Distance : le X" de « Éclaireurs X" ». Éligible : étape « Résoudre les aptitudes d\'avant-bataille » et unité entièrement dans ta zone de déploiement. Après : l\'unité doit être à plus de 8" horizontalement de toutes les unités ennemies.',
    '## Mouvement d\'Élan (Surge)',
    '- Distance : celle de la règle qui l\'autorise. Éligible : la règle est déclenchée, l\'unité n\'est pas en Choc de Bataille, est non engagée et n\'a pas bougé dans la phase.',
    '- Avant : choisir l\'unité ennemie la plus proche comme cible d\'élan. Pendant : chaque figurine finit engagée avec la cible si possible, sinon le plus près possible d\'elle. Après : pas engagée avec une autre unité ennemie ; ne peut plus bouger cette phase.',
    '## Mouvement à Réacteur à impulsions (Pulse Jet)',
    '- Distance : jet d\'impulsion (1D6) + 18". Éligible : selon la règle qui l\'autorise. Ignore toute distance verticale, traverse tous les types de figurines et de décors.',
    '- Après : unité non engagée ; pas de charge ni d\'action jusqu\'à la fin du tour ; jusqu\'au début de ton prochain tour, les attaques qui la ciblent subissent -1 à la touche.' ] }
] },
{ n: '10', g: 'Le round de bataille', t: 'Phase de Tir', s: [
  { n: '10.01', t: 'Déroulement', p: [
    '- Début de phase, étape Tirer, fin de phase.',
    '- Étape Tirer : le joueur actif tire avec ses unités éligibles une par une jusqu\'à ce que chaque unité voulue ait été choisie et ses attaques résolues. Est éligible une unité sur le champ de bataille pas encore choisie pour tirer ce tour.',
    '- Choisis une unité amie éligible, puis un type de tir qu\'elle peut faire : Normal, d\'Assaut, en Combat Rapproché, Indirect, ou autre type présenté ailleurs (ex. tir instinctif).',
    '- Une unité sans arme peut être choisie : elle ne fait aucune attaque mais le type de tir/combat est résolu.' ] },
  { n: '10.04', t: 'Tir normal', p: [
    '- Éligible : non engagée et n\'a pas fait d\'Avance ce tour. Tir selon « Effectuer des attaques » (04).',
    '- Après : ne peut pas commencer d\'action jusqu\'à la fin de la phase.' ] },
  { n: '10.05', t: 'Tir d\'assaut', p: [
    '- Éligible : non engagée, a fait une Avance ce tour, et possède au moins une arme [ASSAULT].',
    '- Pendant : seules les armes [ASSAULT] peuvent être choisies. Après : pas d\'action jusqu\'à la fin de la phase.' ] },
  { n: '10.06', t: 'Tir en combat rapproché', p: [
    '- Éligible : engagée, pas d\'Avance ce tour, et au moins une arme [COMBAT RAPPROCHÉ] ou unité MONSTRE/VÉHICULE.',
    '- Pendant : les figurines peuvent cibler les unités ennemies avec lesquelles l\'unité est engagée.',
    '- Figurines MONSTRE/VÉHICULE : chaque attaque subit -1 à la touche, sauf si elle est faite avec une arme [COMBAT RAPPROCHÉ] contre une unité avec laquelle l\'unité est engagée. Une arme [EXPLOSION] ne peut toujours pas cibler une unité avec laquelle l\'unité est engagée.',
    '- Autres figurines : seules les armes [COMBAT RAPPROCHÉ] peuvent être choisies, et seules les unités ennemies engagées avec l\'unité peuvent être ciblées. Après : pas d\'action jusqu\'à la fin de la phase.' ] },
  { n: '10.07', t: 'Tir indirect', p: [
    '- Éligible : non engagée, pas d\'Avance ce tour, au moins une arme [TIR INDIRECT].',
    '- Pendant : les armes [TIR INDIRECT] peuvent cibler des unités non visibles. Chaque attaque : la cible bénéficie du couvert (13.08) ; pas de relance des touches ; un jet de touche non modifié de 1-5 rate (1-3 si l\'unité est restée immobile ce tour et que la cible est visible d\'au moins une unité amie).',
    '- Après : pas d\'action jusqu\'à la fin de la phase. Les autres armes de l\'unité peuvent toujours viser des cibles visibles.' ] },
  { n: '15.09', t: 'Tir instinctif (Snap Shooting)', p: [
    '- Éligible : selon la règle qui l\'autorise (ex. stratagème Tir d\'Alerte).',
    '- Pendant : une seule unité ennemie visible à 24" ou moins (si c\'est une cible valide) ; chaque attaque ne touche que sur un 6 non modifié (quelle que soit la CT ou les modificateurs), et ce ne sont pas des touches critiques ; pas de relance des touches.',
    '- Après : pas d\'action jusqu\'à la fin de la phase.' ] }
] },
{ n: '11', g: 'Le round de bataille', t: 'Phase de Charge', s: [
  { n: '11.01', t: 'Déroulement', p: [
    '- Début de phase, étape de Charge, fin de phase. Le joueur actif résout les charges avec ses unités une par une.',
    '- 1. Déclarer la charge : choisis une unité amie qui n\'a pas encore déclaré de charge ce tour et qui y est éligible : sur le champ de bataille, sauf indication contraire. Elle n\'est PAS éligible si elle n\'est pas à 12" ou moins d\'une unité ennemie, si elle est engagée, ou si elle a fait une Avance ou une Retraite ce tour.',
    '- 2. Jet de charge : lance 2D6. Le résultat est la distance maximale du mouvement de charge.',
    '- 3. Tenter la charge : si un mouvement de charge est possible et voulu, fais-le ; sinon l\'unité ne bouge pas. Dans tous les cas la charge est résolue.',
    '! Sans modificateur, un 2 ne suffit jamais : une unité ne peut pas finir à portée d\'engagement (2") en chargeant. Une charge ratée ne déplace pas l\'unité. Quand une règle ordonne une charge hors phase de Charge, on résout les étapes 2 et 3.' ] },
  { n: '11.04', t: 'Mouvement de charge', p: [
    '- Distance maximale : le jet de charge. Éligible : l\'unité a déclaré une charge cette phase.',
    '- Avant : choisis une ou plusieurs unités ennemies à 12" ou moins de ton unité et dans la distance maximale ; ce sont les cibles de charge jusqu\'à la fin du mouvement.',
    '- Pendant : chaque figurine doit finir plus près d\'une ou plusieurs cibles de charge ; chaque figurine qui peut finir à 1" ou moins d\'une cible de charge doit le faire ; chaque figurine qui peut finir engagée avec une cible de charge doit le faire.',
    '- Après : l\'unité doit être engagée avec toutes les cibles de charge et avec aucune unité ennemie qui n\'en est pas une. Jusqu\'à la fin du tour, chaque figurine de l\'unité a Combat en Premier (24.13).',
    '! Exemple avec un jet de 7" : une unité à 7" ou moins peut être choisie comme cible, mais la charge échoue si un décor empêche de finir engagé. Une unité à plus de 7" ne peut pas être choisie, même si le chargeur pourrait finir à 2" d\'elle.' ] }
] },
{ n: '12', g: 'Le round de bataille', t: 'Phase de Combat', s: [
  { n: '12.01', t: 'Déroulement', p: [
    '- Les deux joueurs agissent. Les unités se mettent d\'abord au contact (pile in), puis les combattants frappent en mêlée, puis les unités consolident.',
    '- 1. Début de phase : résoudre les règles déclenchées. Tu dois combattre avec toutes les unités qui le peuvent ; tu n\'es pas obligé de faire une mise au contact ni de consolider.',
    '- 2. Mise au contact (12.02) : les deux joueurs font des mouvements de mise au contact avec les unités éligibles de leur choix ; le joueur actif d\'abord, puis l\'adversaire. Une seule mise au contact par unité.',
    '- 3. Étape de combat (12.04).',
    '- 4. Consolidation (12.07).',
    '- 5. Fin de phase (12.09).' ] },
  { n: '12.03', t: 'Mouvement de mise au contact', p: [
    '- Distance maximale : 3". Éligible : phase de Combat et au moins une condition : l\'unité est engagée ; elle a fait une charge ce tour ; elle a été choisie pour une attaque de débordement (12.06).',
    '- Avant : si engagée, choisis toutes les unités ennemies avec lesquelles elle l\'est ; sinon une ou plusieurs unités ennemies à 5" ou moins.',
    '- Pendant : les figurines au contact de socle d\'une figurine ennemie ne peuvent pas bouger ; chaque figurine déplacée doit finir plus près de la cible la plus proche, et engagée avec elle si possible.',
    '- Après : l\'unité doit être engagée ; chaque figurine qui commençait engagée avec une unité ennemie doit l\'être toujours avec cette unité.' ] },
  { n: '12.04', t: 'Étape de combat', p: [
    '- Une unité est éligible pour combattre si elle n\'a pas encore été choisie ce tour ET qu\'elle est engagée (ou l\'était au début de l\'étape) OU a fait une charge ce tour.',
    '- Répéter jusqu\'à ce que toutes les unités éligibles aient combattu :',
    '- 1. Combats en Combat en Premier : en commençant par le joueur actif, les joueurs choisissent à tour de rôle une unité amie Combat en Premier éligible. Si aucun ne peut, on passe aux combats restants (le joueur actif choisit en premier). Si le joueur actif n\'en a pas mais l\'adversaire oui, c\'est l\'adversaire qui choisit.',
    '- 2. Combats restants : en commençant par le joueur qui arrive à cette étape, les joueurs choisissent à tour de rôle une unité amie éligible. S\'il n\'y en a plus, l\'étape se termine ; si un seul joueur en a, l\'autre ne choisit pas.',
    '- Après un combat des combats restants, si une unité Combat en Premier est devenue éligible, on retourne à l\'étape Combat en Premier.',
    '! Changer la distance d\'une mise au contact ou consolidation ne change pas la distance aux cibles. Les règles qui permettent de se mettre au contact ou de consolider « plus loin » s\'utilisent dans l\'étape correspondante. Si une règle fixe la distance à 6", cela change aussi la distance maximale.' ] },
  { n: '12.05', t: 'Quand une unité est choisie pour combattre', p: [
    '- Choisis un type de combat que l\'unité peut faire :',
    '- Combat normal : éligible si l\'unité est engagée ; elle combat selon « Effectuer des attaques » (04).',
    '- Attaque de débordement (12.06, Overrun) : éligible si l\'unité est non engagée, ou l\'était au début de l\'étape mais est devenue engagée pendant la phase. Elle fait une mise au contact supplémentaire, puis combat. Ses figurines peuvent être déplacées de sorte que des unités ennemies jusque-là non engagées deviennent engagées ; elles deviennent éligibles pour combattre cette phase (et peuvent combattre ensuite si elles ont Combat en Premier).' ] },
  { n: '12.08', t: 'Mouvement de consolidation', p: [
    '- Étape 4 : les deux joueurs font des consolidations avec les unités éligibles de leur choix ; le joueur actif d\'abord. Une seule par unité.',
    '- Distance maximale : 3". Éligible : phase de Combat et l\'unité était éligible pour combattre cette phase.',
    '- Avant, choisir un mode : Consolidation continue (si l\'unité est engagée : obligatoire, avec toutes les unités ennemies engagées) ; Consolidation d\'engagement (sinon, si l\'unité est à 3" ou moins d\'une ou plusieurs unités ennemies : obligatoire, avec une ou plusieurs d\'entre elles) ; Consolidation d\'objectif (sinon, si à 3" ou moins d\'un objectif : obligatoire, avec l\'un d\'eux).',
    '- Pendant : continue = les figurines au contact de socle ne bougent pas, chaque figurine déplacée finit plus près de l\'unité ennemie choisie la plus proche et engagée avec elle si possible ; engagement = idem sans la restriction de socle ; objectif = chaque figurine finit à portée de l\'objectif si possible, sinon plus près de lui.',
    '- Après : continue = chaque figurine qui commençait engagée l\'est toujours avec la même unité ; engagement = l\'unité doit être engagée avec toutes les unités ciblées, et l\'adversaire doit choisir (une par une) pour combattre toute unité engagée qui n\'avait pas encore combattu, qui devient éligible et combat ; objectif = l\'unité est non engagée et à portée de l\'objectif.',
    '! « Nouveaux ennemis » : une Consolidation d\'engagement peut finir engagée avec des unités qui n\'ont pas encore combattu : elles pourront combattre ton unité. À utiliser avec discernement.' ] },
  { n: '12.09', t: 'Fin de la phase de Combat', p: [ '- Résoudre les règles déclenchées à la fin de la phase.' ] }
] }
);
RULES11.push(
{ n: '13', g: 'Champ de bataille et tactique', t: 'Décor', s: [
  { n: '13.01', t: 'Placer le décor', p: [
    'Avant la bataille, place le décor avec l\'une de ces méthodes :',
    '- Marquer une limite (socle, tapis…) et placer un ou plusieurs éléments entièrement à l\'intérieur.',
    '- Placer un seul élément directement sur le champ de bataille.',
    '- Placer deux éléments ou plus qui définissent ensemble la limite d\'une zone.',
    '- Chacune de ces zones est une zone de décor. La carte de déploiement d\'une mission peut en définir l\'emplacement et la taille ; sinon les joueurs s\'accordent avant la bataille.' ] },
  { n: '13.02', t: 'Catégories de décor', p: [
    '- Chaque élément appartient à une catégorie qui influence mouvement et visibilité.',
    '- Exposé (13.03) : peu de protection, se franchit librement (cratères, barbelés, débris).',
    '- Léger (13.04) : offre un couvert mais ne ralentit pas et n\'offre pas d\'abri durable (barricades, murets, statues).',
    '- Dense (13.05) : gêne même les plus grosses machines et peut cacher des unités entières (bâtiments, ruines, conteneurs blindés, bois).',
    '- Une carte de déploiement peut imposer les catégories d\'une zone ; des éléments de catégories différentes peuvent coexister dans la même zone.',
    '- Décor Solide : une figurine ne peut pas finir un mouvement avec une partie d\'elle dans une partie fermée d\'un élément Solide (les éléments denses, 13.11) située à 3" ou moins du sol, même à travers portes et fenêtres.',
    '- Tir plongeant : les figurines qui montent sur de hauts éléments peuvent en bénéficier (22.05).' ] },
  { n: '13.06', t: 'Décor et mouvement', p: [
    '- Exposé / Léger : toutes les figurines se déplacent horizontalement et verticalement à travers, sans pénalité.',
    '- Dense : INFANTERIE, BÊTES, NUÉE et MOBILE peuvent le traverser horizontalement ; INFANTERIE, BÊTES et NUÉE peuvent aussi le traverser verticalement. Les autres figurines ne le traversent horizontalement que si chaque section sous leur socle mesure 2" ou moins de haut ; sinon elles doivent monter par-dessus (sans traverser plafonds ni sols, et sans finir sur une surface autre que le sol).',
    '- Mouvement vertical : la figurine reste à ½" horizontalement de l\'élément ; la distance montée ET la distance descendue comptent dans le total.',
    '- Mise en place ou fin de mouvement : le niveau du sol de n\'importe quel élément est toujours autorisé. Toute autre surface exige INFANTERIE, BÊTES, NUÉE, VOLANT ou MONSTRE, et une position stable (aucun socle ne dépasse du bord).',
    '! Un MONSTRE doit contourner un élément dense dont toutes les sections font 2" ou moins ; un VÉHICULE ne le traverse pas mais peut monter et descendre des sections de plus de 2" sans finir dessus.' ] },
  { n: '13.07', t: 'Décor et visibilité', p: [
    '- Le décor agit sur la visibilité par quatre règles : Bénéfice du couvert, Caché, Obscurcissant et Solide.' ] },
  { n: '13.08', t: 'Bénéfice du couvert', p: [
    '- Quand une attaque à distance cible une unité, celle-ci bénéficie du couvert si chaque figurine remplit au moins une condition : elle est INFANTERIE, BÊTES ou NUÉE et se trouve dans une zone de décor ; OU elle n\'est pas entièrement visible de l\'attaquant à cause d\'éléments de décor et/ou de zones obscurcissantes.',
    '- Chaque attaque contre une unité à couvert voit sa CT dégradée de 1 (−1 à la touche).' ] },
  { n: '13.09', t: 'Caché', p: [
    '- Une figurine est cachée si elle est INFANTERIE, BÊTES ou NUÉE dans une zone de décor contenant au moins un élément dense, ET si son unité n\'a fait aucune attaque à distance ce tour ni au tour précédent.',
    '- Une figurine cachée n\'est visible que des figurines ennemies à portée de détection : 15" sauf indication contraire.' ] },
  { n: '13.10', t: 'Obscurcissant', p: [
    '- Les zones de décor contenant au moins un élément léger ou dense sont obscurcissantes.',
    '- Si chaque ligne de vue entre deux figurines traverse au moins une zone obscurcissante (hors celles où elles se trouvent), elles ne se voient pas.' ] },
  { n: '13.11', t: 'Solide', p: [
    '- Les éléments denses sont Solides : on ne peut pas tracer de ligne de vue à travers un trou fermé de leur surface situé à 3" ou moins du sol.',
    '! 3" correspond à peu près à la hauteur d\'un premier étage ; une mission peut changer cette hauteur. Les figurines à l\'abri au sol restent invisibles malgré portes, fenêtres ou trous.' ] }
] },
{ n: '14', g: 'Champ de bataille et tactique', t: 'Objectifs', s: [
  { n: '14.01', t: 'Objectifs de décor', p: [
    '- La mission indique où sont les objectifs. Chaque point d\'objectif doit coïncider avec une zone de décor (13.01), qui EST l\'objectif.',
    '- Les distances vers/depuis un objectif se mesurent à sa partie la plus proche.' ] },
  { n: '14.02', t: 'Niveau de contrôle', p: [
    '- Au début de la bataille, aucun objectif n\'est contrôlé.',
    '- Pour en prendre le contrôle, il faut au moins une figurine avec CO 1 ou plus à portée ; une figurine est à portée quand elle est dans la zone de décor.',
    '- À la fin de chaque phase et de chaque tour, additionne le CO de toutes les figurines d\'un joueur à portée de l\'objectif : c\'est son niveau de contrôle.',
    '- Le joueur au niveau le plus élevé contrôle l\'objectif. En cas d\'égalité, personne ne le contrôle, sauf s\'il est sécurisé (14.03).',
    '- Chaque unité à portée d\'un objectif que son joueur contrôle, avec au moins une figurine de CO 1+, « contrôle » cet objectif.',
    '! Exemple : des figurines de CO 3 et CO 2 donnent 5 ; si l\'adversaire est à 6, il contrôle l\'objectif. Une unité en Choc de Bataille a un CO « - » : elle compte 0.' ] },
  { n: '14.03', t: 'Objectifs sécurisés', p: [
    '- Certaines règles permettent de sécuriser un objectif.',
    '- Un objectif sécurisé reste sous le contrôle du joueur même sans unité à portée, jusqu\'à ce que le niveau de contrôle adverse soit supérieur au sien à la fin d\'une phase.' ] }
] },
{ n: '15', g: 'Champ de bataille et tactique', t: 'Stratagèmes', s: [
  { n: '15.01', t: 'Utiliser un stratagème', p: [
    '- Les deux joueurs peuvent utiliser des stratagèmes. Chacun indique son coût en PC, QUAND, CIBLE, EFFET et éventuellement RESTRICTIONS.',
    '- Un même stratagème ne peut pas être utilisé plus d\'une fois par phase. Sauf indication contraire, une même unité ne peut pas être ciblée par plus d\'un stratagème par phase.',
    '- Résolution : 1) choisir les cibles ; 2) payer le coût en PC (une option « +X PC » n\'est utilisable que si l\'on paie le supplément ; sans assez de PC, on ne peut pas l\'utiliser) ; 3) résoudre les effets.',
    '- Les stratagèmes de base sont à tous les joueurs ; les autres figurent dans les codex et autres publications.' ] },
  { n: '15.02', t: 'Relance de Commandement — 1 PC', p: [
    '- QUAND : n\'importe quelle phase, juste après un jet d\'Avance, de Charge, de Dégâts, de danger, de Touche, de Sauvegarde ou de Blessure pour une unité ou figurine amie, ou un jet pour déterminer le nombre d\'attaques d\'une arme.',
    '- CIBLE : cette unité ou figurine. EFFET : relancer ce jet. Si plusieurs dés sont lancés ensemble, relancer l\'un d\'eux (un jet de charge se relance en entier).' ] },
  { n: '15.03', t: 'Défi Épique — 1 PC', p: [
    '- QUAND : phase de Combat, juste après qu\'une unité PERSONNAGE amie est choisie pour combattre. CIBLE : cette unité.',
    '- EFFET : choisis une figurine PERSONNAGE de l\'unité ; jusqu\'à la fin de la phase, ses armes de mêlée ont [PRÉCISION].' ] },
  { n: '15.04', t: 'Bravoure Insensée — 1 PC', p: [
    '- QUAND : étape de Choc de Bataille de ta phase de Commandement, juste avant un jet de Choc de Bataille pour une unité amie.',
    '- EFFET : ce jet réussit automatiquement. RESTRICTION : une seule fois par bataille.' ] },
  { n: '15.05', t: 'Explosifs — 1 PC', p: [
    '- QUAND : ta phase de Tir. CIBLE : une unité amie EXPLOSIFS/GRENADES non engagée, éligible pour tirer, qui n\'a pas fait d\'Avance ce tour.',
    '- EFFET : choisis une figurine EXPLOSIFS/GRENADES de l\'unité et une unité ennemie non engagée, visible de cette figurine et à 8" ou moins ; lance six D6 : chaque 4+ inflige 1 blessure mortelle à cette unité ennemie (06.02).' ] },
  { n: '15.06', t: 'Impact Écrasant — 1 PC', p: [
    '- QUAND : ta phase de Charge, juste après qu\'une unité MONSTRE/VÉHICULE amie termine un mouvement de charge. CIBLE : cette unité.',
    '- EFFET : choisis une unité ennemie engagée avec la tienne, et une figurine de ton unité engagée avec elle. Lance autant de D6 que son Endurance : chaque 1 inflige 1 blessure mortelle à ton unité ; chaque 5+ en inflige 1 à l\'unité ennemie (6 maximum par unité).' ] },
  { n: '15.07', t: 'Insertion Rapide — 1 PC', p: [
    '- QUAND : fin de la phase de Mouvement adverse. CIBLE : une unité amie en réserves stratégiques (hors AÉRONEF).',
    '- EFFET : elle fait un mouvement d\'Insertion (20.04). RESTRICTION : impossible au premier round.' ] },
  { n: '15.08', t: 'Tir d\'Alerte — 1 PC', p: [
    '- QUAND : fin de la phase de Mouvement adverse. CIBLE : une unité amie non engagée (hors TITANESQUE).',
    '- EFFET : elle tire en tir instinctif (15.09) : une seule unité ennemie visible à 24", touche seulement sur 6 non modifié, pas de relance.' ] },
  { n: '15.10', t: 'Écran de Fumée — 1 PC', p: [
    '- QUAND : début de la phase de Tir adverse. CIBLE : une unité amie FUMIGÈNES.',
    '- EFFET : jusqu\'à la fin de la phase, une cible bénéficie du couvert (13.08) contre les attaques si c\'est l\'unité FUMIGÈNES, ou si elle n\'est pas entièrement visible de l\'attaquant à cause de figurines FUMIGÈNES.' ] },
  { n: '15.11', t: 'Intervention Héroïque — 1 PC', p: [
    '- QUAND : fin de la phase de Charge adverse. CIBLE : une unité amie non engagée à 12" ou moins d\'une ou plusieurs unités ennemies. Un VÉHICULE n\'est éligible que s\'il est PERSONNAGE/WALKER.',
    '- EFFET : résous une charge (11.02) ; avant le jet de charge, choisis un mode :',
    '- Bondir à la défense : tu ne peux choisir que des unités ennemies qui ont chargé cette phase et qui sont dans la distance maximale.',
    '- Dans la mêlée (+1 PC) : si le jet de charge (modifié) dépasse 6, il devient 6 ; tu peux choisir toute unité ennemie à 6" ou moins et dans la distance maximale.' ] },
  { n: '15.12', t: 'Contre-offensive — 2 PC', p: [
    '- QUAND : étape de combat de la phase de Combat adverse, juste après qu\'une unité ennemie a résolu ses attaques. CIBLE : une unité amie éligible pour combattre.',
    '- EFFET : jusqu\'à la fin de la phase, elle a Combat en Premier et doit être la prochaine unité que tu choisis pour combattre (12.04).' ] }
] },
{ n: '16', g: 'Champ de bataille et tactique', t: 'Actions', s: [
  { n: '16.01', t: 'Effectuer une action', p: [
    'Chaque action indique : COMMENCE (quand), UNITÉS (lesquelles), LIMITE D\'UTILISATION, TERMINE (quand), EFFET et restrictions éventuelles.',
    '## Commencer une action',
    'Une unité ne peut pas commencer d\'action si : elle n\'est pas sur le champ de bataille ; c\'est un AÉRONEF ou une FORTIFICATION ; elle est en Choc de Bataille ; son CO est 0 ou « - » ; elle est engagée (sauf TITANESQUE) ; elle a fait une Avance ou une Retraite ce tour ; elle a déjà commencé une autre action ce tour.',
    '- Une fois l\'action commencée, jusqu\'à la fin du tour l\'unité ne peut pas tirer (sauf TITANESQUE) ni déclarer de charge.',
    '## Terminer une action',
    '- Si l\'unité fait un mouvement (hors mise au contact et consolidation) ou quitte le champ de bataille, elle ne termine pas l\'action. Sinon l\'effet se déclenche à la fin de l\'action.',
    '- Exemple : COMMENCE ta phase de Tir ; UNITÉS une INFANTERIE dans une zone de décor hors de ta zone de déploiement ; LIMITE une fois par tour ; TERMINE à la fin du tour ; EFFET place un marqueur à 1" de l\'unité dans cette zone.' ] }
] }
);
RULES11.push(
{ n: '17', g: 'Règles avancées', t: 'Monstres et Véhicules', s: [
  { n: '17.01', t: 'Mouvement', p: [
    '- Quand une unité fait un mouvement normal ou une Avance, ses figurines MONSTRE/VÉHICULE peuvent traverser les figurines amies et ennemies, sauf les autres figurines MONSTRE/VÉHICULE (elles ne se traversent pas entre elles).' ] },
  { n: '17.02', t: 'Châssis (FRAME)', p: [
    '- Les figurines avec le mot-clé FRAME se mesurent différemment (nombreux MONSTRES/VÉHICULES et quelques autres grandes figurines) : sauf indication contraire, on mesure vers/depuis le point le plus proche de la figurine, pas forcément de son socle.',
    '- Une figurine FRAME sans socle qui pivote pendant un mouvement peut tourner autant qu\'elle veut autour de son axe central, à plat.' ] },
  { n: '17.03', t: 'Tir', p: [
    '- Pendant ta phase de Tir, les unités MONSTRE/VÉHICULE ennemies engagées peuvent être ciblées par des attaques à distance.',
    '- Chaque attaque à distance contre une telle unité subit -1 à la touche, sauf pour les armes [COMBAT RAPPROCHÉ] utilisées par des figurines d\'une unité engagée avec la cible.',
    '- Une unité engagée avec un MONSTRE/VÉHICULE ne peut pas cibler cette unité avec ses armes [EXPLOSION], mais peut cibler d\'autres unités non engagées.',
    '- Une unité INFANTERIE engagée avec un VÉHICULE peut le tirer en combat rapproché : seulement avec ses armes [COMBAT RAPPROCHÉ], et seulement ce VÉHICULE.' ] }
] },
{ n: '18', g: 'Règles avancées', t: 'Transports', s: [
  { n: '18.01', t: 'Capacité de transport', p: [
    '- Un TRANSPORT a sur sa fiche une capacité (type et nombre maximal de figurines amies embarquables). Plusieurs unités peuvent embarquer ensemble si la capacité suffit.',
    '- Avant la bataille, à l\'étape « Déclarer les formations de bataille », des unités peuvent commencer embarquées dans un TRANSPORT ami avec assez de capacité restante pour toute l\'unité.' ] },
  { n: '18.02', t: 'Embarquer', p: [
    '- Après le début du premier round, une unité amie peut embarquer dans un TRANSPORT ami après un mouvement normal, une Avance ou une Retraite si : chaque figurine est à 3" ou moins du TRANSPORT ; l\'unité n\'a pas été posée sur le champ de bataille ce tour ; elle a le droit d\'y embarquer d\'après sa fiche ; le TRANSPORT a assez de capacité pour toutes ses figurines.',
    '- Le joueur actif retire l\'unité du champ de bataille et la met de côté : elle est embarquée.' ] },
  { n: '18.03', t: 'Débarquer', p: [
    '- Dans la phase de Mouvement du joueur actif, chaque unité amie embarquée peut débarquer par un mouvement de débarquement (18.04).',
    '- Si un TRANSPORT est détruit, le joueur actif fait un débarquement d\'urgence (18.05) pour chaque unité embarquée, avant de retirer le TRANSPORT.' ] },
  { n: '18.04', t: 'Mouvement de débarquement', p: [
    '- Distance de mise en place : Rapide ou Tactique 3" ; Au contact 6".',
    '- Éligible si : l\'unité est embarquée dans un TRANSPORT sur le champ de bataille ; elle n\'y a pas embarqué cette phase ; le TRANSPORT n\'a pas fait d\'Avance ni de Retraite cette phase. Effet : mise en place selon 03.02.',
    '- Avant, choisir un mode : Rapide (obligatoire si le TRANSPORT a fait un mouvement normal ou d\'Insertion cette phase) ; Tactique (sinon, si le TRANSPORT est resté immobile ou n\'a pas encore été choisi pour bouger, et si l\'unité peut être posée ainsi) ; Au contact (sinon : jet de danger pour chaque figurine).',
    '- Pendant : chaque figurine est posée entièrement dans la distance de mise en place du TRANSPORT. Rapide : si le TRANSPORT a fait une Insertion ce tour, chaque figurine suit les mêmes règles que lui. Au contact : une figurine peut être posée engagée avec des unités ennemies avec lesquelles le TRANSPORT est engagé.',
    '- Après : Rapide = pas de charge jusqu\'à la fin du tour ; Tactique = l\'unité peut être choisie pour un mouvement normal ou une Avance ; Au contact = l\'unité est en Choc de Bataille et ne peut pas déclarer de charge jusqu\'à la fin du tour.' ] },
  { n: '18.05', t: 'Débarquement d\'urgence', p: [
    '- Distance de mise en place : 6". Éligible : l\'unité est embarquée dans un TRANSPORT qui vient d\'être détruit.',
    '- Avant : jet de danger pour chaque figurine (06.03). Pendant : chaque figurine est posée entièrement à 6" ou moins du TRANSPORT, le plus près possible ; si c\'est impossible en restant non engagée, elle est posée au plus près, engagée ; toute figurine qui ne peut pas être posée est détruite.',
    '- Après : l\'unité est en Choc de Bataille et ne peut pas déclarer de charge jusqu\'à la fin du tour.' ] }
] },
{ n: '19', g: 'Règles avancées', t: 'Unités rattachées', s: [
  { n: '19.01', t: 'Former une unité rattachée', p: [
    '- Les unités avec l\'aptitude Meneur ou Soutien peuvent mener des unités de protection précises (listées dans l\'appli Warhammer 40,000) pour former une unité rattachée.',
    '- Une unité rattachée est « une seule unité pour toutes les règles ».' ] },
  { n: '19.02', t: 'Attaquer une unité rattachée', p: [
    '- Si l\'unité contient des figurines de protection, les attaques utilisent l\'Endurance la plus haute parmi ces figurines, même si un meneur/soutien a une autre Endurance. Sinon, la plus haute parmi les meneurs/soutiens.',
    '- Les règles déclenchées par la destruction d\'une unité ne s\'appliquent que lorsque la dernière figurine qui a commencé la bataille dans l\'unité rattachée est détruite.' ] },
  { n: '19.03', t: 'Mots-clés d\'une unité rattachée', p: [
    '- Une unité rattachée a tous les mots-clés de toutes ses unités composantes ; les règles qui visent ces mots-clés s\'y appliquent. Une figurine n\'obtient pas pour autant les mots-clés des autres figurines.',
    '- Les attaques visent des unités, pas des figurines. Exemple : un meneur PSYKER rend toute l\'unité PSYKER ; une arme [ANTI-PSYKER 4+] y fait des blessures critiques sur 4+ non modifié, même si l\'attaque n\'est pas attribuée au meneur.' ] },
  { n: '19.04', t: 'Aptitudes dans une unité rattachée', p: [
    '- Une aptitude qui affecte une figurine précise (amélioration, équipement) ne s\'applique qu\'à elle.',
    '- Sinon, les aptitudes de niveau unité s\'appliquent à toutes les figurines de l\'unité rattachée jusqu\'à la destruction de leur source : unité meneuse/soutien = jusqu\'à la destruction de sa dernière figurine ; unité de protection = idem ; figurine précise (porteur) = jusqu\'à sa destruction.',
    '- Les meneurs/soutiens gardent leurs aptitudes « tant que cette figurine mène une unité » après la destruction de leur unité de protection, s\'ils ont commencé la bataille rattachés.',
    '- Si la dernière figurine source est détruite par une attaque, l\'aptitude conférée dure jusqu\'à ce que l\'unité attaquante ait résolu toutes ses attaques.' ] }
] },
{ n: '20', g: 'Règles avancées', t: 'Réserves stratégiques', s: [
  { n: '20.01', t: 'Réserves stratégiques', p: [
    '- À l\'étape « Déclarer les formations de bataille », tu peux placer des unités amies (hors FORTIFICATION) en réserves stratégiques au lieu de les déployer. Elles arrivent plus tard.',
    '- Sauf indication contraire, le total en points de tes réserves ne peut pas dépasser 50 % de la limite de points de la taille de bataille (unités embarquées dans des TRANSPORTS en réserves comprises).' ] },
  { n: '20.02', t: 'Unités repositionnées', p: [
    '- Les unités retirées du champ de bataille et placées en réserves pendant la bataille par d\'autres règles sont « repositionnées ». En plus des règles d\'arrivée : si la règle est utilisée en phase de Mouvement, elle peut cibler des unités ayant déjà bougé ; une unité posée le tour où elle a fait une Avance, Retraite ou un Débarquement est toujours considérée comme l\'ayant fait ; les effets à durée ou conditions déterminées continuent tant qu\'elles durent (ex. une unité sortie d\'une aura n\'est plus affectée si elle est hors de portée à son Insertion ; une unité en Choc de Bataille le reste).' ] },
  { n: '20.03', t: 'Arriver des réserves', p: [
    '- Chaque unité en réserves doit faire un mouvement d\'Insertion pour arriver. Sauf indication contraire, seulement à partir du round de bataille 2.' ] },
  { n: '20.04', t: 'Mouvement d\'Insertion', p: [
    '- Distance de mise en place : 6". Éligible : l\'unité est en réserves (hors unités embarquées dans des TRANSPORTS eux-mêmes en réserves). Effet : mise en place selon 03.02.',
    '- Pendant : posée entièrement à 6" ou moins d\'un ou plusieurs bords du champ de bataille, à plus de 8" horizontalement de toutes les unités ennemies. Avant le round 3, aucune figurine ne peut être posée dans la zone de déploiement adverse.',
    '- Après : sauf indication contraire, l\'unité ne peut faire aucun autre type de mouvement jusqu\'au début de la prochaine phase de Charge.',
    '- Fin du round 3 : sauf indication contraire, les unités en réserves qui n\'ont pas fait d\'Insertion sont détruites. Exceptions : unités embarquées dans des TRANSPORTS qui ont fait une Insertion pendant la bataille ; unités repositionnées (20.02).' ] }
] },
{ n: '21', g: 'Règles avancées', t: 'Vol et Élan', s: [
  { n: '21.02', t: 'Mouvement d\'Élan (Surge)', p: [
    '- Certaines règles permettent un mouvement d\'Élan, défini par chaque règle.',
    '- Distance maximale : celle de la règle. Éligible : la règle est déclenchée, l\'unité n\'est pas en Choc de Bataille, est non engagée et n\'a pas bougé cette phase.',
    '- Avant : choisir l\'unité ennemie la plus proche comme cible d\'élan. Pendant : chaque figurine finit engagée avec la cible si possible, sinon le plus près possible. Après : l\'unité n\'est engagée avec aucune autre unité ennemie ; elle ne peut plus bouger cette phase.',
    '! Exemple : l\'unité A tire et détruit deux figurines de B ; B a un Élan D6" déclenché par ces pertes ; le D6 fait 4, chaque figurine survivante de B avance de 4" au plus vers l\'ennemi le plus proche (C) et finit engagée avec C.' ] },
  { n: '21.03', t: 'Figurines volantes', p: [
    '- Les figurines avec VOLANT (et leurs unités) peuvent voler.',
    '- Quand une unité VOLANTE est choisie pour un mouvement normal, une Avance, une Retraite ou une charge, le joueur actif peut déclarer qu\'elle prend son envol avant de bouger. Pendant ce mouvement : −2" à la distance maximale ; chaque figurine VOLANTE ignore toute distance verticale, peut traverser tous les types de figurines (ennemies et MONSTRE/VÉHICULE comprises) et tous les décors, horizontalement et verticalement.',
    '- Un jet de charge de 9" en prenant son envol donne donc 7" de distance maximale (voir aussi Vol Stationnaire).' ] }
] },
{ n: '22', g: 'Règles avancées', t: 'Autres règles et aptitudes', s: [
  { n: '22.01', t: 'Aptitudes d\'aura', p: [
    '- Les aptitudes qui affectent les figurines ou unités dans une portée donnée sont des aptitudes d\'aura (marquées « Aura »). Une figurine avec une aura est toujours à portée de sa propre aura.',
    '- Une unité peut subir plusieurs auras ; une même aura ne s\'applique qu\'une fois même si l\'unité est à portée plusieurs fois.' ] },
  { n: '22.02', t: 'Aptitudes de faction', p: [
    '- Aptitudes partagées par les unités d\'une faction (règles d\'armée), listées dans la section Aptitudes de faction de la fiche. Sauf indication contraire, elles ne s\'appliquent que si la faction de ton armée correspond à un mot-clé de faction de la fiche.' ] },
  { n: '22.03', t: 'Aptitudes psychiques', p: [
    '- Les aptitudes marquées « Psychique » sont psychiques. Chaque blessure infligée par une aptitude psychique compte comme une attaque psychique (peut compter pour d\'autres règles).' ] },
  { n: '22.04', t: 'Aptitudes d\'équipement', p: [
    '- Elles viennent d\'un équipement précis et sont listées dans la section correspondante de la fiche. Si l\'unité a l\'équipement, l\'aptitude s\'applique à l\'unité ; si une figurine le porte, elle est le porteur et l\'aptitude dure jusqu\'à sa destruction.' ] },
  { n: '22.05', t: 'Tir plongeant', p: [
    '- Quand une figurine fait une attaque à distance contre une unité visible qui a au moins une figurine au niveau du sol, améliore de 1 la CT de l\'attaque si : la figurine attaquante est sur une section de décor de 3" ou plus de haut ; OU elle a le mot-clé TITANESQUE (TOWERING) et la cible est à 12" ou moins.' ] }
] },
{ n: '23', g: 'Règles avancées', t: 'Aéronefs', s: [
  { n: '23.01', t: 'Déploiement', p: [ '- À l\'étape « Déclarer les formations de bataille », toutes les unités AÉRONEF doivent être placées en réserves stratégiques (20.01).' ] },
  { n: '23.02', t: 'Mouvement', p: [
    '- Un AÉRONEF ne peut faire qu\'un mouvement d\'Insertion (20.04), aucun autre type de mouvement.',
    '- À la fin du tour adverse, tous tes AÉRONEFS sur le champ de bataille retournent en réserves stratégiques.',
    '- Quand une unité fait un mouvement de n\'importe quel type, ses figurines peuvent traverser les figurines AÉRONEF.',
    '- Pour une mise au contact, une consolidation ou un élan, sauf si elle peut VOLER, une unité ignore les AÉRONEFS pour choisir les unités ennemies et déterminer la plus proche.',
    '- Être engagée uniquement avec des AÉRONEFS n\'empêche pas une unité de faire un mouvement normal ou une Avance.' ] },
  { n: '23.03', t: 'Tir', p: [ '- Le Tir plongeant (22.05) n\'a aucun effet sur les attaques faites par des AÉRONEFS ou qui les ciblent.' ] },
  { n: '23.04', t: 'Charge et combat', p: [
    '- Un AÉRONEF ne peut pas déclarer de charge et ne peut faire que des attaques de mêlée contre des unités VOLANTES.',
    '- Seules les unités VOLANTES peuvent choisir un AÉRONEF comme cible de charge ; seules les figurines VOLANTES peuvent faire des attaques de mêlée contre eux.' ] }
] }
);
RULES11.push(
{ n: '24', g: 'Référence', t: 'Aptitudes de base', s: [
  { n: '24.00', t: 'Cumul des aptitudes', p: [
    '- Des aptitudes de base ou d\'arme identiques ne se cumulent pas : le joueur qui contrôle choisit une seule instance à appliquer, même si les valeurs diffèrent. Pour une arme, ce choix se refait à chaque attaque de l\'unité.' ] },
  { n: '24.01', t: 'Aptitudes d\'arme (1/2)', p: [
    '- [ANTI-X Y+] : contre une cible avec le mot-clé X, un jet de blessure non modifié de Y+ est une blessure critique.',
    '- [ASSAUT] : l\'unité peut tirer en tir d\'assaut (10.05).',
    '- [EXPLOSION X] : +1 dé d\'attaque (ou +X pour Explosion X) par tranche de 5 figurines dans l\'unité cible (arrondi inférieur). Ne peut pas cibler une unité engagée.',
    '- [FENTE X] (Cleave) : si toutes les attaques ciblent une seule unité, +X dés d\'attaque par tranche de 5 figurines de cette unité (arrondi inférieur).',
    '- [COMBAT RAPPROCHÉ] : l\'unité peut tirer en tir en combat rapproché (10.06). Au tir normal, chaque figurine non MONSTRE/VÉHICULE choisit soit ses armes [COMBAT RAPPROCHÉ], soit ses autres armes à distance.',
    '- [PISTOLET] : identique à [COMBAT RAPPROCHÉ].',
    '- [BLESSURES DÉVASTATRICES] : une blessure critique met fin à la séquence de cette attaque et inflige des blessures mortelles égales aux Dégâts de l\'arme, après les dégâts normaux. Chaque blessure critique ne peut détruire qu\'une figurine ; les blessures mortelles en excès sont perdues.',
    '- [DANGEREUX] : après que l\'unité a tiré ou combattu, fais un jet de danger (06.03) pour chaque arme [DANGEREUX] choisie.',
    '- [LOURD] : +1 à la touche si l\'unité est non engagée, n\'a pas été posée ce tour et qu\'aucune figurine n\'a bougé de plus de 3" ce tour.',
    '- [IGNORE LE COUVERT] : la cible ne bénéficie pas du couvert contre cette attaque.' ] },
  { n: '24.02', t: 'Aptitudes d\'arme (2/2)', p: [
    '- [TIR INDIRECT] : l\'unité peut tirer en tir indirect (10.07).',
    '- [LANCE] : +1 à la blessure si l\'unité de la figurine a fait un mouvement de charge ce tour.',
    '- [TOUCHES LÉTALES] : sur une touche critique, tu peux blesser automatiquement au lieu de lancer pour blesser.',
    '- [MELTA X] : si la cible est à demi-portée, ajoute X aux Dégâts de l\'arme jusqu\'à la résolution de ces attaques.',
    '- [UN SEUL TIR] : utilisable une seule fois par bataille. Les armes à un seul tir déjà utilisées d\'une figurine qui revient restent inutilisables.',
    '- [PRÉCISION] : si la cible contient un PERSONNAGE visible, le joueur actif peut faire de son groupe d\'attribution le groupe courant, jusqu\'à sa destruction ou la fin de la résolution des attaques.',
    '- [PSYCHIQUE] : ignore tout ou partie des modificateurs de CT/CC et de jet de touche ; ce sont des attaques psychiques.',
    '- [TIR RAPIDE X] : +X dés d\'attaque si la cible est à demi-portée.',
    '- [TOUCHES SOUTENUES X] : chaque touche critique marque X touches supplémentaires.',
    '- [TORRENT] : les attaques de cette arme touchent automatiquement.',
    '- [JUMELÉ] : tu peux relancer le jet de blessure.' ] },
  { n: '24.03', t: 'Aptitudes d\'unité (1/2)', p: [
    '- Fin Mortelle X (24.08) : quand une figurine avec cette aptitude est détruite, une fois que les unités embarquées ont fait leur débarquement d\'urgence, lance un D6 ; sur 6, chaque unité à 6" ou moins subit un nombre de blessures mortelles égal à X (si X est aléatoire, on lance séparément pour chaque unité).',
    '- Frappe en Profondeur (24.09) : à chaque Insertion, si toutes les figurines de l\'unité l\'ont, elle peut être posée n\'importe où sur le champ de bataille à plus de 8" horizontalement de toutes les unités ennemies, même dans la zone de déploiement adverse.',
    '- Ignore la Douleur X+ (24.12) : chaque fois qu\'une figurine avec cette aptitude perdrait un PV, lance un D6 ; sur X+, ce PV n\'est pas perdu.',
    '- Combat en Premier (24.13) : tant que toutes les figurines de l\'unité l\'ont, c\'est une unité Combat en Premier (étape Combats en Combat en Premier, 12.04).',
    '- Plateforme de Tir X (24.14) : dans ta phase de Tir, chaque fois que ce TRANSPORT est choisi pour tirer, si des unités sont embarquées : choisis jusqu\'à X figurines embarquées (dont l\'unité n\'a pas déjà été choisie pour tirer), puis une arme à distance de chacune (hors [UN SEUL TIR]) ; jusqu\'à la fin de ses attaques, le TRANSPORT a ces armes en plus des siennes ; jusqu\'à la fin du tour, les unités embarquées ne peuvent pas tirer.',
    '- Vol Stationnaire (24.17) : quand l\'unité prend son envol (21.03), ne retire pas 2" à la distance maximale.',
    '- Infiltrateurs (24.20) : au déploiement, si toutes les figurines l\'ont, l\'unité peut être posée n\'importe où à plus de 8" horizontalement de la zone de déploiement adverse et de toutes les unités ennemies.' ] },
  { n: '24.04', t: 'Aptitudes d\'unité (2/2)', p: [
    '- Meneur (24.22) / Soutien (24.34) : avant la bataille, à l\'étape « Muster Armies », pour chaque unité meneur et soutien, choisis une unité de protection amie qu\'elle peut mener ; elles forment une unité rattachée (19). Sauf indication contraire, une unité de protection a au plus un meneur et un soutien.',
    '- Agent Solitaire (24.24) : sauf si l\'unité fait partie d\'une unité rattachée, elle n\'est visible des figurines ennemies qu\'à 12" ou moins (ou X" pour « Agent Solitaire X" »), et ne peut être ciblée par des armes [TIR INDIRECT] que si la figurine attaquante est dans cette portée.',
    '- Éclaireurs X" (24.31) : à l\'étape « Résoudre les aptitudes d\'avant-bataille », si toutes les figurines l\'ont, l\'unité peut soit être posée en réserves stratégiques n\'importe où entièrement dans ta zone de déploiement, soit (si elle est entièrement dans ta zone de déploiement) faire un mouvement d\'Éclaireurs de X" au plus (à plus de 8" horizontalement des ennemis). Un TRANSPORT DÉDIÉ dont toutes les figurines embarquées ont Éclaireurs peut aussi faire ce mouvement.',
    '- Furtivité (24.33) : si toutes les figurines de l\'unité l\'ont, chaque attaque à distance qui la cible lui donne le bénéfice du couvert (13.08).',
    '- Super-lourd Marcheur (24.35) : à chaque mouvement normal, Avance ou Retraite : ses figurines peuvent traverser les figurines (MONSTRE/VÉHICULE comprises, TITANESQUE exclues) et traverser horizontalement les sections de décor de 4" ou moins ; avant de bouger, tu peux donner le mot-clé MOBILE à toutes ses figurines jusqu\'à la fin du mouvement ; si tu le fais, lance un D6 à la fin du mouvement : sur 1, l\'unité est en Choc de Bataille.',
    '- Endommagé X (24.39) : tant que les PV restants d\'une figurine sont égaux ou inférieurs à X, elle est endommagée : ses attaques subissent -1 à la touche.',
    '- Attaques Supplémentaires : en mêlée, ces figurines attaquent avec toutes leurs armes Attaques Supplémentaires plus une autre arme de mêlée.' ] }
] }
);
