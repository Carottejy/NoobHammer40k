/* Application — Aide-mémoire Warhammer 40 000 (PWA) */
(() => {
  'use strict';
  const KEY = 'noobammer.state.v1', OLD_KEY = 'w40k.state.v1';
  const $app = document.getElementById('app');
  const $tabs = document.getElementById('tabs');
  const uid = () => Math.random().toString(36).slice(2, 9);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const phaseLabel = (id) => (PHASES.find((p) => p.id === id) || {}).label || id;

  /* ---------- État ---------- */
  const defaults = () => ({
    armies: [], armyId: null, tab: 'home', inGame: false, cp: 0, round: 1, mine: true, phase: 'shoot',
    play: {
      unitId: null, targetUnitId: null, mode: 'attack', weaponIdx: 0, nModels: 1,
      target: { T: 4, sv: '3+', inv: 0, fnp: 0, W: 2, models: 5, kw: ['infantry'], inCover: false, stealth: false },
      sit: { moved: 'stationary', halfRange: false, engaged: false, elevated: false, charged: false, snap: false, hiddenTarget: false, setUp: false },
      fx: {}, mods: { hit: 0, wound: 0, rrHit: 'none', rrWound: 'none', extraA: 0, apImp: 0, lethal: false, sust: 0, dev: false, anti: '', antiX: 4, dmgRed: 0, strength: 0, dmg: 0 },
    },
    enemy: null, net: { role: '', code: '', nick: '', auto: false }, gameId: null, gameName: '', autoGame: true, used: {}, once: [], bs: {}, relayOk: false, targets: [], customStrats: [], armyRules: {}, editUnit: null, ui: {},
  });
  function normalize(raw) {
    const d = defaults();
    if (!raw) return d;
    Object.assign(d, raw);
    d.play = Object.assign(defaults().play, raw.play || {});
    d.play.target = Object.assign(defaults().play.target, (raw.play || {}).target || {});
    d.play.sit = Object.assign(defaults().play.sit, (raw.play || {}).sit || {});
    d.play.mods = Object.assign(defaults().play.mods, (raw.play || {}).mods || {});
    d.play.fx = (raw.play || {}).fx || {};
    d.net = Object.assign(defaults().net, raw.net || {});
    if (d.tab === 'play') d.tab = 'game'; if (d.tab === 'settings') d.tab = 'info';
    if (raw.inGame === undefined) d.inGame = !!raw.gameId;
    if (d.libId === undefined) d.libId = null; if (d.park === undefined) d.park = null;
    return d;
  }
  let S = load();
  function load() {
    try { return normalize(JSON.parse(localStorage.getItem(KEY) || localStorage.getItem(OLD_KEY) || 'null')); } catch (e) { return defaults(); /* état corrompu */ }
  }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* stockage plein/bloqué */ } scheduleGameSave(); netPush(); };
  const army = () => S.armies.find((a) => a.id === S.armyId) || null;
  const unit = () => { const a = army(); return a ? a.units.find((u) => u.id === S.play.unitId) || null : null; };
  const setPath = (path, val) => { const k = path.split('.'); let o = S; for (let i = 0; i < k.length - 1; i++) o = o[k[i]]; o[k[k.length - 1]] = val; };
  const getPath = (path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), S);
  const stratKey = () => `${S.round}|${S.mine ? 1 : 0}|${S.phase}`;
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const normT = (s) => Engine.norm(String(s || '').replace(/[’]/g, "'"));
  const stripN = (n) => String(n || '').replace(/\s*#\d+$/, '');

  /* ---------- Effectifs, meneurs/appuis rattachés ---------- */
  const maxModels = (u) => { const n = parseInt(u.models, 10); return n > 0 ? n : 1; };
  const curModels = (u) => (u.cur == null || u.cur === '' || isNaN(+u.cur) ? maxModels(u) : clamp(+u.cur, 0, maxModels(u)));
  const curHp = (u) => { const W = parseInt(u.W, 10) || 1; return u.hp == null || u.hp === '' || isNaN(+u.hp) ? W : clamp(+u.hp, 0, W); };
  const alive = (u) => curModels(u) > 0;
  const roleOf = (u) => { if (u.role) return u.role; const n = (u.abilities || []).map((x) => normT(x.name)); return n.includes('meneur') || n.includes('leader') ? 'leader' : n.includes('appui') || n.includes('support') ? 'support' : null; };
  const isStructural = (n) => /^(meneur|appui|leader|support)(\s|$)/i.test(normT(n));
  const hasHost = (ar, u) => !!(u.attachedTo && ar && ar.units.some((b) => b.id === u.attachedTo));
  const topUnits = (ar) => (ar ? ar.units.filter((u) => !hasHost(ar, u)) : []);
  function eligibleFor(l, b) {
    const ab = (l.abilities || []).find((x) => /^(meneur|appui|leader|support)\s+\S/i.test(normT(x.name)));
    if (!ab) return null;
    const t = normT(ab.text), name = normT(stripN(b.name));
    return t.includes(name) || t.split(/,|\bou\b|\bet\b|:/).map((x) => x.trim()).some((e) => e.length > 8 && name.includes(e));
  }
  /* Unité « effective » : l'escouade + ses meneurs/appuis vivants (armes, aptitudes et mots-clés fusionnés) */
  function eff(ar, u) {
    const ls = ar ? ar.units.filter((l) => l.attachedTo === u.id && alive(l)) : [];
    const e = Object.assign({}, u, { base: u, leaders: ls });
    e.nowModels = curModels(u) + ls.reduce((n, l) => n + curModels(l), 0);
    e.allModels = maxModels(u) + ls.reduce((n, l) => n + maxModels(l), 0);
    e.allPts = (+u.pts || 0) + ls.reduce((n, l) => n + (+l.pts || 0), 0);
    e.weapons = (u.weapons || []).slice();
    e.abilities = (u.abilities || []).slice();
    const kws = new Map((u.keywords || []).map((k) => [normT(k), k]));
    ls.forEach((l) => {
      (l.weapons || []).forEach((w) => e.weapons.push(Object.assign({}, w, { from: l.name, fromId: l.id })));
      (l.abilities || []).forEach((x) => { if (!isStructural(x.name)) e.abilities.push(Object.assign({}, x, { from: l.name })); });
      (l.keywords || []).forEach((k) => { if (!kws.has(normT(k))) kws.set(normT(k), k); });
    });
    e.keywords = [...kws.values()];
    return e;
  }
  const parseCache = new Map();
  function ptx(text, opts) {
    const k = (opts && opts.scope || '') + '|' + (opts && opts.condText || '') + '|' + text;
    if (!parseCache.has(k)) parseCache.set(k, Effects.parseText(text, opts));
    return parseCache.get(k);
  }
  function targetFrom(ee) {
    const b = ee.base; const single = !ee.leaders.length && maxModels(b) === 1;
    const kws = ee.keywords || [];
    const kw = TARGET_KEYWORDS.map(([k]) => k).filter((k) => Engine.hasKw(kws, k)).concat(kws.map(normT));
    let fnp = parseInt(b.fnp, 10) || 0;
    (ee.abilities || []).forEach((x) => { const m = normT(x.name).match(/insensible a la douleur\s*(\d)/); if (m && (!fnp || +m[1] < fnp)) fnp = +m[1]; });
    return { T: parseInt(b.T, 10) || 0, sv: b.sv || '', inv: parseInt(b.inv, 10) || 0, fnp, W: single ? curHp(b) : (parseInt(b.W, 10) || 1), models: Math.max(1, ee.nowModels), kw: [...new Set(kw)] };
  }
  function syncTarget() {
    const id = S.play.targetUnitId; if (!id) return;
    const b = S.enemy && S.enemy.units.find((x) => x.id === id);
    if (!b || !alive(b)) { S.play.targetUnitId = null; return; }
    Object.assign(S.play.target, targetFrom(eff(S.enemy, b)));
  }
  const liveEnemy = (who) => who === 'enemy' && !!(S.enemy && S.enemy.live);
  function modelsCtl(who, x, label) {
    const mx = maxModels(x), c = curModels(x), W = parseInt(x.W, 10) || 0, ro = liveEnemy(who);
    const btn = (act, v) => ro ? '' : `<button class="chip" data-act="${act}" data-who="${who}" data-id="${x.id}" data-val="${v}">${v < 0 ? '−' : '+'}</button>`;
    let h = `<div class="row sp mdl"><span>${esc(label || x.name)}${c === 0 ? ' <span class="tag verify">détruite</span>' : ''}</span><div class="counter">${btn('models', -1)}<b>${c} / ${mx}</b>${btn('models', 1)}</div></div>`;
    if (mx === 1 && W > 1 && c > 0) h += `<div class="row sp mdl"><span class="muted">PV restants</span><div class="counter">${btn('hp', -1)}<b>${curHp(x)} / ${W}</b>${btn('hp', 1)}</div></div>`;
    return h;
  }

  /* ---------- Rendu ---------- */
  function render() {
    const a = army();
    if (a) {
      let cu = a.units.find((u) => u.id === S.play.unitId);
      if (cu && hasHost(a, cu)) { S.play.unitId = cu.attachedTo; cu = a.units.find((u) => u.id === S.play.unitId); S.play.nModelsUnit = null; }
      if (!cu) S.play.unitId = topUnits(a)[0] ? topUnits(a)[0].id : null;
    }
    if (S.play.targetUnitId && !(S.enemy && S.enemy.units.some((x) => x.id === S.play.targetUnitId))) S.play.targetUnitId = null;
    if (!S.inGame && a && a.gameOf && !S.park) restoreLib();
    else if (!S.inGame && a && !a.gameOf) S.libId = a.id;
    if (!army() && S.armies.some((x) => !x.gameOf)) restoreLib();
    if (!S.inGame && (S.tab === 'enemy' || S.tab === 'strats')) S.tab = 'game';
    const tabs = [['home', '🏠', 'Accueil'], ['game', '🎲', 'Partie'], ['army', '🛡️', 'Armée'], ['build', '🛠️', 'Liste']].concat(S.inGame ? [['enemy', '⚔️', 'Adverse'], ['strats', '📜', 'Strat.']] : []).concat([['info', 'ℹ️', 'Infos']]);
    $tabs.innerHTML = tabs.map(([id, ic, lb]) => `<button class="${S.tab === id ? 'on' : ''}" data-act="tab" data-val="${id}"><span>${ic}</span>${lb}</button>`).join('');
    $app.innerHTML = { home: viewHome, game: viewGame, army: viewArmy, enemy: viewEnemy, strats: viewStrats, build: viewBuild, info: viewInfo }[S.tab === 'db' ? 'build' : S.tab]();
    window.scrollTo(0, S.tab === (render.last || S.tab) ? window.scrollY : 0); render.last = S.tab;
    save();
  }
  const chip = (label, on, attrs) => `<button class="chip ${on ? 'on' : ''}" ${attrs}>${label}</button>`;
  const tog = (label, path) => chip(label, getPath(path), `data-act="toggle" data-path="${path}"`);
  const radio = (label, path, val) => chip(label, getPath(path) === val, `data-act="set" data-path="${path}" data-val="${val}"`);
  const num = (label, path, extra = '') => `<div><label>${label}</label><input type="number" inputmode="decimal" ${extra} data-bind="${path}" data-type="number" value="${esc(getPath(path))}"></div>`;
  const txt = (label, path) => `<div><label>${label}</label><input type="text" data-bind="${path}" value="${esc(getPath(path))}"></div>`;
  const stepper = (label, path) => `<div><label>${label}</label><div class="counter"><button class="chip" data-act="step" data-path="${path}" data-val="-1">−</button><b>${getPath(path) > 0 ? '+' : ''}${getPath(path)}</b><button class="chip" data-act="step" data-path="${path}" data-val="1">+</button></div></div>`;

  /* ----- Écran « Jouer » ----- */
  function viewPlay() {
    const a = army();
    let h = `<h1>NoobHammer40k</h1>${netChip()}`;
    h += `<div class="card">
      <div class="row sp"><div class="counter"><span class="muted">Round</span><button class="chip" data-act="step" data-path="round" data-val="-1">−</button><b>${S.round}</b><button class="chip" data-act="step" data-path="round" data-val="1">+</button></div>
      <div class="counter"><span class="muted">PC</span><button class="chip" data-act="step" data-path="cp" data-val="-1">−</button><b>${S.cp}</b><button class="chip" data-act="step" data-path="cp" data-val="1">+</button></div></div>
      <div class="chips" style="margin:10px 0">${chip('Mon tour', S.mine, 'data-act="set" data-path="mine" data-val="true"')}${chip('Tour adverse', !S.mine, 'data-act="set" data-path="mine" data-val="false"')}</div>
      <div class="chips">${PHASES.map((p) => chip(p.label, S.phase === p.id, `data-act="set" data-path="phase" data-val="${p.id}"`)).join('')}</div>
      <div class="row sp" style="margin-top:10px"><span class="muted">${S.mine ? 'Ton tour' : 'Tour adverse'} — ${phaseLabel(S.phase)}</span><button class="btn small" data-act="nextPhase">Phase suivante ▶</button></div>
    </div>`;
    if (!a || !a.units.length) {
      return h + `<div class="card"><h2>Aucune unité</h2><p class="muted">Crée ton armée dans l'onglet « Armée » (ajoute tes unités à la main ou colle ta liste ALN pour pré-créer les unités).</p><button class="btn" data-act="tab" data-val="army">Aller à l'armée</button></div>` + stratPanel(null);
    }
    const ub = unit(); const u = eff(a, ub);
    const label = (x) => { const e = eff(a, x); return (alive(x) ? '' : '☠ ') + esc(x.name) + (e.leaders.length ? ' (+ ' + e.leaders.map((l) => esc(l.name)).join(', ') + ')' : '') + (alive(x) ? '' : ' — détruite'); };
    h += `<div class="card"><label>Unité</label><select data-bind="play.unitId">${topUnits(a).map((x) => `<option value="${x.id}" class="${alive(x) ? '' : 'dead'}" ${alive(x) ? '' : 'style="color:#888"'} ${x.id === ub.id ? 'selected' : ''}>${label(x)}</option>`).join('')}</select>
      ${unitStatLine(u)}<div style="margin-top:8px">${modelsCtl('mine', ub, 'Figurines')}${u.leaders.map((l) => modelsCtl('mine', l, (roleOf(l) === 'support' ? 'Appui' : 'Meneur') + ' — ' + l.name)).join('')}</div>
      ${u.leaders.length ? `<div class="muted">Unité attachée : les armes, aptitudes et mots-clés de ${u.leaders.map((l) => esc(l.name)).join(', ')} sont pris en compte.</div>` : ''}
      <div class="chips" style="margin-top:8px">${chip('⚠️ En Battle-shock', S.bs[ub.id], `data-act="toggleBs" data-val="${ub.id}"`)}</div></div>
    `;

    const canAttack = S.phase === 'shoot' || S.phase === 'fight';
    if (canAttack) {
      h += `<div class="chips" style="margin-bottom:12px">${chip('⚔️ J\'attaque', S.play.mode === 'attack', 'data-act="set" data-path="play.mode" data-val="attack"')}${chip('🛡️ Je suis attaqué', S.play.mode === 'defend', 'data-act="set" data-path="play.mode" data-val="defend"')}</div>`;
    }
    const defend = canAttack && S.play.mode === 'defend';
    h += remindersCard(u, defend);
    if (canAttack && !defend) h += attackCard(u);
    if (defend) h += defendCard(u);
    h += stratPanel(u, defend);
    if (S.enemy && S.enemy.live && enemyUsedHtml()) h += `<div class="card">${enemyUsedHtml()}</div>`;
    h += enemyStratPanel();
    return h;
  }
  function enemyStratPanel() {
    const e = S.enemy; if (!e || !(e.strats || []).length) return '';
    const list = e.strats.filter((s) => (s.phases || []).includes(S.phase) && (stratTurn(s) === 'either' || (S.mine ? stratTurn(s) === 'opp' : stratTurn(s) === 'mine')));
    if (!list.length) return '';
    return `<div class="card"><h2>Stratagèmes de l'adversaire possibles</h2><p class="muted">${esc(e.name)} · ${phaseLabel(S.phase)}</p>` + list.map((s) => `<details class="note"><summary><b>${esc(s.name)}</b> · ${s.cp} PC${s.detachment ? ' · ' + esc(s.detachment) : ''}</summary><div class="muted"><b>Quand :</b> ${esc(s.when || '—')}</div>${s.target ? `<div class="muted"><b>Cible :</b> ${esc(s.target)}</div>` : ''}<div><b>Effet :</b> ${esc(s.effect || '—')}</div></details>`).join('') + '</div>';
  }

  function abilityMatches(ab, phase, defend) {
    const ph = ab.phases || ['all'];
    if (ph.includes('all')) return true;
    if (defend) return ph.includes('def');
    return ph.includes(phase);
  }
  const ruleNote = (r) => { const nm = `<b>${esc(r.name)}</b>${r.from ? ' <span class="muted">(' + esc(r.from) + ')</span>' : ''}`; return r.text && r.text.length > 140 ? `<details class="note"><summary>${nm}</summary>${esc(r.text)}</details>` : `<div class="note">${nm}${r.text ? ' — ' + esc(r.text) : ''}</div>`; };
  function remindersCard(u, defend) {
    const rules = (S.armyRules[S.armyId] || []).filter((r) => abilityMatches(r, S.phase, defend));
    const abs = (u.abilities || []).filter((r) => abilityMatches(r, S.phase, defend));
    let h = `<div class="card"><h2>À ne pas oublier</h2>`;
    if (!defend) h += `<ul style="margin:0 0 8px;padding-left:18px">${(PHASE_REMINDERS[S.phase] || []).map((x) => `<li class="muted">${esc(x)}</li>`).join('')}</ul>`;
    if (abs.length) {
      const list = abs.map(ruleNote).join('');
      h += `<h3>Règles de ${esc(u.name)}</h3>` + (abs.length > 4 ? `<details><summary>${abs.length} règles</summary>${list}</details>` : list);
    }
    else h += `<p class="muted">Aucune règle d'unité enregistrée pour cette phase. Ajoute-les dans l'éditeur d'unité.</p>`;
    if (rules.length) h += `<h3>Règles d'armée / détachement</h3>` + rules.map(ruleNote).join('');
    return h + '</div>';
  }

  function attackCard(u) {
    const melee = S.phase === 'fight';
    const weapons = (u.weapons || []).map((w, i) => ({ w, i })).filter((x) => (x.w.type === 'melee') === melee);
    let h = `<div class="card"><h2>${melee ? 'Corps à corps' : 'Tir'}</h2>`;
    if (!weapons.length) return h + `<p class="muted">Aucune arme ${melee ? 'de mêlée' : 'de tir'} enregistrée pour cette unité.</p></div>`;
    if (!weapons.find((x) => x.i === S.play.weaponIdx)) S.play.weaponIdx = weapons[0].i;
    if (S.play.nModelsUnit !== u.id) { S.play.nModelsUnit = u.id; S.play.nModels = Math.max(1, curModels(u.base)); }
    const w = u.weapons[S.play.weaponIdx];
    h += `<label>Arme</label><select data-bind="play.weaponIdx" data-type="number">${weapons.map((x) => `<option value="${x.i}" ${x.i === S.play.weaponIdx ? 'selected' : ''}>${esc(x.w.name)}${x.w.from ? ' — ' + esc(x.w.from) : ''}${x.w.abilities ? ' [' + esc(x.w.abilities) + ']' : ''}</option>`).join('')}</select>`;
    h += `<div class="grid g2" style="margin-top:8px">${num('Figurines qui utilisent cette arme', 'play.nModels', 'min="1"')}<div><label>Profil</label><div class="muted">A${esc(w.A)} · ${esc(w.skill)} · F${esc(w.S)} · PA${esc(w.AP)} · D${esc(w.D)}</div></div></div>`;
    h += `<h3>Situation</h3>`;
    if (!melee) {
      h += `<div class="chips">${[['stationary', 'Immobile'], ['le3', 'Bougé ≤ 3″'], ['normal', 'Bougé'], ['advanced', 'Avancé'], ['fellback', 'Retraite']].map(([v, l]) => radio(l, 'play.sit.moved', v)).join('')}</div>
        <div class="chips" style="margin-top:8px">${tog('À mi-portée', 'play.sit.halfRange')}${tog('Unité engagée', 'play.sit.engaged')}${tog('Tir plongeant', 'play.sit.elevated')}${tog('Déployée ce tour', 'play.sit.setUp')}${tog('Tir de réaction (Overwatch)', 'play.sit.snap')}${tog('Cible cachée / non visible', 'play.sit.hiddenTarget')}</div>`;
    } else {
      h += `<div class="chips">${tog('L\'unité a chargé ce tour', 'play.sit.charged')}</div>`;
    }
    h += `<h3>Cible</h3>`;
    const hasEn = !!(S.enemy && S.enemy.units.length);
    if (hasEn) {
      const ts = topUnits(S.enemy);
      const firstAlive = ts.find(alive);
      if (!S.play.targetUnitId && firstAlive) { S.play.targetUnitId = firstAlive.id; syncTarget(); }
      h += `<label>Unité adverse ciblée</label><select data-bind="play.targetUnitId">${ts.map((x) => { const e = eff(S.enemy, x); return `<option value="${x.id}" ${alive(x) ? '' : 'disabled style="color:#888"'} ${x.id === S.play.targetUnitId ? 'selected' : ''}>${alive(x) ? '' : '☠ '}${esc(x.name)}${e.leaders.length ? ' (+ ' + esc(e.leaders.map((l) => l.name).join(', ')) + ')' : ''} · ${alive(x) ? e.nowModels + ' fig.' : 'détruite'}</option>`; }).join('')}</select>`;
      if (S.play.targetUnitId) h += `<p class="muted">Profil lu depuis la liste adverse. Modifie ses effectifs dans l'onglet « Adverse ».</p>`;
    }
    if (!hasEn && S.targets.length) h += `<div class="chips" style="margin-bottom:8px">${S.targets.map((t, i) => chip(esc(t.name), false, `data-act="loadTarget" data-val="${i}"`)).join('')}</div>`;
    if (hasEn) h += `<div class="chips">${melee ? '' : tog('Cible à couvert', 'play.target.inCover') + tog('Cible Furtive', 'play.target.stealth')}</div>`;
    else h += `<div class="grid">${num('Endurance', 'play.target.T')}${txt('Sauvegarde (3+)', 'play.target.sv')}${num('Invulnérable (0 = aucune)', 'play.target.inv')}${num('Ignorer douleur (0 = aucun)', 'play.target.fnp')}${num('PV / figurine', 'play.target.W')}${num('Figurines', 'play.target.models')}</div>
      <div class="chips" style="margin-top:8px">${TARGET_KEYWORDS.map(([k, l]) => chip(l, S.play.target.kw.includes(k), `data-act="toggleKw" data-val="${k}"`)).join('')}</div>
      <div class="chips" style="margin-top:8px">${melee ? '' : tog('Cible à couvert', 'play.target.inCover') + tog('Cible Furtive', 'play.target.stealth')}<button class="chip" data-act="saveTarget">💾 Mémoriser cette cible</button></div>`;
    h += fxPanel(u, w, melee);
    h += `<details style="margin-top:10px"><summary>Bonus manuels supplémentaires</summary>
      <div class="grid g2">${stepper('Modif. à la touche', 'play.mods.hit')}${stepper('Modif. à la blessure', 'play.mods.wound')}</div>
      <label style="margin-top:8px">Relance des touches</label><div class="chips">${[['none', 'Aucune'], ['ones', 'Les 1'], ['all', 'Tout']].map(([v, l]) => radio(l, 'play.mods.rrHit', v)).join('')}</div>
      <label style="margin-top:8px">Relance des blessures</label><div class="chips">${[['none', 'Aucune'], ['ones', 'Les 1'], ['all', 'Tout']].map(([v, l]) => radio(l, 'play.mods.rrWound', v)).join('')}</div>
      <div class="chips" style="margin-top:8px">${tog('Coups fatals', 'play.mods.lethal')}${tog('Blessures dévastatrices', 'play.mods.dev')}${radio('Touches soutenues 1', 'play.mods.sust', 1)}${radio('Touches soutenues 2', 'play.mods.sust', 2)}${radio('Sans soutenues', 'play.mods.sust', 0)}</div>
      <div class="grid g2" style="margin-top:8px">${num('Attaques en plus (par fig.)', 'play.mods.extraA')}${num('PA améliorée de', 'play.mods.apImp')}${num('Force en plus', 'play.mods.strength')}${num('Dégâts en plus', 'play.mods.dmg')}${num('Réduction de dégâts adverse', 'play.mods.dmgRed')}</div>
      <div class="grid g2" style="margin-top:8px">${txt('Anti-… (mot-clé)', 'play.mods.anti')}${num('Anti seuil (X+)', 'play.mods.antiX')}</div></details>`;
    h += '</div>';
    h += resultCard(u, w, melee);
    h += rankCard(u, w, melee);
    return h;
  }

  const RRV = { none: 0, ones: 1, all: 2 };
  const bestRr = (x, y) => ((RRV[y || 'none'] > RRV[x || 'none']) ? y : x);
  /* Calcul complet d'une attaque contre une cible donnée (profil + unité adverse éventuelle) */
  function calcAttack(u, w, melee, target, enemyEff, n) {
    const p = S.play;
    const sit = melee ? { charged: p.sit.charged } : Object.assign({}, p.sit);
    const usedNow = S.used[stratKey()] || [];
    if (!melee && usedNow.some((x) => x.strat === 'fire_overwatch' && x.unitId === u.id)) sit.snap = true;
    const manual = Object.assign({}, p.mods, { anti: p.mods.anti ? { kw: p.mods.anti, x: +p.mods.antiX || 4 } : null, sust: +p.mods.sust || 0 });
    const srcs = fxCollect(u, w, melee, target, enemyEff);
    const active = srcs.flatMap((src) => src.entries.filter((e) => fxOn(src, e)).map((e) => ({ src, e })));
    const fxm = Effects.aggregate(active.map((x) => x.e.it));
    const mods = Object.assign({}, manual, {
      hit: (+manual.hit || 0) + (fxm.hit || 0), wound: (+manual.wound || 0) + (fxm.wound || 0), strength: (+manual.strength || 0) + (fxm.strength || 0),
      extraA: (+manual.extraA || 0) + (fxm.extraA || 0), apImp: (+manual.apImp || 0) + (fxm.apImp || 0), dmg: (+manual.dmg || 0) + (fxm.dmg || 0),
      dmgRed: (+manual.dmgRed || 0) + (fxm.dmgRed || 0),
      rrHit: bestRr(manual.rrHit, fxm.rrHit), rrWound: bestRr(manual.rrWound, fxm.rrWound), lethal: !!(manual.lethal || fxm.lethal), dev: !!(manual.dev || fxm.dev),
      sust: Math.max(+manual.sust || 0, fxm.sust || 0), anti: manual.anti || fxm.anti || null, addAbil: fxm.addAbil, removeAbil: fxm.removeAbil, rrDmg: !!fxm.rrDmg });
    const r = Engine.compute({ mode: melee ? 'melee' : 'ranged', weapon: w, nModels: n, situation: sit, target, mods, battleShocked: !!S.bs[u.id] });
    return { r, srcs, active, mods };
  }
  function enemyEffNow() {
    const b = S.enemy && S.play.targetUnitId && S.enemy.units.find((x) => x.id === S.play.targetUnitId);
    return b ? eff(S.enemy, b) : null;
  }

  function resultCard(u, w, melee) {
    const p = S.play;
    const { r, srcs, active } = calcAttack(u, w, melee, p.target, enemyEffNow(), p.nModels);
    const sgn = (v) => (v > 0 ? '+' : '−') + Math.abs(v);
    let h = `<div class="card"><h2>Ce que tu dois jeter — ${esc(w.name)}</h2>`;
    r.warnings.forEach((x) => { h += `<div class="warn">⚠️ ${esc(x)}</div>`; });
    r.steps.forEach((s, i) => {
      h += `<div class="step"><div class="t">${i + 1}. ${esc(s.title)}</div><div class="big">${esc(s.main)}</div>${s.sub ? `<div class="muted">${esc(s.sub)}</div>` : ''}`;
      const items = (s.mods || []).map((m) => `<li class="${m.v > 0 ? 'pos' : 'neg'}">${sgn(m.v)} ${esc(m.label)}</li>`).concat((s.details || []).map((d) => `<li>${esc(d)}</li>`));
      if (items.length) h += `<ul>${items.join('')}</ul>`;
      h += '</div>';
    });
    const e = r.expected;
    h += `<h3>Espérance (moyenne)</h3><div class="exp"><div><b>${e.hits.toFixed(1)}</b><span>touches</span></div><div><b>${e.wounds.toFixed(1)}</b><span>blessures</span></div><div><b>${e.unsaved.toFixed(1)}</b><span>non sauvées</span></div><div><b>${e.damage.toFixed(1)}</b><span>PV perdus</span></div></div>`;
    if (e.kills != null) h += `<p class="muted">≈ ${e.kills.toFixed(1)} figurine(s) tuée(s) (${p.target.W} PV chacune). Estimation moyenne, sans débordement de dégâts.</p>`;
    const lines = active.map((x) => `<li><b>${esc(x.src.title)}</b>${x.src.sub && x.src.group !== 'strat' ? ' <span class="muted">(' + esc(x.src.sub) + ')</span>' : ''} — ${esc(Effects.summarize(x.e.it.mods).join(', '))}</li>`);
    srcs.filter((s) => s.group === 'strat' && s.used && !s.entries.some((e) => e.ev.applicable)).forEach((s) => lines.push(`<li><b>${esc(s.title)}</b> — effet à appliquer à la main : ${esc(s.strat.effect || '')}</li>`));
    if (lines.length) h += `<h3>Effets pris en compte</h3><ul class="fxlist">${lines.join('')}</ul>`;
    r.notes.forEach((x) => { h += `<div class="note">ℹ️ ${esc(x)}</div>`; });
    return h + '</div>';
  }

  /* ----- Quelle cible choisir ? (classement des unités adverses pour l'arme choisie) ----- */
  function rankCard(u, w, melee) {
    if (!S.enemy) return '';
    const rows = topUnits(S.enemy).filter(alive).map((b) => {
      const ee = eff(S.enemy, b); const t = targetFrom(ee);
      if (!t.T) return { b, ee, noProfile: true, score: -1 };
      t.inCover = !melee && S.play.target.inCover; t.stealth = !melee && S.play.target.stealth;
      const c = calcAttack(u, w, melee, t, ee, S.play.nModels);
      const dmg = c.r.expected.damage;
      const kills = Math.min(ee.nowModels, t.W ? dmg / t.W : 0);
      const frac = Math.min(1, kills / ee.allModels);
      const single = !ee.leaders.length && maxModels(b) === 1;
      const pct = single ? Math.min(1, dmg / t.W) : kills / ee.nowModels;
      const pts = ee.allPts * (single ? Math.min(1, dmg / t.W) : frac);
      return { b, ee, t, dmg, kills, pct, pts, single, fx: c.active.filter((x) => x.src.group === 'enemy').map((x) => x.src.title), score: pts };
    }).sort((x, y) => y.score - x.score || (y.dmg || 0) - (x.dmg || 0));
    if (!rows.length) return '';
    let h = `<div class="card"><h2>Quelle cible ?</h2><p class="muted">Classement avec <b>${esc(w.name)}</b> × ${S.play.nModels} figurine(s), situation, bonus et stratagèmes ci-dessus. Trié par points adverses éliminés (estimation moyenne).</p>`;
    rows.forEach((x, i) => {
      if (x.noProfile) { h += `<div class="strat used"><b>${esc(x.b.name)}</b><div class="muted">Profil adverse incomplet (pas d'Endurance) : impossible de calculer.</div></div>`; return; }
      const sel = x.b.id === S.play.targetUnitId;
      h += `<div class="strat ${sel ? 'sel' : ''}"><div class="row sp"><span class="nm">${i === 0 && x.pts > 0 ? '★ ' : ''}${esc(x.b.name)}${x.ee.leaders.length ? ' <span class="muted">+ ' + esc(x.ee.leaders.map((l) => l.name).join(', ')) + '</span>' : ''}</span><span class="cp">≈ ${Math.round(x.pts)} pts</span></div>
        <div>${x.single ? `PV perdus ≈ <b>${x.dmg.toFixed(1)}</b> / ${x.t.W}` : `≈ <b>${x.kills.toFixed(1)}</b> fig. tuée(s) sur ${x.ee.nowModels} (${Math.round(x.pct * 100)} %)`}</div>
        <div class="muted">E${x.t.T} · Sv ${esc(x.t.sv || '?')}${x.t.inv ? '/' + x.t.inv + '++' : ''}${x.t.fnp ? ' · IdD ' + x.t.fnp + '+' : ''} · PV ${x.t.W} · ${x.ee.allPts} pts${x.fx.length ? ' · règles de la cible : ' + esc(x.fx.join(', ')) : ''}</div>
        <div class="row" style="margin-top:6px"><button class="btn small ${sel ? 'ghost' : ''}" data-act="aim" data-val="${x.b.id}">${sel ? 'Cible actuelle' : 'Viser cette unité'}</button></div></div>`;
    });
    return h + '</div>';
  }

  /* ----- Effets des règles et stratagèmes (lus dans leur texte) ----- */
  const FX_GROUPS = [['strat', 'Stratagèmes'], ['rule', 'Règles d\'armée et de détachement'], ['doctrine', 'Doctrines de combat'], ['unit', 'Règles de l\'unité'], ['leader', 'Meneurs et appuis rattachés'], ['aura', 'Règles d\'autres unités (aura)'], ['enemy', 'Règles de la cible (défense)']];
  function fxCollect(u, w, melee, target, enemyEff) {
    const ctx = { mode: melee ? 'melee' : 'ranged', ab: Engine.parseAbilities(w.abilities), unit: u, sit: melee ? { charged: S.play.sit.charged } : S.play.sit, target: target || S.play.target };
    const used = S.used[stratKey()] || [];
    const srcs = [];
    const push = (group, key, title, sub, items, extra) => {
      const def = !!(extra && extra.def);
      const keep = items.filter((it) => (def ? it.side === 'def' : it.side !== 'def'));
      if (!keep.length && !(extra && extra.show)) return;
      const c = def ? Object.assign({}, ctx, { asTarget: true }) : ctx;
      srcs.push(Object.assign({ group, key, title, sub, entries: keep.map((it, i) => ({ it, key: key + '#' + i, ev: Effects.evalItem(it, c) })) }, extra || {}));
    };
    allStrats().filter((s) => s.phases.includes(S.phase) && (stratTurn(s) === 'either' || (S.mine ? stratTurn(s) === 'mine' : stratTurn(s) === 'opp'))).forEach((s) => {
      const isUsed = !!used.find((x) => x.strat === s.id && x.unitId === u.id);
      const items = ptx(s.effect || '', { condText: (s.when || '') + ' ' + (s.target || ''), scope: s.phases.length === 1 ? ({ shoot: 'ranged', fight: 'melee' })[s.phases[0]] : null });
      push('strat', 'strat:' + s.id, s.name, `${s.cp} PC${s.detachment ? ' · ' + s.detachment : ''}`, items, { strat: s, used: isUsed, show: isUsed });
    });
    (S.armyRules[S.armyId] || []).forEach((r) => {
      if (/^Doctrines de combat/i.test(r.name)) Effects.splitDoctrines(r.text || '').forEach((d) => push('doctrine', 'rule:' + r.name + ':' + d.name, d.name, '', ptx(d.text)));
      else push('rule', 'rule:' + r.name, r.name, '', ptx(r.text || ''));
    });
    const own = new Set();
    (u.abilities || []).forEach((ab) => { own.add(ab.name); push(ab.from ? 'leader' : 'unit', 'u:' + (ab.from || u.name) + ':' + ab.name, ab.name, ab.from || u.name, ptx(ab.text || '')); });
    const ar = army(); const seen = new Set(); const mine = new Set([u.id].concat((u.leaders || []).map((l) => l.id)));
    (ar ? ar.units : []).forEach((o) => {
      if (mine.has(o.id) || !alive(o)) return;
      (o.abilities || []).forEach((ab) => {
        if (own.has(ab.name) || seen.has(ab.name) || !/\bamie?s?\b/i.test(ab.text || '')) return;
        const its = ptx(ab.text || ''); if (!its.some((x) => x.side !== 'def')) return;
        seen.add(ab.name); push('aura', 'a:' + ab.name, ab.name, 'via ' + o.name, its);
      });
    });
    if (enemyEff) {
      const partial = (t) => /figurine/i.test(t || '');
      (enemyEff.abilities || []).forEach((ab) => { if (!isStructural(ab.name)) push('enemy', 'e:' + enemyEff.id + ':' + ab.name, ab.name, ab.from || enemyEff.name, ptx(ab.text || ''), { def: true, partial: partial(ab.text) }); });
      ((S.enemy && S.enemy.rules) || []).forEach((r) => push('enemy', 'er:' + r.name, r.name, 'règle adverse', ptx(r.text || ''), { def: true, partial: partial(r.text) }));
    }
    return srcs;
  }
  function fxOn(src, e) {
    if (!e.ev.applicable) return false;
    if (src.group === 'strat') return !!src.used;
    const v = S.play.fx[e.key]; if (v !== undefined) return v;
    if (src.group === 'doctrine' || src.group === 'aura') return false;
    return e.ev.manual.length === 0 && !src.partial;
  }
  function fxPanel(u, w, melee) {
    const srcs = fxCollect(u, w, melee, S.play.target, enemyEffNow());
    if (!srcs.length) return '';
    let h = `<h3>Règles et stratagèmes pris en compte</h3><p class="muted">Coche ce qui s'applique à cette attaque : l'effet est ajouté au calcul ci-dessous. Les conditions sont vérifiées quand c'est possible, sinon c'est à toi de les confirmer.</p>`;
    FX_GROUPS.forEach(([g, label]) => {
      const list = srcs.filter((s) => s.group === g); if (!list.length) return;
      h += `<div class="fxgrp"><div class="t">${label}</div>` + list.map(fxSource).join('') + '</div>';
    });
    return h;
  }
  function fxSource(src) {
    let h = `<div class="fx"><div class="row sp"><b>${esc(src.title)}</b><span class="muted">${esc(src.sub || '')}</span></div>`;
    src.entries.forEach((e) => {
      const sum = Effects.summarize(e.it.mods).join(', ');
      const conds = e.it.conds.map(Effects.condLabel).join(' · ');
      const on = fxOn(src, e);
      if (!e.ev.applicable) h += `<div class="muted fxoff">${esc(sum)} — ${esc(e.ev.why)}</div>`;
      else if (src.group === 'strat') h += `<div class="${src.used ? 'pos' : 'muted'}">${src.used ? '✓ ' : ''}${esc(sum)}${conds ? ' <span class="muted">(' + esc(conds) + ')</span>' : ''}</div>`;
      else h += `<button class="chip ${on ? 'on' : ''}" data-act="fxToggle" data-key="${esc(e.key)}" data-val="${on ? 0 : 1}">${on ? '☑' : '☐'} ${esc(sum)}${conds ? ' · ' + esc(conds) : ''}</button> `;
    });
    if (src.group === 'strat') h += `<div class="row" style="margin-top:6px"><button class="btn small ${src.used ? 'ghost' : ''}" data-act="fxStrat" data-val="${esc(src.strat.id)}">${src.used ? 'Annuler ce stratagème (+' + src.strat.cp + ' PC)' : 'Utiliser (−' + src.strat.cp + ' PC)'}</button></div>`;
    return h + '</div>';
  }

  function defendCard(u) {
    const sv = Engine.parseSkill(u.sv), inv = +u.inv || 0;
    let h = `<div class="card"><h2>${esc(u.name)} se défend</h2>
      <div class="exp"><div><b>${esc(u.T || '?')}</b><span>Endurance</span></div><div><b>${esc(u.sv || '?')}</b><span>Sauv.</span></div><div><b>${inv ? inv + '+' : '—'}</b><span>Invuln.</span></div><div><b>${u.fnp ? u.fnp + '+' : '—'}</b><span>Ign. douleur</span></div></div>
      <h3>Sauvegarde à jeter selon la PA de l'arme adverse</h3><div class="grid g4">`;
    [0, 1, 2, 3, 4, 5].forEach((ap) => {
      const mod = sv ? sv + ap : null;
      const useInv = inv && (!mod || inv < mod);
      const fin = useInv ? inv : mod;
      h += `<div class="step" style="margin:0;text-align:center"><div class="t">PA −${ap}</div><div class="big" style="font-size:1.2rem">${fin == null ? '?' : fin > 6 ? '—' : fin + '+'}</div><div class="muted">${useInv ? 'invuln.' : ''}</div></div>`;
    });
    h += `</div><div class="note" style="margin-top:10px">ℹ️ En 11e édition le couvert (et la Furtivité) pénalise la <b>touche</b> de l'attaquant (−1 CT) ; il ne change plus ta sauvegarde.</div>`;
    if (u.fnp) h += `<div class="note">ℹ️ Ignorer la douleur ${u.fnp}+ : 1 dé par PV perdu, y compris sur blessures mortelles.</div>`;
    if (u.leaders && u.leaders.length) h += `<div class="note">ℹ️ Unité attachée. Les attaques allouées à un meneur/appui utilisent son propre profil : ${u.leaders.map((l) => `<b>${esc(l.name)}</b> E${esc(l.T || '?')} Sv ${esc(l.sv || '?')}${l.inv ? '/' + esc(l.inv) + '++' : ''} PV ${esc(l.W || '?')}`).join(' ; ')}.</div>`;
    return h + '</div>';
  }

  /* ----- Stratagèmes ----- */
  function allStrats() { return CORE_STRATS.concat(S.customStrats.filter((s) => !s.armyId || s.armyId === S.armyId).map((s) => Object.assign({ custom: true }, s))); }
  const stratTurn = (s) => (s.turns && s.turns[S.phase]) || s.turn;
  function stratPanel(u, defend) {
    const list = allStrats().filter((s) => s.phases.includes(S.phase) && (stratTurn(s) === 'either' || (S.mine ? stratTurn(s) === 'mine' : stratTurn(s) === 'opp')));
    const used = (S.used[stratKey()] || []);
    let h = `<div class="card"><h2>Stratagèmes possibles maintenant</h2><p class="muted">${S.mine ? 'Ton tour' : 'Tour adverse'} · ${phaseLabel(S.phase)} · PC : ${S.cp}. Une unité ne peut bénéficier que d'<b>un</b> stratagème par phase, et un stratagème ne peut être joué qu'une fois par phase.</p>`;
    if (!list.length) return h + '<p class="muted">Aucun stratagème de base à cette phase. Ajoute les stratagèmes de ton détachement dans l\'onglet « Stratagèmes ».</p></div>';
    h += list.map((s) => stratCard(s, u, used)).join('');
    return h + '</div>';
  }
  function stratCard(s, u, used) {
    const onceDone = (s.once || s.id === 'insane_bravery') && S.once.includes(s.id);
    const doneNow = used.find((x) => x.strat === s.id);
    const mine = !!(doneNow && u && doneNow.unitId === u.id);
    const unitHas = u && used.find((x) => x.unitId === u.id && x.strat !== s.id);
    let status = '';
    if (mine) status = '<div class="note">✓ Utilisé sur cette unité : son effet est pris en compte dans le calcul.</div>';
    else if (onceDone) status = '<div class="warn">Déjà utilisé cette bataille (une fois par bataille).</div>';
    else if (doneNow) status = '<div class="warn">Déjà joué cette phase : impossible de le rejouer.</div>';
    else if (u && S.bs[u.id]) status = '<div class="warn">Unité en Battle-shock : elle ne peut pas être ciblée par un stratagème.</div>';
    else if (unitHas) status = `<div class="warn">Cette unité a déjà bénéficié de « ${esc(unitHas.name)} » : un seul stratagème par unité et par phase.</div>`;
    const disabled = !mine && (onceDone || doneNow || (u && S.bs[u.id]));
    const calc = Effects.parseText(s.effect || '', { condText: (s.when || '') + ' ' + (s.target || '') }).filter((x) => x.side !== 'def').map((x) => Effects.summarize(x.mods).join(', ')).filter(Boolean);
    return `<div class="strat ${disabled ? 'used' : ''}"><div class="row sp"><span class="nm">${esc(s.name)}</span><span><span class="cp">${s.cp} PC</span> ${s.verify ? '<span class="tag verify">à vérifier</span>' : ''}</span></div>
      ${s.detachment ? `<div class="muted">${esc(s.detachment)}</div>` : ''}<div class="muted"><b>Quand :</b> ${esc(s.when || '—')}</div>${s.target ? `<div class="muted"><b>Cible :</b> ${esc(s.target)}</div>` : ''}<div><b>Effet :</b> ${esc(s.effect || '—')}</div>${calc.length ? `<div class="muted">⚙️ Pris en compte dans le calcul : ${esc(calc.join(' | '))}</div>` : ''}${s.tip ? `<div class="muted">💡 ${esc(s.tip)}</div>` : ''}${status}
      <div class="row" style="margin-top:8px"><button class="btn small ${mine ? 'ghost' : ''}" data-act="fxStrat" data-val="${esc(s.id)}" ${disabled ? 'disabled' : ''}>${mine ? 'Annuler (+' + s.cp + ' PC)' : 'Utiliser (−' + s.cp + ' PC)'}</button></div></div>`;
  }

  function viewStrats() {
    const f = S.ui.stratPhase || 'all';
    let list = allStrats().filter((s) => f === 'all' || s.phases.includes(f));
    let h = `<h1>Stratagèmes</h1><div class="chips" style="margin-bottom:10px">${chip('Tous', f === 'all', 'data-act="setUi" data-path="stratPhase" data-val="all"')}${PHASES.map((p) => chip(p.label, f === p.id, `data-act="setUi" data-path="stratPhase" data-val="${p.id}"`)).join('')}</div>`;
    h += `<div class="card">${list.map((s) => `<div class="strat"><div class="row sp"><span class="nm">${esc(s.name)}</span><span><span class="cp">${s.cp} PC</span> ${s.verify ? '<span class="tag verify">à vérifier</span>' : ''} ${s.custom ? '<span class="tag">perso</span>' : '<span class="tag">base</span>'}</span></div>
      <div class="muted">${s.phases.map(phaseLabel).join(', ')} · ${s.turn === 'mine' ? 'mon tour' : s.turn === 'opp' ? 'tour adverse' : 'les deux tours'}</div>
      ${s.detachment ? `<div class="muted">${esc(s.detachment)}</div>` : ''}<div class="muted"><b>Quand :</b> ${esc(s.when || '—')}</div>${s.target ? `<div class="muted"><b>Cible :</b> ${esc(s.target)}</div>` : ''}<div><b>Effet :</b> ${esc(s.effect || '—')}</div>
      ${s.custom ? `<button class="btn small danger" style="margin-top:6px" data-act="delStrat" data-val="${esc(s.id)}">Supprimer</button>` : ''}</div>`).join('') || '<p class="muted">Aucun stratagème.</p>'}</div>`;
    const n = S.ui.newStrat || (S.ui.newStrat = { name: '', cp: 1, phases: ['shoot'], turn: 'mine', when: '', effect: '' });
    h += `<div class="card"><h2>Ajouter un stratagème (détachement / faction)</h2>
      ${txt('Nom', 'ui.newStrat.name')}<div class="grid g2" style="margin-top:8px">${num('Coût (PC)', 'ui.newStrat.cp')}<div><label>Tour</label><select data-bind="ui.newStrat.turn">${[['mine', 'Mon tour'], ['opp', 'Tour adverse'], ['either', 'Les deux']].map(([v, l]) => `<option value="${v}" ${n.turn === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
      <label style="margin-top:8px">Phases</label><div class="chips">${PHASES.map((p) => chip(p.label, n.phases.includes(p.id), `data-act="toggleNewPhase" data-val="${p.id}"`)).join('')}</div>
      <label style="margin-top:8px">Quand</label><textarea data-bind="ui.newStrat.when" style="min-height:60px">${esc(n.when)}</textarea>
      <label style="margin-top:8px">Effet</label><textarea data-bind="ui.newStrat.effect" style="min-height:60px">${esc(n.effect)}</textarea>
      <button class="btn" style="margin-top:10px" data-act="addStrat">Ajouter</button></div>`;
    return h;
  }

  /* ----- Ligne d'unité (mon armée / adverse) : effectifs et rattachement des meneurs/appuis ----- */
  function unitRow(who, ar, u) {
    const role = roleOf(u);
    let h = `<div class="unit-item col${alive(u) ? '' : ' dead'}"><div class="row sp"><div><b>${alive(u) ? '' : '☠ '}${esc(u.name)}</b>${alive(u) ? '' : ' <span class="tag">détruite</span>'}<div class="muted">${u.pts ? esc(u.pts) + ' pts' + (u.ptsNote ? ' (' + esc(u.ptsNote) + ')' : '') + ' · ' : ''}${role ? (role === 'support' ? 'Appui' : 'Meneur') + ' · ' : ''}${u.hasProfile || (u.weapons || []).length ? '✅ ' + (u.weapons || []).length + ' arme(s)' : '⚠️ sans profil'}${u.T ? ' · E' + esc(u.T) + ' Sv' + esc(u.sv) : ''}</div></div>${who === 'mine' ? `<button class="btn small ghost" data-act="editUnit" data-val="${u.id}">Éditer</button>` : ''}</div>`;
    h += modelsCtl(who, u, 'Figurines');
    if (role) {
      const hosts = ar.units.filter((b) => b.id !== u.id && !roleOf(b));
      const clash = u.attachedTo && ar.units.some((b) => b.id !== u.id && b.attachedTo === u.attachedTo && roleOf(b) === role);
      h += `<div class="mdl"><label>${role === 'support' ? 'Appui' : 'Meneur'} rattaché à…</label><select data-attach="${u.id}" data-who="${who}" ${liveEnemy(who) ? 'disabled' : ''}><option value="">Non rattaché</option>${hosts.map((b) => { const el = eligibleFor(u, b); return `<option value="${b.id}" ${u.attachedTo === b.id ? 'selected' : ''}>${el === true ? '✓ ' : el === false ? '✗ ' : ''}${esc(b.name)}</option>`; }).join('')}</select>
        <div class="muted">✓ = éligible d'après le texte de la règle · ✗ = non listé.</div>${clash ? '<div class="warn">Max. 1 meneur et 1 appui par unité : un autre est déjà rattaché ici.</div>' : ''}</div>`;
    } else {
      const att = ar.units.filter((l) => l.attachedTo === u.id);
      if (att.length) h += `<div class="muted">Rattaché(s) : ${att.map((l) => esc(l.name)).join(', ')}</div>`;
    }
    return h + '</div>';
  }

  /* ----- Armée adverse ----- */
  function enemyImportCard() {
    const m = S.ui.enemyMsg || '';
    return `<div class="card"><h2>Importer l'armée adverse</h2>
      <p class="muted">Charge le <b>PDF ALN</b> de ton adversaire : unités, profils, armes, aptitudes, règles d'armée et stratagèmes de détachement. Tu pourras ensuite choisir tes cibles et voir laquelle est la plus rentable.</p>
      <label class="btn" style="display:inline-block;margin:0;cursor:pointer">📄 Importer un PDF<input type="file" id="pdfEnemy" accept=".pdf,application/pdf" hidden></label>
      <details style="margin-top:10px"><summary>Ou coller son export texte / BBCode</summary><textarea id="enemyText" placeholder="Orks : Liste adverse&#10;Boyz (10) : 90 pts"></textarea><button class="btn small" style="margin-top:8px" data-act="importEnemyList">Importer la liste</button></details>
      ${m ? `<div class="note" style="margin-top:8px;white-space:pre-wrap">${esc(m)}</div>` : ''}</div>`;
  }
  const wLine = (w) => `${esc(w.name)}${w.abilities ? ' [' + esc(w.abilities) + ']' : ''} — ${esc(w.range || '')} · A${esc(w.A)} · ${esc(w.skill)} · F${esc(w.S)} · PA${esc(w.AP)} · D${esc(w.D)}`;
  function viewEnemy() {
    const e = S.enemy;
    let h = '<h1>Armée adverse</h1>';
    if (!e) return h + (S.net.code ? '<div class="note">En attente de la liste de l\'adversaire (partie en ligne)…</div>' : '') + enemyImportCard();
    h += `<div class="card">${e.live ? `<div class="note">🟢 En direct${e.nick ? ' avec <b>' + esc(e.nick) + '</b>' : ''} · PC adverses : <b>${e.cp == null ? '?' : e.cp}</b>. Sa liste, ses effectifs et ses stratagèmes se mettent à jour tout seuls ; il gère ses propres pertes.</div>` : ''}${enemyUsedHtml()}<div class="row sp"><h2 style="margin:0">${esc(e.name)}</h2>${e.live ? '' : '<button class="btn small danger" data-act="removeEnemy">Retirer</button>'}</div>
      ${(e.detachments || []).map((d) => `<div class="note">${esc(d)}</div>`).join('')}${e.total ? `<p class="muted">Total : ${e.total.points} pts${e.total.models ? ' · ' + e.total.models + ' figurines' : ''}</p>` : ''}
      ${e.live ? '' : `<details><summary>Remplacer par un autre import</summary>${enemyImportCard()}</details>`}${S.ui.enemyMsg ? `<div class="note" style="white-space:pre-wrap">${esc(S.ui.enemyMsg)}</div>` : ''}</div>`;
    h += `<div class="card"><div class="row sp"><h2 style="margin:0">Unités (${e.units.length})</h2>${liveEnemy('enemy') ? '' : '<button class="btn small ghost" data-act="resetModels" data-who="enemy">↺ Rétablir effectifs</button>'}</div>`;
    e.units.forEach((u) => {
      h += unitRow('enemy', e, u);
      h += `<details class="eu"><summary>Détails de ${esc(u.name)}</summary>${unitStatLine(u)}${(u.keywords || []).length ? `<div class="muted">${esc((u.keywords || []).concat(u.factionKw || []).join(' · '))}</div>` : ''}
        ${(u.weapons || []).length ? `<h3>Armes</h3><ul class="fxlist">${u.weapons.map((w) => `<li>${wLine(w)}</li>`).join('')}</ul>` : ''}
        ${(u.abilities || []).length ? `<h3>Aptitudes</h3>${u.abilities.map(ruleNote).join('')}` : ''}
        <button class="btn small" style="margin-top:6px" data-act="aim" data-val="${u.id}" data-go="1">🎯 Choisir comme cible</button></details>`;
    });
    h += '</div>';
    if ((e.rules || []).length) h += `<div class="card"><h2>Règles d'armée / détachement</h2>${e.rules.map(ruleNote).join('')}</div>`;
    if ((e.strats || []).length) h += `<div class="card"><h2>Stratagèmes adverses (${e.strats.length})</h2>${e.strats.map((s) => `<details class="note"><summary><b>${esc(s.name)}</b> · ${s.cp} PC${s.detachment ? ' · ' + esc(s.detachment) : ''}</summary><div class="muted"><b>Quand :</b> ${esc(s.when || '—')}</div>${s.target ? `<div class="muted"><b>Cible :</b> ${esc(s.target)}</div>` : ''}<div><b>Effet :</b> ${esc(s.effect || '—')}</div></details>`).join('')}</div>`;
    return h;
  }
  async function importEnemyPdf(file) {
    S.ui.enemyMsg = 'Lecture du PDF…'; render();
    let res = null, err = '';
    try { res = await parsePdfStructured(file); } catch (x) { err = x && x.message ? x.message : 'erreur'; }
    if (res && res.units.length) {
      S.enemy = { id: uid(), name: (res.faction ? res.faction + ' — ' : '') + (res.name || 'Armée adverse'), faction: res.faction, detachments: res.detachments.map((d) => d.name + (d.dp != null ? ` (${d.dp} pt${d.dp > 1 ? 's' : ''})` : '')), total: res.total, units: res.units.map(unitFromParsed), rules: res.rules.slice(), strats: res.strats.map((s) => Object.assign({ id: 'e_' + uid() }, s)) };
      linkParsed(S.enemy.units, res.units); S.ui.enemyMsg = `Armée adverse importée : ${S.enemy.units.length} unité(s), ${res.rules.length} règle(s), ${res.strats.length} stratagème(s).`;
      Wahap.fill(S.enemy.units, Wahap.facIds(res.faction)).then((n) => { if (n) { S.ui.enemyMsg += `\n+ ${n} unité(s) complétée(s) depuis la base.`; render(); } }).catch(() => {});
    } else {
      let text = '';
      try { text = await readPdf(file); } catch (x) { S.ui.enemyMsg = 'Impossible de lire ce PDF (' + (err || (x && x.message) || 'erreur') + ').'; render(); return; }
      const r = Importer.parseList(text); const ar = makeArmy(r, Importer.parseAlnPage(text));
      if (!ar.units.length) { S.ui.enemyMsg = 'Aucune unité reconnue dans ce PDF.'; render(); return; }
      S.enemy = Object.assign(ar, { rules: [], strats: [] }); S.ui.enemyMsg = `Armée adverse importée (lecture générique) : ${ar.units.length} unité(s).`;
    }
    S.play.targetUnitId = null; render();
  }

  /* ----- Partie en ligne : synchronisation directe entre deux téléphones (WebRTC via PeerJS) ----- */
  const PEER_URL = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
  const NET_PREFIX = 'noobammer-';
  const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const net = { peer: null, conn: null, status: 'off', msg: '', ver: 0, lastTurn: '', lastArmy: '', lastMsg: '', timer: null, push: null, tries: 0, dirty: false };
  const newCode = () => Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  const turnStr = () => `${S.round}|${S.phase}|${S.mine ? 1 : 0}`;
  const otherRole = () => (S.net.role === 'h' ? 'g' : 'h');
  const loadPeer = () => (window.Peer ? Promise.resolve() : loadScript(PEER_URL));
  const netErr = (m) => { net.status = 'err'; net.msg = m; render(); };

  function netPush() {
    if (net.status !== 'on' || !net.conn) return;
    clearTimeout(net.push); net.push = setTimeout(() => netSend(false), 250);
  }
  function netSend(force) {
    if (net.status !== 'on' || !net.conn) return;
    const cur = turnStr(); if (cur !== net.lastTurn) { net.ver++; net.lastTurn = cur; }
    const a = army();
    const aj = JSON.stringify(a ? { name: a.name, faction: a.faction, detachments: a.detachments, total: a.total, units: a.units, rules: S.armyRules[a.id] || [], strats: S.customStrats.filter((s) => s.armyId === a.id) } : null);
    const msg = { t: 'sync', nick: S.net.nick || 'Joueur', cp: S.cp, force: !!force, turn: { v: net.ver, round: S.round, phase: S.phase, active: S.mine ? S.net.role : otherRole() }, used: Object.entries(S.used).flatMap(([k, arr]) => arr.map((x) => ({ k, name: x.name }))) };
    const sig = JSON.stringify(msg);
    if (!force && sig === net.lastMsg && aj === net.lastArmy) return;
    if (force || aj !== net.lastArmy) { msg.army = aj; net.lastArmy = aj; }
    net.lastMsg = sig;
    try { net.conn.send(msg); } catch (e) { /* connexion en train de tomber */ }
  }
  function netRecv(msg) {
    if (!msg) return;
    if (msg.t === 'busy') { netStop(false); netErr('Cette partie a déjà deux joueurs.'); return; }
    if (msg.t !== 'sync') return;
    if (msg.army) { try { const ar = JSON.parse(msg.army); if (ar && Array.isArray(ar.units)) S.enemy = Object.assign({}, ar, { id: 'live', live: true }); } catch (e) { /* message illisible */ } }
    if (S.enemy && S.enemy.live) { S.enemy.cp = msg.cp; S.enemy.used = msg.used || []; S.enemy.nick = msg.nick || 'Adversaire'; }
    const t = msg.turn;
    if (t && (t.v > net.ver || (msg.force && S.net.role === 'g'))) {
      S.round = t.round; S.phase = t.phase; S.mine = t.active === S.net.role; net.ver = t.v; net.lastTurn = turnStr();
    }
    syncTarget();
    if (/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) { net.dirty = true; save(); return; }
    render();
  }
  function netAttach(c) {
    net.conn = c;
    c.on('open', () => { net.status = 'on'; net.msg = ''; net.tries = 0; net.lastMsg = ''; net.lastArmy = ''; netSend(true); render(); });
    c.on('data', netRecv);
    c.on('close', () => {
      if (net.conn !== c) return;
      net.conn = null;
      if (!S.net.auto) return;
      net.status = S.net.role === 'h' ? 'wait' : 'connecting'; net.msg = 'Connexion perdue, nouvelle tentative…';
      if (S.net.role === 'g') { clearTimeout(net.timer); net.timer = setTimeout(netConnectGuest, 3000); }
      render();
    });
    c.on('error', () => { /* géré par close */ });
  }
  function netConnectGuest() {
    if (!net.peer || net.conn && net.conn.open) return;
    net.status = 'connecting'; net.msg = 'Connexion à la partie ' + S.net.code + '…'; render();
    const c = net.peer.connect(NET_PREFIX + S.net.code, { reliable: true });
    netAttach(c);
    clearTimeout(net.timer);
    net.timer = setTimeout(() => {
      if (net.conn === c && !c.open) {
        net.tries++; try { c.close(); } catch (e) { /* déjà fermée */ }
        net.conn = null;
        if (net.tries < 5) netConnectGuest(); else netErr('Partie introuvable : vérifie le code, et que l\'hôte a bien créé la partie et reste connecté.');
      }
    }, 9000);
  }
  async function netStart(role, code) {
    netStop(true);
    S.net.role = role; S.net.code = code; S.net.auto = true; net.tries = 0;
    net.status = 'connecting'; net.msg = 'Connexion au service de mise en relation…'; render();
    try { await loadPeer(); } catch (e) { netErr('Impossible de charger la bibliothèque de connexion : internet est nécessaire.'); return; }
    const peer = role === 'h' ? new window.Peer(NET_PREFIX + code) : new window.Peer();
    net.peer = peer;
    peer.on('open', () => {
      if (net.peer !== peer) return;
      if (role === 'h') { net.status = 'wait'; net.msg = ''; render(); } else netConnectGuest();
    });
    peer.on('connection', (c) => {
      if (role !== 'h') return;
      if (net.conn && net.conn.open) { c.on('open', () => { try { c.send({ t: 'busy' }); } catch (e) { /* ignoré */ } setTimeout(() => c.close(), 300); }); return; }
      netAttach(c);
    });
    peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) { /* ignoré */ } });
    peer.on('error', (err) => {
      const t = err && err.type;
      if (t === 'unavailable-id') {
        net.tries++;
        if (net.tries < 8) { net.msg = 'Reprise de la partie…'; render(); clearTimeout(net.timer); net.timer = setTimeout(() => netStart('h', code), 3000); } else netErr('Ce code est déjà utilisé. Crée une nouvelle partie.');
      } else if (t === 'peer-unavailable') { /* le délai de netConnectGuest réessaie */ }
      else if (t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed') netErr('Service de mise en relation injoignable (vérifie ta connexion).');
      else if (t === 'webrtc') netErr('Connexion directe impossible sur ce réseau (essaie en Wi-Fi ou avec un autre réseau).');
    });
  }
  function netStop(keepAuto) {
    clearTimeout(net.timer); clearTimeout(net.push);
    try { if (net.conn) net.conn.close(); } catch (e) { /* ignoré */ }
    try { if (net.peer) net.peer.destroy(); } catch (e) { /* ignoré */ }
    net.peer = null; net.conn = null; net.status = 'off'; net.msg = '';
    if (!keepAuto) { S.net.auto = false; if (S.enemy && S.enemy.live) S.enemy.live = false; }
  }
  function enemyUsedHtml() {
    const e = S.enemy; if (!e || !e.live || !(e.used || []).length) return '';
    const now = e.used.filter((x) => { const k = String(x.k).split('|'); return +k[0] === S.round && k[2] === S.phase; });
    return now.length ? `<div class="note">L'adversaire a joué ce round, cette phase : <b>${esc(now.map((x) => x.name).join(', '))}</b></div>` : '';
  }
  function netChip() {
    if (!S.net.code || net.status === 'off') return '';
    const s = net.status === 'on' ? `🟢 En ligne${S.enemy && S.enemy.nick ? ' avec ' + esc(S.enemy.nick) : ''}` : net.status === 'err' ? '🔴 Hors ligne' : '🟠 ' + (net.status === 'wait' ? 'En attente de l\'adversaire (code ' + esc(S.net.code) + ')' : 'Connexion…');
    return `<div class="muted" style="margin:-4px 0 8px">${s}</div>`;
  }
  function onlineCard() {
    const n = S.net, st = net.status;
    let h = `<div class="card"><h2>Partie en ligne</h2>`;
    if (location.protocol === 'file:') h += `<div class="warn">Tu as ouvert l'appli depuis un fichier : la partie en ligne a besoin que l'appli soit hébergée en HTTPS (voir le guide HEBERGER.md).</div>`;
    if (st === 'off') {
      h += `<p class="muted">Joue à deux : chacun voit la liste, les effectifs et les stratagèmes de l'autre, et le round / la phase / les PC se synchronisent. Il faut internet des deux côtés.</p>
        ${txt('Ton pseudo', 'net.nick')}
        <div class="row" style="margin-top:10px"><button class="btn" data-act="netHost">Créer une partie en ligne</button></div>
        <hr><label>Rejoindre avec un code</label><div class="row"><input type="text" id="joinCode" maxlength="8" placeholder="Code (5 caractères)" style="flex:1;text-transform:uppercase" value=""><button class="btn" data-act="netJoin">Rejoindre</button></div>
        ${n.code ? `<hr><div class="row sp"><span class="muted">Dernière partie : code <b>${esc(n.code)}</b> (${n.role === 'h' ? 'créée par toi' : 'rejointe'})</span><button class="btn small ghost" data-act="netResume">Reprendre</button></div>` : ''}`;
    } else {
      h += `<div style="text-align:center;margin:8px 0"><div class="muted">Code de la partie</div><div style="font-size:2rem;font-weight:800;letter-spacing:.25em;color:var(--accent)">${esc(n.code)}</div></div>`;
      h += st === 'on' ? `<div class="note">🟢 Connecté${S.enemy && S.enemy.nick ? ' à <b>' + esc(S.enemy.nick) + '</b>' : ''}. Tes données et les siennes se synchronisent automatiquement.</div>`
        : st === 'wait' ? `<div class="note">🟠 En attente de l'adversaire : donne-lui ce code, il doit l'entrer dans « Rejoindre avec un code ».</div>`
        : st === 'err' ? '' : `<div class="note">🟠 Connexion en cours…</div>`;
      if (net.msg) h += `<div class="${st === 'err' ? 'warn' : 'note'}">${esc(net.msg)}</div>`;
      h += `<div class="row" style="margin-top:8px"><button class="btn small danger" data-act="netLeave">Quitter la partie en ligne</button>${st === 'err' ? '<button class="btn small ghost" data-act="netResume">Réessayer</button>' : ''}</div>`;
    }
    return h + '</div>';
  }

  /* ----- Parties (sauvegardes) ----- */
  const GKEY = 'noobammer.games.v1';
  const readGames = () => { try { return JSON.parse(localStorage.getItem(GKEY) || '[]'); } catch (e) { return []; } };
  const writeGames = (l) => { try { localStorage.setItem(GKEY, JSON.stringify(l)); return true; } catch (e) { alert('Sauvegarde impossible (stockage plein ou bloqué). Utilise « Exporter » pour garder un fichier.'); return false; } };
  const snapshot = () => { const c = JSON.parse(JSON.stringify(S)); c.ui = {}; c.tab = 'game'; delete c.park; delete c.libId; { const ids = new Set(c.armies.filter((x) => x.gameOf).map((x) => x.id)); c.armies = c.armies.filter((x) => ids.has(x.id)); Object.keys(c.armyRules).forEach((k) => { if (!ids.has(k)) delete c.armyRules[k]; }); c.customStrats = c.customStrats.filter((s) => s.armyId && ids.has(s.armyId)); } delete c.inGame; delete c.gameId; delete c.gameName; delete c.net; if (c.enemy && c.enemy.live) { c.enemy.live = false; } return c; };
  let gameTimer = null;
  function scheduleGameSave() {
    if (!S.gameId || !S.autoGame || !S.inGame) return;
    clearTimeout(gameTimer);
    gameTimer = setTimeout(() => {
      try { const l = readGames(); const g = l.find((x) => x.id === S.gameId); if (!g) return; g.at = Date.now(); g.state = snapshot(); localStorage.setItem(GKEY, JSON.stringify(l)); } catch (e) { /* ignoré */ }
    }, 1500);
  }
  const hasQuick = () => S.round > 1 || S.cp > 0 || Object.keys(S.used).length > 0 || Object.keys(S.bs).length > 0;
  function freshGame() {
    S.round = 1; S.cp = 0; S.mine = true; S.phase = 'command'; S.used = {}; S.once = []; S.bs = {}; S.gameId = null; S.gameName = '';
    [army(), S.enemy && !S.enemy.live ? S.enemy : null].forEach((ar) => ar && ar.units.forEach((u) => { delete u.cur; delete u.hp; }));
    S.play.nModelsUnit = null; S.play.fx = {}; syncTarget();
  }
  const libArmies = () => S.armies.filter((x) => !x.gameOf);
  function flushGameSave() {
    if (!S.gameId || !S.autoGame || !S.inGame) return; clearTimeout(gameTimer);
    try { const l = readGames(); const g = l.find((x) => x.id === S.gameId); if (!g) return; g.at = Date.now(); g.state = snapshot(); localStorage.setItem(GKEY, JSON.stringify(l)); } catch (e) { /* ignoré */ }
  }
  function restoreLib() { const l = libArmies(); S.armyId = (l.find((x) => x.id === S.libId) || l[0] || {}).id || null; }
  /* Chaque partie a sa propre copie de l'armée (effectifs, PV) : la bibliothèque reste intacte. */
  function makeGameArmy(src, gid) {
    const c = JSON.parse(JSON.stringify(src)); c.id = uid(); c.gameOf = gid; c.fromId = src.id;
    c.units.forEach((u) => { delete u.cur; delete u.hp; });
    S.armyRules[c.id] = JSON.parse(JSON.stringify(S.armyRules[src.id] || []));
    S.customStrats.filter((s) => s.armyId === src.id).forEach((s) => S.customStrats.push(Object.assign({}, JSON.parse(JSON.stringify(s)), { id: 'c_' + uid(), armyId: c.id })));
    return c;
  }
  function dropGameArmies() {
    const ids = new Set(S.armies.filter((x) => x.gameOf).map((x) => x.id));
    S.armies = libArmies(); ids.forEach((i) => delete S.armyRules[i]); S.customStrats = S.customStrats.filter((s) => !ids.has(s.armyId));
  }
  function attachGameArmy(gid) {
    const lib = army(); if (!lib || lib.gameOf) return;
    S.libId = lib.id; dropGameArmies();
    const c = makeGameArmy(lib, gid); S.armies.push(c); S.armyId = c.id; S.play.unitId = null; S.play.nModelsUnit = null; S.play.weaponIdx = 0;
  }
  function ensureGame(name) {
    if (S.inGame) return;
    if (!S.gameId) { flushGameSave(); freshGame(); const g = { id: uid(), name, at: Date.now() }; S.gameId = g.id; S.gameName = name; attachGameArmy(g.id); g.state = snapshot(); const l = readGames(); l.unshift(g); writeGames(l); }
    S.park = null; S.inGame = true; S.tab = 'game';
  }
  const defaultGameName = () => { const d = new Date(); return `${(army() || {}).name || 'Partie'}${S.enemy ? ' vs ' + S.enemy.name : ''} — ${d.getDate()}/${d.getMonth() + 1}`; };
  function download(name, text) {
    const el = document.createElement('a'); el.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); el.download = name;
    document.body.appendChild(el); el.click(); setTimeout(() => { URL.revokeObjectURL(el.href); el.remove(); }, 800);
  }
  const fmtDate = (t) => { const d = new Date(t); return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  function gamesCard() {
    const l = readGames();
    return `<div class="card"><h2>Mes parties</h2>
      ${S.ui.gameMsg ? `<div class="note">${esc(S.ui.gameMsg)}</div>` : ''}
      ${l.map((g) => `<div class="unit-item col"><div><b>${esc(g.name)}</b>${g.id === S.gameId ? ' <span class="tag">en cours</span>' : ''}<div class="muted">${fmtDate(g.at)} · Round ${g.state.round} · ${g.state.cp} PC · ${esc(((g.state.armies || []).find((x) => x.id === g.state.armyId) || {}).name || '—')}${g.state.enemy ? ' vs ' + esc(g.state.enemy.name) : ''}</div></div>
        <div class="row"><button class="btn small" data-act="gameLoad" data-val="${g.id}">Ouvrir</button><button class="btn small ghost" data-act="gameExport" data-val="${g.id}">Exporter</button><button class="btn small ghost" data-act="gameRename" data-val="${g.id}">Renommer</button><button class="btn small danger" data-act="gameDel" data-val="${g.id}">Suppr.</button></div></div>`).join('') || '<p class="muted" style="margin-top:8px">Aucune partie sauvegardée. Crée ta première partie ci-dessus.</p>'}
      <hr><div class="row"><label class="btn small ghost" style="margin:0;display:inline-block;cursor:pointer;color:var(--text)">Importer un fichier de partie<input type="file" id="gameFile" accept=".json,application/json" hidden></label></div></div>`;
  }

  /* ----- Armée ----- */
  const phaseCodes = { all: 'all', toujours: 'all', cmd: 'command', commandement: 'command', command: 'command', mvt: 'move', mouvement: 'move', move: 'move', tir: 'shoot', shoot: 'shoot', charge: 'charge', combat: 'fight', fight: 'fight', cac: 'fight', def: 'def', defense: 'def', défense: 'def' };
  function parseWeapons(text) {
    const out = [], errors = [];
    text.split('\n').map((l) => l.trim()).filter(Boolean).forEach((l, i) => {
      const t = l.split(/\s*[|;\t]\s*/);
      if (t.length < 7) { errors.push(`Ligne ${i + 1} : 7 champs minimum (nom | portée | A | CT | F | PA | D | capacités)`); return; }
      const melee = /m[eê]l|corps|melee|cac/i.test(t[1]) || t[1] === '';
      out.push({ name: t[0], range: t[1], A: t[2], skill: t[3], S: t[4], AP: t[5], D: t[6], abilities: t[7] || '', type: melee ? 'melee' : 'ranged' });
    });
    return { out, errors };
  }
  const weaponsToText = (ws) => (ws || []).map((w) => [w.name, w.range, w.A, w.skill, w.S, w.AP, w.D, w.abilities].join(' | ')).join('\n');
  function parseAbilities(text) {
    return text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const t = l.split(/\s*\|\s*/);
      const phases = (t[1] || 'all').split(/[ ,]+/).map((x) => phaseCodes[x.toLowerCase()]).filter(Boolean);
      return { name: t[0], phases: phases.length ? phases : ['all'], text: t.slice(2).join(' | ') };
    });
  }
  const abilitiesToText = (as) => (as || []).map((a) => `${a.name} | ${(a.phases || ['all']).join(',')} | ${a.text || ''}`).join('\n');

  function viewArmy() {
    const a = army();
    let h = S.inGame ? `<h1>Armée de la partie</h1><div class="card"><b>${esc(a ? a.name : '—')}</b><p class="muted">Cette copie appartient à la partie « ${esc(S.gameName || 'Partie rapide')} » : tes pertes n'affectent pas ta bibliothèque. Pour changer d'armée, crée une autre partie.</p><div class="row"><button class="btn small ghost" data-act="renameArmy">Renommer</button></div></div>` : `<h1>Mes armées</h1><div class="card"><label>Armée (bibliothèque)</label>
      <select data-bind="armyId">${libArmies().map((x) => `<option value="${x.id}" ${x.id === S.armyId ? 'selected' : ''}>${esc(x.name)}</option>`).join('') || '<option value="">(aucune)</option>'}</select>
      <div class="row" style="margin-top:8px"><button class="btn small" data-act="newArmy">+ Nouvelle armée</button>${a ? '<button class="btn small ghost" data-act="renameArmy">Renommer</button><button class="btn small danger" data-act="delArmy">Supprimer</button>' : ''}</div></div>`;
    if (!a) return h + importCard(null);
    if (S.editUnit) return h + unitEditor(a);
    if (a.detachments && a.detachments.length) h += `<div class="card"><h2>Détachements</h2>${a.detachments.map((d) => `<div class="note">${esc(d)}</div>`).join('')}${a.total ? `<p class="muted">Total : ${a.total.points} pts${a.total.models ? ' · ' + a.total.models + ' figurines' : ''}${a.total.units ? ' · ' + a.total.units + ' unités' : ''}</p>` : ''}</div>`;
    h += `<div class="card"><div class="row sp"><h2 style="margin:0">Unités (${a.units.length})</h2><button class="btn small" data-act="addUnit">+ Unité</button></div>
      ${a.units.map((u) => unitRow('mine', a, u)).join('') || '<p class="muted">Aucune unité pour l\'instant.</p>'}
      ${a.units.length ? '<button class="btn small ghost" style="margin-top:8px" data-act="resetModels" data-who="mine">↺ Rétablir tous les effectifs</button>' : ''}</div>`;
    const rules = S.armyRules[a.id] || [];
    h += `<div class="card"><h2>Règles d'armée / détachement</h2><p class="muted">Une règle par ligne : <code>Nom | phases | texte</code> (phases : cmd, mvt, tir, charge, combat, def, all).</p>
      <textarea data-act-change="saveRules" data-bind-rules="1" placeholder="Oath of Moment | tir,combat | Relance les touches contre l'unité choisie">${esc(abilitiesToText(rules))}</textarea></div>`;
    if (S.inGame) return h;
    h += importCard(a);
    h += `      <div class="card"><h2>Sauvegarde / partage (JSON)</h2><textarea id="jsonBox">${a ? esc(JSON.stringify({ army: a, rules: S.armyRules[a.id] || [] }, null, 1)) : ''}</textarea>
      <div class="row" style="margin-top:8px"><button class="btn small ghost" data-act="copyJson">Copier</button><button class="btn small" data-act="importJson">Importer ce JSON</button></div></div>`;
    return h;
  }

  function unitEditor(a) {
    const u = a.units.find((x) => x.id === S.editUnit);
    if (!u) { S.editUnit = null; return ''; }
    return `<div class="card" data-unit="${u.id}"><h2>Éditer l'unité</h2>
      <label>Nom</label><input type="text" id="u_name" value="${esc(u.name)}">
      <div class="grid" style="margin-top:8px"><div><label>Endurance</label><input type="number" id="u_T" value="${esc(u.T || '')}"></div><div><label>Sauvegarde</label><input type="text" id="u_sv" placeholder="3+" value="${esc(u.sv || '')}"></div><div><label>Invulnérable</label><input type="number" id="u_inv" value="${esc(u.inv || '')}"></div>
      <div><label>Ignorer douleur</label><input type="number" id="u_fnp" value="${esc(u.fnp || '')}"></div><div><label>PV / fig.</label><input type="number" id="u_W" value="${esc(u.W || '')}"></div><div><label>Figurines</label><input type="number" id="u_models" value="${esc(u.models || '')}"></div></div>
      <label style="margin-top:8px">Armes (une par ligne)</label>
      <textarea id="u_weapons" placeholder="Fusil bolter | 24 | 2 | 3+ | 4 | -1 | 1 | Assault, Heavy&#10;Épée énergétique | Mêlée | 4 | 3+ | 5 | -2 | 1 | ">${esc(weaponsToText(u.weapons))}</textarea>
      <p class="muted">Format : nom | portée (ou « Mêlée ») | A | CT/CC | F | PA | D | capacités. Capacités reconnues (FR ou EN) : Tir rapide X, Touches soutenues X, Coups fatals, Blessures dévastatrices, Anti-… X+, Fusion X, Jumelé, Torrent, Explosion, Lourde, Assaut, Pistolet, Lance, Ignore le couvert, Tir indirect, Précision, Dangereux…</p>
      <label>Règles de l'unité (une par ligne)</label>
      <textarea id="u_abilities" placeholder="Furtivité | def | Bénéficie du couvert hors terrain&#10;Bouclier | def | Invulnérable 4+">${esc(abilitiesToText(u.abilities))}</textarea>
      <p class="muted">Format : nom | phases | texte. Phases : cmd, mvt, tir, charge, combat, def (quand elle est attaquée), all.</p>
      <div class="row" style="margin-top:10px"><button class="btn" data-act="saveUnit">Enregistrer</button><button class="btn ghost" data-act="cancelUnit">Annuler</button><button class="btn ghost" data-act="dupUnit">Dupliquer</button><button class="btn danger" data-act="delUnit">Supprimer</button></div></div>`;
  }


  /* ----- Import (liste ALN texte/BBCode + profils depuis la page ALN) ----- */
  const RELAY = 'https://api.allorigins.win/raw?url=';
  function unitStatLine(u) {
    if (!u.T) return '';
    return `<div class="muted" style="margin-top:6px">${u.M ? 'M' + esc(u.M) + ' · ' : ''}E${esc(u.T)} · Sv ${esc(u.sv)}${u.inv ? '/' + esc(u.inv) + '++' : ''} · PV ${esc(u.W)}${u.Ld ? ' · CD ' + esc(u.Ld) : ''}${u.OC ? ' · CO ' + esc(u.OC) : ''}${u.fnp ? ' · IdD ' + esc(u.fnp) + '+' : ''}</div>`;
  }
  function importCard(a) {
    const m = S.ui.importMsg || '';
    return `<div class="card"><h2>Importer ma liste ALN</h2>
      <p class="muted">Colle l'export <b>texte</b> ou <b>BBCode</b> de ta liste ALN40k : l'appli crée l'armée, les unités, les détachements et les options.</p>
      <textarea id="importText" placeholder="Space Marines : Ma liste&#10;### Détachements :&#10;* …&#10;Escouade Aggressor (6) : 180 pts"></textarea>
      <button class="btn" style="margin-top:8px" data-act="importList">Importer la liste</button>
      <hr><p class="muted">Ou charge un <b>PDF</b> ALN (liste + fiches) : armée, profils, armes et aptitudes sont importés en une fois.</p>
      <label class="btn ghost" style="display:inline-block;margin:0;cursor:pointer;color:var(--text)">📄 Importer un PDF<input type="file" id="pdfNew" accept=".pdf,application/pdf" hidden></label>
      ${m ? `<div class="note" style="margin-top:8px;white-space:pre-wrap">${esc(m)}</div>` : ''}</div>${a ? profilesCard(a) : ''}`;
  }
  function profilesCard(a) {
    return `<div class="card"><h2>Profils des unités et armes</h2>
      <p class="muted">${a.alnUrl ? 'Lien ALN détecté : ' + esc(a.alnUrl) : 'Aucun lien ALN dans l\'export : utilise le collage ou le fichier ci-dessous.'}</p>
      ${a.alnUrl ? '<button class="btn" data-act="fetchProfiles">Récupérer les profils depuis ALN</button>' : ''}
      <details style="margin-top:10px"><summary>Ou coller la page ALN / charger un fichier</summary>
        <p class="muted">Ouvre ta liste sur le site ALN, sélectionne toute la page, copie, puis colle ici. Ou enregistre la page (.html) et charge-la.</p>
        <textarea id="alnPage" placeholder="Colle ici le contenu de la page ALN…"></textarea>
        <div class="row" style="margin-top:8px"><button class="btn small" data-act="parsePage">Analyser le texte collé</button>
        <label class="btn small ghost" style="margin:0;display:inline-block;cursor:pointer;color:var(--text)">Charger un fichier<input type="file" id="alnFile" accept=".html,.htm,.txt" hidden></label>
        <label class="btn small ghost" style="margin:0;display:inline-block;cursor:pointer;color:var(--text)">📄 PDF<input type="file" id="pdfEnrich" accept=".pdf,application/pdf" hidden></label></div></details>
      ${S.ui.profMsg ? `<div class="note" style="margin-top:8px;white-space:pre-wrap">${esc(S.ui.profMsg)}</div>` : ''}</div>`;
  }
  function applyPage(text) {
    const a = army(); if (!a) return;
    const blocks = Importer.parseAlnPage(text);
    if (!blocks.length) { S.ui.profMsg = 'Aucune fiche d\'unité reconnue dans ce contenu (je cherche des lignes « Nom : 100 pts » suivies des tableaux de caractéristiques et d\'armes). Si c\'est bien la page ALN, copie-moi un extrait d\'une unité pour que j\'ajuste la lecture.'; return; }
    const rep = Importer.enrichArmy(a, blocks, uid);
    const lines = [`${blocks.length} fiche(s) lue(s) sur la page. ${rep.matched}/${a.units.length} unité(s) reliée(s) à un profil.`];
    if (rep.missing.length) lines.push('Sans profil : ' + [...new Set(rep.missing)].join(', '));
    if (rep.noStats.length) lines.push('Caractéristiques non lues : ' + [...new Set(rep.noStats)].join(', '));
    if (rep.noWeapons.length) lines.push('Armes non lues : ' + [...new Set(rep.noWeapons)].join(', '));
    S.ui.profMsg = lines.join('\n');
  }

  /* ----- PDF : extraction du texte (pdf.js embarqué, hors ligne) ----- */
  function loadScript(src) {
    return new Promise((res, rej) => { const el = document.createElement('script'); el.src = src; el.onload = res; el.onerror = () => rej(new Error('chargement de ' + src + ' impossible')); document.head.appendChild(el); });
  }
  async function loadPdfJs() {
    if (!globalThis.pdfjsLib) { await loadScript('lib/pdf.worker.classic.js'); await loadScript('lib/pdf.classic.js'); }
    globalThis.pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.classic.js';
    return globalThis.pdfjsLib;
  }
  async function pdfToText(buf) {
    const pdfjs = await loadPdfJs();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    const out = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      const items = tc.items.filter((it) => typeof it.str === 'string' && (it.str.trim() || it.hasEOL)).map((it) => ({ s: it.str, x: it.transform[4], y: it.transform[5], w: it.width || 0, h: Math.abs(it.transform[3]) || it.height || 8 }));
      items.sort((a, b) => (Math.abs(b.y - a.y) > 2.5 ? b.y - a.y : a.x - b.x));
      const rows = [];
      items.forEach((it) => {
        const r = rows[rows.length - 1];
        if (r && Math.abs(r.y - it.y) <= Math.max(2.5, it.h * 0.35)) r.items.push(it); else rows.push({ y: it.y, items: [it] });
      });
      rows.forEach((r) => {
        r.items.sort((a, b) => a.x - b.x);
        let line = '', end = null, size = 8;
        r.items.forEach((it) => {
          size = it.h || size;
          if (end !== null) {
            const gap = it.x - end;
            if (gap > size * 1.3) line += '\t';
            else if (gap > size * 0.12 && !/\s$/.test(line) && !/^\s/.test(it.s)) line += ' ';
          }
          line += it.s; end = it.x + it.w;
        });
        if (line.trim()) out.push(line.replace(/[ \t]+$/, ''));
      });
      out.push('');
    }
    return out.join('\n');
  }
  async function readPdf(file) {
    const buf = await file.arrayBuffer();
    return pdfToText(buf);
  }
  function makeArmy(r, blocks) {
    const withProfile = (blocks || []).filter((b) => b.stats || b.weapons.length);
    let units;
    if (withProfile.length) {
      const sameOrder = r.units.length === withProfile.length;
      units = withProfile.map((b, i) => {
        const lu = sameOrder ? r.units[i] : null;
        return Importer.toUnit(uid, { name: b.name, models: b.models, pts: b.pts, section: lu ? lu.section : '', options: lu ? lu.options : [], enhancement: lu ? lu.enhancement : '' }, b);
      });
    } else units = r.units.map((u) => Importer.toUnit(uid, u, null));
    const total = r.total || { points: units.reduce((a, u) => a + (+u.pts || 0), 0), models: null, units: units.length };
    return { id: uid(), name: (r.faction ? r.faction + ' — ' : '') + (r.name || 'Liste importée'), faction: r.faction, detachments: r.detachments, alnUrl: r.url || '', total, units };
  }
  async function parsePdfStructured(file) {
    const pdfjs = await loadPdfJs();
    const rows = await AlnPdf.extractRows(pdfjs, await file.arrayBuffer());
    return AlnPdf.parse(rows);
  }
  const unitFromParsed = (u) => ({ id: uid(), name: u.name, models: u.models || '', pts: u.pts, ptsNote: u.ptsNote || '', section: u.section || '', tag: u.tag || '', M: u.M, T: u.T, sv: u.sv, inv: u.inv, W: u.W, Ld: u.Ld, OC: u.OC, fnp: u.fnp || '', weapons: u.weapons, abilities: u.abilities, keywords: u.keywords, factionKw: u.factionKw, equipment: u.equipment, subModels: u.subModels, enhancement: u.enhancement ? u.enhancement.name : '', options: u.enhancement ? [u.enhancement.name] : [], hasProfile: u.hasProfile, role: u.role || '', profiles: u.profiles });
  function linkParsed(units, parsed) { parsed.forEach((p, i) => { if (p.attachedToExp != null && units[i] && units[p.attachedToExp]) units[i].attachedTo = units[p.attachedToExp].id; }); }
  function summary(a, res) {
    const nW = a.units.reduce((n, u) => n + (u.weapons || []).length, 0), nA = a.units.reduce((n, u) => n + (u.abilities || []).length, 0);
    const lines = [`Armée « ${a.name} » créée depuis le PDF.`, `${a.units.length} unité(s)${a.total ? ' · ' + a.total.points + ' pts' : ''} · ${nW} arme(s) · ${nA} aptitude(s) d'unité.`,
      `${res.detachments.length} détachement(s) · ${res.rules.length} règle(s) d'armée/détachement · ${res.strats.length} stratagème(s) de détachement.`];
    const miss = a.units.filter((u) => !u.hasProfile).map((u) => u.name); if (miss.length) lines.push('Sans profil : ' + [...new Set(miss)].join(', '));
    const noW = a.units.filter((u) => u.hasProfile && !(u.weapons || []).length).map((u) => u.name); if (noW.length) lines.push('Sans arme : ' + [...new Set(noW)].join(', '));
    const sum = a.units.reduce((n, u) => n + (+u.pts || 0), 0);
    if (a.total && sum && sum !== a.total.points) lines.push(`⚠️ La somme des unités (${sum} pts) ne correspond pas au total du PDF (${a.total.points} pts).`);
    return lines.join('\n');
  }
  function enrichFromParsed(a, res) {
    const key = (n) => AlnPdf.norm(String(n).replace(/\s*#\d+$/, ''));
    const pool = res.units.map((u) => ({ u, used: false })); const map = new Map(); let n = 0; const miss = [];
    a.units.forEach((x) => {
      const c = pool.find((p) => !p.used && key(p.u.name) === key(x.name) && (!x.models || !p.u.models || +x.models === +p.u.models)) || pool.find((p) => !p.used && key(p.u.name) === key(x.name)) || pool.find((p) => !p.used && (key(p.u.name).includes(key(x.name)) || key(x.name).includes(key(p.u.name))));
      if (!c) { miss.push(x.name); return; }
      c.used = true; n++; map.set(c.u, x);
      const f = unitFromParsed(c.u); const keep = { id: x.id, name: x.name, pts: x.pts || f.pts, section: x.section || f.section, models: x.models || f.models };
      Object.assign(x, f, keep);
    });
    res.units.forEach((p) => { const x = map.get(p), h = p.attachedToExp != null ? map.get(res.units[p.attachedToExp]) : null; if (x && h && !x.attachedTo) x.attachedTo = h.id; });
    if (res.rules.length) S.armyRules[a.id] = res.rules.slice();
    if (res.strats.length) { S.customStrats = S.customStrats.filter((s) => s.armyId !== a.id); res.strats.forEach((s) => S.customStrats.push(Object.assign({ id: 'c_' + uid(), armyId: a.id }, s))); }
    if (res.detachments.length) a.detachments = res.detachments.map((d) => d.name + (d.dp != null ? ` (${d.dp} pt${d.dp > 1 ? 's' : ''})` : ''));
    return `${n}/${a.units.length} unité(s) mises à jour depuis le PDF · ${res.rules.length} règle(s) · ${res.strats.length} stratagème(s).` + (miss.length ? '\nSans correspondance : ' + [...new Set(miss)].join(', ') : '');
  }
  async function importPdfFile(file, mode) {
    const key = mode === 'new' ? 'importMsg' : 'profMsg';
    S.ui[key] = 'Lecture du PDF…'; render();
    let res = null, err = '';
    try { res = await parsePdfStructured(file); } catch (e) { err = e && e.message ? e.message : 'erreur'; }
    if (!res || !res.units.length) {
      /* repli : lecture « texte » générique si le format n'est pas celui d'ALN */
      let text = '';
      try { text = await readPdf(file); } catch (e) { S.ui[key] = 'Impossible de lire ce PDF (' + (err || (e && e.message) || 'erreur') + ').'; render(); return; }
      if (text.replace(/\s/g, '').length < 40) { S.ui[key] = 'Ce PDF ne contient pas de texte exploitable (scan ou image ?).'; render(); return; }
      if (mode === 'enrich') { applyPage(text); render(); return; }
      const r = Importer.parseList(text); const a = makeArmy(r, Importer.parseAlnPage(text));
      if (!a.units.length) { S.ui.importMsg = 'Aucune unité reconnue dans ce PDF.'; render(); return; }
    S.armies.push(a); S.armyId = a.id; S.play.unitId = a.units[0].id; S.play.nModelsUnit = null;
      S.ui.importMsg = `Armée « ${a.name} » créée (lecture générique) : ${a.units.length} unité(s).`; render(); return;
    }
    if (mode === 'enrich') { const a = army(); S.ui.profMsg = a ? enrichFromParsed(a, res) : 'Crée d\'abord une armée.'; render(); return; }
    const a = { id: uid(), name: (res.faction ? res.faction + ' — ' : '') + (res.name || 'Liste importée'), faction: res.faction, author: res.author, detachments: res.detachments.map((d) => d.name + (d.dp != null ? ` (${d.dp} pt${d.dp > 1 ? 's' : ''})` : '')), alnUrl: '', total: res.total, units: res.units.map(unitFromParsed) };
    linkParsed(a.units, res.units);
    S.armies.push(a); S.armyId = a.id; S.play.unitId = a.units[0].id; S.play.nModelsUnit = null; S.play.weaponIdx = 0;
    S.armyRules[a.id] = res.rules.slice();
    res.strats.forEach((s) => S.customStrats.push(Object.assign({ id: 'c_' + uid(), armyId: a.id }, s)));
    S.ui.importMsg = summary(a, res); S.ui.profMsg = ''; render();
    Wahap.fill(a.units, Wahap.facIds(res.faction)).then((n) => { if (n) { S.ui.importMsg += `\n+ ${n} unité(s) sans arme complétée(s) depuis la base Wahapedia.`; render(); } }).catch(() => {});
  }
  async function runFetch(autoOnly) {
    const a = army(); if (!a || !a.alnUrl) return;
    S.ui.profMsg = 'Récupération des profils depuis ALN…'; render();
    const get = async (u) => {
      const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 15000);
      try { const r = await fetch(u, { signal: ctl.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.text(); } finally { clearTimeout(timer); }
    };
    let html = null, via = '';
    try { html = await get(a.alnUrl); via = 'accès direct'; } catch (e) { /* CORS probable */ }
    if (html == null && !autoOnly) {
      if (!S.relayOk && !confirm('Le navigateur bloque l\'accès direct à ALN. Passer par un relais public (api.allorigins.win) ? Seule l\'adresse de ta liste lui est transmise.')) {
        S.ui.profMsg = 'Récupération annulée. Tu peux coller la page ALN ou charger un fichier ci-dessous.'; render(); return;
      }
      S.relayOk = true;
      try { html = await get(RELAY + encodeURIComponent(a.alnUrl)); via = 'relais public'; } catch (e) { /* échec */ }
    }
    if (html == null) {
      S.ui.profMsg = autoOnly ? 'Accès direct à ALN bloqué par le navigateur (sécurité CORS, normal). Appuie sur « Récupérer les profils depuis ALN » pour passer par un relais public, ou colle/charge la page ci-dessous.' : 'Impossible de récupérer la page ALN (relais indisponible ?). Colle son contenu ou charge le fichier ci-dessous.';
      render(); return;
    }
    applyPage(html); S.ui.profMsg = `(${via})\n` + S.ui.profMsg; render();
  }

  /* ----- Infos ----- */

  /* ----- Base Wahapedia ----- */
  const wt = (x) => (Wahap.isEn(x) ? esc(Wahap.T(x)) + ' <span class="tag">EN</span>' : esc(x || '').replace(/\n/g, '<br>'));
  function splitWTE(t) {
    const s = String(t || '').replace(/\r/g, ''); const rx = /(?:^|\n)\s*(WHEN|TARGET|EFFECT|RESTRICTIONS|QUAND|CIBLE|EFFET|RESTRICTIONS?)\s*:\s*/gi; const marks = []; let m;
    while ((m = rx.exec(s))) marks.push({ k: m[1].toLowerCase(), i: m.index, e: rx.lastIndex });
    const o = { when: '', target: '', effect: '' };
    marks.forEach((k, n) => { const v = s.slice(k.e, n + 1 < marks.length ? marks[n + 1].i : undefined).trim(); if (/when|quand/.test(k.k)) o.when = v; else if (/target|cible/.test(k.k)) o.target = v; else o.effect = (o.effect ? o.effect + ' ' : '') + (/restr/.test(k.k) ? 'Restrictions : ' : '') + v; });
    if (!marks.length) o.effect = s.trim();
    return o;
  }
  /* ----- Création de liste (données Wahapedia) ----- */
  const BKEY = 'noobammer.build.v1';
  const FORMATS = [['500', 'Escarmouche (500)'], ['1000', 'Incursion (1000)'], ['2000', 'Force de frappe (2000)'], ['3000', 'Offensive (3000)'], ['0', 'Libre']];
  const bdef = () => ({ fac: '', fmt: '1000', limit: 1000, name: '', dets: [], units: [], open: null, q: '', grp: '', msg: '' });
  const B = (() => { try { return Object.assign(bdef(), JSON.parse(localStorage.getItem(BKEY) || '{}')); } catch (e) { return bdef(); } })();
  const bsave = () => { try { localStorage.setItem(BKEY, JSON.stringify(B)); } catch (e) { /* ignoré */ } };
  const bfac = () => (B.fac ? Wahap.cached(B.fac) : null);
  const bdef1 = (f, id) => f.units.find((x) => x.id === id);
  const kwOf = (d) => (d.kw || []).map((k) => Wahap.norm(k));
  const bgrp = (d) => { const k = kwOf(d), r = Wahap.norm(d.role); if (d.support) return 'Appuis'; if (k.includes('personnage') || k.includes('heros epique') || (d.leads || []).length) return 'Chefs'; if (/transport/.test(r)) return 'Transports'; if (/vehicule|marcheur|monstre|titanesque|aeronef|monte/.test(r)) return 'Véhicules & monstres'; return 'Troupes'; };
  const BGRPS = ['Chefs', 'Appuis', 'Troupes', 'Véhicules & monstres', 'Transports'];
  const canEnh = (d) => { const k = kwOf(d); return k.includes('personnage') && !k.includes('heros epique'); };
  const bEnhs = (f) => { const o = []; f.detachments.filter((d) => B.dets.includes(d.id)).forEach((d) => (d.enh || []).forEach((e) => o.push({ key: d.id + '|' + T0(e.name), name: T0(e.name), en: e.e || (e.name && e.name.en) || '', cost: +e.cost || 0, text: e.text, det: T0(d.name) }))); return o; };
  const T0 = (x) => Wahap.T(x);
  const bSizes = (d, ord) => { const t = d.pc && d.pc.t.slice().sort((a, b) => a[0] - b[0]).find((x) => ord <= x[0]); return t ? t[1] : []; };
  const bOrd = (e) => B.units.filter((x) => x.id === e.id).indexOf(e) + 1;
  function bAuto(f, e) {
    const d = bdef1(f, e.id); if (!d || !d.pc) return 0;
    const sz = bSizes(d, bOrd(e)); if (!sz.length) return 0; const n = +e.models || 0;
    const hit = sz.find((x) => x[0] === n) || sz.find((x) => x[0] >= n) || sz[sz.length - 1]; return hit[1];
  }
  const bWg = (f, e) => { const d = bdef1(f, e.id); return d && d.pc ? d.pc.w.reduce((s, w, j) => s + w[1] * (+(e.wg || {})[j] || 0), 0) : 0; };
  const bBase = (f, e) => (+e.pts > 0 ? +e.pts : bAuto(f, e));
  const bCost = (f, e) => { const en = bEnhs(f).find((x) => x.key === e.enh); return bBase(f, e) + bWg(f, e) + (en ? en.cost : 0); };
  function viewBuild() {
    let h = '<h1>Création de liste</h1>';
    const ix = Wahap.index();
    if (!ix) {
      if (!B.loading) { B.loading = true; Wahap.ready().then(() => { B.loading = false; render(); }).catch((e) => { B.loading = false; B.err = e.message; render(); }); }
      return h + `<div class="card">${B.err ? '<div class="warn">' + esc(B.err) + '</div>' : '<p class="muted">Chargement de la base…</p>'}</div>`;
    }
    h += `<div class="card"><label>Faction</label><select data-bf="fac"><option value="">— choisir —</option>${ix.factions.map((f) => `<option value="${f.id}" ${f.id === B.fac ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}</select>
      <div class="row" style="margin-top:8px"><div style="flex:1"><label>Format</label><select data-bf="fmt">${FORMATS.map((x) => `<option value="${x[0]}" ${x[0] === B.fmt ? 'selected' : ''}>${x[1]}</option>`).join('')}</select></div>
      <div style="width:110px"><label>Limite (pts)</label><input type="number" inputmode="numeric" data-bf="limit" value="${B.limit || ''}"></div></div>
      <label style="margin-top:8px">Nom de la liste</label><input type="text" data-bf="name" value="${esc(B.name)}" placeholder="Ma liste"></div>`;
    if (B.msg) h += `<div class="note">${esc(B.msg)}</div>`;
    if (!B.fac) return h + '<p class="muted">Choisis une faction pour commencer.</p>';
    const f = bfac();
    if (!f) { Wahap.faction(B.fac).then(() => render()).catch((e) => { B.err = e.message; B.fac = ''; render(); }); return h + '<div class="card"><p class="muted">Chargement de la faction…</p></div>'; }
    const dp = f.detachments.filter((d) => B.dets.includes(d.id)).reduce((s, d) => s + (+d.dp || 0), 0);
    h += `<div class="card"><h2>Détachements${B.dets.length ? ' · ' + dp + ' pt(s)' : ''}</h2><div class="chips">${f.detachments.map((d) => `<button class="chip ${B.dets.includes(d.id) ? 'on' : ''}" data-act="bDet" data-val="${d.id}">${esc(T0(d.name))} (${esc(d.dp || "?")})</button>`).join('')}</div>
      ${B.dets.map((id) => { const d = f.detachments.find((x) => x.id === id); return d ? `<details class="note"><summary><b>${wt(d.name)}</b></summary>${(d.abilities || []).map((a) => `<div style="margin-top:6px"><b>${wt(a.name)}</b><div>${wt(a.text)}</div></div>`).join('')}</details>` : ''; }).join('')}</div>`;
    const pts = B.units.reduce((s, e) => s + bCost(f, e), 0), over = B.limit && pts > B.limit;
    h += `<div class="card"><div class="row sp"><b style="${over ? 'color:#e5484d' : ''}">${pts}${B.limit ? ' / ' + B.limit : ''} pts</b><span class="muted">${B.units.length} unité(s) · ${B.units.reduce((s, e) => s + (+e.models || 0), 0)} fig.</span></div>${over ? '<div class="warn">Au-dessus de la limite du format.</div>' : ''}</div>`;
    h += B.units.map((e, i) => bUnitCard(f, e, i)).join('');
    h += `<div class="card"><h2>Ajouter une unité</h2><div class="chips"><button class="chip ${B.grp ? '' : 'on'}" data-act="bGrp" data-val="">Toutes</button>${BGRPS.map((g) => `<button class="chip ${B.grp === g ? 'on' : ''}" data-act="bGrp" data-val="${g}">${g}</button>`).join('')}</div>
      <input type="search" id="bq" placeholder="Rechercher (français ou anglais)…" value="${esc(B.q)}" autocomplete="off" style="margin-top:8px"><div id="bres" style="margin-top:6px">${bResults(f)}</div></div>`;
    h += `<div class="card"><h2>Code YellowScribe</h2><p class="muted">Texte au format « application GW » (noms anglais) à coller dans <b>yellowscribe.link</b> pour générer le fichier Tabletop Simulator.</p><textarea id="ysTxt" rows="8" readonly style="width:100%;font-size:12px">${esc(bYellow())}</textarea><div class="row" style="margin-top:6px"><button class="btn small" data-act="bCopy">📋 Copier</button><a class="btn small ghost" href="https://yellowscribe.link" target="_blank" rel="noopener">Ouvrir YellowScribe</a></div></div>`;
    h += `<div class="card"><button class="btn" data-act="bCreate" ${B.units.length ? '' : 'disabled'}>✅ Créer l'armée</button> <button class="btn small danger" data-act="bReset">Vider</button><p class="muted">Points calculés d'après le Munitorum Field Manual (selon la taille et le rang de l'unité) ; tu peux les forcer dans « Points ». Les améliorations et équipements ajoutent leur coût.</p></div>`;
    return h;
  }
  function bResults(f) {
    const terms = Wahap.norm(B.q).split(' ').filter(Boolean);
    const r = f.units.filter((d) => (!B.grp || bgrp(d) === B.grp) && terms.every((t) => Wahap.norm(d.name).includes(t) || Wahap.norm(d.en).includes(t))).slice(0, 60);
    return r.map((d) => `<div class="unit-item"><div><b>${esc(T0(d.name))}</b>${Wahap.isEn(d.name) ? ' <span class="tag">EN</span>' : ''}<div class="muted">${esc(bgrp(d))} · ${esc(d.role)}</div></div><button class="btn small" data-act="bAdd" data-val="${d.id}">＋</button></div>`).join('') || '<p class="muted">Aucune unité.</p>';
  }
  function bUnitCard(f, e, i) {
    const d = bdef1(f, e.id); if (!d) return '';
    const sizes = bSizes(d, bOrd(e)); const open = B.open === e.k, host = e.to && B.units.find((x) => x.k === e.to);
    let h = `<div class="card"><div class="row sp"><b>${esc(T0(d.name))}</b><span class="muted">${bCost(f, e)} pts</span></div>
      <div class="muted">${esc(bgrp(d))}${host ? ' · rejoint ' + esc(T0(bdef1(f, host.id).name)) : ''}${e.enh ? ' · ' + esc((bEnhs(f).find((x) => x.key === e.enh) || {}).name || '') : ''}</div>
      <div class="row" style="margin-top:6px"><div style="flex:1"><label>Figurines</label>${sizes.length ? `<select data-bu="${e.k}" data-bk="models">${sizes.map((z) => `<option value="${z[0]}" ${z[0] === +e.models ? 'selected' : ''}>${z[0]}</option>`).join('')}</select>` : `<input type="number" inputmode="numeric" data-bu="${e.k}" data-bk="models" value="${e.models}">`}</div><div style="flex:1"><label>Points${bAuto(f, e) ? ' (auto ' + bAuto(f, e) + ')' : ''}</label><input type="number" inputmode="numeric" data-bu="${e.k}" data-bk="pts" value="${e.pts || ''}" placeholder="${bAuto(f, e) || ''}"></div></div>
      <div class="row" style="margin-top:6px"><button class="btn small ghost" data-act="bOpen" data-val="${e.k}">${open ? 'Fermer' : '⚙️ Options'}</button><button class="btn small ghost" data-act="bDup" data-val="${e.k}">Dupliquer</button><button class="btn small danger" data-act="bDel" data-val="${e.k}">Retirer</button></div>`;
    if (open) {
      const hosts = (d.leads || []).length ? B.units.filter((x) => x.k !== e.k && d.leads.includes(x.id)) : [];
      if ((d.leads || []).length) h += `<label style="margin-top:8px">Rejoint (meneur / appui)</label><select data-bu="${e.k}" data-bk="to"><option value="">— aucune —</option>${hosts.map((x) => `<option value="${x.k}" ${x.k === e.to ? 'selected' : ''}>${esc(T0(bdef1(f, x.id).name))} #${B.units.indexOf(x) + 1}</option>`).join('')}</select>${hosts.length ? '' : '<div class="muted">Ajoute d\'abord une unité compatible : ' + d.leads.map((id) => { const u = bdef1(f, id); return u ? esc(T0(u.name)) : ''; }).filter(Boolean).slice(0, 6).join(', ') + '</div>'}`;
      if (canEnh(d)) { const used = new Set(B.units.filter((x) => x.k !== e.k).map((x) => x.enh)); h += `<label style="margin-top:8px">Amélioration</label><select data-bu="${e.k}" data-bk="enh"><option value="">— aucune —</option>${bEnhs(f).filter((x) => !used.has(x.key)).map((x) => `<option value="${esc(x.key)}" ${x.key === e.enh ? 'selected' : ''}>${esc(x.name)} (${x.cost} pts)</option>`).join('')}</select>${B.dets.length ? '' : '<div class="muted">Choisis un détachement pour voir ses améliorations.</div>'}`; }
      if (d.pc && d.pc.w.length) h += `<label style="margin-top:8px">Équipements payants (quantité)</label>${d.pc.w.map((w, j) => `<div class="row sp"><span>${wt(w[0])} <span class="muted">+${w[1]} pts</span></span><input type="number" inputmode="numeric" style="width:70px" data-bu="${e.k}" data-bg="${j}" value="${(e.wg || {})[j] || 0}"></div>`).join('')}`;
      if ((d.weapons || []).length) h += `<label style="margin-top:8px">Armes (décoche pour retirer)</label>${d.weapons.map((w, j) => `<label class="chk"><input type="checkbox" data-bu="${e.k}" data-bw="${j}" ${(e.woff || []).includes(j) ? '' : 'checked'}> ${wt(w.name)} <span class="muted">${esc(w.range)} · A${esc(w.A)} F${esc(w.S)} PA${esc(w.AP)} D${esc(w.D)}${w.ab ? ' · ' + esc(w.ab) : ''}</span></label>`).join('')}`;
      const abs = (d.abilities || []).map((a, j) => [a, j]).filter((x) => x[0].name);
      if (abs.length) h += `<label style="margin-top:8px">Aptitudes</label>${abs.map(([a, j]) => `<label class="chk"><input type="checkbox" data-bu="${e.k}" data-ba="${j}" ${(e.aoff || []).includes(j) ? '' : 'checked'}> ${wt(a.name)}${a.param ? ' ' + esc(a.param) : ''}</label>`).join('')}`;
      if (d.loadout) h += `<div class="muted" style="margin-top:6px">${wt(d.loadout)}</div>`;
    }
    return h + '</div>';
  }
  function bYellow() {
    const f = bfac(); if (!f) return ''; const ix = Wahap.index(); const en = (x) => (x && x.en) || (typeof x === 'string' ? x : '');
    const fname = (ix.factions.find((x) => x.id === B.fac) || {}).name || '';
    const dets = f.detachments.filter((d) => B.dets.includes(d.id)); const pts = B.units.reduce((s, e) => s + bCost(f, e), 0);
    const cap = (t) => String(t || '').toLowerCase().replace(/(^|[\s'’-])([a-zà-ÿ])/g, (m, a, b) => a + b.toUpperCase());
    const L = [`${B.name || 'Army list'} (${pts} points)`, '', fname, dets.map((d) => d.e || en(d.name)).join(' / '), '', ''];
    const sec = { Chefs: 'CHARACTERS', Appuis: 'SUPPORT', Troupes: 'BATTLELINE', 'Véhicules & monstres': 'OTHER DATASHEETS', Transports: 'DEDICATED TRANSPORTS' };
    BGRPS.forEach((g) => {
      const es = B.units.filter((e) => { const d = bdef1(f, e.id); return d && bgrp(d) === g; }); if (!es.length) return;
      L.push(sec[g], '');
      es.forEach((e) => {
        const d = bdef1(f, e.id), c = bCost(f, e); const hostE = e.to && B.units.find((x) => x.k === e.to);
        L.push(`${cap(d.en || en(d.name))} (${c} points)`);
        if (g === 'Chefs' && B.units.indexOf(e) === B.units.findIndex((x) => { const dd = bdef1(f, x.id); return dd && bgrp(dd) === 'Chefs'; })) L.push('  • Warlord');
        const enh = bEnhs(f).find((x) => x.key === e.enh); if (enh) L.push('  • Enhancements: ' + (enh.en || enh.name));
        if (hostE) L.push('  • Attached to: ' + cap(bdef1(f, hostE.id).en));
        const seen = new Set(); (d.weapons || []).forEach((w, j) => { if ((e.woff || []).includes(j)) return; const n = cap(String(w.e || en(w.name)).split(/ [-–] /)[0]); if (n && !seen.has(n)) { seen.add(n); L.push('  • ' + n); } });
        L.push('');
      });
    });
    return L.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }
  function bBuildArmy() {
    const f = bfac(); const ix = Wahap.index();
    const idmap = {}; const units = B.units.map((e) => {
      const d = bdef1(f, e.id); const d2 = Object.assign({}, d, { weapons: (d.weapons || []).filter((w, j) => !(e.woff || []).includes(j)), abilities: (d.abilities || []).filter((a, j) => !(e.aoff || []).includes(j)) });
      const u = Wahap.toApp(d2, uid); idmap[e.k] = u.id; u.pts = bCost(f, e); u.ptsNote = bWg(f, e) ? 'dont équipements ' + bWg(f, e) + ' pts' : ''; u.models = String(e.models || ''); u.section = bgrp(d); u.role = d.support ? 'support' : (d.leads || []).length ? 'leader' : '';
      const en = bEnhs(f).find((x) => x.key === e.enh);
      if (en) { u.enhancement = en.name; u.options = [en.name]; u.abilities.push({ name: 'Amélioration — ' + en.name, text: T0(en.text), phases: AlnPdf.phasesFromText(T0(en.text), en.name), en: Wahap.isEn(en.text) }); }
      return u;
    });
    B.units.forEach((e, i) => { if (e.to && idmap[e.to]) units[i].attachedTo = idmap[e.to]; });
    const fname = (ix.factions.find((x) => x.id === B.fac) || {}).name || '';
    const dets = f.detachments.filter((d) => B.dets.includes(d.id));
    const a = { id: uid(), name: B.name || (fname + ' — ' + (B.limit || 'liste') + ' pts'), faction: fname, detachments: dets.map((d) => T0(d.name) + ` (${d.dp} pt${+d.dp > 1 ? 's' : ''})`), alnUrl: '', total: { points: units.reduce((s, u) => s + u.pts, 0), models: units.reduce((s, u) => s + (+u.models || 0), 0), units: units.length }, units };
    S.armies.push(a); S.armyId = a.id; S.armyRules[a.id] = []; dets.forEach((d) => addDetTo(a, d));
    S.play.unitId = null; S.play.nModelsUnit = null; S.play.weaponIdx = 0; return a;
  }
  function addDetTo(a, d) {
    let n = 0; (d.strats || []).forEach((s) => {
      const p = splitWTE(Wahap.T(s.text)); const t = AlnPdf.stratTiming(p.when || Wahap.T(s.text));
      S.customStrats.push({ id: 'c_' + uid(), armyId: a.id, name: Wahap.T(s.name), detachment: Wahap.T(d.name), cp: +s.cp || 1, when: p.when, target: p.target, effect: p.effect, phases: t.phases, turn: t.turn, turns: t.turns }); n++;
    });
    (d.abilities || []).forEach((r) => { (S.armyRules[a.id] = S.armyRules[a.id] || []).push({ name: Wahap.T(r.name), phases: AlnPdf.phasesFromText(Wahap.T(r.text), Wahap.T(r.name)), text: Wahap.T(r.text) }); });
    return n;
  }

  function viewInfo() {
    const rel = (typeof APP_RELEASES !== 'undefined' && APP_RELEASES) || [];
    const last = rel[0];
    const ver = `<div class="card"><h2>Version ${esc(typeof APP_VERSION !== 'undefined' ? APP_VERSION : '?')}</h2>${last ? `<div class="muted">Notes de version · ${esc(last.date || '')}</div><ul class="fxlist">${last.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}${rel.length > 1 ? `<details><summary>Versions précédentes</summary>${rel.slice(1).map((r) => `<h3>${esc(r.v)} · ${esc(r.date || '')}</h3><ul class="fxlist">${r.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`).join('')}</details>` : ''}</div>`;
    return `<h1>Infos</h1>${ver}<div class="card"><h2>Sources des règles</h2>
      <p>Les règles de base (touche, blessure, sauvegarde, couvert −1 CT, relances, stratagèmes de base de la 11e édition) sont codées d'après les règles de base publiques et les guides de la communauté. Ce que l'appli ne peut pas deviner (datasheets, stratagèmes de ton détachement) vient de toi : saisis-le une fois, il reste sur ton téléphone.</p>
      <p class="muted">Les stratagèmes marqués « à vérifier » ont un coût ou un détail à confirmer dans l'appli officielle Warhammer 40,000. En cas de doute, la règle officielle prime.</p></div>
      <div class="card"><h2>Installer sur le téléphone</h2><p><b>Android (Chrome)</b> : menu ⋮ → « Installer l'application ».<br><b>iPhone (Safari)</b> : Partager → « Sur l'écran d'accueil ».</p><p class="muted">Après la première ouverture, l'appli fonctionne hors ligne.</p></div>
      <div class="card"><h2>Import depuis ALN</h2><p class="muted">Pour lire ta page ALN, l'appli essaie d'abord un accès direct ; si le navigateur le bloque (CORS), elle peut passer par un relais public après ton accord. Relais : <b>${S.relayOk ? 'autorisé' : 'non autorisé'}</b>.</p>${S.relayOk ? '<button class="btn small ghost" data-act="resetRelay">Retirer l\'autorisation</button>' : ''}</div>
      <div class="card"><h2>Données</h2><button class="btn danger" data-act="resetAll">Tout effacer</button></div>`;
  }

  /* ----- Accueil, hub des parties, écran de partie ----- */
  function viewHome() {
    const a = army(); const l = readGames();
    let h = `<div class="hero"><img src="icons/accueil.jpg" alt="Un eldar et un ork face a face autour d une table de jeu de figurines" width="477" height="441"></div><h1 style="text-align:center;margin:10px 0 2px">NoobHammer40k</h1><p class="muted" style="text-align:center;margin:0 0 14px">Ton aide-mémoire de table : dés à jeter, bonus, stratagèmes et cibles.</p>`;
    h += `<div class="card">`;
    if (!S.gameId && hasQuick()) h += `<div class="row sp" style="margin-bottom:10px"><div><div class="muted">Partie rapide en cours</div>Round ${S.round}</div><button class="btn" data-act="gameResume">Reprendre</button></div>`;
    if (S.gameId) h += `<div class="row sp" style="margin-bottom:10px"><div><div class="muted">Partie en cours</div><b>${esc(S.gameName)}</b> · Round ${S.round}</div><button class="btn" data-act="gameResume">Reprendre</button></div>`;
    h += `<div class="row"><button class="btn grow" data-act="tab" data-val="game">🎲 Parties${l.length ? ' (' + l.length + ')' : ''}</button><button class="btn ghost grow" data-act="tab" data-val="army">🛡️ Mon armée</button></div></div>`;
    h += `<div class="card"><h2>Comment ça marche</h2><ol class="steps"><li><b>Armée</b> : importe ta liste (PDF ou texte ALN).</li><li><b>Adverse</b> : importe celle de ton adversaire, ou joue en ligne pour la recevoir en direct.</li><li><b>Partie</b> : crée ou ouvre une partie, puis choisis ton unité, ton action et ta cible.</li></ol>
      <p class="muted">${a ? 'Bibliothèque : ' + libArmies().length + ' armée(s). Chaque partie utilise sa propre copie de l\'armée et son adversaire.' : 'Aucune armée importée pour le moment.'}</p></div>`;
    return h;
  }
  function viewHub() {
    const a = army();
    let h = `<h1>Parties</h1><div class="card"><h2>Nouvelle partie</h2>
      <label>Nom de la partie</label><input type="text" id="newGameName" placeholder="${esc(defaultGameName())}">
      <label style="margin-top:8px">Mon armée</label><select data-bind="armyId">${libArmies().map((x) => `<option value="${x.id}" ${x.id === S.armyId ? 'selected' : ''}>${esc(x.name)}</option>`).join('') || '<option value="">(aucune armée)</option>'}</select>
      ${S.enemy ? `<div class="note">Adversaire : <b>${esc(S.enemy.name)}</b>${S.enemy.live ? ' (en direct)' : ''} · ${S.enemy.units.length} unités.${S.enemy.live ? '' : ' <button class="btn small ghost" data-act="enemyDrop">Retirer</button>'}</div>` : '<details><summary>Ajouter l\'armée adverse (facultatif)</summary>' + enemyImportCard() + '</details><p class="muted">L\'armée adverse n\'est liée qu\'à cette partie. Tu pourras aussi l\'ajouter ensuite, ou jouer en ligne ci-dessous pour la recevoir.</p>'}
      <div class="row" style="margin-top:8px"><button class="btn" data-act="gameCreate">Créer la partie</button><button class="btn ghost" data-act="gameQuick">Partie rapide</button></div>
      ${a ? '' : '<div class="warn" style="margin-top:8px">Importe d\'abord une armée dans l\'onglet « Armée ».</div>'}</div>`;
    if (!S.gameId && hasQuick()) h = h.replace('<h2>Nouvelle partie</h2>', '<h2>Nouvelle partie</h2><div class="note">Une partie rapide non enregistrée est en cours (round ' + S.round + ') : <button class="btn small" data-act="gameResume">Continuer</button></div>');
    h += onlineCard() + gamesCard();
    return h;
  }
  function viewGame() {
    if (!S.inGame) return viewHub();
    const head = `<div class="row sp" style="margin-bottom:8px"><button class="btn small ghost" data-act="gameClose">← Parties</button><span class="muted" style="flex:1;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${S.gameId ? esc(S.gameName) : 'Partie rapide'}</span><button class="btn small" data-act="gameSave">💾</button></div>${S.gameId ? `<div class="chips" style="margin-bottom:8px">${tog('Sauvegarde automatique', 'autoGame')}</div>` : '<div class="muted" style="margin-bottom:8px">Partie rapide non enregistrée : appuie sur 💾 pour la nommer et la garder.</div>'}${S.ui.gameMsg ? `<div class="note">${esc(S.ui.gameMsg)}</div>` : ''}`;
    const online = `<details style="margin-bottom:10px"><summary>🌐 Partie en ligne${net.status === 'on' ? ' — connecté' : ''}</summary>${onlineCard()}</details>`;
    return head + viewPlay().replace('<h1>NoobHammer40k</h1>', '') .replace(/^/, online);
  }

  /* ---------- Actions ---------- */
  const actions = {
    tab(v) { S.tab = v; },
    set(v, el) { const val = v === 'true' ? true : v === 'false' ? false : isNaN(v) || v === '' ? v : +v; setPath(el.dataset.path, val); },
    setUi(v, el) { S.ui[el.dataset.path] = v; },
    toggle(v, el) { setPath(el.dataset.path, !getPath(el.dataset.path)); },
    step(v, el) { setPath(el.dataset.path, (+getPath(el.dataset.path) || 0) + +v); },
    toggleBs(id) { S.bs[id] = !S.bs[id]; },
    models(v, el) {
      if (liveEnemy(el.dataset.who)) return;
      const ar = el.dataset.who === 'enemy' ? S.enemy : army(); const u = ar && ar.units.find((x) => x.id === el.dataset.id); if (!u) return;
      const before = curModels(u); u.cur = clamp(before + +v, 0, maxModels(u));
      if (before === 0 && u.cur > 0) delete u.hp;
      if (u.cur === 0 && maxModels(u) === 1) u.hp = 0;
      if (el.dataset.who === 'enemy') syncTarget(); S.play.nModelsUnit = null;
    },
    hp(v, el) {
      if (liveEnemy(el.dataset.who)) return;
      const ar = el.dataset.who === 'enemy' ? S.enemy : army(); const u = ar && ar.units.find((x) => x.id === el.dataset.id); if (!u) return;
      u.hp = clamp(curHp(u) + +v, 0, parseInt(u.W, 10) || 1);
      u.cur = u.hp === 0 ? 0 : Math.max(1, curModels(u));
      if (el.dataset.who === 'enemy') syncTarget();
    },
    resetModels(v, el) {
      if (liveEnemy(el.dataset.who)) return;
      const ar = el.dataset.who === 'enemy' ? S.enemy : army(); if (!ar || !confirm('Rétablir l\'effectif complet de toutes les unités ?')) return;
      ar.units.forEach((u) => { delete u.cur; delete u.hp; }); S.play.nModelsUnit = null; syncTarget();
    },
    aim(id, el) { S.play.targetUnitId = id; syncTarget(); if (el && el.dataset.go) { S.tab = 'game'; S.inGame = true; } },
    removeEnemy() { if (!confirm('Retirer l\'armée adverse ?')) return; S.enemy = null; S.play.targetUnitId = null; },
    importEnemyList() {
      const r = Importer.parseList(document.getElementById('enemyText').value);
      if (!r.units.length) { S.ui.enemyMsg = 'Aucune unité reconnue. Il me faut des lignes du type « Boyz (10) : 90 pts ».'; return; }
      S.enemy = Object.assign(makeArmy(r, null), { rules: [], strats: [] }); S.play.targetUnitId = null;
      S.ui.enemyMsg = `Armée adverse importée : ${S.enemy.units.length} unité(s). Sans profils : ajoute un PDF ALN pour avoir armes et aptitudes.`;
    },
    gameCreate() {
      const a = army(); if (!a) { alert('Importe d\'abord une armée dans l\'onglet « Armée ».'); return; }
      const name = (document.getElementById('newGameName').value || '').trim() || defaultGameName();
      flushGameSave(); freshGame(); const g = { id: uid(), name, at: Date.now() }; S.park = null; attachGameArmy(g.id);
      S.gameId = g.id; S.gameName = name; S.inGame = true; S.tab = 'game'; S.ui = { gameMsg: `✓ Partie « ${name} » créée.` };
      g.state = snapshot(); const l = readGames(); l.unshift(g); writeGames(l);
    },
    gameQuick() { if (!army()) { alert('Importe d\'abord une armée dans l\'onglet « Armée ».'); return; } flushGameSave(); freshGame(); S.park = null; attachGameArmy('quick'); S.gameId = null; S.gameName = ''; S.inGame = true; S.tab = 'game'; S.ui = {}; },

    bDet(id) { const i = B.dets.indexOf(id); if (i >= 0) { B.dets.splice(i, 1); B.units.forEach((e) => { if (e.enh && e.enh.startsWith(id + '|')) e.enh = ''; }); } else B.dets.push(id); bsave(); },
    bGrp(v) { B.grp = v; bsave(); },
    bAdd(id) { const f = bfac(); const d = f && bdef1(f, id); if (!d) return; const k = uid(); B.units.push({ k, id, models: ((d.pc && d.pc.t.length && d.pc.t[0][1].length) ? d.pc.t[0][1][0][0] : 1), pts: 0, wg: {}, to: '', enh: '', woff: [], aoff: [] }); B.open = k; B.msg = ''; bsave(); },
    bOpen(k) { B.open = B.open === k ? null : k; },
    bDup(k) { const e = B.units.find((x) => x.k === k); if (!e) return; const c = JSON.parse(JSON.stringify(e)); c.k = uid(); c.enh = ''; c.to = ''; B.units.splice(B.units.indexOf(e) + 1, 0, c); bsave(); },
    bDel(k) { B.units = B.units.filter((x) => x.k !== k); B.units.forEach((x) => { if (x.to === k) x.to = ''; }); bsave(); },
    bCopy() { const t = bYellow(); const ta = document.getElementById('ysTxt'); const ok = () => { B.msg = 'Texte copié : colle-le dans YellowScribe.'; }; try { navigator.clipboard.writeText(t).then(() => { B.msg = 'Texte copié : colle-le dans YellowScribe.'; render(); }, () => { if (ta) { ta.select(); document.execCommand('copy'); } ok(); }); } catch (e) { if (ta) { ta.select(); document.execCommand('copy'); } ok(); } },
    bReset() { if (confirm('Vider la liste en cours ?')) { B.units = []; B.dets = []; B.open = null; bsave(); } },
    bCreate() { const a = bBuildArmy(); B.msg = ''; S.tab = 'army'; S.ui = Object.assign({}, S.ui, { importMsg: `Armée « ${a.name} » créée depuis la liste : ${a.units.length} unité(s), ${a.total.points} pts.` }); },
    gameResume() {
      if (S.park) { if (S.park.armyId && S.armies.some((x) => x.id === S.park.armyId)) S.armyId = S.park.armyId; if (S.park.enemy && !S.enemy) S.enemy = S.park.enemy; S.park = null; }
      else { const c = S.armies.find((x) => x.gameOf && (x.gameOf === S.gameId || (!S.gameId && x.gameOf === 'quick'))); if (c) S.armyId = c.id; }
      S.inGame = true; S.tab = 'game';
    },
    gameClose() {
      if (S.inGame) {
        flushGameSave();
        S.park = { armyId: S.armyId, enemy: S.enemy && !S.enemy.live ? S.enemy : null };
        if (S.park.enemy) { S.enemy = null; S.play.targetUnitId = null; }
        restoreLib();
      }
      S.inGame = false; S.ui.gameMsg = '';
    },
    enemyDrop() { if (S.enemy && !S.enemy.live && confirm('Retirer l\'armée adverse ?')) { S.enemy = null; S.play.targetUnitId = null; S.ui.enemyMsg = ''; } },
    netHost() {
      if (!S.net.nick.trim()) { S.net.nick = 'Joueur'; }
      if (S.enemy && !S.enemy.live && !confirm('Créer une partie en ligne ? Ton armée adverse locale sera remplacée par celle de ton adversaire.')) return;
      const code = newCode(); ensureGame('Partie en ligne ' + code); netStart('h', code);
    },
    netJoin() {
      const c = (document.getElementById('joinCode').value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (c.length < 4) { alert('Entre le code de la partie (5 caractères).'); return; }
      if (!S.net.nick.trim()) { S.net.nick = 'Joueur'; }
      if (S.enemy && !S.enemy.live && !confirm('Rejoindre une partie en ligne ? Ton armée adverse locale sera remplacée par celle de ton adversaire.')) return;
      ensureGame('Partie en ligne ' + c); netStart('g', c);
    },
    netResume() { netStart(S.net.role, S.net.code); },
    netLeave() { if (!confirm('Quitter la partie en ligne ? Ton adversaire ne verra plus tes mises à jour.')) return; netStop(false); S.net.code = ''; S.net.role = ''; },
    gameSave() {
      const l = readGames(); let g = l.find((x) => x.id === S.gameId);
      if (!g) { const name = prompt('Nom de la partie :', defaultGameName()); if (!name) return; g = { id: uid(), name }; l.unshift(g); S.gameId = g.id; S.gameName = name; }
      g.at = Date.now(); g.state = snapshot();
      if (!writeGames(l)) return; S.ui.gameMsg = `✓ Partie « ${g.name} » sauvegardée.`;
    },
    gameSaveAs() {
      const name = prompt('Nom de la nouvelle sauvegarde :', S.gameName || defaultGameName()); if (!name) return;
      const l = readGames(); const g = { id: uid(), name, at: Date.now(), state: snapshot() }; l.unshift(g);
      if (!writeGames(l)) return; S.gameId = g.id; S.gameName = name; S.ui.gameMsg = `✓ Enregistrée sous « ${name} ».`;
    },
    gameLoad(id) {
      const g = readGames().find((x) => x.id === id); if (!g) return;
      if (!confirm(`Ouvrir « ${g.name} » ? L'état en cours qui n'a pas été sauvegardé sera remplacé.`)) return;
      const old = S; flushGameSave();
      S = normalize(g.state);
      { /* bibliothèque conservée ; l'armée de la partie lui est propre */
        const gAr = S.armies.find((x) => x.id === S.armyId);
        if (gAr && !gAr.gameOf) { const keepId = gAr.id; const c = JSON.parse(JSON.stringify(gAr)); c.id = uid(); c.gameOf = g.id; c.fromId = keepId; S.armyRules[c.id] = S.armyRules[keepId] || []; S.customStrats.filter((s) => s.armyId === keepId).forEach((s) => S.customStrats.push(Object.assign({}, s, { id: 'c_' + uid(), armyId: c.id }))); S.armyId = c.id; S.armies.push(c); }
        const have = new Set(S.armies.map((x) => x.id)); const mine = S.armies.filter((x) => x.gameOf === g.id);
        const lib = old.armies.filter((x) => !x.gameOf); const libIds = new Set(lib.map((x) => x.id));
        S.armies.filter((x) => !x.gameOf && !libIds.has(x.id)).forEach((x) => lib.push(x));
        lib.forEach((x) => { if (!S.armyRules[x.id] && old.armyRules[x.id]) S.armyRules[x.id] = old.armyRules[x.id]; });
        const sIds = new Set(S.customStrats.map((s) => s.id)); old.customStrats.forEach((s) => { if (!sIds.has(s.id) && !(s.armyId && old.armies.some((x) => x.id === s.armyId && x.gameOf))) S.customStrats.push(s); });
        S.armies = lib.concat(mine); S.libId = old.libId || (lib[0] || {}).id || null; S.park = null; S.targets = old.targets || S.targets; void have;
      }
      S.gameId = g.id; S.gameName = g.name; S.net = Object.assign({}, S.net, { auto: false }); S.tab = 'game'; S.inGame = true; S.ui = { gameMsg: `Partie « ${g.name} » chargée.` };
    },
    gameDel(id) { const l = readGames(); const g = l.find((x) => x.id === id); if (!g || !confirm(`Supprimer la partie « ${g.name} » ?`)) return; writeGames(l.filter((x) => x.id !== id)); if (S.gameId === id) { S.gameId = null; S.gameName = ''; } },
    gameRename(id) { const l = readGames(); const g = l.find((x) => x.id === id); if (!g) return; const n = prompt('Nouveau nom :', g.name); if (!n) return; g.name = n; if (writeGames(l) && S.gameId === id) S.gameName = n; },
    gameExport(id) {
      const g = readGames().find((x) => x.id === id); if (!g) return;
      download('noobammer-partie-' + g.name.replace(/[^\w\-]+/g, '_').slice(0, 40) + '.json', JSON.stringify({ noobammerGame: 1, name: g.name, at: g.at, state: g.state }));
    },
    gameNew() {
      if (!confirm('Remettre la partie à zéro (round, PC, stratagèmes, effectifs, Battle-shock) ? Les armées sont conservées.')) return;
      freshGame();
    },
    toggleKw(k) { const a = S.play.target.kw; const i = a.indexOf(k); if (i >= 0) a.splice(i, 1); else a.push(k); },
    nextPhase() {
      const i = PHASES.findIndex((p) => p.id === S.phase);
      if (i < PHASES.length - 1) S.phase = PHASES[i + 1].id; else { S.phase = 'command'; if (S.mine) S.mine = false; else { S.mine = true; S.round += 1; } }
      S.play.sit = Object.assign({}, S.play.sit, { snap: false, charged: S.phase === 'fight' ? S.play.sit.charged : false });
    },
    saveTarget() { const name = prompt('Nom de la cible (ex. Marines, Rhino, Garde) :'); if (name) S.targets.push(Object.assign({ name }, JSON.parse(JSON.stringify(S.play.target)))); },
    loadTarget(i) { const { name, ...t } = S.targets[i]; S.play.target = Object.assign(S.play.target, JSON.parse(JSON.stringify(t))); },
    useStrat(id) {
      const s = allStrats().find((x) => x.id === id); if (!s) return;
      const u = unit(); const k = stratKey(); (S.used[k] = S.used[k] || []).push({ strat: id, name: s.name, unitId: u ? u.id : null });
      if (s.once || id === 'insane_bravery') S.once.push(id);
      S.cp = Math.max(0, S.cp - s.cp);
    },
    fxToggle(v, el) { S.play.fx[el.dataset.key] = v === '1'; },
    fxStrat(id) {
      const s = allStrats().find((x) => x.id === id); const u = unit(); if (!s || !u) return;
      const k = stratKey(); const used = S.used[k] || []; const mine = used.find((x) => x.strat === id && x.unitId === u.id);
      if (mine) { S.used[k] = used.filter((x) => x !== mine); S.cp += s.cp; S.once = S.once.filter((x) => x !== id); return; }
      if (S.bs[u.id]) { alert('Unité en Battle-shock : elle ne peut pas être ciblée par un stratagème.'); return; }
      if (used.find((x) => x.strat === id)) { alert('Ce stratagème a déjà été joué cette phase.'); return; }
      if (S.once.includes(id)) { alert('Ce stratagème est limité à une fois par bataille et a déjà été utilisé.'); return; }
      if (used.find((x) => x.unitId === u.id)) { alert('Cette unité a déjà bénéficié d\'un stratagème cette phase (un seul par unité et par phase).'); return; }
      if (S.cp < s.cp && !confirm(`Il te reste ${S.cp} PC pour un stratagème à ${s.cp} PC. Continuer quand même ?`)) return;
      actions.useStrat(id);
    },
    toggleNewPhase(p) { const a = S.ui.newStrat.phases; const i = a.indexOf(p); if (i >= 0) a.splice(i, 1); else a.push(p); },
    addStrat() {
      const n = S.ui.newStrat; if (!n.name.trim()) { alert('Donne un nom au stratagème.'); return; }
      S.customStrats.push({ id: 'c_' + uid(), name: n.name.trim(), cp: +n.cp || 1, phases: n.phases.length ? n.phases : ['shoot'], turn: n.turn, when: n.when, effect: n.effect });
      S.ui.newStrat = null;
    },
    delStrat(id) { if (confirm('Supprimer ce stratagème ?')) S.customStrats = S.customStrats.filter((s) => s.id !== id); },
    newArmy() { const name = prompt('Nom de l\'armée :', 'Mon armée'); if (!name) return; const a = { id: uid(), name, units: [] }; S.armies.push(a); S.armyId = a.id; },
    renameArmy() { const a = army(); const n = prompt('Nouveau nom :', a.name); if (n) a.name = n; },
    delArmy() { if (!confirm('Supprimer cette armée ?')) return; S.customStrats = S.customStrats.filter((x) => x.armyId !== S.armyId); delete S.armyRules[S.armyId]; S.armies = S.armies.filter((x) => x.id !== S.armyId); S.armyId = libArmies()[0] ? libArmies()[0].id : null; },
    addUnit() { const a = army(); const u = { id: uid(), name: 'Nouvelle unité', weapons: [], abilities: [] }; a.units.push(u); S.editUnit = u.id; },
    editUnit(id) { S.editUnit = id; },
    cancelUnit() { S.editUnit = null; },
    delUnit() { if (!confirm('Supprimer cette unité ?')) return; const a = army(); a.units = a.units.filter((u) => u.id !== S.editUnit); S.editUnit = null; },
    dupUnit() { const a = army(); const u = a.units.find((x) => x.id === S.editUnit); const c = JSON.parse(JSON.stringify(u)); c.id = uid(); c.name += ' (copie)'; a.units.push(c); S.editUnit = c.id; },
    saveUnit() {
      const a = army(); const u = a.units.find((x) => x.id === S.editUnit); const g = (id) => document.getElementById(id).value;
      const w = parseWeapons(g('u_weapons'));
      if (w.errors.length) { alert(w.errors.join('\n')); return; }
      Object.assign(u, { name: g('u_name') || 'Unité', T: g('u_T'), sv: g('u_sv'), inv: g('u_inv'), fnp: g('u_fnp'), W: g('u_W'), models: g('u_models'), weapons: w.out, abilities: parseAbilities(g('u_abilities')) });
      if (u.models) S.play.nModels = Math.max(1, +u.models || 1);
      S.editUnit = null;
    },
    importList() {
      const r = Importer.parseList(document.getElementById('importText').value);
      if (!r.units.length) { S.ui.importMsg = 'Aucune unité reconnue. Il me faut des lignes du type « Escouade Aggressor (6) : 180 pts ».'; return; }
      const a = makeArmy(r, null);
      S.armies.push(a); S.armyId = a.id; S.play.unitId = a.units[0].id; S.play.nModelsUnit = null;
      S.ui.importMsg = `Armée « ${a.name} » créée : ${a.units.length} unité(s), ${a.detachments.length} détachement(s)${r.total ? ', ' + r.total.points + ' pts' : ''}.`;
      S.ui.profMsg = '';
      if (a.alnUrl) runFetch(true);
    },
    fetchProfiles() { runFetch(false); },
    parsePage() { S.ui.profMsg = ''; const t = document.getElementById('alnPage').value; if (!t.trim()) { S.ui.profMsg = 'Colle d\'abord le contenu de la page.'; return; } applyPage(t); },
    resetRelay() { S.relayOk = false; },
    copyJson() { const el = document.getElementById('jsonBox'); if (navigator.clipboard) navigator.clipboard.writeText(el.value); else { el.select(); document.execCommand('copy'); } },
    importJson() {
      try {
        const d = JSON.parse(document.getElementById('jsonBox').value); const a = d.army; if (!a || !Array.isArray(a.units)) throw new Error('format');
        a.id = uid(); a.units.forEach((u) => { u.id = uid(); }); S.armies.push(a); S.armyId = a.id; S.armyRules[a.id] = d.rules || [];
      } catch (e) { alert('JSON invalide.'); }
    },
    resetAll() { if (confirm('Effacer toutes les données de l\'appli ?')) { S = defaults(); } },
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
    const fn = actions[el.dataset.act]; if (!fn) return;
    fn(el.dataset.val, el); render();
  });
  document.addEventListener('input', (e) => { if (e.target.id === 'bq') { B.q = e.target.value; const r = document.getElementById('bres'); const f = bfac(); if (r && f) r.innerHTML = bResults(f); } });
  document.addEventListener('change', (e) => {
    const t0 = e.target, ds = t0.dataset || {};
    if (ds.bf) { const v = t0.value; if (ds.bf === 'fac') { B.fac = v; B.dets = []; B.units = []; B.open = null; } else if (ds.bf === 'fmt') { B.fmt = v; if (+v) B.limit = +v; } else if (ds.bf === 'limit') B.limit = +v || 0; else B.name = v; bsave(); render(); return; }
    if (ds.bu) { const en = B.units.find((x) => x.k === ds.bu); if (en) { if (ds.bw != null) { const j = +ds.bw; en.woff = (en.woff || []).filter((x) => x !== j); if (!t0.checked) en.woff.push(j); } else if (ds.bg != null) { en.wg = en.wg || {}; en.wg[ds.bg] = Math.max(0, +t0.value || 0); } else if (ds.ba != null) { const j = +ds.ba; en.aoff = (en.aoff || []).filter((x) => x !== j); if (!t0.checked) en.aoff.push(j); } else en[ds.bk] = ['models', 'pts'].includes(ds.bk) ? Math.max(0, +t0.value || 0) : t0.value; bsave(); render(); } return; }
    const el = e.target;
    if ((el.id === 'pdfNew' || el.id === 'pdfEnrich') && el.files && el.files[0]) { const f = el.files[0]; el.value = ''; importPdfFile(f, el.id === 'pdfNew' ? 'new' : 'enrich'); return; }
    if (el.id === 'pdfEnemy' && el.files && el.files[0]) { const f = el.files[0]; el.value = ''; importEnemyPdf(f); return; }
    if (el.id === 'gameFile' && el.files && el.files[0]) {
      const fr = new FileReader();
      fr.onload = () => {
        try {
          const d = JSON.parse(String(fr.result)); const st = d.state || d; if (!st || !Array.isArray(st.armies)) throw new Error('format');
          const l = readGames(); const g = { id: uid(), name: d.name || 'Partie importée', at: Date.now(), state: st }; l.unshift(g);
          if (writeGames(l)) S.ui.gameMsg = `✓ Partie « ${g.name} » importée. Appuie sur « Charger » pour la reprendre.`;
        } catch (x) { S.ui.gameMsg = 'Fichier de partie invalide.'; }
        render();
      };
      fr.readAsText(el.files[0]); return;
    }
    if (el.dataset.attach) {
      if (liveEnemy(el.dataset.who)) return;
      const ar = el.dataset.who === 'enemy' ? S.enemy : army(); const l = ar && ar.units.find((x) => x.id === el.dataset.attach);
      if (l) { if (el.value) l.attachedTo = el.value; else delete l.attachedTo; S.play.nModelsUnit = null; S.play.weaponIdx = 0; if (el.dataset.who === 'enemy') syncTarget(); }
      render(); return;
    }
    if (el.id === 'alnFile' && el.files && el.files[0]) { const fr = new FileReader(); fr.onload = () => { applyPage(String(fr.result)); render(); }; fr.readAsText(el.files[0]); return; }
    if (el.dataset.bindRules) { S.armyRules[S.armyId] = parseAbilities(el.value); save(); return; }
    const path = el.dataset.bind; if (!path) return;
    let v = el.value;
    if (el.dataset.type === 'number') v = v === '' ? 0 : +v;
    if (path === 'armyId' && !S.inGame) S.libId = v;
    if (path === 'play.unitId') { S.play.weaponIdx = 0; S.play.nModelsUnit = null; }
    setPath(path, v);
    if (path === 'net.nick' || path.startsWith('ui.')) { save(); return; }
    if (path === 'play.targetUnitId') { if (!v) S.play.targetUnitId = null; syncTarget(); }
    if (path === 'play.weaponIdx') { const ub = unit(); const ew = ub && eff(army(), ub).weapons[v]; if (ew) S.play.nModels = ew.fromId ? 1 : Math.max(1, curModels(ub)); }
    render();
  });

  document.addEventListener('focusout', () => { if (net.dirty) { net.dirty = false; setTimeout(() => { if (!/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) render(); }, 50); } });
  if (S.net.auto && S.net.code) setTimeout(() => netStart(S.net.role, S.net.code), 400);
  /* ---------- Mise à jour automatique ---------- */
  function updateBanner(reg) {
    if (document.getElementById('updBar')) return;
    const d = document.createElement('div'); d.id = 'updBar'; d.className = 'updbar';
    d.innerHTML = '<span>🔄 Nouvelle version disponible</span><button id="updGo">Mettre à jour</button><button id="updLater" class="ghost" aria-label="Plus tard">✕</button>';
    document.body.appendChild(d);
    document.getElementById('updLater').onclick = () => d.remove();
    document.getElementById('updGo').onclick = () => { d.querySelector('span').textContent = 'Mise à jour…'; if (reg.waiting) reg.waiting.postMessage('SKIP_WAITING'); else location.reload(); };
  }
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      const watch = (w) => w && w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) updateBanner(reg); });
      if (reg.waiting && navigator.serviceWorker.controller) updateBanner(reg);
      reg.addEventListener('updatefound', () => watch(reg.installing));
      const check = () => reg.update().catch(() => {});
      setInterval(check, 30 * 60 * 1000);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloading) return; reloading = true; location.reload(); });
    }).catch(() => {});
  }
  render();
})();
