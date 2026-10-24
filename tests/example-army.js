/* Liste d'exemple (format interne de l'appli, comme produite par le Creator) construite sur les vraies fiches. */
module.exports = async function makeArmy(W) {
  await W.ready();
  const f = await W.faction('SM'); let n = 0; const uid = () => 'a' + (++n);
  const by = (id) => f.units.find((x) => x.id === id);
  const det = f.detachments.find((d) => d.e === 'Gladius Task Force');
  const mk = (id, models, pts, build, extra) => {
    const d = by(id); const u = W.toApp(d, uid); u.models = String(models); u.pts = pts; u.section = d.role || '';
    Object.assign(u, extra || {});
    const e = Object.assign({ k: 'k' + n, id, models, pts, wg: {}, woff: [], aoff: [], sel: {} }, build || {});
    return { u, e };
  };
  const lt = mk('000001346', 1, 50, { sel: { 3: [0, 0, 1] } }); /* Lieutenant : bolter de maître -> gantelet énergétique */
  const enh = det.enh[1]; lt.u.enhancement = enh.name; lt.e.enh = det.id + '|' + enh.name;
  lt.u.abilities.push({ name: 'Amélioration — ' + enh.name, text: enh.text }); lt.u.pts = 50 + (+enh.cost || 0);
  lt.u.warlord = true; lt.u.role = 'leader';
  const inf = mk('000000126', 5, 95);
  const hb = mk('000002098', 5, 115, { sel: { 0: [1] } }); /* Sergent : pistolet à plasma */
  const ic = mk('000001157', 5, 85, { sel: { 0: [0, 1, 0, 0], 2: [1] } }); /* Sergent : gantelet énergétique ; 1 lance-grenades */
  const tm = mk('000000118', 5, 170, { sel: { 0: [3] } }); /* 3 figurines : bouclier tempête + marteau Tonnerre */
  const rd = mk('000002717', 1, 170 + 10, { wg: { 0: 1 }, sel: { 0: [1], 3: [1] } }); /* Nacelle Icarus + macro-incinérateur (2 modes) */
  const im = mk('000002568', 1, 70 + 10, { wg: { 0: 1 } });
  const all = [lt, inf, hb, ic, tm, rd, im];
  lt.u.attachedTo = inf.u.id; lt.e.to = inf.e.k;
  const units = all.map((x) => x.u);
  return {
    id: 'ex', name: 'Salamanders 2000pts (exemple)', faction: 'Space Marines', chapter: '', detachments: [det.name + ' (' + det.dp + ' pts)'],
    total: { points: units.reduce((s, u) => s + u.pts, 0), models: 0, units: units.length }, units,
    build: { fac: 'SM', ch: '', limit: 2000, name: '', dets: [det.id], units: all.map((x) => x.e) }
  };
};
