/* Core rules of 11th edition — paraphrased English summary (not the official text); mirrors rules11.js structure. */
const RULES11_EN = [];
RULES11_EN.push(
{ n: '01', g: 'Core rules', t: 'Core concepts', s: [
  { n: '01.01', t: 'Armies', p: [
    '- Each player commands an army made up of units of models and controls all of its models.',
    '- The "controlling player" is the one who controls the models a rule applies to.' ] },
  { n: '01.02', t: 'Units and models', p: [
    '- A unit has one or more models that move and fight together.',
    '- Most models have a base; the base is part of the model for all rules purposes.',
    '- Friendly = from your army. Enemy = from the opposing army. A rule that says neither applies to any unit, whichever army it belongs to.',
    '- An effect applied to a unit applies to each of its models.' ] },
  { n: '01.03', t: 'Active and opposing player', p: [
    '- One player is the active player, the other is the opposing player; roles swap when the other player becomes active.',
    '- Outside a player\'s turn (start/end of round), the player who goes first that round is the active player.',
    '- During their turn a player is active, except: when a unit is selected to move, its controlling player is active until that move ends; when a unit is selected to shoot or fight, its controlling player is active until its attacks are resolved.' ] },
  { n: '01.04', t: 'Measuring distances', p: [
    '- Distances are measured in inches (").',
    '- You can measure at any time.',
    '- Unless stated otherwise, measure to/from the closest part of the model\'s base.' ] },
  { n: '01.05', t: 'Dice', p: [
    '- Six-sided dice (D6).',
    '- Notation: X+ = a result of X or more; A-B = any result from A to B; XD6 = roll X D6 and add them; D3 = roll a D6 and halve it, rounding up; D6+1, 2D6+3… = add the fixed value.',
    '- Sub-rules cover: automatic success, re-rolls, modifiers, ignoring modifiers, roll-offs, doubles/triples, highest/lowest result, results "treated as" or "set to".' ] },
  { n: '01.06', t: 'Leadership test', p: [
    '- The controlling player rolls 2D6.',
    '- Success if the result is equal to or greater than at least one of the unit\'s Ld characteristics; otherwise it fails.',
    '- The rule that calls for the test defines the effects of success and failure. A "Leadership check" = a "Leadership test".' ] },
  { n: '01.07', t: 'Battle-shock test', p: [
    '- It is a Leadership test taken for a unit by its controlling player. Success: nothing happens to the unit. Failure: the unit and each of its models are Battle-shocked.',
    '- A Battle-shocked unit: the OC of all its models becomes "-"; its controlling player cannot target it with Stratagems; it cannot start an action and actions already started cannot be completed.',
    '! A unit that becomes Battle-shocked after starting an action stops that action. A unit allowed to start an action while Battle-shocked can continue one it started earlier.' ] }
] },
{ n: '02', g: 'Core rules', t: 'Datasheets', s: [
  { n: '02.02', t: 'Profiles', p: [
    '- Move (M): speed across the battlefield. M "-": the model can be set up but not moved.',
    '- Toughness (T): resilience to damage.',
    '- Save (Sv): armour protection, as a dice target (e.g. 4+).',
    '- Invulnerable save (Inv): protection that ignores armour, shown only if the model has one.',
    '- Wounds (W): damage the model can take. At 0 or less it is destroyed.',
    '- Leadership (Ld): courage and self-control, as a dice target (e.g. 7+).',
    '- Objective Control (OC): ability to hold objectives. OC "-": cannot control objectives.',
    '! If a rule sets the Damage of an incoming attack to 0, the change applies after saving throws.',
    '! Modifiers to the charge roll or to the maximum charge distance (e.g. Take Flight) determine which targets can be selected. Example: a roll of 7" with +1 gives 8" max; a flying unit that takes flight and rolls 9" has 7" max (2" removed). If a modifier applied after targets are chosen puts a target out of range, new targets must be chosen.' ] },
  { n: '02.03', t: 'Abilities', p: [
    '- The datasheet lists the unit\'s abilities. Categories: aura abilities (22.01), faction abilities (22.02), psychic abilities (22.03), wargear abilities (22.04).' ] },
  { n: '02.04', t: 'Weapons', p: [
    '- Range (R): shooting range. Range "Melee" = melee weapon.',
    '- Attacks (A): number of attack dice rolled each time it is used.',
    '- Ballistic Skill (BS): hit target of ranged weapons (e.g. 4+).',
    '- Weapon Skill (WS): hit target of melee weapons.',
    '- Strength (S): the higher it is, the easier it is to wound.',
    '- Armour Penetration (AP): modifier to the saving throw (e.g. -1). The bigger it is, the better the armour is pierced.',
    '- Damage (D): damage inflicted by each successful attack.',
    '! A "+1 A" bonus to ranged attacks increases the A characteristic of each ranged weapon by 1; it does not add an extra attack die to each attack.' ] },
  { n: '02.05', t: 'Keywords', p: [
    '- Two groups: faction keywords (used to build the army) and other keywords. Otherwise they work the same.',
    '- A rule that targets a keyword only affects units that have it. Singular and plural are equivalent.',
    '! A compound keyword does not contain the base keyword: a rule on COMMISSAR does not affect COMMISSAR GRAVES.' ] },
  { n: '02.06', t: 'Unit composition and other rules', p: [
    '- Gives the number and type of models, their default wargear, and other rules (which units a Leader can join, who can embark in a TRANSPORT…).',
    '! If the Munitorum Field Manual gives other attachment options than the datasheet, the Field Manual takes precedence.' ] },
  { n: '02.07', t: 'Wargear options', p: [
    '- Some datasheets list options: you can use them when building the army to change weapons and wargear.' ] }
] },
{ n: '03', g: 'Core rules', t: 'Movement', s: [
  { n: '03.01', t: 'Moving units', p: [
    '- Each type of move defines who can make it, its maximum distance (or set-up distance) and its conditions.',
    '- You move models one at a time, in straight lines and/or pivots, as much as you like.',
    '- Unless stated otherwise, a model can move through friendly models and any gap its base fits through; it cannot move through enemy models or off the battlefield; it must respect the "during the move" conditions.',
    '- Straight line: horizontal, measured from the same point on the base at the start and the end. Each straight line adds to the total; it cannot exceed the maximum distance.',
    '- Pivot: around the centre of the base, flat; it does not count towards distance.',
    '- End of the move, check: the unit is in coherency; no model is on top of another or straddling a terrain surface (wall, ceiling); all "after the move" conditions are met. Otherwise the move is impossible and the models return to their starting positions.',
    '- Move types: Advance (09.06), Charge (11.04), Consolidate (12.08), Disembark (18.04), Emergency Disembark (18.05), Fall Back (09.07), Insertion (20.04), Normal (09.05), Pile-in (12.03), Scouts (24.32), Surge (21.02).' ] },
  { n: '03.02', t: 'Setting up', p: [
    '- A unit must be set up on the battlefield before it can move or attack (usually at deployment, sometimes elsewhere).',
    '- When set up: the unit is in coherency, not engaged, and meets all other requirements.',
    '- If not all models can be set up, the unit is removed and returns to where it came from (Strategic Reserves, transport…).',
    '- If the unit cannot be set up during a move: its models return to their previous position, it is not considered selected for that move; it can try again or remain stationary (09.04).' ] },
  { n: '03.03', t: 'Coherency', p: [
    '- A unit of several models must be set up and end every move in coherency.',
    '- Each model must be within 2" horizontally and 5" vertically of at least one other model in the unit, AND within 9" horizontally and 5" vertically of all other models in the unit.',
    '- Regaining coherency: at the end-of-turn step of each player, the controlling player removes models one by one from units out of coherency until it is regained. They are destroyed, without triggering "model destroyed" rules.',
    '! These models count for mission objectives. The unit must form a single connected group. A movement obligation cannot force the unit to end out of coherency.' ] },
  { n: '03.04', t: 'Engagement', p: [
    '- A model\'s Engagement Range = 2" horizontally and 5" vertically.',
    '- When a friendly model is within Engagement Range of enemy models, those models and their units are engaged with each other.',
    '- A unit with no engaged model is not engaged.',
    '! Moving through a unit\'s Engagement Range does not make you engaged.' ] }
] },
{ n: '04', g: 'Core rules', t: 'Making attacks', s: [
  { n: '04', t: 'General sequence', p: [
    '- When a unit shoots or fights, the active player follows three steps: select weapons, select targets, resolve attacks.' ] },
  { n: '04.01', t: '1. Select weapons', p: [
    '- For each model in the attacking unit, choose the weapons used.',
    '- Shooting: one or more ranged weapons. Fighting: exactly one melee weapon.',
    '- A model without a ranged weapon cannot shoot; without a melee weapon it cannot strike.',
    '- Exception: [CLOSE-QUARTERS] weapons alongside other ranged weapons (see 04.01.02, Pistols).' ] },
  { n: '04.02', t: '2. Select targets', p: [
    '- Choose a target for each weapon.',
    '- Shooting: an enemy unit that, unless stated otherwise, must be visible to the model carrying the weapon, within range of the weapon, and not engaged.',
    '- Fighting: one or more enemy units, each engaged with the model carrying the weapon. No more targets than the weapon\'s A characteristic.',
    '- Different weapons can have different targets. If no target is possible, or if you choose none for a ranged weapon, it makes no attacks.',
    '! The visible model and the model in range can be different in the target unit. A model can be in range without being visible.' ] },
  { n: '04.03', t: '3. Resolve attacks', p: [
    'Repeat until all weapons have made all their attacks:',
    '- 1. Pick an enemy unit targeted by one or more weapons.',
    '- 2. Gather attack dice: choose a weapon that targets this unit and has not attacked yet; gather as many D6 as its A characteristic (each die = one attack die). Other weapons making identical attacks against this unit also attack now and their dice are added.',
    '- 3. Resolve these dice with the attack sequence (section 05).',
    '- 4. If unresolved weapons remain against the same unit, go back to 2; otherwise if against another unit, go back to 1; otherwise you are done.',
    '## Identical attacks (04.03.01)',
    '- Same BS/WS, S, AP and D, and the same applicable abilities/rules.',
    '## Splitting melee attacks (04.03.02)',
    '- If a melee weapon targets several units, its attacks are split: declare how many attacks go to each target (at least one per unit) and only gather that many dice per target.',
    '! If some of the attackers target a unit benefiting from cover and not the others, the dice are gathered separately. Identical weapons of which some have [PRECISION] are rolled together against a target without the CHARACTER keyword, since PRECISION does not apply to it.' ] }
] },
{ n: '05', g: 'Core rules', t: 'Attack sequence', s: [
  { n: '05', t: 'Principle', p: [
    '- The active player resolves the sequence below. If a step calls for several dice, roll them all together.',
    '- An attack\'s sequence stops as soon as it fails or inflicts damage.' ] },
  { n: '05.01', t: '1. Hit roll', p: [
    '- One D6 per attack die. An unmodified 1 misses. An unmodified 6 is a Critical Hit.',
    '- Any other result equal to or above the attacker\'s BS/WS hits; otherwise it misses.',
    '- A Critical Hit is still a hit and can trigger [LETHAL HITS], etc.',
    '- Snap shooting (Overwatch, etc.): unless stated otherwise, attacks only hit on a 6; a rule that gives Critical Hits on 4+ does not apply.' ] },
  { n: '05.02', t: '2. Wound roll', p: [
    '- One D6 per hit. An unmodified 1 fails. An unmodified 6 is a Critical Wound.',
    '- Compare the attack\'s Strength (S) to the target\'s Toughness (T):',
    '| S versus T | Roll needed |',
    '| S ≥ 2 × T | 2+ |',
    '| S > T | 3+ |',
    '| S = T | 4+ |',
    '| S < T | 5+ |',
    '| S ≤ T / 2 | 6+ |',
    '- A Critical Wound is still a wound and can trigger [DEVASTATING WOUNDS], etc.' ] },
  { n: '05.03', t: '3. Saving throws', p: [
    'Step resolved by the opposing player:',
    '- 1. Form groups: one group per CHARACTER model, and one group for all other models sharing the same W, Sv and Inv.',
    '- 2. Allocation order: a non-CHARACTER group containing a wounded model goes first; no CHARACTER group goes before a non-CHARACTER group; CHARACTER groups with wounded models go before those without; on a tie, free order.',
    '- 3. Roll a D6 for each attack that wounded.',
    '- Wounds cannot be allocated to a destroyed model. A modifier can make a save worse than 6+: the attack can then be allocated to other models in the unit that have a better save.',
    '- "Saving throw" = "save roll". If hit or wound results change an attack\'s profile, new batches are formed; the active player chooses the order in which batches are resolved.' ] },
  { n: '05.04', t: '4. Inflict damage', p: [
    'The opposing player processes each saving throw, from lowest to highest, until all attacks are resolved or the unit is destroyed. Excess attacks are lost.',
    '- 1. Choose a model from the current group (wounded if possible).',
    '- 2. Check the save: the attack fails (no damage) if the group has an Inv and the unmodified die equals or exceeds it, OR if, after applying AP (e.g. AP -1 turns a 3 into a 2), the result equals or exceeds the Sv. Otherwise damage is inflicted.',
    '- 3. Resolve damage: the model loses as many W as the attack\'s D; at 0 or less it is destroyed.',
    '- The first group in the order is the current group; when all its models are destroyed, the next one becomes current.',
    '- An attack that reaches "resolve damage" counts as having caused damage, even if the model then ignores the wounds (Feel No Pain is rolled at this step).',
    '- Fight On Death: models waiting to fight remain on the battlefield for all rules (measuring, visibility, abilities, Stratagems, engagement) until their unit has attacked or the phase ends.' ] }
] },
{ n: '06', g: 'Core rules', t: 'Other concepts', s: [
  { n: '06.01', t: 'Visibility', p: [
    '- Line of sight: an imaginary straight line 1 mm wide can be drawn from any part of the observing model to any part of the observed model. Models in the observing unit and the observed unit are ignored.',
    '- Visible model: any part is visible. Fully visible model: the whole part facing the observer is visible (only the model itself can block).',
    '- Visible unit: at least one model is. Fully visible unit: all its models are (the observer sees through other models of the same unit).',
    '- Terrain adds visibility rules (13.07).',
    '! A rule that says "visible" without naming the observer means the unit using the rule. Example: a Stratagem on a friendly unit that picks "a visible enemy unit" requires it to be visible to the targeted friendly unit.' ] },
  { n: '06.02', t: 'Mortal wounds', p: [
    '- Each mortal wound is applied in turn until all are inflicted or the unit is destroyed. For each one, its controlling player chooses a model with the first applicable option: 1) a wounded non-CHARACTER model; 2) otherwise a non-CHARACTER model; 3) otherwise a wounded CHARACTER model; 4) otherwise a CHARACTER model.',
    '- The model loses 1 W and is destroyed at 0.',
    '- If an attack inflicts normal damage and mortal wounds, resolve normal damage first, then mortal wounds.' ] },
  { n: '06.03', t: 'Hazard rolls (Hazardous)', p: [
    '- Roll a D6: on a 1-2 the roll fails and the unit suffers 1 mortal wound. If all models in the unit are MONSTER or VEHICLE: 3 mortal wounds instead.',
    '- If several hazard rolls are needed for a unit, make them all at once.',
    '! The mortal wounds from a failed [HAZARDOUS] roll are spread across the unit (06.02), not only among the weapon\'s bearers. A unit makes a single hazard roll whatever its number of models. "Hazardous test" = "hazard roll".' ] }
] }
);
RULES11_EN.push(
{ n: '07', g: 'The battle round', t: 'The battle round', s: [
  { n: '07', t: 'Sequence', p: [
    'A round has three steps: start of round, player turns, end of round.',
    '- 1. Start of round: resolve rules that trigger at this time, before the turns.',
    '- 2. Player turns: each player takes one turn. The same player always goes first (set by the mission). Each turn consists, in order, of: start-of-turn step; Command phase; Movement phase (units move, Strategic Reserves arrive); Shooting phase; Charge phase; Fight phase (units of both players strike); end-of-turn step.',
    '- End of turn: first the rules that trigger at this time (excluding mission rules), then each player consults their mission and resolves what they have achieved.',
    '- 3. End of round: same order (non-mission rules, then mission). The battle ends if the mission\'s round limit is reached; otherwise the next round begins.' ] }
] },
{ n: '08', g: 'The battle round', t: 'Command phase', s: [
  { n: '08', t: 'Sequence', p: [
    'Both players gain Command Points (CP), check their units\' morale and use their strategic abilities.',
    '- 1. Start of phase: resolve rules triggered at this time.',
    '- 2. Basic CP gain: both players gain 1 CP.',
    '- 3. Battle-shock step: the active player takes a Battle-shock test for each unit in their army that is Battle-shocked or at half (or less) of its starting strength. A Battle-shocked unit that passes is no longer Battle-shocked. A failure makes the unit and its models Battle-shocked (see 01.07).',
    '- 4. Command abilities: resolve rules triggered during the phase (other than start/end, CP gain and Battle-shock tests).',
    '- 5. End of phase: non-mission rules, then mission.',
    '## Battle-shock examples',
    '- Starting strength 3, above half but Battle-shocked: test required (passing ends the Battle-shock).',
    '- Starting strength 10, 5 models left: at half, test required.',
    '- Starting strength 5, 2 models left: below half, test required.',
    '- Single-model vehicle, W 11, with 3 W left: below half, test required.' ] }
] },
{ n: '09', g: 'The battle round', t: 'Movement phase', s: [
  { n: '09.01', t: 'Sequence', p: [
    '- Start of phase: resolve triggered rules. "Move units" step (09.02). End of phase: resolve triggered rules.',
    '- Move units step: the active player moves their units one at a time. Choose a friendly unit not yet selected this turn (on the battlefield, in Strategic Reserves or embarked in a TRANSPORT), then a type of move it can make and resolve it. Types: Remain Stationary, Normal Move, Advance, Fall Back, Disembark, Insertion, and any other type presented elsewhere.',
    '- At the end of the step, all units in the army (reserves included) must have been selected, even to remain stationary.' ] },
  { n: '09.04', t: 'Remain Stationary', p: [
    '- Maximum distance: none. Eligible: any unit.',
    '- No model moves or pivots. A stationary unit does not trigger rules that activate when a unit starts or ends a move.' ] },
  { n: '09.05', t: 'Normal Move', p: [
    '- Maximum distance: the M characteristic. Eligible: unit on the battlefield and not engaged.',
    '- After: the unit must be not engaged. No more than one Normal move per phase.' ] },
  { n: '09.06', t: 'Advance', p: [
    '- Maximum distance: Advance roll (1D6) + M. Eligible: on the battlefield and not engaged.',
    '- Before: roll 1D6 (Advance roll). After: unit not engaged; until the end of the turn, unless stated otherwise, it can neither declare a charge nor start an action.' ] },
  { n: '09.07', t: 'Fall Back', p: [
    '- Maximum distance: M. Eligible: the unit is engaged.',
    '- Before moving, choose a mode: Orderly Fall Back (if the unit is not Battle-shocked) or Desperate Escape (mandatory if the unit is Battle-shocked): make a hazard roll for each model in the unit (06.03).',
    '- During: in Desperate Escape, models can move through enemy models.',
    '- After: the unit must be not engaged; until the end of the turn, unless stated otherwise, it cannot shoot, declare a charge or start an action. In Desperate Escape, if it is not Battle-shocked, it must take a Battle-shock test.',
    '## Desperate Escape test (09.07.01)',
    '- "Desperate Escape test" means the hazard rolls made for this mode. A penalty to this test applies to those hazard rolls (e.g. a Battle-shocked unit fleeing from Slaughterers with Bane of Cowards: -1 to its rolls).',
    '- If a Stratagem or ability forces a unit to take a Desperate Escape test: one hazard roll per model + one Battle-shock test.' ] },
  { n: '09.02.02', t: 'Choosing modes', p: [
    '- Modes are mutually exclusive; evaluate them in the order presented.',
    '- If the unit meets the conditions of no mode, it cannot make this move.',
    '- Some modes are mandatory when they apply (Consolidate modes, 12.08). Orderly Fall Back is not: you may choose Desperate Escape.',
    '- A "during/after the move" condition bearing the name of a mode only applies if that mode was chosen; with no mode name, it always applies.' ] },
  { n: '24.32 · 21.02', t: 'Other move types', p: [
    '## Scouts move',
    '- Distance: the X" of "Scouts X"". Eligible: "Resolve pre-battle abilities" step and unit wholly within your deployment zone. After: the unit must be more than 8" horizontally from all enemy units.',
    '## Surge move',
    '- Distance: that of the rule that allows it. Eligible: the rule is triggered, the unit is not Battle-shocked, is not engaged and has not moved in the phase.',
    '- Before: choose the nearest enemy unit as the surge target. During: each model ends engaged with the target if possible, otherwise as close to it as possible. After: not engaged with any other enemy unit; cannot move again this phase.',
    '## Pulse Jet move',
    '- Distance: pulse roll (1D6) + 18". Eligible: per the rule that allows it. Ignores any vertical distance, moves through all model types and terrain.',
    '- After: unit not engaged; no charge or action until the end of the turn; until the start of your next turn, attacks that target it suffer -1 to hit.' ] }
] },
{ n: '10', g: 'The battle round', t: 'Shooting phase', s: [
  { n: '10.01', t: 'Sequence', p: [
    '- Start of phase, Shoot step, end of phase.',
    '- Shoot step: the active player shoots with their eligible units one at a time until each wanted unit has been selected and its attacks resolved. A unit on the battlefield not yet selected to shoot this turn is eligible.',
    '- Choose an eligible friendly unit, then a type of shooting it can make: Normal, Assault, Close-Quarters, Indirect, or another type presented elsewhere (e.g. snap shooting).',
    '- A unit with no weapons can be selected: it makes no attacks but the shooting/fighting type is resolved.' ] },
  { n: '10.04', t: 'Normal shooting', p: [
    '- Eligible: not engaged and did not Advance this turn. Shoots per "Making attacks" (04).',
    '- After: cannot start an action until the end of the phase.' ] },
  { n: '10.05', t: 'Assault shooting', p: [
    '- Eligible: not engaged, Advanced this turn, and has at least one [ASSAULT] weapon.',
    '- During: only [ASSAULT] weapons can be chosen. After: no action until the end of the phase.' ] },
  { n: '10.06', t: 'Close-Quarters shooting', p: [
    '- Eligible: engaged, did not Advance this turn, and at least one [CLOSE-QUARTERS] weapon or a MONSTER/VEHICLE unit.',
    '- During: models can target the enemy units the unit is engaged with.',
    '- MONSTER/VEHICLE models: each attack suffers -1 to hit, unless it is made with a [CLOSE-QUARTERS] weapon against a unit the unit is engaged with. A [BLAST] weapon still cannot target a unit the unit is engaged with.',
    '- Other models: only [CLOSE-QUARTERS] weapons can be chosen, and only enemy units engaged with the unit can be targeted. After: no action until the end of the phase.' ] },
  { n: '10.07', t: 'Indirect shooting', p: [
    '- Eligible: not engaged, did not Advance this turn, at least one [INDIRECT FIRE] weapon.',
    '- During: [INDIRECT FIRE] weapons can target non-visible units. Each attack: the target benefits from cover (13.08); no re-rolling hit rolls; an unmodified hit roll of 1-5 misses (1-3 if the unit remained stationary this turn and the target is visible to at least one friendly unit).',
    '- After: no action until the end of the phase. The unit\'s other weapons can still target visible targets.' ] },
  { n: '15.09', t: 'Snap Shooting', p: [
    '- Eligible: per the rule that allows it (e.g. Overwatch Stratagem).',
    '- During: a single visible enemy unit within 24" or less (if it is a valid target); each attack only hits on an unmodified 6 (regardless of BS or modifiers), and these are not Critical Hits; no re-rolling hit rolls.',
    '- After: no action until the end of the phase.' ] }
] },
{ n: '11', g: 'The battle round', t: 'Charge phase', s: [
  { n: '11.01', t: 'Sequence', p: [
    '- Start of phase, Charge step, end of phase. The active player resolves charges with their units one at a time.',
    '- 1. Declare the charge: choose a friendly unit that has not yet declared a charge this turn and is eligible: on the battlefield, unless stated otherwise. It is NOT eligible if it is not within 12" or less of an enemy unit, if it is engaged, or if it Advanced or Fell Back this turn.',
    '- 2. Charge roll: roll 2D6. The result is the maximum distance of the charge move.',
    '- 3. Attempt the charge: if a charge move is possible and wanted, make it; otherwise the unit does not move. In all cases the charge is resolved.',
    '! With no modifier, a 2 is never enough: a unit cannot end within Engagement Range (2") by charging. A failed charge does not move the unit. When a rule orders a charge outside the Charge phase, resolve steps 2 and 3.' ] },
  { n: '11.04', t: 'Charge move', p: [
    '- Maximum distance: the charge roll. Eligible: the unit declared a charge this phase.',
    '- Before: choose one or more enemy units within 12" or less of your unit and within the maximum distance; these are the charge targets until the end of the move.',
    '- During: each model must end closer to one or more charge targets; each model that can end within 1" or less of a charge target must do so; each model that can end engaged with a charge target must do so.',
    '- After: the unit must be engaged with all charge targets and with no enemy unit that is not one. Until the end of the turn, each model in the unit has Fights First (24.13).',
    '! Example with a roll of 7": a unit within 7" or less can be chosen as a target, but the charge fails if terrain prevents ending engaged. A unit more than 7" away cannot be chosen, even if the charger could end within 2" of it.' ] }
] },
{ n: '12', g: 'The battle round', t: 'Fight phase', s: [
  { n: '12.01', t: 'Sequence', p: [
    '- Both players act. Units first Pile In, then fighters strike in melee, then units Consolidate.',
    '- 1. Start of phase: resolve triggered rules. You must fight with all units that can; you are not obliged to Pile In or Consolidate.',
    '- 2. Pile-in (12.02): both players make Pile-in moves with the eligible units of their choice; the active player first, then the opponent. Only one Pile-in per unit.',
    '- 3. Fight step (12.04).',
    '- 4. Consolidation (12.07).',
    '- 5. End of phase (12.09).' ] },
  { n: '12.03', t: 'Pile-in move', p: [
    '- Maximum distance: 3". Eligible: Fight phase and at least one condition: the unit is engaged; it made a charge this turn; it was chosen for an Overrun attack (12.06).',
    '- Before: if engaged, choose all enemy units it is engaged with; otherwise one or more enemy units within 5" or less.',
    '- During: models in base-to-base contact with an enemy model cannot move; each moved model must end closer to the nearest target, and engaged with it if possible.',
    '- After: the unit must be engaged; each model that started engaged with an enemy unit must still be engaged with that unit.' ] },
  { n: '12.04', t: 'Fight step', p: [
    '- A unit is eligible to fight if it has not yet been selected this turn AND it is engaged (or was at the start of the step) OR made a charge this turn.',
    '- Repeat until all eligible units have fought:',
    '- 1. Fights First combats: starting with the active player, players take turns choosing an eligible friendly Fights First unit. If neither can, move on to remaining combats (the active player chooses first). If the active player has none but the opponent does, the opponent chooses.',
    '- 2. Remaining combats: starting with the player who reaches this step, players take turns choosing an eligible friendly unit. If none remain, the step ends; if only one player has any, the other does not choose.',
    '- After a combat from the remaining combats, if a Fights First unit has become eligible, go back to the Fights First step.',
    '! Changing the distance of a Pile-in or Consolidate does not change the distance to targets. Rules that allow you to Pile In or Consolidate "further" are used in the matching step. If a rule sets the distance to 6", that also changes the maximum distance.' ] },
  { n: '12.05', t: 'When a unit is selected to fight', p: [
    '- Choose a type of fight the unit can make:',
    '- Normal fight: eligible if the unit is engaged; it fights per "Making attacks" (04).',
    '- Overrun attack (12.06): eligible if the unit is not engaged, or was at the start of the step but became engaged during the phase. It makes an extra Pile-in, then fights. Its models can be moved so that previously unengaged enemy units become engaged; they become eligible to fight this phase (and can fight afterwards if they have Fights First).' ] },
  { n: '12.08', t: 'Consolidate move', p: [
    '- Step 4: both players make Consolidate moves with the eligible units of their choice; the active player first. Only one per unit.',
    '- Maximum distance: 3". Eligible: Fight phase and the unit was eligible to fight this phase.',
    '- Before, choose a mode: Continuing Consolidate (if the unit is engaged: mandatory, with all enemy units engaged); Engagement Consolidate (otherwise, if the unit is within 3" or less of one or more enemy units: mandatory, with one or more of them); Objective Consolidate (otherwise, if within 3" or less of an objective: mandatory, with one of them).',
    '- During: continuing = models in base contact do not move, each moved model ends closer to the nearest chosen enemy unit and engaged with it if possible; engagement = same without the base restriction; objective = each model ends within range of the objective if possible, otherwise closer to it.',
    '- After: continuing = each model that started engaged is still engaged with the same unit; engagement = the unit must be engaged with all targeted units, and the opponent must choose (one at a time) to fight any engaged unit that had not yet fought, which becomes eligible and fights; objective = the unit is not engaged and within range of the objective.',
    '! "New enemies": an Engagement Consolidate can end engaged with units that have not yet fought: they will be able to fight your unit. Use with discretion.' ] },
  { n: '12.09', t: 'End of the Fight phase', p: [ '- Resolve rules triggered at the end of the phase.' ] }
] }
);
RULES11_EN.push(
{ n: '13', g: 'Battlefield and tactics', t: 'Terrain', s: [
  { n: '13.01', t: 'Placing terrain', p: [
    'Before the battle, place terrain using one of these methods:',
    '- Mark a boundary (base, mat…) and place one or more features wholly inside it.',
    '- Place a single feature directly on the battlefield.',
    '- Place two or more features that together define the boundary of an area.',
    '- Each of these areas is a terrain area. A mission\'s deployment map can define their location and size; otherwise the players agree before the battle.' ] },
  { n: '13.02', t: 'Terrain categories', p: [
    '- Each feature belongs to a category that influences movement and visibility.',
    '- Exposed (13.03): little protection, crossed freely (craters, barbed wire, debris).',
    '- Light (13.04): offers cover but does not slow movement and offers no lasting shelter (barricades, low walls, statues).',
    '- Dense (13.05): hinders even the largest machines and can hide whole units (buildings, ruins, armoured containers, woods).',
    '- A deployment map can impose the categories of an area; features of different categories can coexist in the same area.',
    '- Solid terrain: a model cannot end a move with any part of it inside an enclosed part of a Solid feature (dense features, 13.11) that is 3" or less from the ground, even through doors and windows.',
    '- Plunging fire: models that climb tall features can benefit from it (22.05).' ] },
  { n: '13.06', t: 'Terrain and movement', p: [
    '- Exposed / Light: all models move horizontally and vertically through them without penalty.',
    '- Dense: INFANTRY, BEASTS, SWARM and MOUNTED can move through it horizontally; INFANTRY, BEASTS and SWARM can also move through it vertically. Other models can only move through it horizontally if every section under their base is 2" or less high; otherwise they must climb over (without passing through ceilings or floors, and without ending on a surface other than the ground).',
    '- Vertical movement: the model stays within ½" horizontally of the feature; both the distance climbed AND the distance descended count towards the total.',
    '- Set-up or end of move: the ground level of any feature is always allowed. Any other surface requires INFANTRY, BEASTS, SWARM, FLY or MONSTER, and a stable position (no base overhangs the edge).',
    '! A MONSTER must go around a dense feature whose sections are all 2" or less; a VEHICLE does not move through it but can climb up and down sections over 2" without ending on them.' ] },
  { n: '13.07', t: 'Terrain and visibility', p: [
    '- Terrain affects visibility through four rules: Benefit of Cover, Hidden, Obscuring and Solid.' ] },
  { n: '13.08', t: 'Benefit of Cover', p: [
    '- When a ranged attack targets a unit, it benefits from cover if every model meets at least one condition: it is INFANTRY, BEASTS or SWARM and is within a terrain area; OR it is not fully visible to the attacker because of terrain features and/or obscuring areas.',
    '- Each attack against a unit in cover has its BS worsened by 1 (−1 to hit).' ] },
  { n: '13.09', t: 'Hidden', p: [
    '- A model is hidden if it is INFANTRY, BEASTS or SWARM in a terrain area containing at least one dense feature, AND its unit made no ranged attack this turn or the previous turn.',
    '- A hidden model is only visible to enemy models within detection range: 15" unless stated otherwise.' ] },
  { n: '13.10', t: 'Obscuring', p: [
    '- Terrain areas containing at least one light or dense feature are obscuring.',
    '- If every line of sight between two models crosses at least one obscuring area (other than those they are in), they cannot see each other.' ] },
  { n: '13.11', t: 'Solid', p: [
    '- Dense features are Solid: no line of sight can be drawn through an enclosed gap in their surface that is 3" or less from the ground.',
    '! 3" is roughly the height of a first floor; a mission can change this height. Models sheltering at ground level remain invisible despite doors, windows or gaps.' ] }
] },
{ n: '14', g: 'Battlefield and tactics', t: 'Objectives', s: [
  { n: '14.01', t: 'Terrain objectives', p: [
    '- The mission says where the objectives are. Each objective point must coincide with a terrain area (13.01), which IS the objective.',
    '- Distances to/from an objective are measured to its closest part.' ] },
  { n: '14.02', t: 'Control level', p: [
    '- At the start of the battle, no objective is controlled.',
    '- To take control of one, you need at least one model with OC 1 or more in range; a model is in range when it is within the terrain area.',
    '- At the end of each phase and each turn, add up the OC of all a player\'s models in range of the objective: that is their control level.',
    '- The player with the highest level controls the objective. On a tie, nobody controls it, unless it is secured (14.03).',
    '- Each unit in range of an objective its player controls, with at least one model of OC 1+, "controls" that objective.',
    '! Example: models with OC 3 and OC 2 give 5; if the opponent has 6, they control the objective. A Battle-shocked unit has OC "-": it counts as 0.' ] },
  { n: '14.03', t: 'Secured objectives', p: [
    '- Some rules let you secure an objective.',
    '- A secured objective stays under the player\'s control even with no unit in range, until the opponent\'s control level is higher than theirs at the end of a phase.' ] }
] },
{ n: '15', g: 'Battlefield and tactics', t: 'Stratagems', s: [
  { n: '15.01', t: 'Using a Stratagem', p: [
    '- Both players can use Stratagems. Each lists its CP cost, WHEN, TARGET, EFFECT and possibly RESTRICTIONS.',
    '- The same Stratagem cannot be used more than once per phase. Unless stated otherwise, the same unit cannot be targeted by more than one Stratagem per phase.',
    '- Resolution: 1) choose targets; 2) pay the CP cost (a "+X CP" option can only be used if the extra is paid; without enough CP you cannot use it); 3) resolve the effects.',
    '- Core Stratagems belong to all players; the others are in codexes and other publications.' ] },
  { n: '15.02', t: 'Command Re-roll — 1 CP', p: [
    '- WHEN: any phase, just after an Advance roll, Charge roll, Damage roll, hazard roll, Hit roll, Saving throw or Wound roll for a friendly unit or model, or a roll to determine the number of attacks of a weapon.',
    '- TARGET: that unit or model. EFFECT: re-roll that roll. If several dice are rolled together, re-roll one of them (a charge roll is re-rolled in full).' ] },
  { n: '15.03', t: 'Epic Challenge — 1 CP', p: [
    '- WHEN: Fight phase, just after a friendly CHARACTER unit is selected to fight. TARGET: that unit.',
    '- EFFECT: choose a CHARACTER model in the unit; until the end of the phase, its melee weapons have [PRECISION].' ] },
  { n: '15.04', t: 'Insane Bravery — 1 CP', p: [
    '- WHEN: Battle-shock step of your Command phase, just before a Battle-shock test for a friendly unit.',
    '- EFFECT: that test is automatically passed. RESTRICTION: once per battle.' ] },
  { n: '15.05', t: 'Grenade — 1 CP', p: [
    '- WHEN: your Shooting phase. TARGET: a friendly GRENADES unit that is not engaged, eligible to shoot, and did not Advance this turn.',
    '- EFFECT: choose a GRENADES model in the unit and an enemy unit that is not engaged, visible to that model and within 8" or less; roll six D6: each 4+ inflicts 1 mortal wound on that enemy unit (06.02).' ] },
  { n: '15.06', t: 'Tank Shock — 1 CP', p: [
    '- WHEN: your Charge phase, just after a friendly MONSTER/VEHICLE unit ends a charge move. TARGET: that unit.',
    '- EFFECT: choose an enemy unit engaged with yours, and a model in your unit engaged with it. Roll as many D6 as its Toughness: each 1 inflicts 1 mortal wound on your unit; each 5+ inflicts 1 on the enemy unit (6 maximum per unit).' ] },
  { n: '15.07', t: 'Rapid Ingress — 1 CP', p: [
    '- WHEN: end of your opponent\'s Movement phase. TARGET: a friendly unit in Strategic Reserves (excluding AIRCRAFT).',
    '- EFFECT: it makes an Insertion move (20.04). RESTRICTION: not possible in the first round.' ] },
  { n: '15.08', t: 'Fire Overwatch — 1 CP', p: [
    '- WHEN: end of your opponent\'s Movement phase. TARGET: a friendly unit that is not engaged (excluding TITANIC).',
    '- EFFECT: it shoots using snap shooting (15.09): a single visible enemy unit within 24", hits only on an unmodified 6, no re-rolls.' ] },
  { n: '15.10', t: 'Smokescreen — 1 CP', p: [
    '- WHEN: start of your opponent\'s Shooting phase. TARGET: a friendly SMOKE unit.',
    '- EFFECT: until the end of the phase, a target benefits from cover (13.08) against attacks if it is the SMOKE unit, or if it is not fully visible to the attacker because of SMOKE models.' ] },
  { n: '15.11', t: 'Heroic Intervention — 1 CP', p: [
    '- WHEN: end of your opponent\'s Charge phase. TARGET: a friendly unit that is not engaged within 12" or less of one or more enemy units. A VEHICLE is only eligible if it is a CHARACTER/WALKER.',
    '- EFFECT: resolve a charge (11.02); before the charge roll, choose a mode:',
    '- Leap to the defence: you can only choose enemy units that charged this phase and are within the maximum distance.',
    '- Into the thick of it (+1 CP): if the (modified) charge roll exceeds 6, it becomes 6; you can choose any enemy unit within 6" or less and within the maximum distance.' ] },
  { n: '15.12', t: 'Counter-offensive — 2 CP', p: [
    '- WHEN: Fight step of your opponent\'s Fight phase, just after an enemy unit has resolved its attacks. TARGET: a friendly unit eligible to fight.',
    '- EFFECT: until the end of the phase, it has Fights First and must be the next unit you choose to fight (12.04).' ] }
] },
{ n: '16', g: 'Battlefield and tactics', t: 'Actions', s: [
  { n: '16.01', t: 'Performing an action', p: [
    'Each action lists: STARTS (when), UNITS (which), LIMIT, COMPLETES (when), EFFECT and any restrictions.',
    '## Starting an action',
    'A unit cannot start an action if: it is not on the battlefield; it is an AIRCRAFT or a FORTIFICATION; it is Battle-shocked; its OC is 0 or "-"; it is engaged (except TITANIC); it Advanced or Fell Back this turn; it has already started another action this turn.',
    '- Once the action has started, until the end of the turn the unit cannot shoot (except TITANIC) or declare a charge.',
    '## Completing an action',
    '- If the unit makes a move (other than Pile-in and Consolidate) or leaves the battlefield, it does not complete the action. Otherwise the effect triggers at the end of the action.',
    '- Example: STARTS your Shooting phase; UNITS an INFANTRY in a terrain area outside your deployment zone; LIMIT once per turn; COMPLETES at the end of the turn; EFFECT place a marker 1" from the unit in that area.' ] }
] }
);
RULES11_EN.push(
{ n: '17', g: 'Advanced rules', t: 'Monsters and Vehicles', s: [
  { n: '17.01', t: 'Movement', p: [
    '- When a unit makes a Normal move or an Advance, its MONSTER/VEHICLE models can move through friendly and enemy models, except other MONSTER/VEHICLE models (they cannot move through each other).' ] },
  { n: '17.02', t: 'FRAME', p: [
    '- Models with the FRAME keyword are measured differently (many MONSTERS/VEHICLES and a few other large models): unless stated otherwise, measure to/from the closest point of the model, not necessarily of its base.',
    '- A FRAME model with no base that pivots during a move can turn as much as it likes around its central axis, flat.' ] },
  { n: '17.03', t: 'Shooting', p: [
    '- During your Shooting phase, engaged enemy MONSTER/VEHICLE units can be targeted by ranged attacks.',
    '- Each ranged attack against such a unit suffers -1 to hit, except for [CLOSE-QUARTERS] weapons used by models from a unit engaged with the target.',
    '- A unit engaged with a MONSTER/VEHICLE cannot target that unit with its [BLAST] weapons, but can target other units that are not engaged.',
    '- An INFANTRY unit engaged with a VEHICLE can shoot it in Close-Quarters: only with its [CLOSE-QUARTERS] weapons, and only that VEHICLE.' ] }
] },
{ n: '18', g: 'Advanced rules', t: 'Transports', s: [
  { n: '18.01', t: 'Transport capacity', p: [
    '- A TRANSPORT has a capacity on its datasheet (type and maximum number of friendly models that can embark). Several units can embark together if the capacity is enough.',
    '- Before the battle, at the "Declare battle formations" step, units can start embarked in a friendly TRANSPORT with enough remaining capacity for the whole unit.' ] },
  { n: '18.02', t: 'Embarking', p: [
    '- After the start of the first round, a friendly unit can embark in a friendly TRANSPORT after a Normal move, Advance or Fall Back if: every model is within 3" or less of the TRANSPORT; the unit was not set up on the battlefield this turn; it is allowed to embark in it according to its datasheet; the TRANSPORT has enough capacity for all its models.',
    '- The active player removes the unit from the battlefield and sets it aside: it is embarked.' ] },
  { n: '18.03', t: 'Disembarking', p: [
    '- In the active player\'s Movement phase, each embarked friendly unit can disembark with a Disembark move (18.04).',
    '- If a TRANSPORT is destroyed, the active player makes an Emergency Disembark (18.05) for each embarked unit, before removing the TRANSPORT.' ] },
  { n: '18.04', t: 'Disembark move', p: [
    '- Set-up distance: Rapid or Tactical 3"; Combat 6".',
    '- Eligible if: the unit is embarked in a TRANSPORT on the battlefield; it did not embark in it this phase; the TRANSPORT did not Advance or Fall Back this phase. Effect: set up per 03.02.',
    '- Before, choose a mode: Rapid (mandatory if the TRANSPORT made a Normal or Insertion move this phase); Tactical (otherwise, if the TRANSPORT remained stationary or has not yet been selected to move, and the unit can be set up that way); Combat (otherwise: hazard roll for each model).',
    '- During: each model is set up wholly within the TRANSPORT\'s set-up distance. Rapid: if the TRANSPORT made an Insertion this turn, each model follows the same rules as it. Combat: a model can be set up engaged with enemy units the TRANSPORT is engaged with.',
    '- After: Rapid = no charge until the end of the turn; Tactical = the unit can be selected for a Normal move or Advance; Combat = the unit is Battle-shocked and cannot declare a charge until the end of the turn.' ] },
  { n: '18.05', t: 'Emergency Disembark', p: [
    '- Set-up distance: 6". Eligible: the unit is embarked in a TRANSPORT that has just been destroyed.',
    '- Before: hazard roll for each model (06.03). During: each model is set up wholly within 6" or less of the TRANSPORT, as close as possible; if that is impossible while staying not engaged, it is set up as close as possible, engaged; any model that cannot be set up is destroyed.',
    '- After: the unit is Battle-shocked and cannot declare a charge until the end of the turn.' ] }
] },
{ n: '19', g: 'Advanced rules', t: 'Attached units', s: [
  { n: '19.01', t: 'Forming an attached unit', p: [
    '- Units with the Leader or Support ability can lead specific bodyguard units (listed in the Warhammer 40,000 app) to form an attached unit.',
    '- An attached unit is "a single unit for all rules".' ] },
  { n: '19.02', t: 'Attacking an attached unit', p: [
    '- If the unit contains bodyguard models, attacks use the highest Toughness among those models, even if a leader/support has a different Toughness. Otherwise, the highest among the leaders/supports.',
    '- Rules triggered by a unit\'s destruction only apply when the last model that started the battle in the attached unit is destroyed.' ] },
  { n: '19.03', t: 'Keywords of an attached unit', p: [
    '- An attached unit has all the keywords of all its component units; rules that target those keywords apply to it. A model does not thereby gain the keywords of the other models.',
    '- Attacks target units, not models. Example: a PSYKER leader makes the whole unit PSYKER; an [ANTI-PSYKER 4+] weapon makes Critical Wounds on an unmodified 4+ against it, even if the attack is not allocated to the leader.' ] },
  { n: '19.04', t: 'Abilities in an attached unit', p: [
    '- An ability that affects a specific model (enhancement, wargear) only applies to it.',
    '- Otherwise, unit-level abilities apply to all models of the attached unit until their source is destroyed: leader/support unit = until its last model is destroyed; bodyguard unit = same; specific model (bearer) = until it is destroyed.',
    '- Leaders/supports keep their "while this model is leading a unit" abilities after their bodyguard unit is destroyed, if they started the battle attached.',
    '- If the last source model is destroyed by an attack, the conferred ability lasts until the attacking unit has resolved all its attacks.' ] }
] },
{ n: '20', g: 'Advanced rules', t: 'Strategic Reserves', s: [
  { n: '20.01', t: 'Strategic Reserves', p: [
    '- At the "Declare battle formations" step, you can place friendly units (excluding FORTIFICATIONS) in Strategic Reserves instead of deploying them. They arrive later.',
    '- Unless stated otherwise, the total points of your reserves cannot exceed 50% of the battle size points limit (units embarked in TRANSPORTS in reserves included).' ] },
  { n: '20.02', t: 'Repositioned units', p: [
    '- Units removed from the battlefield and placed in reserves during the battle by other rules are "repositioned". In addition to the arrival rules: if the rule is used in the Movement phase, it can target units that have already moved; a unit set up the turn it Advanced, Fell Back or Disembarked is still considered to have done so; effects with set durations or conditions continue as long as they last (e.g. a unit that left an aura is no longer affected if it is out of range when it Inserts; a Battle-shocked unit stays so).' ] },
  { n: '20.03', t: 'Arriving from reserves', p: [
    '- Each unit in reserves must make an Insertion move to arrive. Unless stated otherwise, only from battle round 2.' ] },
  { n: '20.04', t: 'Insertion move', p: [
    '- Set-up distance: 6". Eligible: the unit is in reserves (excluding units embarked in TRANSPORTS that are themselves in reserves). Effect: set up per 03.02.',
    '- During: set up wholly within 6" or less of one or more battlefield edges, and more than 8" horizontally from all enemy units. Before round 3, no model can be set up in the opponent\'s deployment zone.',
    '- After: unless stated otherwise, the unit cannot make any other type of move until the start of the next Charge phase.',
    '- End of round 3: unless stated otherwise, units in reserves that have not made an Insertion are destroyed. Exceptions: units embarked in TRANSPORTS that made an Insertion during the battle; repositioned units (20.02).' ] }
] },
{ n: '21', g: 'Advanced rules', t: 'Flying and Surge', s: [
  { n: '21.02', t: 'Surge move', p: [
    '- Some rules allow a Surge move, defined by each rule.',
    '- Maximum distance: that of the rule. Eligible: the rule is triggered, the unit is not Battle-shocked, is not engaged and has not moved this phase.',
    '- Before: choose the nearest enemy unit as the surge target. During: each model ends engaged with the target if possible, otherwise as close as possible. After: the unit is not engaged with any other enemy unit; it cannot move again this phase.',
    '! Example: unit A shoots and destroys two models of B; B has a D6" Surge triggered by those losses; the D6 is 4, each surviving model of B moves up to 4" towards the nearest enemy (C) and ends engaged with C.' ] },
  { n: '21.03', t: 'Flying models', p: [
    '- Models with FLY (and their units) can fly.',
    '- When a FLY unit is selected for a Normal move, Advance, Fall Back or charge, the active player can declare that it takes flight before moving. During that move: −2" to the maximum distance; each FLY model ignores any vertical distance, and can move through all model types (enemy and MONSTER/VEHICLE included) and all terrain, horizontally and vertically.',
    '- A charge roll of 9" while taking flight therefore gives a maximum distance of 7" (see also Hover).' ] }
] },
{ n: '22', g: 'Advanced rules', t: 'Other rules and abilities', s: [
  { n: '22.01', t: 'Aura abilities', p: [
    '- Abilities that affect models or units within a given range are aura abilities (marked "Aura"). A model with an aura is always within range of its own aura.',
    '- A unit can be affected by several auras; the same aura only applies once even if the unit is in range several times.' ] },
  { n: '22.02', t: 'Faction abilities', p: [
    '- Abilities shared by the units of a faction (army rules), listed in the Faction abilities section of the datasheet. Unless stated otherwise, they only apply if your army\'s faction matches a faction keyword on the datasheet.' ] },
  { n: '22.03', t: 'Psychic abilities', p: [
    '- Abilities marked "Psychic" are psychic. Each wound inflicted by a psychic ability counts as a psychic attack (it can count for other rules).' ] },
  { n: '22.04', t: 'Wargear abilities', p: [
    '- They come from a specific piece of wargear and are listed in the matching section of the datasheet. If the unit has the wargear, the ability applies to the unit; if a model carries it, that model is the bearer and the ability lasts until it is destroyed.' ] },
  { n: '22.05', t: 'Plunging fire', p: [
    '- When a model makes a ranged attack against a visible unit that has at least one model at ground level, improve the attack\'s BS by 1 if: the attacking model is on a terrain section 3" or more high; OR it has the TOWERING keyword and the target is within 12" or less.' ] }
] },
{ n: '23', g: 'Advanced rules', t: 'Aircraft', s: [
  { n: '23.01', t: 'Deployment', p: [ '- At the "Declare battle formations" step, all AIRCRAFT units must be placed in Strategic Reserves (20.01).' ] },
  { n: '23.02', t: 'Movement', p: [
    '- An AIRCRAFT can only make an Insertion move (20.04), no other type of move.',
    '- At the end of your opponent\'s turn, all your AIRCRAFT on the battlefield return to Strategic Reserves.',
    '- When a unit makes a move of any type, its models can move through AIRCRAFT models.',
    '- For a Pile-in, Consolidate or Surge, unless it can FLY, a unit ignores AIRCRAFT when choosing enemy units and determining the nearest one.',
    '- Being engaged only with AIRCRAFT does not prevent a unit from making a Normal move or an Advance.' ] },
  { n: '23.03', t: 'Shooting', p: [ '- Plunging fire (22.05) has no effect on attacks made by or targeting AIRCRAFT.' ] },
  { n: '23.04', t: 'Charge and fight', p: [
    '- An AIRCRAFT cannot declare a charge and can only make melee attacks against FLY units.',
    '- Only FLY units can choose an AIRCRAFT as a charge target; only FLY models can make melee attacks against them.' ] }
] }
);
RULES11_EN.push(
{ n: '24', g: 'Reference', t: 'Core abilities', s: [
  { n: '24.00', t: 'Stacking abilities', p: [
    '- Identical core or weapon abilities do not stack: the controlling player chooses a single instance to apply, even if the values differ. For a weapon, this choice is made again for each of the unit\'s attacks.' ] },
  { n: '24.01', t: 'Weapon abilities (1/2)', p: [
    '- [ANTI-X Y+]: against a target with keyword X, an unmodified wound roll of Y+ is a Critical Wound.',
    '- [ASSAULT]: the unit can shoot in Assault shooting (10.05).',
    '- [BLAST X]: +1 attack die (or +X for Blast X) for every 5 models in the target unit (rounded down). Cannot target an engaged unit.',
    '- [CLEAVE X]: if all attacks target a single unit, +X attack dice for every 5 models in that unit (rounded down).',
    '- [CLOSE-QUARTERS]: the unit can shoot in Close-Quarters shooting (10.06). In normal shooting, each non-MONSTER/VEHICLE model chooses either its [CLOSE-QUARTERS] weapons or its other ranged weapons.',
    '- [PISTOL]: identical to [CLOSE-QUARTERS].',
    '- [DEVASTATING WOUNDS]: a Critical Wound ends the sequence for that attack and inflicts mortal wounds equal to the weapon\'s Damage, after normal damage. Each Critical Wound can only destroy one model; excess mortal wounds are lost.',
    '- [HAZARDOUS]: after the unit has shot or fought, make a hazard roll (06.03) for each [HAZARDOUS] weapon chosen.',
    '- [HEAVY]: +1 to hit if the unit is not engaged, was not set up this turn and no model moved more than 3" this turn.',
    '- [IGNORES COVER]: the target does not benefit from cover against this attack.' ] },
  { n: '24.02', t: 'Weapon abilities (2/2)', p: [
    '- [INDIRECT FIRE]: the unit can shoot in Indirect shooting (10.07).',
    '- [LANCE]: +1 to wound if the model\'s unit made a charge move this turn.',
    '- [LETHAL HITS]: on a Critical Hit, you can wound automatically instead of rolling to wound.',
    '- [MELTA X]: if the target is within half range, add X to the weapon\'s Damage until those attacks are resolved.',
    '- [ONE SHOT]: usable only once per battle. One-shot weapons already used by a returning model remain unusable.',
    '- [PRECISION]: if the target contains a visible CHARACTER, the active player can make its allocation group the current group, until it is destroyed or the attacks have finished resolving.',
    '- [PSYCHIC]: ignores some or all modifiers to BS/WS and to the hit roll; these are psychic attacks.',
    '- [RAPID FIRE X]: +X attack dice if the target is within half range.',
    '- [SUSTAINED HITS X]: each Critical Hit scores X additional hits.',
    '- [TORRENT]: this weapon\'s attacks hit automatically.',
    '- [TWIN-LINKED]: you can re-roll the wound roll.' ] },
  { n: '24.03', t: 'Unit abilities (1/2)', p: [
    '- Deadly Demise X (24.08): when a model with this ability is destroyed, once embarked units have made their Emergency Disembark, roll a D6; on a 6, each unit within 6" or less suffers a number of mortal wounds equal to X (if X is random, roll separately for each unit).',
    '- Deep Strike (24.09): on each Insertion, if all models in the unit have it, it can be set up anywhere on the battlefield more than 8" horizontally from all enemy units, even in the opponent\'s deployment zone.',
    '- Feel No Pain X+ (24.12): each time a model with this ability would lose a W, roll a D6; on X+, that W is not lost.',
    '- Fights First (24.13): while all models in the unit have it, it is a Fights First unit (Fights First combats step, 12.04).',
    '- Firing Deck X (24.14): in your Shooting phase, each time this TRANSPORT is selected to shoot, if units are embarked: choose up to X embarked models (whose unit has not already been selected to shoot), then a ranged weapon from each (excluding [ONE SHOT]); until the end of its attacks, the TRANSPORT has those weapons in addition to its own; until the end of the turn, the embarked units cannot shoot.',
    '- Hover (24.17): when the unit takes flight (21.03), do not subtract 2" from the maximum distance.',
    '- Infiltrators (24.20): at deployment, if all models have it, the unit can be set up anywhere more than 8" horizontally from the opponent\'s deployment zone and all enemy units.' ] },
  { n: '24.04', t: 'Unit abilities (2/2)', p: [
    '- Leader (24.22) / Support (24.34): before the battle, at the "Muster Armies" step, for each leader and support unit, choose a friendly bodyguard unit it can lead; they form an attached unit (19). Unless stated otherwise, a bodyguard unit has at most one leader and one support.',
    '- Lone Operative (24.24): unless the unit is part of an attached unit, it is only visible to enemy models within 12" or less (or X" for "Lone Operative X""), and can only be targeted by [INDIRECT FIRE] weapons if the attacking model is within that range.',
    '- Scouts X" (24.31): at the "Resolve pre-battle abilities" step, if all models have it, the unit can either be placed in Strategic Reserves anywhere wholly within your deployment zone, or (if it is wholly within your deployment zone) make a Scouts move of up to X" (more than 8" horizontally from enemies). A DEDICATED TRANSPORT whose embarked models all have Scouts can also make this move.',
    '- Stealth (24.33): if all models in the unit have it, each ranged attack that targets it gives it the benefit of cover (13.08).',
    '- Super-heavy Walker (24.35): on each Normal move, Advance or Fall Back: its models can move through models (MONSTER/VEHICLE included, TITANIC excluded) and horizontally through terrain sections of 4" or less; before moving, you can give the MOUNTED keyword to all its models until the end of the move; if you do, roll a D6 at the end of the move: on a 1, the unit is Battle-shocked.',
    '- Damaged X (24.39): while a model\'s remaining W is equal to or less than X, it is damaged: its attacks suffer -1 to hit.',
    '- Extra Attacks: in melee, these models attack with all their Extra Attacks weapons plus one other melee weapon.' ] }
] }
);
