/* Tests unitaires de l'export TTS :  node --test tests/   (Node >= 18) */
const test = require('node:test'); const assert = require('node:assert/strict');
const H = require('./harness.js'); const W = H.Wahap; const T = require('../tts-export.js'); const makeArmy = require('./example-army.js');
let R, A;
test.before(async () => { A = await makeArmy(W); R = T.build(await T.prepare(A, W, { lang: 'fr' })); });
const unit = (n) => R.data.units.find((u) => u.name === n || u.name.includes(n));
const wcount = (m, w) => (m.weapons.find((x) => x.name === w) || {}).count || 0;

test('structure racine et armée', () => {
  assert.equal(R.data.format, 'noobhammer-tts'); assert.equal(R.data.version, 1); assert.equal(R.data.edition, '11e');
  assert.deepEqual(Object.keys(R.data.army), ['name', 'faction', 'subfaction', 'detachment', 'points', 'pointsLimit']);
  assert.equal(R.data.army.pointsLimit, 2000); assert.equal(R.data.army.points, R.data.units.reduce((s, u) => s + u.points, 0));
  assert.equal(R.data.army.detachment, "Force d'Intervention Gladius");
});
test('JSON minifié, sans retour à la ligne structurel ni null', () => {
  assert.ok(!/\n/.test(R.json.replace(/\\n/g, ''))); assert.equal(JSON.parse(R.json).units.length, R.data.units.length); assert.ok(!/null/.test(R.json));
  assert.equal(R.json, JSON.stringify(JSON.parse(R.json)));
});
test('la liste d\'exemple passe la validation', () => { assert.deepEqual(R.errors, []); });
test('ids uniques dans l\'ordre de la liste', () => { assert.deepEqual(R.data.units.map((u) => u.id), ['u01', 'u02', 'u03', 'u04', 'u05', 'u06', 'u07']); });
test('chef rattaché à son escouade', () => { assert.equal(R.data.units[0].attachedTo, 'u02'); assert.equal(R.data.units[1].attachedTo, ''); });
test('amélioration exportée en type enhancement', () => { assert.ok(R.data.units[0].abilities.some((a) => a.type === 'enhancement' && a.description.length > 10)); });
test('escouade à armes différentes : sergent à pistolet à plasma', () => {
  const u = unit('Hellblaster'); const sg = u.models.find((m) => m.profile === 'Hellblaster Sergeant');
  assert.equal(sg.count, 1); assert.equal(wcount(sg, 'Plasma Pistol - Standard'), 1); assert.equal(wcount(sg, 'Bolt Pistol'), 0);
  const m = u.models.find((x) => x.profile === 'Hellblaster'); assert.equal(m.count, 4); assert.equal(wcount(m, 'Bolt Pistol'), 1);
  assert.equal(u.models.reduce((s, x) => s + x.count, 0), 5);
});
test('escouade : lance-grenades sur 1 figurine, sergent au gantelet', () => {
  const u = unit('Intercessor'); assert.equal(u.models.reduce((s, x) => s + x.count, 0), 5);
  assert.equal(u.models.find((m) => m.profile === 'Intercessor Sergeant').weapons.some((w) => w.name === 'Power Fist'), true);
  const gl = u.models.filter((m) => m.weapons.some((w) => w.name.startsWith('Grenade Launcher'))); assert.equal(gl.length, 1); assert.equal(gl[0].count, 1);
});
test('terminators : 3 figurines avec marteau + bouclier, 1 avec griffes', () => {
  const u = unit('Terminator'); const th = u.models.find((m) => wcount(m, 'Thunder Hammer') === 1);
  assert.equal(th.count, 3); assert.deepEqual(th.abilities.length, 1);
  assert.equal(u.models.filter((m) => wcount(m, 'Twin Lightning Claws') === 1).reduce((s, m) => s + m.count, 0), 2);
});
test('véhicule : une seule figurine, arme à deux modes', () => {
  const u = unit('Redemptor'); assert.equal(u.models.length, 1); assert.equal(u.models[0].count, 1);
  const modes = u.weapons.filter((w) => w.name.startsWith('Macro Plasma Incinerator')).map((w) => w.name); assert.deepEqual(modes, ['Macro Plasma Incinerator - Standard', 'Macro Plasma Incinerator - Supercharge']);
});
test('armes : types, portée, AP et mots-clés en anglais', () => {
  const u = unit('Infernus'); const p = u.weapons.find((w) => w.name === 'Pyreblaster'); const f = u.weapons.find((w) => w.name === 'Ceramite Fists');
  assert.deepEqual([p.type, p.range, p.skill, p.AP], ['ranged', '12"', 'N/A', '-1']); assert.deepEqual(p.keywords, ['Blast 1', 'Torrent']);
  assert.deepEqual([f.type, f.range], ['melee', 'Melee']);
});
test('aucune arme inutilisée dans weapons[]', () => {
  R.data.units.forEach((u) => { const used = new Set(); u.models.forEach((m) => m.weapons.forEach((w) => used.add(w.name))); u.weapons.forEach((w) => assert.ok(used.has(w.name), u.name + ' : ' + w.name + ' inutilisée')); });
});
test('équipement non choisi absent (dôme de bouclier de l\'Impulsor)', () => {
  const u = unit('Impulsor'); assert.ok(!u.abilities.some((a) => /Dôme/.test(a.name))); assert.ok(u.abilities.some((a) => a.type === 'wargear'));
});
test('valeurs de caractéristiques en chaînes', () => {
  R.data.units.forEach((u) => u.profiles.forEach((p) => ['M', 'T', 'SV', 'W', 'LD', 'OC', 'invulnerableSave'].forEach((k) => assert.equal(typeof p[k], 'string'))));
  assert.equal(unit('Terminator').profiles[0].invulnerableSave, '4+'); assert.equal(unit('Infernus').profiles[0].M, '6"');
});
test('mots-clés d\'arme : casse normalisée', () => { assert.equal(T.kwTitle('BLAST 1'), 'Blast 1'); assert.equal(T.kwTitle('ONE SHOT'), 'One Shot'); assert.equal(T.kwTitle('Rapid Fire 2'), 'Rapid Fire 2'); assert.equal(T.kwTitle('ANTI-VEHICLE 2+'), 'Anti-Vehicle 2+'); });
test('texte brut : HTML, Markdown et BBCode retirés, crochets des noms remplacés', () => {
  assert.equal(T.clean('<b>Gras</b> et **fort** [b]x[/b]'), 'Gras et fort x');
  assert.equal(T.kwTitle('Arme [x]'), 'Arme (x)');
});

/* ---- validation : cas d'erreur ---- */
const clone = () => JSON.parse(R.json);
const has = (errs, re) => errs.some((e) => re.test(e.msg));
test('validation : id en double', () => { const d = clone(); d.units[1].id = d.units[0].id; assert.ok(has(T.validate(d), /en double/)); });
test('validation : profil inexistant (message avec l\'unité)', () => { const d = clone(); d.units[2].models[0].profile = 'Inconnu'; const e = T.validate(d); assert.ok(has(e, /profil « Inconnu »/)); assert.ok(e.find((x) => /Inconnu/.test(x.msg)).unit.includes('Hellblaster')); });
test('validation : arme inexistante', () => { const d = clone(); d.units[1].models[0].weapons[0].name = 'Lance-patate'; assert.ok(has(T.validate(d), /Lance-patate/)); });
test('validation : somme des figurines', () => { const d = clone(); d.units[1].models[0].count += 1; const e = T.validate(d, { expected: { u02: 5 } }); assert.ok(has(e, /somme des figurines/)); });
test('validation : null interdit', () => { const d = clone(); d.units[1].profiles[0].OC = null; const e = T.validate(d); assert.ok(has(e, /chaîne|nulle/)); });
test('validation : nombre à la place d\'une chaîne', () => { const d = clone(); d.units[1].weapons[0].S = 5; assert.ok(has(T.validate(d), /doit être une chaîne/)); });
test('validation : balises et crochets', () => { const d = clone(); d.units[1].weapons[0].name = 'Arme [x]'; d.units[1].abilities[0].description = '<b>x</b>'; const e = T.validate(d); assert.ok(has(e, /crochets/)); assert.ok(has(e, /balise/)); });
test('validation : retour à la ligne autorisé seulement dans description', () => { const d = clone(); d.units[1].name = 'a\nb'; assert.ok(has(T.validate(d), /retour à la ligne/)); const e = clone(); e.units[1].abilities.find((a) => a.type === 'datasheet').description = 'a\nb'; assert.deepEqual(T.validate(e), []); });
test('validation : rattachement vers une unité inconnue', () => { const d = clone(); d.units[0].attachedTo = 'u99'; assert.ok(has(T.validate(d), /attachedTo/)); });
test('validation : type d\'arme et portée', () => { const d = clone(); d.units[1].weapons[0].type = 'x'; assert.ok(has(T.validate(d), /type doit être/)); });
test('validation : champ manquant', () => { const d = clone(); delete d.units[1].keywords; assert.ok(has(T.validate(d), /keywords doit être un tableau/)); });
test('validation : minification non altérée par le build (une seule ligne)', () => { assert.equal(R.json.split('\n').length, 1); });

/* ---- repli sans fiche (liste importée) ---- */
test('unité hors base : export possible avec remarque', async () => {
  const a = { id: 'x', name: 'Import', faction: 'Space Marines', detachments: [], units: [{ id: 'z1', name: 'Unité Maison', models: '3', pts: 60, M: '6', T: '4', sv: '3+', inv: '', W: '2', Ld: '6+', OC: '1', weapons: [{ name: 'Bolter', range: '24', A: '2', skill: '3+', S: '4', AP: '0', D: '1', abilities: 'Rapid Fire 1', type: 'ranged' }], abilities: [{ name: 'Fureur', text: 'Texte' }], keywords: ['Infanterie'], factionKw: [] }] };
  const r = T.build(await T.prepare(a, W, { lang: 'fr' })); assert.deepEqual(r.errors, []); assert.equal(r.data.units[0].models[0].count, 3); assert.equal(r.data.units[0].weapons[0].range, '24"'); assert.ok(r.warnings.length >= 1);
});
