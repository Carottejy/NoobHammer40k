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
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* stockage plein/bloqué */ } scheduleGameSave(); netPush(); syncSoon(); };
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
    if (!['home', 'game', 'army', 'build', 'assist', 'db', 'enemy', 'strats', 'rules', 'info'].includes(S.tab)) S.tab = 'home';
    const a = army();
    if (a && ['army', 'game', 'strats'].includes(S.tab)) frAuto(a);
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
    const tabs = [['home', '🏠', 'Accueil' + (frOn() && (FR.invites.length + FR.incoming.length) ? ' (' + (FR.invites.length + FR.incoming.length) + ')' : '')], ['army', '🛡️', 'Armées'], ['game', '🎲', 'Parties']].concat(S.inGame ? [['enemy', '⚔️', 'Adverse']] : []).concat([['build', '🛠️', 'Creator'], ['assist', '🧭', 'Assistant'], ['db', '📚', 'Datasheets']]).concat(S.inGame ? [['strats', '📜', 'Stratagèmes']] : []).concat([['rules', '📖', 'Règles'], ['info', 'ℹ️', 'Infos']]);
    $tabs.innerHTML = tabs.map(([id, ic, lb]) => `<button class="${S.tab === id ? 'on' : ''}" data-act="tab" data-val="${id}"><span>${ic}</span>${lb}</button>`).join('');
    $app.innerHTML = { home: viewHome, game: viewGame, army: viewArmy, enemy: viewEnemy, strats: viewStrats, build: viewBuild, assist: viewAssist, db: viewDb, rules: viewRules, info: viewInfo }[S.tab]();
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
      return h + `<div class="card"><h2>Aucune unité</h2><p class="muted">Crée ton armée dans l'onglet « Creator » (ajoute tes unités à la main ou colle ta liste ALN pour pré-créer les unités).</p><button class="btn" data-act="tab" data-val="army">Aller à l'armée</button></div>` + stratPanel(null);
    }
    const ub = unit(); const u = eff(a, ub);
    const label = (x) => { const e = eff(a, x); return (alive(x) ? '' : '☠ ') + esc(x.name) + (e.leaders.length ? ' (+ ' + e.leaders.map((l) => esc(l.name)).join(', ') + ')' : '') + (alive(x) ? '' : ' — détruite'); };
    h += `<div class="card"><label>Unité</label><select data-bind="play.unitId">${topUnits(a).map((x) => `<option value="${x.id}" class="${alive(x) ? '' : 'dead'}" ${alive(x) ? '' : 'style="color:#888"'} ${x.id === ub.id ? 'selected' : ''}>${label(x)}</option>`).join('')}</select>
      ${unitStatLine(u)}<div style="margin-top:8px">${modelsCtl('mine', ub, 'Figurines')}${u.leaders.map((l) => modelsCtl('mine', l, (roleOf(l) === 'support' ? 'Appui' : 'Meneur') + ' — ' + l.name)).join('')}</div>
      ${u.leaders.length ? `<div class="muted">Unité attachée : les armes, aptitudes et mots-clés de ${u.leaders.map((l) => esc(l.name)).join(', ')} sont pris en compte.</div>` : ''}
      <div class="chips" style="margin-top:8px">${chip('⚠️ En Choc de Bataille', S.bs[ub.id], `data-act="toggleBs" data-val="${ub.id}"`)}</div></div>
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
    let list = allStrats().filter((s) => s.phases.includes(S.phase) && (stratTurn(s) === 'either' || (S.mine ? stratTurn(s) === 'mine' : stratTurn(s) === 'opp')));
    const used = (S.used[stratKey()] || []);
    let h = `<div class="card"><h2>Stratagèmes possibles maintenant</h2><p class="muted">${S.mine ? 'Ton tour' : 'Tour adverse'} · ${phaseLabel(S.phase)} · PC : ${S.cp}. Une unité ne peut bénéficier que d'<b>un</b> stratagème par phase, et un stratagème ne peut être joué qu'une fois par phase.</p>`;
    if (!list.length) return h + '<p class="muted">Aucun stratagème de base à cette phase. Ajoute les stratagèmes de ton détachement dans l\'onglet « Stratagèmes ».</p></div>';
    const okKw = (s) => !u || !s.target || Kw.ok(s.target, u, 'strat');
    const bad = list.filter((s) => !okKw(s)); const showBad = !!S.ui.showKwNo;
    list = list.filter((s) => okKw(s) || showBad); list.sort((a, b) => (okKw(b) ? 1 : 0) - (okKw(a) ? 1 : 0));
    if (u && bad.length) h += `<div class="chips" style="margin-bottom:8px">${chip((showBad ? 'Masquer' : 'Afficher') + ' les ' + bad.length + ' stratagème(s) non compatibles avec les mots-clés de ' + esc(u.name), showBad, 'data-act="setUi" data-path="showKwNo" data-val="' + (showBad ? '' : '1') + '"')}</div>`;
    h += list.map((s) => stratCard(s, u, used, okKw(s))).join('');
    return h + '</div>';
  }
  function stratCard(s, u, used, kwOk) {
    const onceDone = (s.once || s.id === 'insane_bravery') && S.once.includes(s.id);
    const doneNow = used.find((x) => x.strat === s.id);
    const mine = !!(doneNow && u && doneNow.unitId === u.id);
    const unitHas = u && used.find((x) => x.unitId === u.id && x.strat !== s.id);
    let status = '';
    if (mine) status = '<div class="note">✓ Utilisé sur cette unité : son effet est pris en compte dans le calcul.</div>';
    else if (onceDone) status = '<div class="warn">Déjà utilisé cette bataille (une fois par bataille).</div>';
    else if (doneNow) status = '<div class="warn">Déjà joué cette phase : impossible de le rejouer.</div>';
    else if (u && S.bs[u.id]) status = '<div class="warn">Unité en Choc de Bataille : elle ne peut pas être ciblée par un stratagème.</div>';
    else if (unitHas) status = `<div class="warn">Cette unité a déjà bénéficié de « ${esc(unitHas.name)} » : un seul stratagème par unité et par phase.</div>`;
    if (kwOk === false && !mine) status += '<div class="warn">Mots-clés : cette unité ne correspond pas à la cible du stratagème (« ' + esc(s.target) + ' »).</div>';
    const disabled = !mine && (onceDone || doneNow || (u && S.bs[u.id]));
    const calc = Effects.parseText(s.effect || '', { condText: (s.when || '') + ' ' + (s.target || '') }).filter((x) => x.side !== 'def').map((x) => Effects.summarize(x.mods).join(', ')).filter(Boolean);
    return `<div class="strat ${disabled || kwOk === false ? 'used' : ''}"><div class="row sp"><span class="nm">${esc(s.name)}</span><span><span class="cp">${s.cp} PC</span> ${s.verify ? '<span class="tag verify">à vérifier</span>' : ''}</span></div>
      ${s.detachment ? `<div class="muted">${esc(s.detachment)}</div>` : ''}<div class="muted"><b>Quand :</b> ${esc(s.when || '—')}</div>${s.target ? `<div class="muted"><b>Cible :</b> ${esc(s.target)}</div>` : ''}<div><b>Effet :</b> ${esc(s.effect || '—')}</div>${calc.length ? `<div class="muted">⚙️ Pris en compte dans le calcul : ${esc(calc.join(' | '))}</div>` : ''}${s.tip ? `<div class="muted">💡 ${esc(s.tip)}</div>` : ''}${status}
      <div class="row" style="margin-top:8px"><button class="btn small ${mine ? 'ghost' : ''}" data-act="fxStrat" data-val="${esc(s.id)}" ${disabled ? 'disabled' : ''}>${mine ? 'Annuler (+' + s.cp + ' PC)' : 'Utiliser (−' + s.cp + ' PC)'}</button></div></div>`;
  }

  function viewStrats() {
    const f = S.ui.stratPhase || 'all';
    const ar = army(); const onlyKw = !!S.ui.stratKw && !!ar;
    let list = allStrats().filter((s) => (f === 'all' || s.phases.includes(f)) && (!onlyKw || !s.target || ar.units.some((u) => Kw.ok(s.target, u, 'strat'))));
    let h = `<h1>Stratagèmes</h1>${ar ? `<div class="chips" style="margin-bottom:8px">${chip('Seulement ceux dont la cible correspond aux mots-clés de mon armée', onlyKw, 'data-act="setUi" data-path="stratKw" data-val="' + (onlyKw ? '' : '1') + '"')}</div>` : ''}<div class="chips" style="margin-bottom:10px">${chip('Tous', f === 'all', 'data-act="setUi" data-path="stratPhase" data-val="all"')}${PHASES.map((p) => chip(p.label, f === p.id, `data-act="setUi" data-path="stratPhase" data-val="${p.id}"`)).join('')}</div>`;
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
    let h = `<div class="unit-item col${alive(u) ? '' : ' dead'}"><div class="row sp"><div><b>${alive(u) ? '' : '☠ '}${u.warlord ? '👑 ' : ''}${esc(u.name)}</b>${alive(u) ? '' : ' <span class="tag">détruite</span>'}<div class="muted">${u.pts ? esc(u.pts) + ' pts' + (u.ptsNote ? ' (' + esc(u.ptsNote) + ')' : '') + ' · ' : ''}${role ? (role === 'support' ? 'Appui' : 'Meneur') + ' · ' : ''}${u.hasProfile || (u.weapons || []).length ? '✅ ' + (u.weapons || []).length + ' arme(s)' : '⚠️ sans profil'}${u.T ? ' · E' + esc(u.T) + ' Sv' + esc(u.sv) : ''}</div></div>${who === 'mine' ? `<button class="btn small ghost" data-act="editUnit" data-val="${u.id}">Éditer</button>` : ''}</div>`;
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
    let h = `<div class="card"><h2>${S.inGame ? 'Partie en ligne' : 'Rejoindre une partie'}</h2>`;
    if (location.protocol === 'file:') h += `<div class="warn">Tu as ouvert l'appli depuis un fichier : la partie en ligne a besoin que l'appli soit hébergée en HTTPS (voir le guide HEBERGER.md).</div>`;
    if (st === 'off') {
      h += `<p class="muted">Joue à deux : chacun voit la liste, les effectifs et les stratagèmes de l'autre, et le round / la phase / les PC se synchronisent. Il faut internet des deux côtés.</p>
        ${frInvitesHtml()}${txt('Ton pseudo', 'net.nick')}
        ${S.inGame ? '<div class="row" style="margin-top:10px"><button class="btn" data-act="netHost">Créer une partie en ligne</button></div><hr>' : ''}<label>Rejoindre une partie avec un code</label><div class="row"><input type="text" id="joinCode" maxlength="8" placeholder="Code (5 caractères)" style="flex:1;text-transform:uppercase" value=""><button class="btn" data-act="netJoin">Rejoindre</button></div>
        ${n.code ? `<hr><div class="row sp"><span class="muted">Dernière partie : code <b>${esc(n.code)}</b> (${n.role === 'h' ? 'créée par toi' : 'rejointe'})</span><button class="btn small ghost" data-act="netResume">Reprendre</button></div>` : ''}`;
    } else {
      h += `<div style="text-align:center;margin:8px 0"><div class="muted">Code de la partie</div><div style="font-size:2rem;font-weight:800;letter-spacing:.25em;color:var(--accent)">${esc(n.code)}</div></div>`;
      h += st === 'on' ? `<div class="note">🟢 Connecté${S.enemy && S.enemy.nick ? ' à <b>' + esc(S.enemy.nick) + '</b>' : ''}. Tes données et les siennes se synchronisent automatiquement.</div>`
        : st === 'wait' ? `<div class="note">🟠 En attente de l'adversaire : donne-lui ce code, il doit l'entrer dans « Rejoindre avec un code ».</div>`
        : st === 'err' ? '' : `<div class="note">🟠 Connexion en cours…</div>`;
      if (net.msg) h += `<div class="${st === 'err' ? 'warn' : 'note'}">${esc(net.msg)}</div>`;
      if (n.role === 'h' && st !== 'on') h += frInviteButtons();
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
      ${l.map((g) => `<div class="unit-item col"><div><b>${esc(g.name)}</b>${g.id === S.gameId ? ' <span class="tag">en cours</span>' : ''}<div class="muted">${fmtDate(g.at)} · Round ${g.state.round} · ${g.state.cp} PC · liste : ${esc(((g.state.armies || []).find((x) => x.id === g.state.armyId) || {}).name || '—')}${g.state.enemy ? ' vs ' + esc(g.state.enemy.name) : ''}</div></div>
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

  function armyBody(a) {
    let h = '';
    if (S.editUnit) return unitEditor(a);
    if (a.detachments && a.detachments.length) h += `<div class="card"><h2>Détachements</h2>${a.detachments.map((d) => `<div class="note">${esc(d)}</div>`).join('')}${a.total ? `<p class="muted">Total : ${a.total.points} pts${a.total.models ? ' · ' + a.total.models + ' figurines' : ''}${a.total.units ? ' · ' + a.total.units + ' unités' : ''}</p>` : ''}</div>`;
    h += `<div class="card"><div class="row sp"><h2 style="margin:0">Unités (${a.units.length})</h2><button class="btn small" data-act="addUnit">+ Unité</button></div>
      ${a.units.map((u) => unitRow('mine', a, u)).join('') || '<p class="muted">Aucune unité pour l\'instant.</p>'}
      ${a.units.length ? '<button class="btn small ghost" style="margin-top:8px" data-act="resetModels" data-who="mine">↺ Rétablir tous les effectifs</button>' : ''}</div>`;
    h += yellowCard(a);
    const rules = S.armyRules[a.id] || [];
    h += `<div class="card"><h2>Règles d'armée / détachement</h2><p class="muted">Une règle par ligne : <code>Nom | phases | texte</code> (phases : cmd, mvt, tir, charge, combat, def, all).</p>
      <textarea data-act-change="saveRules" data-bind-rules="1" placeholder="Oath of Moment | tir,combat | Relance les touches contre l'unité choisie">${esc(abilitiesToText(rules))}</textarea></div>`;
    return h;
  }
  /* Détail d'une armée de la bibliothèque : détachements, règles, unités repliées */
  function unitDetail(u) {
    const ws = u.weapons || [], ab = (u.abilities || []).filter((x) => x && x.name);
    const stat = [u.M && 'M ' + u.M, u.T && 'E ' + u.T, u.sv && 'Sv ' + u.sv + (u.inv ? ' (' + u.inv + '++)' : ''), u.W && 'PV ' + u.W, u.Ld && 'CD ' + u.Ld, u.OC && 'CO ' + u.OC, u.fnp && 'FNP ' + u.fnp + '+'].filter(Boolean).join(' · ');
    let h = `<details class="unit-item col"><summary style="display:flex;justify-content:space-between;gap:8px;cursor:pointer;color:inherit"><span><b>${u.warlord ? '👑 ' : ''}${esc(u.name)}</b>${u.enhancement ? ' <span class="tag">✦ ' + esc(u.enhancement) + '</span>' : ''}</span><span class="muted" style="white-space:nowrap">${u.models ? esc(u.models) + ' fig. · ' : ''}${u.pts ? esc(u.pts) + ' pts' : ''}</span></summary><div style="margin-top:6px">`;
    if (stat) h += `<div class="muted">${esc(stat)}</div>`;
    if ((u.keywords || []).length) h += `<div class="kws" style="margin-top:4px">${u.keywords.concat(u.factionKw || []).map((k) => `<span class="kw">${esc(k)}</span>`).join('')}</div>`;
    if (u.equipment || (u.options || []).length || u.ptsNote) h += `<div style="margin-top:6px"><b>Équipement et options</b>${u.equipment ? `<div class="muted">${esc(u.equipment)}</div>` : ''}${(u.options || []).length ? `<div class="muted">Options choisies : ${u.options.map(esc).join(' · ')}</div>` : ''}${u.ptsNote ? `<div class="muted">${esc(u.ptsNote)}</div>` : ''}</div>`;
    if (ws.length) h += `<div style="margin-top:6px"><b>Armes (${ws.length})</b><ul class="fxlist">${ws.map((w) => `<li>${wLine(w)}</li>`).join('')}</ul></div>`;
    if (ab.length) h += `<div style="margin-top:6px"><b>Aptitudes (${ab.length})</b>${ab.map((x) => `<details class="note"><summary><b>${esc(x.name)}</b></summary><div>${esc(x.text || '').replace(/\n/g, '<br>')}</div></details>`).join('')}</div>`;
    if (!stat && !ws.length && !ab.length) h += '<div class="muted">Aucun profil enregistré pour cette unité.</div>';
    return h + '</div></details>';
  }
  function armyDetail(a) {
    let h = '';
    h += `<div class="card"><h2>Détachements</h2>${(a.detachments || []).length ? a.detachments.map((d) => `<div class="note">${esc(d)}</div>`).join('') : '<p class="muted" style="margin:0">Aucun détachement.</p>'}${a.total ? `<p class="muted" style="margin-bottom:0">Total : ${a.total.points} pts${a.total.models ? ' · ' + a.total.models + ' figurines' : ''}${a.total.units ? ' · ' + a.total.units + ' unités' : ''}</p>` : ''}</div>`;
    const rules = (S.armyRules[a.id] || []).filter((r) => r && r.name);
    h += `<div class="card"><h2>Règles d'armée et de détachement</h2>${rules.length ? rules.map((r) => `<details class="note"><summary><b>${esc(r.name)}</b></summary><div>${esc(r.text || '').replace(/\n/g, '<br>')}</div></details>`).join('') : '<p class="muted" style="margin:0">Aucune règle enregistrée pour cette armée.</p>'}</div>`;
    h += `<div class="card"><h2>Unités (${a.units.length})</h2>${a.units.map(unitDetail).join('') || '<p class="muted">Aucune unité.</p>'}</div>`;
    h += yellowCard(a);
    return h;
  }
  function viewArmy() {
    const a = army();
    if (S.inGame) {
      const others = libArmies();
      let h = `<h1>Liste de la partie</h1><div class="card"><b>${esc(a ? a.name : '—')}</b>${a ? `<div class="muted">${esc(a.faction || '')}${a.chapter ? ' · ' + esc(a.chapter) : ''}${a.total ? ' · ' + a.total.points + ' pts' : ''}</div>` : ''}<p class="muted">C'est la liste associée à « ${esc(S.gameName || 'Partie rapide')} ». Les pertes et les effectifs sont propres à la partie : ta liste d'origine n'est jamais modifiée.</p>
        ${others.length ? `<label>Changer de liste</label><div class="row"><select id="gameList" style="flex:1">${others.map((x) => `<option value="${x.id}" ${x.id === S.libId ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select><button class="btn small" data-act="gameSetList">Appliquer</button></div><div class="muted">Remet les effectifs à zéro pour la nouvelle liste.</div>` : ''}
        <div class="row" style="margin-top:8px"><button class="btn small ghost" data-act="renameArmy">Renommer</button></div></div>`;
      return a ? h + armyBody(a) : h;
    }
    const lib = libArmies();
    let h = `<h1>Mes armées</h1>${S.ui.importMsg ? `<div class="note" style="white-space:pre-wrap">${esc(S.ui.importMsg)}</div>` : ''}<div class="row" style="margin-bottom:10px"><button class="btn grow" data-act="armyNew">🛠️ Nouvelle liste (Creator)</button></div>`;
    const imp = () => importCard(null) + `<div class="card"><h2>Importer un JSON</h2><p class="muted">Colle ici une armée exportée depuis NoobHammer40k (bouton « Copier » de Creator &gt; Modifier une armée).</p><textarea id="jsonBox"></textarea><div class="row" style="margin-top:8px"><button class="btn small" data-act="importJson">Importer ce JSON</button></div></div>`;
    if (!lib.length) return h + '<div class="card"><p class="muted">Aucune armée pour l\'instant : importe-la ci-dessous (PDF, texte ALN, BBCode, JSON) ou crée-la dans Creator.</p></div>' + imp();
    const open = S.ui.openArmy;
    h += lib.map((x) => {
      const on = x.id === S.armyId; const isOpen = x.id === open; const pts = x.total && x.total.points != null ? x.total.points : x.units.reduce((t, u) => t + (+u.pts || 0), 0);
      let c = `<div class="card army-card${on ? ' on' : ''}" style="margin-bottom:${isOpen ? 6 : 8}px"><div class="row sp" data-act="armyOpen" data-val="${x.id}" style="cursor:pointer;flex-wrap:nowrap"><div style="min-width:0"><b>${on ? '✅ ' : ''}${esc(x.name)}</b><div class="muted">${esc(x.faction || '')}${x.chapter ? ' · ' + esc(x.chapter) : ''} · ${pts} pts · ${x.units.length} unité(s)</div></div><span class="muted" style="font-size:1.1rem">${isOpen ? '▾' : '▸'}</span></div>`;
      if (isOpen) c += `<div class="row" style="margin-top:8px">${on ? '' : `<button class="btn small" data-act="armySel" data-val="${x.id}">Choisir</button>`}<button class="btn small ghost" data-act="armyEdit" data-val="${x.id}">✏️ Modifier</button><button class="btn small danger" data-act="armyDel" data-val="${x.id}">Supprimer</button></div>`;
      c += '</div>';
      if (isOpen) c += armyDetail(x);
      return c;
    }).join('');
    return h + imp();
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
  const ABT = { Datasheet: 'Fiche', Core: 'Règle de base', Faction: 'Faction', Wargear: 'Équipement', 'Wargear profile': "Profil d'équipement", Primarch: 'Primarque', Psychic: 'Psychique' };
  const abType = (t) => { t = String(t || ''); if (/^Special/.test(t)) return 'Spécial'; if (/^Fortification/.test(t)) return 'Fortification'; return ABT[t] || t; };
  const STT = { 'Battle Tactic': 'Tactique de bataille', 'Strategic Ploy': 'Ruse stratégique', 'Epic Deed': 'Haut fait', Requisition: 'Réquisition', Wargear: 'Équipement' };
  const stType = (t) => { const m = String(t || '').match(/(?:–|-)\s*(.+?)\s+Stratagem$/i); return m ? (STT[m[1]] || m[1]) + ' · stratagème' : 'Stratagème'; };
  const wt = (x) => (Wahap.isEn(x) ? esc(Wahap.T(x)) + ' <span class="tag">EN</span>' : esc(x || '').replace(/\n/g, '<br>'));
  function splitWTE(t) {
    const s = String(t || '').replace(/\r/g, ''); const rx = /(?:^|\n)\s*(WHEN|TARGET|EFFECT|RESTRICTIONS|QUAND|CIBLE|EFFET|RESTRICTIONS?)\s*:\s*/gi; const marks = []; let m;
    while ((m = rx.exec(s))) marks.push({ k: m[1].toLowerCase(), i: m.index, e: rx.lastIndex });
    const o = { when: '', target: '', effect: '' };
    marks.forEach((k, n) => { const v = s.slice(k.e, n + 1 < marks.length ? marks[n + 1].i : undefined).trim(); if (/when|quand/.test(k.k)) o.when = v; else if (/target|cible/.test(k.k)) o.target = v; else o.effect = (o.effect ? o.effect + ' ' : '') + (/restr/.test(k.k) ? 'Restrictions : ' : '') + v; });
    if (!marks.length) o.effect = s.trim();
    return o;
  }
  /* ----- Base Wahapedia ----- */
  const dbs = { fac: '', ch: '', kw: '', q: '', mode: 'units', unit: null, detFac: '', det: null, msg: '', err: '' };
  function viewDb() {
    let h = '<h1>Base de données</h1>';
    const ix = Wahap.index();
    if (!ix) {
      if (dbs.err) return h + `<div class="card"><div class="warn">${esc(dbs.err)}</div><button class="btn small" data-act="dbRetry">Réessayer</button></div>`;
      if (!dbs.loading) { dbs.loading = true; Wahap.ready().then(() => { dbs.loading = false; render(); }).catch((e) => { dbs.loading = false; dbs.err = e.message; render(); }); }
      return h + '<div class="card"><p class="muted">Chargement de la base…</p></div>';
    }
    const facOpts = ix.factions.map((f) => `<option value="${f.id}" ${f.id === (dbs.mode === 'det' ? dbs.detFac : dbs.fac) ? 'selected' : ''}>${esc(f.name)}</option>`).join('');
    h += `<div class="card"><p class="muted">Données Wahapedia (11e édition) : ${ix.units.length} fiches. Les textes encore non traduits sont repérés <span class="tag">EN</span>.</p>
      <div class="chips"><button class="chip ${dbs.mode === 'units' ? 'on' : ''}" data-act="dbMode" data-val="units">Unités</button><button class="chip ${dbs.mode === 'det' ? 'on' : ''}" data-act="dbMode" data-val="det">Détachements</button></div>
      <label style="margin-top:8px">Faction</label><select data-dbfac="1"><option value="">${dbs.mode === 'det' ? '— choisir —' : 'Toutes'}</option>${facOpts}</select>
      ${(dbs.mode === 'det' ? dbs.detFac : dbs.fac) && chList(dbs.mode === 'det' ? dbs.detFac : dbs.fac) ? `<label style="margin-top:8px">Chapitre</label><select data-dbch="1"><option value="">— tous les chapitres —</option><option value="codex" ${dbs.ch === 'codex' ? 'selected' : ''}>Chapitre générique (Codex)</option>${chList(dbs.mode === 'det' ? dbs.detFac : dbs.fac).map((c) => `<option value="${c[0]}" ${dbs.ch === c[0] ? 'selected' : ''}>${esc(c[1])}</option>`).join('')}</select>` : ''}
      ${dbs.mode === 'units' ? '<label style="margin-top:8px">Recherche (nom ou mot-clé)</label><input type="search" id="dbq" placeholder="Nom ou mot-clé (français ou anglais)…" value="' + esc(dbs.q) + '" autocomplete="off">' + dbKwSel() : ''}</div>`;
    if (dbs.msg) h += `<div class="note">${esc(dbs.msg)}</div>`;
    if (dbs.mode === 'det') return h + dbDetView();
    if (dbs.unit) return h + dbUnitView(dbs.unit);
    return h + `<div class="card" id="dbres">${dbResults()}</div>`;
  }
  function dbKwSel() {
    const f = dbs.fac && Wahap.cached(dbs.fac); if (!f) return '';
    const c = {}; f.units.filter((d) => chOkUnit(d, dbs.ch, dbs.fac)).forEach((d) => new Set(kwShow(d)).forEach((k) => { c[k] = (c[k] || 0) + 1; }));
    const o = Object.entries(c).filter(([k, n]) => n >= 2 && !/^(imperium|chaos|adeptus astartes)$/i.test(k)).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 80);
    return `<label style="margin-top:8px">Mot-clé</label><select data-dbkw="1"><option value="">— tous —</option>${o.map(([k, n]) => `<option value="${esc(k)}" ${dbs.kw === k ? 'selected' : ''}>${esc(k)} (${n})</option>`).join('')}</select>`;
  }
  function dbResults() {
    if (!dbs.q && !dbs.fac) return '<p class="muted">Choisis une faction ou tape un nom.</p>';
    let r;
    if (dbs.fac) {
      const f = Wahap.cached(dbs.fac);
      if (!f) { if (!dbs.facLoad) { dbs.facLoad = true; Wahap.faction(dbs.fac).then(() => { dbs.facLoad = false; render(); }).catch((e) => { dbs.facLoad = false; dbs.err = e.message; dbs.fac = ''; render(); }); } return '<p class="muted">Chargement de la faction…</p>'; }
      const terms = Wahap.norm(dbs.q).split(' ').filter(Boolean);
      r = f.units.filter((d) => chOkUnit(d, dbs.ch, dbs.fac) && (!dbs.kw || kwShow(d).includes(dbs.kw)) && terms.every((t) => Wahap.norm(d.name).includes(t) || Wahap.norm(d.en).includes(t) || Wahap.norm(d.role).includes(t) || kwShow(d).some((k) => Wahap.norm(k).includes(t)))).slice(0, 80).map((d) => ({ id: d.id, n: d.name, f: d.fac, r: d.role }));
    } else {
      const ix = Wahap.index();
      r = Wahap.search(dbs.q, '');
    }
    return (r.map((u) => `<div class="unit-item"><div><b>${esc(Wahap.T(u.n))}</b>${Wahap.isEn(u.n) ? ' <span class="tag">EN</span>' : ''}<div class="muted">${esc(Wahap.factionName(u.f))} · ${esc(u.r)}</div></div><button class="btn small" data-act="dbOpen" data-val="${u.id}">Ouvrir</button></div>`).join('') || '<p class="muted">Aucun résultat.</p>') + (r.length >= 80 ? '<p class="muted">Seuls les 80 premiers résultats sont affichés : affine la recherche.</p>' : '');
  }
  function dbUnitView(d) {
    const ix = Wahap.index(); const nameOf = (id) => { const e = ix.units.find((x) => x.id === id); return e ? Wahap.T(e.n) : id; };
    let h = `<div class="card"><div class="row sp"><h2 style="margin:0">${wt(d.name)}</h2><button class="btn small ghost" data-act="dbBack">← Liste</button></div><div class="muted">${esc(Wahap.factionName(d.fac))} · ${esc(d.role)}</div>`;
    h += (d.models || []).map((m) => `<div class="muted" style="margin-top:6px">${(d.models.length > 1 ? '<b>' + wt(m.name) + '</b> — ' : '')}M${esc(m.M)} · E${esc(m.T)} · Sv ${esc(m.Sv)}${m.inv ? '/' + esc(m.inv) + '++' : ''} · PV ${esc(m.W)} · CD ${esc(m.Ld)} · CO ${esc(m.OC)}</div>`).join('');
    h += `<div class="chips" style="margin-top:8px">${(d.kw || []).concat(d.fkw || []).map((k) => `<button class="chip" data-act="dbKw" data-val="${esc(Wahap.kwT(k))}" title="Voir les unités avec ce mot-clé">${esc(Wahap.kwT(k))}</button>`).join('')}</div><div class="muted">Touche un mot-clé pour lister les unités qui l'ont.</div>`;
    h += `<div class="row" style="margin-top:10px">${S.enemy ? '' : '<button class="btn small" data-act="dbTarget">🎯 Utiliser comme cible</button>'}${army() ? '<button class="btn small ghost" data-act="dbAdd">➕ Ajouter à mon armée</button>' : ''}</div></div>`;
    if ((d.weapons || []).length) h += `<div class="card"><h2>Armes</h2><ul class="fxlist">${d.weapons.map((w) => `<li>${wt(w.name)}${w.ab ? ' [' + esc(w.ab) + ']' : ''} — ${esc(w.range)} · A${esc(w.A)} · ${esc(w.skill)} · F${esc(w.S)} · PA${esc(w.AP)} · D${esc(w.D)}</li>`).join('')}</ul></div>`;
    if ((d.abilities || []).length) h += `<div class="card"><h2>Aptitudes</h2>${d.abilities.map((a) => `<details class="note"><summary><b>${wt(a.name) || esc(a.type)}</b>${a.param ? ' ' + esc(a.param) : ''} <span class="muted">${esc(abType(a.type))}</span></summary><div>${wt(a.text)}</div></details>`).join('')}</div>`;
    if (d.loadout) h += `<div class="card"><h2>Équipement</h2><div>${wt(d.loadout)}</div></div>`;
    if (d.pc) h += `<div class="card"><h2>Points</h2>${d.pc.t.slice().sort((a, b) => a[0] - b[0]).map((t) => `<div class="muted">${t[0] >= 9999 ? 'Unités suivantes' : 'Jusqu\'à la ' + t[0] + 'e unité'} : ${t[1].map((z) => z[0] + ' fig. = ' + z[1] + ' pts').join(' · ')}</div>`).join('')}${d.pc.w.length ? '<div class="muted">Équipements : ' + d.pc.w.map((w) => wt(w[0]) + ' +' + w[1]).join(' · ') + '</div>' : ''}</div>`;
    if ((d.leads || []).length) h += `<div class="card"><h2>Peut rejoindre</h2><div class="muted">${d.leads.map((i) => esc(nameOf(i))).join(' · ')}</div></div>`;
    if ((d.ledBy || []).length) h += `<div class="card"><h2>Meneurs possibles</h2><div class="muted">${d.ledBy.map((i) => esc(nameOf(i))).join(' · ')}</div></div>`;
    return h;
  }
  function dbDetView() {
    if (!dbs.detFac) return '';
    const f = Wahap.cached(dbs.detFac);
    if (!f) { Wahap.faction(dbs.detFac).then(() => render()).catch((e) => { dbs.err = e.message; dbs.detFac = ''; render(); }); return '<div class="card"><p class="muted">Chargement…</p></div>'; }
    if (dbs.det) {
      const d = f.detachments.find((x) => x.id === dbs.det); if (!d) { dbs.det = null; return ''; }
      let h = `<div class="card"><div class="row sp"><h2 style="margin:0">${wt(d.name)}</h2><button class="btn small ghost" data-act="dbBack">← Détachements</button></div><div class="muted">${esc(d.dp)} pt(s) de détachement</div>${army() && d.strats.length ? '<button class="btn small" style="margin-top:8px" data-act="dbAddStrats">➕ Ajouter ses stratagèmes à mon armée</button>' : ''}</div>`;
      if (d.abilities.length) h += `<div class="card"><h2>Règles</h2>${d.abilities.map((a) => `<details class="note" open><summary><b>${wt(a.name)}</b></summary><div>${wt(a.text)}</div></details>`).join('')}</div>`;
      if (d.enh.length) h += `<div class="card"><h2>Améliorations</h2>${d.enh.map((a) => `<details class="note"><summary><b>${wt(a.name)}</b> · ${esc(a.cost)} pts</summary><div>${wt(a.text)}</div></details>`).join('')}</div>`;
      if (d.strats.length) h += `<div class="card"><h2>Stratagèmes</h2>${d.strats.map((a) => `<details class="note"><summary><b>${wt(a.name)}</b> · ${esc(a.cp)} PC</summary><div class="muted">${esc(stType(a.type))}</div><div>${wt(a.text)}</div></details>`).join('')}</div>`;
      return h;
    }
    return `<div class="card"><h2>Détachements (${f.detachments.filter((d) => chOkDet(d, dbs.ch, dbs.detFac)).length})</h2>${f.detachments.filter((d) => chOkDet(d, dbs.ch, dbs.detFac)).map((d) => `<div class="unit-item"><div><b>${wt(d.name)}</b><div class="muted">${esc(d.dp)} pt(s) · ${d.strats.length} stratagèmes · ${d.enh.length} améliorations</div></div><button class="btn small" data-act="dbDet" data-val="${d.id}">Voir</button></div>`).join('')}</div>`;
  }

  /* ----- Création de liste (données Wahapedia) ----- */
  const BKEY = 'noobammer.build.v1';
  const FORMATS = [['500', 'Escarmouche (500)'], ['1000', 'Incursion (1000)'], ['2000', 'Force de frappe (2000)'], ['3000', 'Offensive (3000)'], ['0', 'Libre']];
  const bdef = () => ({ cm: 'build', editId: '', fac: '', ch: '', kw: '', allEnh: false, warlord: '', fold: {}, fmt: '1000', limit: 1000, name: '', dets: [], units: [], open: null, q: '', grp: '', msg: '' });
  const B = (() => { try { return Object.assign(bdef(), JSON.parse(localStorage.getItem(BKEY) || '{}')); } catch (e) { return bdef(); } })();
  B.fold = B.fold || {};
  const fh = (id, title, right) => `<div class="row sp fold" data-act="bFold" data-val="${id}" style="cursor:pointer"><h2 style="margin:0">${B.fold[id] ? '▸' : '▾'} ${title}</h2>${right || ''}</div>`;
  const bsave = () => { try { localStorage.setItem(BKEY, JSON.stringify(B)); } catch (e) { /* ignoré */ } };
  const bfac = () => (B.fac ? Wahap.cached(B.fac) : null);
  const bdef1 = (f, id) => f.units.find((x) => x.id === id);
  const kwOf = (d) => (d.kw || []).map((k) => Wahap.norm(k));
  const bgrp = (d) => { const k = kwOf(d), r = Wahap.norm(d.role); if (d.support) return 'Appuis'; if (k.includes('personnage') || k.includes('heros epique') || (d.leads || []).length) return 'Chefs'; if (/transport/.test(r)) return 'Transports'; if (/vehicule|marcheur|monstre|titanesque|aeronef|monte/.test(r)) return 'Véhicules & monstres'; return 'Troupes'; };
  /* Chapitres Space Marines : filtre les détachements et les unités selon le mot-clé de faction du chapitre */
  const CHAPTERS = { SM: [['Ultramarines', 'Ultramarines'], ['Dark Angels', 'Dark Angels (Anges Sombres)'], ['Blood Angels', 'Blood Angels (Anges Sanglants)'], ['Space Wolves', 'Space Wolves (Loups Spatiaux)'], ['Black Templars', 'Black Templars (Templiers Noirs)'], ['Deathwatch', 'Deathwatch'], ['Iron Hands', 'Iron Hands (Mains de Fer)'], ['Salamanders', 'Salamanders (Salamandres)'], ['Imperial Fists', 'Imperial Fists (Poings Impériaux)'], ['Raven Guard', 'Raven Guard (Garde du Corbeau)'], ['White Scars', 'White Scars (Cicatrices Blanches)']] };
  const DET_CHAPTER = { 'Black Spear Task Force': 'Deathwatch', 'Deathwatch Support': 'Deathwatch', 'Inner Circle Task Force': 'Dark Angels', 'Wrath of the Rock': 'Dark Angels', 'Darkflight Pursuit': 'Dark Angels', 'Angelic Inheritors': 'Blood Angels', 'Encarmine Speartip': 'Blood Angels', 'Wrath of the Doomed': 'Blood Angels', 'Champions of Fenris': 'Space Wolves', 'Saga of the Beastslayer': 'Space Wolves', 'Saga of the Great Wolf': 'Space Wolves', "Forgefather's Seekers": 'Salamanders', 'Spearpoint Task Force': 'White Scars', 'Ceramite Sentinels': 'Imperial Fists', 'Blade of Ultramar': 'Ultramarines', 'Shadowmark Talon': 'Raven Guard', "Marshal's Household": 'Black Templars', 'Vow-sworn Crusaders': 'Black Templars', 'Fist of the God-Emperor': 'Black Templars', "Medusa's Wrath": 'Iron Hands' };
  const chList = (fac) => CHAPTERS[fac || B.fac] || null;
  const chNames = (fac) => (chList(fac) || []).map((c) => c[0]);
  const chOfUnit = (d, fac) => (d.fkw || []).map(T0).find((k) => chNames(fac || d.fac || B.fac).includes(k)) || '';
  const chOfDet = (d) => DET_CHAPTER[d.e || T0(d.name)] || '';
  /* '' = tous les chapitres ; 'codex' = chapitre générique (ni unités ni détachements propres à un chapitre) */
  const chOkUnit = (d, ch, fac) => { ch = ch === undefined ? B.ch : ch; fac = fac || B.fac; if (!chList(fac) || !ch) return true; const c = chOfUnit(d, fac); return ch === 'codex' ? !c : (!c || c === ch); };
  const chOkDet = (d, ch, fac) => { ch = ch === undefined ? B.ch : ch; fac = fac || B.fac; if (!chList(fac) || !ch) return true; const c = chOfDet(d); return ch === 'codex' ? !c : (!c || c === ch); };
  const chLabel = () => { const c = (chList() || []).find((x) => x[0] === B.ch); return B.ch === 'codex' ? 'Chapitre générique' : c ? c[1] : ''; };
  const kwShow = (d) => (d.kw || []).concat(d.fkw || []).map((k) => Wahap.kwT(k));
  const BGRPS = ['Chefs', 'Appuis', 'Troupes', 'Véhicules & monstres', 'Transports'];
  const canEnh = (d) => { const k = kwOf(d); return k.includes('personnage') && !k.includes('heros epique'); };
  const enhOk = (en, d) => Kw.ok(T0(en.text), Object.assign({}, d, { chapter: B.ch && B.ch !== 'codex' ? B.ch : '' }), 'enh');
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
  function creatorTabs() {
    return `<h1>Creator</h1><div class="seg">${[['build', '🛠️ Nouvelle liste'], ['edit', '✏️ Modifier une armée']].map(([k, l]) => `<button class="${(B.cm === 'edit' ? 'edit' : 'build') === k ? 'on' : ''}" data-act="bCm" data-val="${k}">${l}</button>`).join('')}</div>`;
  }
  function viewBuild() {
    const head = creatorTabs();
    if (B.cm === 'edit') {
      const lib = libArmies(); const a = army();
      let h = head + `<div class="card"><label>Armée à modifier</label><select data-bind="armyId">${lib.map((x) => `<option value="${x.id}" ${x.id === S.armyId ? 'selected' : ''}>${esc(x.name)}</option>`).join('') || '<option value="">(aucune)</option>'}</select>`;
      if (a) h += `<div class="row" style="margin-top:8px">${a.build ? '<button class="btn small" data-act="bReopen">🛠️ Rouvrir dans le constructeur</button>' : ''}<button class="btn small ghost" data-act="renameArmy">Renommer</button><button class="btn small danger" data-act="delArmy">Supprimer</button></div>${a.build ? '' : '<p class="muted">Cette armée a été importée : tu peux modifier ses unités et ses règles ci-dessous.</p>'}`;
      h += '</div>';
      if (!a) return h + '<p class="muted">Aucune armée à modifier : construis une liste ou importe-en une.</p>';
      if (S.ui.importMsg) h += `<div class="note" style="white-space:pre-wrap">${esc(S.ui.importMsg)}</div>`;
      h += armyBody(a);
      if (!S.editUnit) h += profilesCard(a) + `<div class="card"><h2>Sauvegarde / partage (JSON)</h2><textarea id="jsonBox">${esc(JSON.stringify({ army: a, rules: S.armyRules[a.id] || [] }, null, 1))}</textarea><div class="row" style="margin-top:8px"><button class="btn small ghost" data-act="copyJson">Copier</button></div></div>`;
      return h;
    }
    let h = head;
    if (B.editId) { const ea = S.armies.find((x) => x.id === B.editId); h += ea ? `<div class="note">Modification de l'armée « ${esc(ea.name)} ». <button class="btn small ghost" data-act="bNew">Nouvelle liste</button></div>` : ''; if (!ea) B.editId = ''; }
    return viewBuilder(h);
  }
  function viewBuilder(h) {
    const ix = Wahap.index();
    if (!ix) {
      if (B.err) return h + `<div class="card"><div class="warn">${esc(B.err)}</div><p class="muted">Les fichiers du dossier « data/wahapedia » doivent être hébergés avec l'appli (GitHub Pages).</p><button class="btn small" data-act="bRetry">Réessayer</button></div>`;
      if (!B.loading) { B.loading = true; Wahap.ready().then(() => { B.loading = false; render(); }).catch((e) => { B.loading = false; B.err = e.message; render(); }); }
      return h + `<div class="card">${B.err ? '<div class="warn">' + esc(B.err) + '</div>' : '<p class="muted">Chargement de la base…</p>'}</div>`;
    }
    h += `<div class="card">${fh('set', 'Faction, format et nom' + (B.fac ? ' · ' + esc((ix.factions.find((x) => x.id === B.fac) || {}).name || '') : ''))}<div ${B.fold.set ? 'hidden' : ''}><label>Faction</label><select data-bf="fac"><option value="">— choisir —</option>${ix.factions.map((f) => `<option value="${f.id}" ${f.id === B.fac ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}</select>
      <div class="row" style="margin-top:8px"><div style="flex:1"><label>Format</label><select data-bf="fmt">${FORMATS.map((x) => `<option value="${x[0]}" ${x[0] === B.fmt ? 'selected' : ''}>${x[1]}</option>`).join('')}</select></div>
      <div style="width:110px"><label>Limite (pts)</label><input type="number" inputmode="numeric" data-bf="limit" value="${B.limit || ''}"></div></div>
      <label style="margin-top:8px">Nom de la liste</label><input type="text" data-bf="name" value="${esc(B.name)}" placeholder="Ma liste"></div></div>`;
    if (B.msg) h += `<div class="note">${esc(B.msg)}</div>`;
    if (!B.fac) return h + '<p class="muted">Choisis une faction pour commencer.</p>';
    if (chList()) h += `<div class="card">${fh('ch', 'Chapitre' + (B.ch ? ' · ' + esc(chLabel()) : ''))}<div ${B.fold.ch ? 'hidden' : ''}><label>Chapitre</label><select data-bf="ch"><option value="" ${B.ch ? '' : 'selected'}>— tous les chapitres —</option><option value="codex" ${B.ch === 'codex' ? 'selected' : ''}>Chapitre générique (Codex)</option>${chList().map((c) => `<option value="${c[0]}" ${B.ch === c[0] ? 'selected' : ''}>${esc(c[1])}</option>`).join('')}</select><p class="muted">Le chapitre filtre les détachements et les unités qui lui sont propres.</p></div></div>`;
    const f = bfac();
    if (!f) { if (B.facErr === B.fac) return h + `<div class="card"><div class="warn">Faction introuvable (fichier data/wahapedia/${esc(B.fac)}.js manquant ?).</div><button class="btn small" data-act="bRetry">Réessayer</button></div>`; if (!B.facLoad) { B.facLoad = true; Wahap.faction(B.fac).then(() => { B.facLoad = false; if (!Wahap.cached(B.fac)) B.facErr = B.fac; render(); }).catch(() => { B.facLoad = false; B.facErr = B.fac; render(); }); } return h + '<div class="card"><p class="muted">Chargement de la faction…</p></div>'; }
    const dp = f.detachments.filter((d) => B.dets.includes(d.id)).reduce((s, d) => s + (+d.dp || 0), 0);
    h += `<div class="card">${fh('det', 'Détachements' + (B.dets.length ? ' · ' + dp + ' pt(s)' : ''))}<div ${B.fold.det ? 'hidden' : ''}><div class="chips" style="margin-top:8px">${f.detachments.filter((d) => chOkDet(d) || B.dets.includes(d.id)).map((d) => `<button class="chip ${B.dets.includes(d.id) ? 'on' : ''}" data-act="bDet" data-val="${d.id}">${esc(T0(d.name))} (${esc(d.dp || "?")})</button>`).join('')}</div>${chList() && B.ch ? `<p class="muted">${f.detachments.filter((d) => !chOkDet(d)).length} détachement(s) masqué(s) pour : ${esc(chLabel())}.</p>` : ''}
      ${B.dets.map((id) => { const d = f.detachments.find((x) => x.id === id); return d ? `<details class="note"><summary><b>${wt(d.name)}</b></summary>${(d.abilities || []).map((a) => `<div style="margin-top:6px"><b>${wt(a.name)}</b><div>${wt(a.text)}</div></div>`).join('')}</details>` : ''; }).join('')}</div></div>`;
    const pts = B.units.reduce((s, e) => s + bCost(f, e), 0), over = B.limit && pts > B.limit;
    if (B.warlord && !B.units.some((x) => x.k === B.warlord)) B.warlord = '';
    const wlc = B.units.filter((x) => { const d = bdef1(f, x.id); return d && kwOf(d).some((k) => k === 'personnage' || k === 'heros epique'); });
    h += `<div class="card"><div class="row sp"><b style="${over ? 'color:#e5484d' : ''}">${pts}${B.limit ? ' / ' + B.limit : ''} pts</b><span class="muted">${B.units.length} unité(s) · ${B.units.reduce((s, e) => s + (+e.models || 0), 0)} fig.</span></div>${wlc.length ? `<label style="margin-top:8px">👑 Seigneur de bataille</label><select data-bf="warlord"><option value="">— non choisi —</option>${wlc.map((x) => `<option value="${x.k}" ${B.warlord === x.k ? 'selected' : ''}>${esc(x.nm || T0(bdef1(f, x.id).name))} #${B.units.indexOf(x) + 1}</option>`).join('')}</select>` : '<p class="muted">Ajoute un personnage pour choisir ton seigneur de bataille.</p>'}${B.units.length ? '<div class="row" style="margin-top:6px"><button class="btn small ghost" data-act="bFoldAll" data-val="1">Tout replier</button><button class="btn small ghost" data-act="bFoldAll" data-val="">Tout déplier</button></div>' : ''}${over ? '<div class="warn">Au-dessus de la limite du format.</div>' : ''}</div>`;
    h += `<div class="card">${fh('add', 'Ajouter une unité')}<div ${B.fold.add ? 'hidden' : ''}><div class="chips" style="margin-top:8px"><button class="chip ${B.grp ? '' : 'on'}" data-act="bGrp" data-val="">Toutes</button>${BGRPS.map((g) => `<button class="chip ${B.grp === g ? 'on' : ''}" data-act="bGrp" data-val="${g}">${g}</button>`).join('')}</div>
      <div class="row" style="margin-top:8px"><input type="search" id="bq" placeholder="Nom ou mot-clé (français ou anglais)…" value="${esc(B.q)}" autocomplete="off" style="flex:1"><select data-bf="kw" style="width:42%"><option value="">Mot-clé…</option>${bKwOpts(f).map(([k, n]) => `<option value="${esc(k)}" ${B.kw === k ? 'selected' : ''}>${esc(k)} (${n})</option>`).join('')}</select></div><div id="bres" style="margin-top:6px">${bResults(f)}</div></div></div>`;
    h += B.units.map((e, i) => bUnitCard(f, e, i)).join('');
    h += `<div class="card">${B.editId ? `<button class="btn" data-act="bUpdate" ${B.units.length ? '' : 'disabled'}>💾 Mettre à jour l'armée</button> <button class="btn small ghost" data-act="bCreate" ${B.units.length ? '' : 'disabled'}>Créer une copie</button>` : `<button class="btn" data-act="bCreate" ${B.units.length ? '' : 'disabled'}>✅ Créer l'armée</button>`} <button class="btn small danger" data-act="bReset">Vider</button><p class="muted">Points calculés d'après le Munitorum Field Manual (selon la taille et le rang de l'unité) ; tu peux les forcer dans « Points ». Les améliorations et équipements ajoutent leur coût.</p></div>`;
    return h;
  }
  function bKwOpts(f) {
    const c = {}; f.units.filter(chOkUnit).forEach((d) => new Set(kwShow(d)).forEach((k) => { c[k] = (c[k] || 0) + 1; }));
    return Object.entries(c).filter(([k, n]) => n >= 2 && !/^(imperium|chaos|adeptus astartes)$/i.test(k)).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 60);
  }
  /* changement de chapitre : retire les détachements et unités qui ne sont plus permis */
  function bChapter(v) {
    B.ch = v; const f = bfac(); if (!f) return;
    const nd = B.dets.length, nu = B.units.length;
    B.dets = B.dets.filter((id) => { const d = f.detachments.find((x) => x.id === id); return d && chOkDet(d); });
    B.units = B.units.filter((e) => { const d = bdef1(f, e.id); return d && chOkUnit(d); });
    B.units.forEach((e) => { if (e.to && !B.units.some((x) => x.k === e.to)) e.to = ''; if (e.enh && !B.dets.some((id) => e.enh.startsWith(id + '|'))) e.enh = ''; });
    const rd = nd - B.dets.length, ru = nu - B.units.length;
    B.msg = rd || ru ? `Chapitre « ${chLabel() || 'tous'} » : ${rd} détachement(s) et ${ru} unité(s) retiré(s) car non permis.` : '';
  }
  function bResults(f) {
    const terms = Wahap.norm(B.q).split(' ').filter(Boolean);
    const r = f.units.filter((d) => chOkUnit(d) && (!B.grp || bgrp(d) === B.grp) && (!B.kw || kwShow(d).includes(B.kw)) && terms.every((t) => Wahap.norm(d.name).includes(t) || Wahap.norm(d.en).includes(t) || kwShow(d).some((k) => Wahap.norm(k).includes(t)))).slice(0, 60);
    return r.map((d) => `<div class="unit-item"><div><b>${esc(T0(d.name))}</b>${Wahap.isEn(d.name) ? ' <span class="tag">EN</span>' : ''}<div class="muted">${esc(bgrp(d))} · ${esc(d.role)}${chOfUnit(d) ? ' · ' + esc(chOfUnit(d)) : ''}</div><div class="kws">${kwShow(d).filter((k) => !/^(imperium|chaos)$/i.test(k)).slice(0, 8).map((k) => `<span class="kw">${esc(k)}</span>`).join('')}</div></div><button class="btn small" data-act="bAdd" data-val="${d.id}">＋</button></div>`).join('') || '<p class="muted">Aucune unité.</p>';
  }
  function bUnitCard(f, e, i) {
    const d = bdef1(f, e.id); if (!d) return '';
    const sizes = bSizes(d, bOrd(e)); const open = B.open === e.k, host = e.to && B.units.find((x) => x.k === e.to);
    const fd = !!B.fold['u' + e.k];
    let h = `<div class="card"><div class="row sp fold" data-act="bFold" data-val="u${e.k}" style="cursor:pointer"><b>${fd ? '▸' : '▾'} ${B.warlord === e.k ? '👑 ' : ''}${esc(e.nm || T0(d.name))}</b><span class="muted">${bCost(f, e)} pts</span></div><div ${fd ? 'hidden' : ''}>
      <label style="margin-top:6px">Nom de l'unité${e.nm ? ' <span class="muted">(' + esc(T0(d.name)) + ')</span>' : ''}</label><input type="text" data-bu="${e.k}" data-bk="nm" value="${esc(e.nm || '')}" placeholder="${esc(T0(d.name))}">
      <div class="kws">${kwShow(d).map((k) => `<span class="kw">${esc(k)}</span>`).join('')}</div>
      <div class="muted">${esc(bgrp(d))}${host ? ' · rejoint ' + esc(host.nm || T0(bdef1(f, host.id).name)) : ''}${e.enh ? ' · ' + esc((bEnhs(f).find((x) => x.key === e.enh) || {}).name || '') : ''}</div>
      <div class="row" style="margin-top:6px"><div style="flex:1"><label>Figurines</label>${sizes.length ? `<select data-bu="${e.k}" data-bk="models">${sizes.map((z) => `<option value="${z[0]}" ${z[0] === +e.models ? 'selected' : ''}>${z[0]}</option>`).join('')}</select>` : `<input type="number" inputmode="numeric" data-bu="${e.k}" data-bk="models" value="${e.models}">`}</div><div style="flex:1"><label>Points${bAuto(f, e) ? ' (auto ' + bAuto(f, e) + ')' : ''}</label><input type="number" inputmode="numeric" data-bu="${e.k}" data-bk="pts" value="${e.pts || ''}" placeholder="${bAuto(f, e) || ''}"></div></div>
      <div class="row" style="margin-top:6px"><button class="btn small ghost" data-act="bOpen" data-val="${e.k}">${open ? 'Fermer' : '⚙️ Options'}</button><button class="btn small ghost" data-act="bDup" data-val="${e.k}">Dupliquer</button><button class="btn small danger" data-act="bDel" data-val="${e.k}">Retirer</button></div>`;
    if (open) {
      const hosts = (d.leads || []).length ? B.units.filter((x) => x.k !== e.k && d.leads.includes(x.id)) : [];
      if ((d.leads || []).length) h += `<label style="margin-top:8px">Rejoint (meneur / appui)</label><select data-bu="${e.k}" data-bk="to"><option value="">— aucune —</option>${hosts.map((x) => `<option value="${x.k}" ${x.k === e.to ? 'selected' : ''}>${esc(x.nm || T0(bdef1(f, x.id).name))} #${B.units.indexOf(x) + 1}</option>`).join('')}</select>${hosts.length ? '' : '<div class="muted">Ajoute d\'abord une unité compatible : ' + d.leads.map((id) => { const u = bdef1(f, id); return u ? esc(T0(u.name)) : ''; }).filter(Boolean).slice(0, 6).join(', ') + '</div>'}`;
      if (canEnh(d)) { const used = new Set(B.units.filter((x) => x.k !== e.k).map((x) => x.enh)); h += `<label style="margin-top:8px">Amélioration</label><select data-bu="${e.k}" data-bk="enh"><option value="">— aucune —</option>${bEnhs(f).filter((x) => !used.has(x.key) && (B.allEnh || x.key === e.enh || enhOk(x, d))).map((x) => `<option value="${esc(x.key)}" ${x.key === e.enh ? 'selected' : ''}>${esc(x.name)} (${x.cost} pts)</option>`).join('')}</select>${B.dets.length ? `<label class="chk"><input type="checkbox" data-bf="allEnh" ${B.allEnh ? 'checked' : ''}> Afficher aussi les améliorations non compatibles avec les mots-clés (${bEnhs(f).filter((x) => !used.has(x.key) && !enhOk(x, d)).length})</label>` : '<div class="muted">Choisis un détachement pour voir ses améliorations.</div>'}`; }
      if (d.pc && d.pc.w.length) h += `<label style="margin-top:8px">Équipements payants (quantité)</label>${d.pc.w.map((w, j) => `<div class="row sp"><span>${wt(w[0])} <span class="muted">+${w[1]} pts</span></span><input type="number" inputmode="numeric" style="width:70px" data-bu="${e.k}" data-bg="${j}" value="${(e.wg || {})[j] || 0}"></div>`).join('')}`;
      if ((d.weapons || []).length) h += `<label style="margin-top:8px">Armes (décoche pour retirer)</label>${d.weapons.map((w, j) => `<label class="chk"><input type="checkbox" data-bu="${e.k}" data-bw="${j}" ${(e.woff || []).includes(j) ? '' : 'checked'}> ${wt(w.name)} <span class="muted">${esc(w.range)} · A${esc(w.A)} F${esc(w.S)} PA${esc(w.AP)} D${esc(w.D)}${w.ab ? ' · ' + esc(w.ab) : ''}</span></label>`).join('')}`;
      const abs = (d.abilities || []).map((a, j) => [a, j]).filter((x) => x[0].name);
      if (abs.length) h += `<label style="margin-top:8px">Aptitudes</label>${abs.map(([a, j]) => `<label class="chk"><input type="checkbox" data-bu="${e.k}" data-ba="${j}" ${(e.aoff || []).includes(j) ? '' : 'checked'}> ${wt(a.name)}${a.param ? ' ' + esc(a.param) : ''}</label>`).join('')}`;
      if (d.loadout) h += `<div class="muted" style="margin-top:6px">${wt(d.loadout)}</div>`;
    }
    return h + '</div></div>';
  }
  /* Texte YellowScribe (format application GW, noms anglais) depuis l'armée courante */
  function yellowNeed(a) {
    const ids = new Set(); a.units.forEach((u) => { if (u.wahapId) ids.add((Wahap.index().units.find((x) => x.id === u.wahapId) || {}).f); });
    Wahap.facIds(a.faction).forEach((x) => ids.add(x)); return [...ids].filter(Boolean);
  }
  function yellowFromArmy(a) {
    const ix = Wahap.index(); const en = (x) => (x && x.en) || (typeof x === 'string' ? x : '');
    const cap = (t) => String(t || '').toLowerCase().replace(/(^|[\s'’(-])([a-zà-ÿ])/g, (m, p, c) => p + c.toUpperCase());
    const find = (u) => { const e = u.wahapId && ix.units.find((x) => x.id === u.wahapId); const f = e && Wahap.cached(e.f); return f ? { f, d: f.units.find((x) => x.id === u.wahapId) } : null; };
    const facId = Wahap.facIds(a.faction)[0]; const fn = (ix.factions.find((x) => x.id === facId) || {}).name || a.faction || '';
    const fdata = facId && Wahap.cached(facId);
    const detNames = (a.detachments || []).map((s) => { const n = s.replace(/\s*\(\d+ pts?\)\s*$/, ''); const d = fdata && fdata.detachments.find((x) => Wahap.norm(Wahap.T(x.name)) === Wahap.norm(n)); return d ? (d.e || en(d.name)) : n; });
    const pts = a.units.reduce((t, u) => t + (+u.pts || 0), 0);
    const L = [`${a.name} (${pts} points)`, '', fn, detNames.join(' / '), '', ''];
    const sec = { Chefs: 'CHARACTERS', Appuis: 'SUPPORT', Troupes: 'BATTLELINE', 'Véhicules & monstres': 'OTHER DATASHEETS', Transports: 'DEDICATED TRANSPORTS', Autres: 'OTHER DATASHEETS' };
    const grp = (u) => { const r = find(u); return r ? bgrp(r.d) : (roleOf(u) ? 'Chefs' : 'Autres'); };
    const anyWl = a.units.some((u) => u.warlord); let warlord = false;
    BGRPS.concat(['Autres']).forEach((g) => {
      const us = a.units.filter((u) => grp(u) === g); if (!us.length) return; L.push(sec[g], '');
      us.forEach((u) => {
        const r = find(u); L.push(`${cap(r ? (r.d.en || en(r.d.name)) : u.name.replace(/\s*#\d+$/, ''))} (${+u.pts || 0} points)`);
        if (g === 'Chefs' && !warlord && (anyWl ? u.warlord : true)) { warlord = true; L.push('  • Warlord'); }
        if (u.enhancement) { let e = u.enhancement; if (fdata) fdata.detachments.forEach((d) => (d.enh || []).forEach((x) => { if (Wahap.norm(Wahap.T(x.name)) === Wahap.norm(u.enhancement)) e = x.e || en(x.name); })); L.push('  • Enhancements: ' + e); }
        if (u.attachedTo) { const h = a.units.find((x) => x.id === u.attachedTo); if (h) { const rh = find(h); L.push('  • Attached to: ' + cap(rh ? (rh.d.en || en(rh.d.name)) : h.name.replace(/\s*#\d+$/, ''))); } }
        const seen = new Set(); (u.weapons || []).forEach((w) => { let n = w.name; const m = r && r.d.weapons.find((x) => Wahap.T(x.name) === w.name); if (m && m.e) n = m.e; n = cap(String(n).split(/ [-–] /)[0]); if (n && !seen.has(n)) { seen.add(n); L.push('  • ' + n); } });
        L.push('');
      });
    });
    return L.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }
  const ysState = { loading: false, err: '' };
  function yellowCard(a) {
    let body;
    if (!Wahap.index()) { if (!ysState.loading && !ysState.err) { ysState.loading = true; Wahap.ready().then(() => { ysState.loading = false; render(); }).catch((e) => { ysState.loading = false; ysState.err = e.message; render(); }); } body = ysState.err ? '<div class="warn">' + esc(ysState.err) + '</div>' : '<p class="muted">Chargement de la base…</p>'; }
    else {
      const need = yellowNeed(a).filter((id) => !Wahap.cached(id));
      if (need.length) { if (!ysState.loading) { ysState.loading = true; Promise.all(need.map((id) => Wahap.faction(id).catch(() => null))).then(() => { ysState.loading = false; need.forEach((id) => { if (!Wahap.cached(id)) ysState.err = 'Données de faction introuvables.'; }); render(); }); } body = '<p class="muted">Chargement des noms anglais…</p>'; }
      else body = `<textarea id="ysTxt" rows="8" readonly style="width:100%;font-size:12px">${esc(yellowFromArmy(a))}</textarea><div class="row" style="margin-top:6px"><button class="btn small" data-act="bCopy">📋 Copier</button><a class="btn small ghost" href="https://yellowscribe.link" target="_blank" rel="noopener">Ouvrir YellowScribe</a></div>`;
    }
    return `<div class="card"><h2>Code YellowScribe</h2><p class="muted">Texte au format « application GW » (noms anglais), à coller dans <b>yellowscribe.link</b> pour obtenir le fichier Tabletop Simulator. Armes listées sans quantité ; le seigneur de bataille choisi (sinon le premier chef) est marqué Warlord.</p>${body}</div>`;
  }
  function bBuildArmy(rid) {
    const f = bfac(); const ix = Wahap.index();
    const idmap = {}; const units = B.units.map((e) => {
      const d = bdef1(f, e.id); const d2 = Object.assign({}, d, { weapons: (d.weapons || []).filter((w, j) => !(e.woff || []).includes(j)), abilities: (d.abilities || []).filter((a, j) => !(e.aoff || []).includes(j)) });
      const u = Wahap.toApp(d2, uid); if (B.ch && B.ch !== 'codex' && !u.factionKw.includes(B.ch)) u.factionKw.push(B.ch); idmap[e.k] = u.id; if (e.nm) u.name = e.nm; if (B.warlord === e.k) u.warlord = true; u.pts = bCost(f, e); u.ptsNote = bWg(f, e) ? 'dont équipements ' + bWg(f, e) + ' pts' : ''; u.models = String(e.models || ''); u.section = bgrp(d); u.role = d.support ? 'support' : (d.leads || []).length ? 'leader' : '';
      const en = bEnhs(f).find((x) => x.key === e.enh);
      if (en) { u.enhancement = en.name; u.options = [en.name]; u.abilities.push({ name: 'Amélioration — ' + en.name, text: T0(en.text), phases: AlnPdf.phasesFromText(T0(en.text), en.name), en: Wahap.isEn(en.text) }); }
      return u;
    });
    B.units.forEach((e, i) => { if (e.to && idmap[e.to]) units[i].attachedTo = idmap[e.to]; });
    const fname = (ix.factions.find((x) => x.id === B.fac) || {}).name || '';
    const dets = f.detachments.filter((d) => B.dets.includes(d.id));
    const a = { chapter: B.ch && B.ch !== 'codex' ? B.ch : '', id: rid || uid(), name: B.name || (fname + ' — ' + (B.limit || 'liste') + ' pts'), faction: fname, detachments: dets.map((d) => T0(d.name) + (+d.dp ? ` (${d.dp} pt${+d.dp > 1 ? 's' : ''})` : '')), alnUrl: '', total: { points: units.reduce((s, u) => s + u.pts, 0), models: units.reduce((s, u) => s + (+u.models || 0), 0), units: units.length }, units };
    a.build = JSON.parse(JSON.stringify({ fac: B.fac, ch: B.ch, kw: '', allEnh: B.allEnh, warlord: B.warlord, fmt: B.fmt, limit: B.limit, name: B.name, dets: B.dets, units: B.units }));
    const oi = rid ? S.armies.findIndex((x) => x.id === rid) : -1;
    if (oi >= 0) { S.customStrats = S.customStrats.filter((x) => x.armyId !== rid); S.armies[oi] = a; } else S.armies.push(a);
    S.armyId = a.id; S.armyRules[a.id] = []; dets.forEach((d) => addDetTo(a, d));
    S.play.unitId = null; S.play.nModelsUnit = null; S.play.weaponIdx = 0; return a;
  }
  /* Armées importées (PDF/ALN) : détachements, règles, stratagèmes et améliorations remplacés par la version française de la base */
  const frBusy = new Set();
  async function frDets(a) {
    await Wahap.ready(); const nz = Wahap.norm;
    let ids = Wahap.facIds(a.faction); if (!ids.length) ids = Wahap.index().factions.map((f) => f.id);
    await Promise.all(ids.map((id) => Wahap.faction(id).catch(() => null)));
    const dets = []; ids.forEach((id) => { const f = Wahap.cached(id); if (f) f.detachments.forEach((d) => dets.push(d)); });
    a.detachments = (a.detachments || []).map((entry) => {
      const m = String(entry).match(/^(.*?)(\s*\(\d+\s*pts?\))?$/); const n = m[1];
      const d = dets.find((x) => nz(x.e) === nz(n)); if (!d || nz(Wahap.T(d.name)) === nz(n)) return entry;
      S.customStrats = S.customStrats.filter((x) => !(x.armyId === a.id && nz(x.detachment) === nz(n)));
      S.armyRules[a.id] = (S.armyRules[a.id] || []).filter((r) => nz(r.name) !== nz('Détachement ' + n));
      addDetTo(a, d);
      a.units.forEach((u) => (d.enh || []).forEach((en) => {
        if (!u.enhancement || nz(u.enhancement) !== nz(en.e)) return;
        const old = u.enhancement, fr = Wahap.T(en.name); u.enhancement = fr;
        u.options = (u.options || []).map((o) => (nz(o) === nz(old) ? fr : o));
        u.abilities = (u.abilities || []).map((x) => (nz(x.name).includes(nz(old)) ? Object.assign({}, x, { name: 'Amélioration — ' + fr, text: Wahap.T(en.text), en: Wahap.isEn(en.text) }) : x));
      }));
      return Wahap.T(d.name) + (m[2] || '');
    });
  }
  function frAuto(a) {
    if (!a || a.frDone || frBusy.has(a.id) || !(a.detachments || []).length) return;
    frBusy.add(a.id);
    frDets(a).catch(() => {}).then(() => { frBusy.delete(a.id); a.frDone = 1; save(); render(); });
  }
  function addDetTo(a, d) {
    let n = 0; (d.strats || []).forEach((s) => {
      const p = splitWTE(Wahap.T(s.text)); const t = AlnPdf.stratTiming(p.when || Wahap.T(s.text));
      S.customStrats.push({ id: 'c_' + uid(), armyId: a.id, name: Wahap.T(s.name), detachment: Wahap.T(d.name), cp: +s.cp || 1, when: p.when, target: p.target, effect: p.effect, phases: t.phases, turn: t.turn, turns: t.turns }); n++;
    });
    (d.abilities || []).forEach((r) => { (S.armyRules[a.id] = S.armyRules[a.id] || []).push({ name: Wahap.T(r.name), phases: AlnPdf.phasesFromText(Wahap.T(r.text), Wahap.T(r.name)), text: Wahap.T(r.text) }); });
    return n;
  }

  /* ---- Assistant de création de liste (sans IA générative : règles de composition locales) ---- */
  const AKEY = 'noobammer.assist.v1';
  const adef = () => ({ fac: '', ch: '', fmt: '1000', limit: 1000, styles: ['equilibre'], det: '', kws: {}, free: '', leaders: 'normal', sizeMode: 'auto', dups: 'low', epic: 'oui', air: 'non', seed: 1, q: '' });
  const AS = Object.assign(adef(), (() => { try { const o = JSON.parse(localStorage.getItem(AKEY) || '{}'); if (o.style && !o.styles) o.styles = [o.style]; if (!Array.isArray(o.kws) && o.kws && typeof o.kws === 'object') { /* ok */ } else o.kws = {}; return o; } catch (e) { return {}; } })(), { res: [], err: '', load: false, parsed: [], expand: false });
  const asave = () => { try { const c = Object.assign({}, AS); ['res', 'err', 'load', 'parsed', 'expand'].forEach((k) => delete c[k]); localStorage.setItem(AKEY, JSON.stringify(c)); } catch (e) { /* ignoré */ } };
  const STYLES = [['equilibre', 'Équilibrée'], ['tir', 'Tir'], ['melee', 'Corps à corps'], ['blindes', 'Blindés & monstres'], ['elite', 'Élite'], ['horde', 'Horde'], ['objectifs', 'Objectifs'], ['mobile', 'Mobilité'], ['durable', 'Résistance']];
  const AW = { equilibre: { m: 0.5, r: 0.5, d: 0.3, o: 0.3 }, tir: { m: 0.15, r: 1, d: 0.25, o: 0.25 }, melee: { m: 1, r: 0.15, d: 0.35, o: 0.25 }, blindes: { m: 0.5, r: 0.6, d: 0.5, o: 0.1, veh: 1 }, elite: { m: 0.5, r: 0.5, d: 0.7, o: 0.2, elite: 1 }, horde: { m: 0.5, r: 0.5, d: 0.2, o: 0.4, horde: 1 }, objectifs: { m: 0.3, r: 0.4, d: 0.3, o: 1 }, mobile: { m: 0.5, r: 0.5, d: 0.2, o: 0.3, mob: 1 }, durable: { m: 0.3, r: 0.3, d: 1, o: 0.3 } };
  const AKW = { tir: /\b(tir|a distance|portee|ct)\b/g, melee: /(melee|combat|charge)/g, objectifs: /(objectif|controle)/g, blindes: /(vehicule|monstre)/g, elite: /(gravis|terminator|personnage|invulnerable)/g, horde: /(infanterie|figurines)/g, mobile: /(mouvement|avance|frappe en profondeur|insertion|retraite)/g, durable: /(invulnerable|ignore la douleur|sauvegarde|couvert)/g };
  const aW = (o) => { const st = (o.styles && o.styles.length ? o.styles : ['equilibre']); const w = { m: 0, r: 0, d: 0, o: 0 }; st.forEach((s) => { const x = AW[s] || AW.equilibre; ['m', 'r', 'd', 'o'].forEach((k) => { w[k] += x[k] / st.length; }); ['veh', 'elite', 'horde', 'mob'].forEach((k) => { if (x[k]) w[k] = 1; }); }); (o.avoid || []).forEach((a) => { if (a === 'tir') w.r = 0.05; if (a === 'melee') w.m = 0.05; }); return w; };
  const aNum = (x) => parseFloat(String(x == null ? '' : x).replace(/[^\d.]/g, '')) || 0;
  const aDice = (s) => { s = String(s == null ? '' : s).trim().toUpperCase(); const m = s.match(/^(\d*)D(\d+)(?:\+(\d+))?$/); if (m) return (+(m[1] || 1)) * ((+m[2] + 1) / 2) + (+(m[3] || 0)); const n = parseFloat(s); return isNaN(n) ? 0 : n; };
  const aWeap = (w) => { const a = aDice(w.A) || 1, s = aDice(w.S) || 4, ap = Math.abs(aDice(w.AP)), dm = aDice(w.D) || 1; const sk = /^(\d)\+/.exec(String(w.skill || '')); const hit = sk ? (7 - +sk[1]) / 6 : 0.9; return a * hit * (0.3 + 0.1 * Math.min(s, 12)) * (1 + 0.25 * ap) * dm; };
  const aRng = (seed) => { let t = (seed * 2654435761) >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; };
  const aSizes = (d, ord) => { const seen = {}; return bSizes(d, ord).filter(([n, p]) => p > 0 && !seen[n] && (seen[n] = true)); };
  const aTags = (d) => { const n = (d.abilities || []).map((a) => Wahap.norm(a.name)); const has = (re) => n.some((x) => re.test(x)); const k = kwOf(d); return { ds: has(/frappe en profondeur/), sc: has(/eclaireurs/), inf: has(/infiltrateurs/), st: has(/furtivite/), fnp: has(/(ignore|insensible a) la douleur/), lone: has(/(agent|operateur) solitaire/), fly: k.includes('volant') }; };
  const aMetC = {};
  function aMet(d, n) {
    const key = d.id + '|' + n; if (aMetC[key]) return aMetC[key];
    const ms = d.models || []; const m = ms[ms.length > 1 ? 1 : 0] || ms[0] || {};
    const top = (t) => (d.weapons || []).filter((w) => w.type === t).map(aWeap).sort((a, b) => b - a).slice(0, 3).reduce((s, v) => s + v, 0);
    const k = Math.pow(Math.max(1, n), 0.75); const sv = Math.min(aNum(m.Sv) || 7, aNum(m.inv) || 7);
    return (aMetC[key] = { r: top('ranged') * k, m: top('melee') * k, d: n * (aNum(m.W) || 1) * (1 + aNum(m.T) / 3) * (1 + (7 - sv) / 3), o: n * aNum(m.OC), mv: aNum(m.M), n });
  }
  function aCands(f, o) {
    const out = [];
    f.units.forEach((d) => {
      if (!d.pc || !chOkUnit(d, o.ch, o.fac)) return;
      const r = Wahap.norm(d.role); if (/fortification|transport dedie/.test(r)) return;
      const air = /aeronef/.test(r); if (air && o.air !== 'oui') return;
      const epic = /heros epique/.test(r); if (epic && o.epic === 'non') return;
      if (!aSizes(d, 1).length) return;
      const c = { d, grp: bgrp(d), epic, air, ligne: /ligne/.test(r), veh: /vehicule|marcheur|monstre|titanesque|artillerie/.test(r) };
      if ((o.excl || []).some((x) => x.test(c))) return;
      out.push(c);
    });
    return out;
  }
  const aHasKw = (d, kw) => kwShow(d).some((k) => Wahap.norm(k) === Wahap.norm(kw));
  /* ---- champ libre : « beaucoup de terminators, sans aéronefs, 2 dreadnought… » ---- */
  const A_STYLEW = [[/corps a corps|melee|assaut/, 'melee'], [/\btir\b|a distance|tireurs?|artillerie/, 'tir'], [/objectifs?/, 'objectifs'], [/horde|nombreu|beaucoup de figurines|masse/, 'horde'], [/elite|peu de figurines/, 'elite'], [/blindes?|chars?\b|vehicules?|monstres?/, 'blindes'], [/mobil|rapide|vitesse|frappe en profondeur/, 'mobile'], [/resistan|durable|solide|encaiss/, 'durable']];
  function aParse(txt, f, o) {
    const nz = Wahap.norm; const R = { boost: [], excl: [], must: [], styles: [], avoid: [], notes: [], unknown: [], flags: {} };
    const kwmap = {}; f.units.filter((d) => chOkUnit(d, o.ch, o.fac)).forEach((d) => kwShow(d).forEach((k) => { kwmap[nz(k)] = k; }));
    const sing = (t) => t.replace(/(eaux|aux)$/, 'al').replace(/s$/, '');
    String(txt || '').split(/[,;\n]+|\s+et\s+/i).map((s) => s.trim()).filter(Boolean).forEach((raw) => {
      let n = nz(raw).replace(/[.!]+$/g, ''); let neg = false, w = 2, must = false, cnt = 0;
      let m;
      for (let i = 0; i < 3; i++) {
        if ((m = n.match(/^(sans|pas d['e ]\s*|pas de|aucune?s?|eviter|evite|exclure|sauf|no|without|ni)\s+(.*)$/))) { neg = true; n = m[2]; continue; }
        if ((m = n.match(/^(beaucoup d['e ]\s*|beaucoup de|plus d['e ]\s*|plus de|surtout|majorite d['e ]\s*|que des|maximum d['e ]\s*|privilegier|favoriser)\s*(.*)$/))) { w = 2.6; n = m[2]; continue; }
        if ((m = n.match(/^(peu d['e ]\s*|peu de|moins d['e ]\s*|moins de|limiter|reduire)\s*(.*)$/))) { w = 0.5; n = m[2]; continue; }
        if ((m = n.match(/^(avec|inclure|ajouter|prendre|obligatoire|je veux|j'ai|je possede|au moins|minimum|min)\s+(.*)$/))) { must = true; n = m[2]; continue; }
        if ((m = n.match(/^(\d+)\s*(?:x\s*)?(.*)$/))) { cnt = +m[1]; must = true; n = m[2]; continue; }
        break;
      }
      const term = sing(n.replace(/^(les |des |du |de la |de l'|d'|de |la |le |l'|un |une |unites? |escouades? |figurines? )+/, '').trim()); if (term.length < 2) return;
      const label = raw.trim();
      // options générales
      if (/aeronef|avion|flyer/.test(term)) { R.flags.air = neg ? 'non' : 'oui'; R.notes.push((neg ? 'Sans' : 'Avec') + ' aéronefs'); return; }
      if (/heros epique|personnage unique|champion/.test(term) && !/chef/.test(term)) { R.flags.epic = neg ? 'non' : 'oui'; R.notes.push((neg ? 'Sans' : 'Avec') + ' héros épiques'); return; }
      if (/transport/.test(term)) { R.unknown.push(label + ' (transports non gérés par l\'assistant)'); return; }
      if (/^(chefs?|leaders?|heros)$/.test(term)) { R.flags.leaders = neg || w < 1 ? 'few' : (w > 2 ? 'many' : 'normal'); R.notes.push('Chefs : ' + (R.flags.leaders === 'few' ? 'peu' : R.flags.leaders === 'many' ? 'beaucoup' : 'normal')); return; }
      // styles
      const sty = A_STYLEW.find(([re]) => re.test(term));
      if (sty && !neg && !cnt) { R.styles.push(sty[1]); R.notes.push('Style : ' + (STYLES.find((x) => x[0] === sty[1]) || [0, sty[1]])[1]); return; }
      if (sty && neg) { if (sty[1] === 'tir' || sty[1] === 'melee') { R.avoid.push(sty[1]); R.notes.push('Éviter : ' + (sty[1] === 'tir' ? 'le tir' : 'le corps à corps')); return; } }
      // mots-clés
      let kwk = kwmap[term] ? term : Object.keys(kwmap).find((k) => sing(k) === term);
      if (!kwk) kwk = Object.keys(kwmap).filter((k) => k.length >= 4 && (' ' + term + ' ').includes(' ' + k + ' ')).sort((a, b) => b.length - a.length)[0];
      let test = null, lab = '';
      if (kwk) { const kk = kwk; test = (c) => kwShow(c.d).some((k) => nz(k) === kk); lab = 'mot-clé « ' + kwmap[kk] + ' »'; }
      else {
        const ids = f.units.filter((d) => term.length >= 3 && chOkUnit(d, o.ch, o.fac) && nz(T0(d.name)).includes(term)).map((d) => d.id);
        if (ids.length && ids.length <= 14) { test = (c) => ids.includes(c.d.id); lab = ids.length === 1 ? 'unité « ' + T0(f.units.find((d) => d.id === ids[0]).name) + ' »' : ids.length + ' unités dont le nom contient « ' + term + ' »'; }
      }
      if (!test) { R.unknown.push(label); return; }
      if (neg) { R.excl.push({ test }); R.notes.push('Exclure ' + lab); }
      else if (must) { R.must.push({ test, n: cnt || 1, label: lab }); R.notes.push('Inclure ' + (cnt || 1) + ' × ' + lab); }
      else { R.boost.push({ test, w, label: lab }); R.notes.push((w > 2 ? 'Privilégier fortement ' : w < 1 ? 'Limiter ' : 'Privilégier ') + lab); }
    });
    return R;
  }
  function aRaw(c, n, o) {
    const t = aMet(c.d, n), W = o.W, mx = o.mx;
    let s = W.m * t.m / mx.m + W.r * t.r / mx.r + W.d * t.d / mx.d + W.o * t.o / mx.o;
    if (W.veh && c.veh) s *= 1.5;
    if (W.horde) s *= 1 + Math.min(1, n / 20) * 0.6;
    if (W.elite) s *= 1 + Math.min(1, (aSizes(c.d, 1).find((x) => x[0] === n) || [n, 0])[1] / Math.max(1, n) / 45) * 0.6;
    if (W.mob) { const tg = aTags(c.d); s *= 1 + (t.mv >= 8 ? 0.35 : 0) + (tg.ds || tg.sc || tg.inf ? 0.4 : 0) + (tg.fly ? 0.25 : 0); }
    (o.boost || []).forEach((b) => { if (b.test(c)) s *= b.w; });
    return s;
  }
  function aDetScore(det, o) {
    const txt = Wahap.norm([].concat((det.abilities || []).map((a) => T0(a.name) + ' ' + T0(a.text)), (det.strats || []).map((s) => T0(s.name) + ' ' + T0(s.text)), (det.enh || []).map((e) => T0(e.name) + ' ' + T0(e.text))).join(' '));
    let s = (det.strats || []).length * 0.2 + (det.enh || []).length * 0.2;
    (o.styles || []).forEach((st) => { const re = AKW[st]; if (re) s += (txt.match(re) || []).length / o.styles.length; });
    (o.kwPref || []).forEach((k) => { if (txt.includes(Wahap.norm(k))) s += 6; });
    (o.boost || []).forEach((b) => { const k = (b.label.match(/« (.*) »/) || [])[1]; if (k && txt.includes(Wahap.norm(k))) s += 4; });
    return s;
  }
  const A_LEAD = { few: [0.5, 0.12], normal: [1, 0.22], many: [1.6, 0.32] };
  function aBuild(f, o0, noise, seed, rank) {
    const rnd = aRng(seed); const limit = o0.limit || 1000;
    const all = aCands(f, o0); if (!all.length) return null;
    const mx = { r: 1e-6, m: 1e-6, d: 1e-6, o: 1e-6 };
    all.forEach((c) => aSizes(c.d, 1).forEach(([n]) => { const t = aMet(c.d, n); ['r', 'm', 'd', 'o'].forEach((k) => { if (t[k] > mx[k]) mx[k] = t[k]; }); }));
    const o = Object.assign({}, o0, { mx, W: aW(o0) });
    const dets = f.detachments.filter((d) => chOkDet(d, o.ch, o.fac));
    let det = o.det ? dets.find((d) => d.id === o.det) : null;
    if (!det && dets.length) { const rk = dets.map((d) => [aDetScore(d, o), d]).sort((a, b) => b[0] - a[0]); det = rk[Math.min(rank, rk.length - 1)][1]; }
    const picks = []; let used = 0, nk = 0;
    const lowDup = o.dups !== 'ok';
    const cnt = (c) => picks.filter((e) => e.c === c).length;
    const cap = (c) => (c.epic ? 1 : c.ligne ? (lowDup ? 4 : 6) : (lowDup ? 2 : 3));
    const dupPen = lowDup ? 0.45 : 0.85;
    const jit = () => 1 - noise / 2 + noise * rnd();
    const mk = (c, n, p, origin) => { const e = { k: 'a' + seed + '_' + (++nk), c, n, p, to: '', enh: '', enhName: '', enhCost: 0, origin, up: 0 }; picks.push(e); used += p; return e; };
    const leaderGrp = (c) => c.grp === 'Chefs' || c.grp === 'Appuis';
    const troops = all.filter((c) => !leaderGrp(c)), leaders = all.filter(leaderGrp);
    const [lf, lshare] = A_LEAD[o.leaders] || A_LEAD.normal;
    const leaderBudget = Math.round(limit * (lshare + (o.W.elite ? 0.05 : 0)));
    const troopBudget = limit - (leaders.length ? leaderBudget : 0);
    const bigSz = o.sizeMode === 'big' || o.W.horde;
    const pickSize = (c, k, big) => { const sz = aSizes(c.d, k + 1); if (!sz.length) return null; if (o.sizeMode === 'small') return sz[0]; if (big) return sz.filter((x) => x[1] <= limit * 0.2).pop() || sz[0]; return sz[0]; };
    const forcedLeaders = [];
    // 0) unités demandées
    (o.must || []).forEach((mu) => {
      for (let i = 0; i < mu.n; i++) {
        const pool = all.filter((c) => mu.test(c) && cnt(c) < cap(c) && (leaderGrp(c) || !c.air || true));
        let best = null, bv = -1; pool.forEach((c) => { const pk = pickSize(c, cnt(c), false); if (!pk || used + pk[1] > limit * 0.6) return; const v = aRaw(c, pk[0], o) / Math.pow(pk[1], 0.75); if (v > bv) { bv = v; best = [c, pk]; } });
        if (best) { const e = mk(best[0], best[1][0], best[1][1], 'must'); e.pref = [mu.label]; if (leaderGrp(best[0])) forcedLeaders.push(e); }
      }
    });
    // 1) Ligne
    const nLigne = Math.max(0, (limit >= 2000 ? 3 : limit >= 1000 ? 2 : 1) - picks.filter((e) => e.c.ligne).length);
    const ligne = troops.filter((c) => c.ligne);
    for (let i = 0; i < nLigne && ligne.length; i++) {
      let best = null, bv = -1;
      ligne.forEach((c) => { if (cnt(c) >= 1 && ligne.some((x) => cnt(x) === 0)) return; if (cnt(c) >= cap(c)) return; const pick = pickSize(c, cnt(c), o.W.horde || o.W.o > 0.6); if (!pick || used + pick[1] > troopBudget) return; const v = aRaw(c, pick[0], o) / Math.pow(pick[1], 0.75) * jit(); if (v > bv) { bv = v; best = [c, pick]; } });
      if (best) mk(best[0], best[1][0], best[1][1], 'ligne');
    }
    // 2) troupes
    for (let g = 0; g < 80; g++) {
      let best = null, bv = -1;
      troops.forEach((c) => { const k = cnt(c); if (k >= cap(c)) return; const pick = pickSize(c, k, o.sizeMode === 'big'); if (!pick || used + pick[1] > troopBudget) return; const v = aRaw(c, pick[0], o) / Math.pow(pick[1], 0.75) * jit() * Math.pow(dupPen, k); if (v > bv) { bv = v; best = [c, pick]; } });
      if (!best) break; mk(best[0], best[1][0], best[1][1], 'troop');
    }
    // 3) chefs et appuis
    const nLead = Math.max(1, Math.min(8, Math.round(limit / 500 * lf))), nSup = Math.max(1, Math.floor(nLead / 2));
    const hostsOf = (c) => picks.filter((e) => !leaderGrp(e.c) && (c.d.leads || []).includes(e.c.d.id));
    const taken = { leader: {}, support: {} }; let nl = forcedLeaders.filter((e) => !e.c.d.support).length, ns = forcedLeaders.filter((e) => e.c.d.support).length;
    const attach = (e) => { const sup = !!e.c.d.support; const hs = hostsOf(e.c).filter((h) => !(sup ? taken.support : taken.leader)[h.k]); if (hs.length) { const h = hs.sort((a, b) => b.p - a.p)[0]; e.to = h.k; (sup ? taken.support : taken.leader)[h.k] = true; } };
    forcedLeaders.forEach(attach);
    for (let g = 0; g < nLead + 2 && nl + ns < nLead && leaders.length; g++) {
      let best = null, bv = -1;
      leaders.forEach((c) => {
        const k = cnt(c); if (k >= cap(c)) return; const pick = aSizes(c.d, k + 1)[0]; if (!pick || used + pick[1] > limit) return;
        const sup = !!c.d.support; if (sup && ns >= nSup) return; if (!sup && nl >= nLead - Math.min(ns, nSup) && nl > 0) return;
        const hs = hostsOf(c).filter((h) => !(sup ? taken.support : taken.leader)[h.k]); if (picks.some((e) => !leaderGrp(e.c)) && !hs.length) return;
        const syn = hs.length ? 0.5 : 0; const v = (0.3 + aRaw(c, pick[0], o) / Math.pow(pick[1], 0.75) + syn) * jit() * Math.pow(dupPen, k);
        if (v > bv) { bv = v; best = [c, pick, sup]; }
      });
      if (!best) break;
      const e = mk(best[0], best[1][0], best[1][1], 'leader'); if (best[2]) ns++; else nl++; attach(e);
    }
    // 4) améliorations
    const maxEnh = limit <= 1000 ? 1 : limit <= 2000 ? 2 : 3; let nEnh = 0;
    if (det && (det.enh || []).length) {
      const re = AKW[(o.styles || [])[0]]; const tk = new Set();
      picks.filter((e) => canEnh(e.c.d) && !e.c.epic).sort((a, b) => (b.to ? 1 : 0) - (a.to ? 1 : 0)).forEach((e) => {
        if (nEnh >= maxEnh) return;
        const opts = (det.enh || []).filter((en) => !tk.has(en.e || T0(en.name)) && used + (+en.cost || 0) <= limit && Kw.ok(T0(en.text), Object.assign({}, e.c.d, { chapter: o.ch && o.ch !== 'codex' ? o.ch : '' }), 'enh'));
        if (!opts.length) return;
        const sc = (en) => (re ? (Wahap.norm(T0(en.text)).match(re) || []).length : 0) - (+en.cost || 0) / 100;
        const en = opts.sort((a, b) => sc(b) - sc(a))[0];
        tk.add(en.e || T0(en.name)); e.enh = det.id + '|' + T0(en.name); e.enhName = T0(en.name); e.enhCost = +en.cost || 0; used += e.enhCost; nEnh++;
      });
    }
    // 5) remplissage
    for (let g = 0; g < 80; g++) {
      const rem = limit - used; let best = null, bv = 0;
      if (o.sizeMode !== 'small') picks.forEach((e) => {
        if (leaderGrp(e.c)) return; const ord = picks.filter((x) => x.c === e.c).indexOf(e) + 1; const nx = aSizes(e.c.d, ord).find((x) => x[0] > e.n); if (!nx) return; const dp = nx[1] - e.p; if (dp <= 0 || dp > rem) return;
        const v = (aRaw(e.c, nx[0], o) - aRaw(e.c, e.n, o)) / Math.pow(dp, 0.75) * jit(); if (v > bv) { bv = v; best = { up: e, nx }; }
      });
      troops.forEach((c) => { const k = cnt(c); if (k >= cap(c)) return; const pick = aSizes(c.d, k + 1)[0]; if (!pick || pick[1] > rem) return; const v = aRaw(c, pick[0], o) / Math.pow(pick[1], 0.75) * jit() * Math.pow(dupPen, k); if (v > bv) { bv = v; best = { add: c, pick }; } });
      if (!best) break;
      if (best.up) { used += best.nx[1] - best.up.p; best.up.n = best.nx[0]; best.up.p = best.nx[1]; best.up.up = 1; } else mk(best.add, best.pick[0], best.pick[1], 'fill');
    }
    // 5b) équipements payants : un par unité, si les points restants le permettent
    picks.forEach((e) => { e.wg = {}; e.wgl = []; });
    for (let g = 0; g < 3; g++) picks.slice().sort(() => rnd() - 0.5).forEach((e) => {
      const d = e.c.d; if (!d.pc || !(d.pc.w || []).length || e.wgl.length >= 1) return; const rem = limit - used;
      const seen = {}; const opts = d.pc.w.map((w, j) => ({ n: w[0], p: w[1], j })).filter((w) => w.p > 0 && w.p <= rem && !seen[w.n] && (seen[w.n] = true));
      if (!opts.length || rnd() > 0.6) return;
      const w = opts.sort((a, b) => a.p - b.p)[Math.floor(rnd() * Math.min(2, opts.length))];
      e.wg[w.j] = 1; e.wgl.push({ n: w.n, p: w.p }); e.p += w.p; used += w.p;
    });
    const wl = picks.find((e) => leaderGrp(e.c) && !e.c.d.support) || picks.find((e) => leaderGrp(e.c)) || picks[0];
    const fname = (Wahap.index().factions.find((x) => x.id === o.fac) || {}).name || '';
    const sl = (o.styles || ['equilibre']).map((s) => (STYLES.find((x) => x[0] === s) || [0, s])[1]).join(' + ');
    const sum = (fn) => picks.reduce((s, e) => s + fn(e), 0);
    const shares = {}; picks.forEach((e) => { shares[e.c.grp] = (shares[e.c.grp] || 0) + e.p; });
    const why = [];
    if (det) why.push(`Détachement « ${T0(det.name)} » : ${o.det ? 'choisi par toi' : rank ? 'alternative n°' + (rank + 1) + ' pour « ' + sl + ' »' : 'le plus adapté à « ' + sl + ' » d\'après ses règles et stratagèmes'}.`);
    const lg = picks.filter((e) => e.c.ligne);
    if (lg.length) why.push(`${lg.length} unité(s) de Ligne (${Math.round(sum((e) => (e.c.ligne ? aMet(e.c.d, e.n).o : 0)))} de CO) pour tenir les objectifs.`);
    if (limit - used > 0) why.push(`Il reste ${limit - used} pts non utilisés.`);
    // prefs
    picks.forEach((e) => { e.pref = (e.pref || []).concat((o.boost || []).filter((b) => b.w >= 1 && b.test(e.c)).map((b) => b.label)); });
    const units = picks.map((e) => Object.assign({ k: e.k, id: e.c.d.id, name: T0(e.c.d.name), n: e.n, pts: e.p, to: e.to, grp: e.c.grp, support: !!e.c.d.support, enh: e.enh, enhName: e.enhName, enhCost: e.enhCost, wg: e.wg, wgl: e.wgl, warlord: e === wl }, aInfo(e, picks, o)));
    return { name: `${fname} — ${sl} ${limit} pts`, detId: det ? det.id : '', detName: det ? T0(det.name) : '—', units, total: used, limit, figs: sum((e) => e.n), oc: Math.round(sum((e) => aMet(e.c.d, e.n).o)), shares, why, warlord: wl ? wl.k : '' };
  }
  /* Pour chaque unité : rôle, raisons du choix, objectif de jeu */
  function aInfo(e, picks, o) {
    const d = e.c.d, nz = Wahap.norm, ms = d.models || [], m = ms[ms.length > 1 ? 1 : 0] || ms[0] || {}, tg = aTags(d), n = e.n, mx = o.mx;
    const rw = (d.weapons || []).filter((w) => w.type === 'ranged').sort((a, b) => aWeap(b) - aWeap(a)), mw = (d.weapons || []).filter((w) => w.type === 'melee').sort((a, b) => aWeap(b) - aWeap(a));
    const heavy = (w) => aDice(w.D) >= 3 && (Math.abs(aDice(w.AP)) >= 2 || aDice(w.S) >= 8);
    const atR = rw.slice(0, 3).some(heavy), atM = mw.slice(0, 2).some(heavy);
    const antiInf = rw.slice(0, 3).some((w) => (aDice(w.A) >= 3 && aDice(w.D) <= 1.5) || /explosion|torrent/.test(nz(w.ab || '')));
    const t = aMet(d, n), rN = t.r / mx.r, mN = t.m / mx.m, dN = t.d / mx.d;
    const lead = e.c.grp === 'Chefs' || e.c.grp === 'Appuis'; const host = e.to ? picks.find((x) => x.k === e.to) : null;
    const wdesc = (w) => `${T0(w.name)} (${/^\d/.test(w.range || '') ? w.range + ', ' : ''}A${w.A} F${w.S} PA${w.AP} D${w.D})`;
    let key = 'poly', role = 'Polyvalent';
    if (lead) { key = 'lead'; role = e.c.d.support ? 'Appui' : e.c.epic ? 'Héros épique' : 'Chef'; }
    else if (e.c.ligne) { key = 'obj'; role = 'Tenir les objectifs'; }
    else if (tg.ds) { key = 'ds'; role = 'Frappe en profondeur'; }
    else if (tg.sc || tg.inf) { key = 'scout'; role = 'Avant-garde / infiltration'; }
    else if (e.c.veh && atR) { key = 'at'; role = 'Chasseur de blindés'; }
    else if (atR && rN >= mN) { key = 'at'; role = 'Tir anti-char'; }
    else if (rN >= 0.15 && rN > mN * 1.2) { key = antiInf ? 'ai' : 'tir'; role = antiInf ? 'Tir anti-infanterie' : 'Tir polyvalent'; }
    else if (mN >= 0.15 && mN > rN * 1.2) { key = 'cac'; role = e.c.veh ? 'Briseur de ligne' : 'Combat rapproché'; }
    else if (dN >= 0.45) { key = 'tank'; role = 'Encaisseur'; }
    const oc = aNum(m.OC);
    const goals = {
      obj: `Reste sur ou près d'un objectif de ta moitié de table et ne le lâche que pour le sécuriser ou en reprendre un. ${oc ? 'CO ' + oc + ' par figurine, ' + Math.round(t.o) + ' pour l\'unité.' : ''} Garde-la à couvert : en décor dense, l'infanterie est cachée (visible à 15" seulement) tant qu'elle ne tire pas.`,
      ds: `Garde-la en réserves stratégiques : elle arrive par Insertion (dès le round 2, à plus de 8" des ennemis) pour prendre un objectif adverse ou frapper l'arrière d'une unité de tir.`,
      scout: `Déploie-la en avant (Éclaireurs / Infiltrateurs) pour poser un objectif en premier ou gêner l'avance adverse.`,
      at: `Cible prioritaire : véhicules et monstres ennemis. ${rw[0] ? 'Arme clé : ' + wdesc(rw[0]) + '.' : ''} Tire dès le tour 1 depuis un couvert et reste hors de portée de charge.`,
      ai: `Nettoie les unités d'infanterie nombreuses et les unités qui tiennent un objectif. ${rw[0] ? 'Arme clé : ' + wdesc(rw[0]) + '.' : ''} Avance avec le milieu de table pour couvrir les objectifs.`,
      tir: `Appuie le reste de l'armée en tirant sur la menace la plus proche. ${rw[0] ? 'Arme clé : ' + wdesc(rw[0]) + '.' : ''} Reste à couvert (le couvert coûte −1 à la touche à l'adversaire).`,
      cac: `Avance à couvert, puis charge au tour 2 (une unité qui a Avancé ne peut pas charger) : après une charge elle a Combat en Premier. ${mw[0] ? 'Arme clé : ' + wdesc(mw[0]) + '.' : ''} Vise des unités déjà affaiblies par ton tir.`,
      tank: `Avance en tête pour absorber les tirs adverses et protéger les unités derrière elle ; sa résistance (${aNum(m.W)} PV, E${aNum(m.T)}, sauvegarde ${m.Sv || '?'}) lui permet de tenir un objectif central.`,
      poly: `Unité de remplissage : adapte-la à la situation (tir ou mêlée selon la cible) et garde-la près d'un objectif.`,
      lead: host ? `Rejoint ${host.c.d.name ? T0(host.c.d.name) : 'son escouade'} pour la faire profiter de ses aptitudes${(d.abilities || []).length ? ' (' + (d.abilities || []).filter((a) => a.type !== 'Core' && a.type !== 'Faction').slice(0, 2).map((a) => T0(a.name)).join(', ') + ')' : ''}. Reste dans l'unité : seul, il serait une cible facile.` : `Sans escouade à rejoindre dans cette liste : garde-le derrière tes lignes et utilise ses aptitudes (${(d.abilities || []).slice(0, 2).map((a) => T0(a.name)).join(', ') || 'voir la fiche'}) en soutien.`
    };
    if (e.c.epic) goals.lead += ' Héros épique : unique, protège-le.';
    const why = [];
    if (e.origin === 'must') why.push('Tu l\'as demandé dans tes préférences.');
    (e.pref || []).filter((x) => e.origin !== 'must' || true).slice(0, 2).forEach((x) => { if (e.origin !== 'must') why.push('Correspond à ta préférence : ' + x + '.'); });
    if (e.origin === 'ligne') why.push('Unité de Ligne : nécessaire pour disposer d\'assez de CO sur les objectifs.');
    if (lead) why.push(host ? 'Se rattache à une unité de ta liste, ce qui multiplie sa valeur.' : 'Chef retenu pour son efficacité par point.');
    const sl = (o.styles || []).map((s) => (STYLES.find((x) => x[0] === s) || [0, s])[1]);
    if (!lead) {
      if (key === 'at' || key === 'tir' || key === 'ai') why.push(`Bonne puissance de tir pour son prix (${e.p} pts)${sl.length ? ', cohérente avec le style « ' + sl.join(' + ') + ' »' : ''}.`);
      else if (key === 'cac') why.push(`Bonne puissance au corps à corps pour son prix (${e.p} pts)${sl.length ? ', cohérente avec le style « ' + sl.join(' + ') + ' »' : ''}.`);
      else if (key === 'tank') why.push('Solide pour son prix : elle protège le reste de la liste.');
      else if (key === 'ds' || key === 'scout') why.push('Apporte de la mobilité et de la souplesse de déploiement.');
      else if (e.origin === 'troop' || e.origin === 'fill') why.push(`Bon rapport puissance/points parmi les unités disponibles (${e.p} pts).`);
    }
    if (e.up) why.push(`Agrandie à ${e.n} figurines pour utiliser les points restants.`);
    if (e.origin === 'fill' && !e.up) why.push('Ajoutée en fin de composition pour dépenser les points restants.');
    if (e.enhName) why.push(`Porte l'amélioration « ${e.enhName} » (+${e.enhCost} pts).`);
    return { role, key, why, goal: goals[key], stats: `M ${m.M || '?'} · E ${m.T || '?'} · Sv ${m.Sv || '?'}${m.inv ? ' (' + m.inv + '++)' : ''} · PV ${m.W || '?'} · CO ${m.OC || '-'}`, wr: rw[0] ? wdesc(rw[0]) : '', wm: mw[0] ? wdesc(mw[0]) : '' };
  }
  const asKwChips = (f) => {
    const kc = {}; f.units.filter((d) => chOkUnit(d, AS.ch, AS.fac)).forEach((d) => new Set(kwShow(d)).forEach((k) => { kc[k] = (kc[k] || 0) + 1; }));
    const q = Wahap.norm(AS.q || ''); let l = Object.entries(kc).filter((x) => !q || Wahap.norm(x[0]).includes(q));
    l.sort((a, b) => ((AS.kws[b[0]] ? 1000 : 0) + b[1]) - ((AS.kws[a[0]] ? 1000 : 0) + a[1]));
    return l.slice(0, 36).map(([k, n]) => `<button type="button" class="chip${AS.kws[k] > 0 ? ' on' : ''}${AS.kws[k] < 0 ? ' no' : ''}" data-act="asKw" data-val="${esc(k)}">${AS.kws[k] > 0 ? '✓ ' : AS.kws[k] < 0 ? '✗ ' : ''}${esc(k)} <small>${n}</small></button>`).join('') || '<span class="muted">Aucun mot-clé.</span>';
  };
  function viewAssist() {
    let h = '<h1>Assistant</h1>';
    const ix = Wahap.index();
    if (!ix) {
      if (!AS.load) { AS.load = true; Wahap.ready().then(() => { AS.load = false; render(); }).catch((e) => { AS.load = false; AS.err = e.message; render(); }); }
      return h + `<div class="card">${AS.err ? '<div class="warn">' + esc(AS.err) + '</div>' : '<p class="muted">Chargement de la base…</p>'}</div>`;
    }
    const f = AS.fac ? Wahap.cached(AS.fac) : null;
    if (AS.fac && !f && !AS.load) { AS.load = true; Wahap.faction(AS.fac).then(() => { AS.load = false; render(); }).catch(() => { AS.load = false; AS.err = 'Faction introuvable.'; render(); }); }
    const opt = (v, l, sel) => `<option value="${esc(v)}" ${sel ? 'selected' : ''}>${esc(l)}</option>`;
    const sel2 = (k, arr) => `<select data-af="${k}">${arr.map((x) => opt(x[0], x[1], AS[k] === x[0])).join('')}</select>`;
    h += `<div class="card"><p class="muted" style="margin-top:0">Décris ce que tu veux : l'assistant compose 3 listes avec les données de l'appli (points, chapitre, détachement, chefs, améliorations) et explique chaque choix. Aucune IA générative : des règles de composition, tu gardes la main dans Creator.</p>
      <label>Faction</label><select data-af="fac"><option value="">— choisir —</option>${ix.factions.map((x) => opt(x.id, x.name, x.id === AS.fac)).join('')}</select>`;
    if (AS.fac && chList(AS.fac)) h += `<label style="margin-top:8px">Chapitre</label><select data-af="ch">${opt('', '— tous les chapitres —', !AS.ch)}${opt('codex', 'Chapitre générique (Codex)', AS.ch === 'codex')}${chList(AS.fac).map((c) => opt(c[0], c[1], AS.ch === c[0])).join('')}</select>`;
    h += `<div class="row" style="margin-top:8px"><div style="flex:1"><label>Format</label><select data-af="fmt">${FORMATS.map((x) => opt(x[0], x[1], x[0] === AS.fmt)).join('')}</select></div><div style="width:110px"><label>Limite (pts)</label><input type="number" inputmode="numeric" data-af="limit" value="${AS.limit || ''}"></div></div>
      <label style="margin-top:8px">Style de jeu (plusieurs possibles)</label><div class="chips">${STYLES.map(([k, l]) => `<button type="button" class="chip${(AS.styles || []).includes(k) ? ' on' : ''}" data-act="asStyle" data-val="${k}">${l}</button>`).join('')}</div>
      <label style="margin-top:10px">Tes préférences, en français libre</label><textarea data-af="free" placeholder="ex : beaucoup de Terminators, au moins 2 Dreadnought, avec un Apothicaire, sans aéronefs, pas de Lieutenant, peu de chefs" style="min-height:70px">${esc(AS.free || '')}</textarea>
      <div class="muted">Mots reconnus : <i>sans / pas de</i> (exclure), <i>beaucoup de / plus de</i> (favoriser), <i>peu de</i> (limiter), <i>2 …</i> ou <i>avec …</i> (inclure), un nom d'unité, un mot-clé, un style (tir, corps à corps, objectifs…).</div>`;
    if (f) {
      h += `<label style="margin-top:10px">Mots-clés : touche une fois pour privilégier ✓, deux fois pour exclure ✗</label><input type="search" id="asq" placeholder="Filtrer les mots-clés…" value="${esc(AS.q || '')}" autocomplete="off"><div class="chips" id="askw" style="margin-top:6px">${asKwChips(f)}</div>`;
      const dets = f.detachments.filter((d) => chOkDet(d, AS.ch, AS.fac));
      h += `<label style="margin-top:10px">Détachement</label><select data-af="det">${opt('', '— laisser l\'assistant choisir —', !AS.det)}${dets.map((d) => opt(d.id, T0(d.name), d.id === AS.det)).join('')}</select>`;
    } else if (AS.fac) h += '<p class="muted">Chargement des données de la faction…</p>';
    h += `<details style="margin-top:10px"><summary>Réglages avancés</summary><div class="grid g2">
      <div><label>Chefs</label>${sel2('leaders', [['few', 'Peu'], ['normal', 'Normal'], ['many', 'Beaucoup']])}</div>
      <div><label>Taille des escouades</label>${sel2('sizeMode', [['small', 'Petites'], ['auto', 'Auto'], ['big', 'Grandes']])}</div>
      <div><label>Doublons</label>${sel2('dups', [['low', 'Peu (variété)'], ['ok', 'Autorisés']])}</div>
      <div><label>Héros épiques</label>${sel2('epic', [['oui', 'Oui'], ['non', 'Non']])}</div>
      <div><label>Aéronefs</label>${sel2('air', [['non', 'Non'], ['oui', 'Oui']])}</div></div></details>`;
    h += `<div class="row" style="margin-top:12px"><button class="btn grow" data-act="asRun" ${f ? '' : 'disabled'}>🧭 Proposer 3 listes</button>${AS.res.length ? '<button class="btn ghost" data-act="asMore">🎲 Autres</button>' : ''}</div>${AS.err ? '<div class="warn" style="margin-top:8px">' + esc(AS.err) + '</div>' : ''}</div>`;
    if (AS.res.length && (AS.parsed.notes.length || AS.parsed.unknown.length)) h += `<div class="card"><h2>Ce que j'ai compris</h2><ul class="fxlist">${AS.parsed.notes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>${AS.parsed.unknown.length ? `<div class="warn">Non compris (ignoré) : ${AS.parsed.unknown.map(esc).join(' · ')}</div>` : ''}</div>`;
    if (AS.res.length) h += `<div class="row" style="margin:0 0 8px"><button class="btn small ghost" data-act="asExpand">${AS.expand ? '▴ Replier les explications' : '▾ Déplier les explications'}</button></div>`;
    AS.res.forEach((p, i) => {
      const L = 'ABC'[i]; const fc = AS.fac ? Wahap.cached(AS.fac) : null; const dOf = (id) => fc && fc.units.find((x) => x.id === id);
      const wrow = (w, key) => `<li>${key ? '★ ' : ''}<b>${wt(w.name)}</b>${w.ab ? ' <span class="muted">[' + esc(w.ab) + ']</span>' : ''} — ${esc(w.range)} · A${esc(w.A)} · ${esc(w.skill)} · F${esc(w.S)} · PA${esc(w.AP)} · D${esc(w.D)}</li>`;
      const det = fc && p.detId ? fc.detachments.find((x) => x.id === p.detId) : null;
      const tot = p.units.reduce((s, u) => s + u.pts, 0) || 1;
      const row = (u, ind) => `<details class="unit-item" style="${ind ? 'margin-left:18px' : ''}" ${AS.expand ? 'open' : ''}><summary style="color:inherit"><span>${ind ? '↳ ' : ''}${u.warlord ? '👑 ' : ''}<b>${esc(u.name)}</b> <span class="muted">(${u.n}) · ${u.pts + u.enhCost} pts</span></span> <span class="tag">${esc(u.role)}</span></summary>
        <div class="muted" style="margin:4px 0">${esc(u.stats)}${u.wr ? '<br>Tir : ' + esc(u.wr) : ''}${u.wm ? '<br>Mêlée : ' + esc(u.wm) : ''}${u.enhName ? '<br>✦ ' + esc(u.enhName) + ' (+' + u.enhCost + ' pts)' : ''}</div>
        ${(() => { const d = dOf(u.id); if (!d) return ''; const ws = d.weapons || []; const tw = (t) => ws.filter((w) => w.type === t).sort((a, b) => aWeap(b) - aWeap(a)); const key = new Set([].concat(tw('ranged').slice(0, 2), tw('melee').slice(0, 1)));
          const en = u.enhName && det ? (det.enh || []).find((x) => T0(x.name) === u.enhName) : null;
          return `${d.loadout ? '<div style="font-size:.9rem;margin:4px 0"><b>Équipement de base</b><div class="muted">' + wt(d.loadout) + '</div></div>' : ''}
          ${(u.wgl || []).length ? '<div style="font-size:.9rem;margin:4px 0"><b>Options choisies</b><ul class="fxlist" style="margin:2px 0">' + u.wgl.map((x) => '<li>' + wt(x.n) + ' <span class="muted">+' + x.p + ' pts</span></li>').join('') + '</ul></div>' : ''}
          ${ws.length ? '<details class="note"><summary><b>Armes (' + ws.length + ')</b> <span class="muted">★ = utilisées en priorité</span></summary><ul class="fxlist">' + ws.map((w) => wrow(w, key.has(w))).join('') + '</ul></details>' : ''}
          ${(d.abilities || []).length ? '<details class="note"><summary><b>Règles et aptitudes (' + d.abilities.length + ')</b></summary>' + d.abilities.map((a) => '<details class="note"><summary><b>' + (wt(a.name) || esc(a.type)) + '</b>' + (a.param ? ' ' + esc(a.param) : '') + ' <span class="muted">' + esc(abType(a.type)) + '</span></summary><div>' + wt(a.text) + '</div></details>').join('') + '</details>' : ''}
          ${en ? '<details class="note"><summary><b>✦ ' + wt(en.name) + '</b> · ' + esc(en.cost) + ' pts</summary><div>' + wt(en.text) + '</div></details>' : ''}`; })()}
        <div style="font-size:.9rem"><b>Pourquoi ce choix</b><ul class="fxlist" style="margin:2px 0 6px">${u.why.map((w) => `<li>${esc(w)}</li>`).join('')}</ul><b>Objectif de jeu</b><div style="margin-top:2px">${esc(u.goal)}</div></div></details>`;
      const top = p.units.filter((u) => !u.to);
      h += `<div class="card"><div class="row sp"><h2 style="margin:0">Proposition ${L}</h2><b ${p.total > p.limit ? 'style="color:#e5484d"' : ''}>${p.total} / ${p.limit} pts</b></div>
        <div class="muted">${esc(p.detName)} · ${p.units.length} unités · ${p.figs} figurines · CO ${p.oc} · ${Object.entries(p.shares).map(([g, v]) => esc(g) + ' ' + Math.round(100 * v / tot) + ' %').join(' · ')}</div>
        <ul class="fxlist" style="margin-top:8px">${p.why.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>
        ${det ? `<details class="note"><summary><b>Règles du détachement</b> · ${(det.strats || []).length} stratagèmes</summary>${(det.abilities || []).map((a) => `<details class="note"><summary><b>${wt(a.name)}</b></summary><div>${wt(a.text)}</div></details>`).join('')}${(det.strats || []).map((a) => `<details class="note"><summary>${wt(a.name)} <span class="muted">· ${esc(a.cp)} PC</span></summary><div>${wt(a.text)}</div></details>`).join('')}</details>` : ''}
        ${top.map((u) => row(u, false) + p.units.filter((x) => x.to === u.k).map((x) => row(x, true)).join('')).join('')}
        <div class="row" style="margin-top:10px"><button class="btn small" data-act="asOpen" data-val="${i}">✏️ Ouvrir dans Creator</button><button class="btn small ghost" data-act="asCreate" data-val="${i}">✅ Créer l'armée</button></div></div>`;
    });
    if (AS.res.length) h += '<p class="muted">Estimations heuristiques (puissance calculée d\'après les profils). Les points viennent de la base ; les limites de composition sont simplifiées (2 exemplaires par fiche par défaut, 3 en « Doublons autorisés », 4 à 6 pour la Ligne, 1 pour les Héros épiques) : vérifie la liste dans Creator.</p>';
    return h;
  }
  function asRunOpts(f) {
    const base = { fac: AS.fac, ch: AS.ch, limit: AS.limit || 1000, styles: (AS.styles || []).slice(), det: AS.det, leaders: AS.leaders, sizeMode: AS.sizeMode, dups: AS.dups, epic: AS.epic, air: AS.air };
    const P = aParse(AS.free, f, base);
    base.styles = Array.from(new Set(base.styles.concat(P.styles))); if (!base.styles.length) base.styles = ['equilibre'];
    base.avoid = P.avoid; base.must = P.must; base.excl = P.excl.slice(); base.boost = P.boost.slice();
    if (P.flags.air) base.air = P.flags.air; if (P.flags.epic) base.epic = P.flags.epic; if (P.flags.leaders) base.leaders = P.flags.leaders;
    base.kwPref = [];
    Object.entries(AS.kws || {}).forEach(([k, v]) => { const nk = Wahap.norm(k); const test = (c) => kwShow(c.d).some((x) => Wahap.norm(x) === nk); if (v > 0) { base.boost.push({ test, w: 1.8, label: 'mot-clé « ' + k + ' »' }); base.kwPref.push(k); } else if (v < 0) base.excl.push({ test }); });
    P.notes.push(...Object.entries(AS.kws || {}).filter(([, v]) => v).map(([k, v]) => (v > 0 ? 'Privilégier' : 'Exclure') + ' le mot-clé « ' + k + ' »'));
    AS.parsed = { notes: P.notes, unknown: P.unknown }; return base;
  }
  function asLoadB(i) {
    const p = AS.res[i]; if (!p) return false;
    Object.assign(B, bdef(), { fac: AS.fac, ch: AS.ch, fmt: AS.fmt, limit: AS.limit, name: p.name, dets: p.detId ? [p.detId] : [], units: p.units.map((u) => ({ k: u.k, id: u.id, models: u.n, pts: 0, wg: Object.assign({}, u.wg || {}), to: u.to || '', enh: u.enh || '', woff: [], aoff: [] })), warlord: p.warlord, cm: 'build', editId: '' });
    bsave(); return true;
  }

  /* ---- Onglet Règles (11e) ---- */
  const RS = { q: '', open: {} };
  const rnorm = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, "'");
  function rBody(lines, terms) {
    const seg = (t) => { if (!terms.length) return esc(t); const np = rnorm(t); const rg = []; terms.forEach((w) => { let i = 0; while ((i = np.indexOf(w, i)) >= 0) { rg.push([i, i + w.length]); i += w.length; } }); if (!rg.length || np.length !== t.length) return esc(t); rg.sort((x, y) => x[0] - y[0]); const m = []; rg.forEach((r) => { const l = m[m.length - 1]; if (l && r[0] <= l[1]) l[1] = Math.max(l[1], r[1]); else m.push(r.slice()); }); let o = '', p = 0; m.forEach((r) => { o += esc(t.slice(p, r[0])) + '<mark>' + esc(t.slice(r[0], r[1])) + '</mark>'; p = r[1]; }); return o + esc(t.slice(p)); };
    const mark = (t) => String(t).split(/(\[[^\]]+\])/).map((x) => (/^\[[^\]]+\]$/.test(x) ? '<b>' + seg(x) + '</b>' : seg(x))).join('');
    let h = '', ul = false, tb = false;
    const close = () => { if (ul) { h += '</ul>'; ul = false; } if (tb) { h += '</tbody></table>'; tb = false; } };
    lines.forEach((l) => {
      if (l.startsWith('- ')) { if (tb) close(); if (!ul) { h += '<ul class="fxlist">'; ul = true; } h += '<li>' + mark(l.slice(2)) + '</li>'; }
      else if (l.startsWith('| ')) { if (ul) close(); const c = l.replace(/^\|\s*|\s*\|$/g, '').split(/\s*\|\s*/); if (!tb) { h += '<table class="rtab"><tbody>'; tb = true; h += '<tr>' + c.map((x) => '<th>' + mark(x) + '</th>').join('') + '</tr>'; } else h += '<tr>' + c.map((x) => '<td>' + mark(x) + '</td>').join('') + '</tr>'; }
      else if (l.startsWith('## ')) { close(); h += '<h4>' + mark(l.slice(3)) + '</h4>'; }
      else if (l.startsWith('! ')) { close(); h += '<p class="rfaq">💡 ' + mark(l.slice(2)) + '</p>'; }
      else { close(); h += '<p>' + mark(l) + '</p>'; }
    });
    close(); return h;
  }
  function rulesResults() {
    const R = (typeof RULES11 !== 'undefined' && RULES11) || [];
    const terms = rnorm(RS.q).split(/\s+/).filter((w) => w.length > 1 || /^\d$/.test(w));
    if (!terms.length) {
      let h = '', g = '';
      R.forEach((c) => {
        if (c.g !== g) { g = c.g; h += `<div class="rgrp">${esc(g)}</div>`; }
        const id = 'c' + c.n; const op = RS.open[id];
        h += `<details class="rch" data-rid="${id}" ${op ? 'open' : ''}><summary><span class="rn">${esc(c.n)}</span> ${esc(c.t)}</summary>${c.s.map((x) => `<div class="rsec" id="r${esc(x.n.replace(/\./g, '_'))}"><h3><span class="rn">${esc(x.n)}</span> ${esc(x.t)}</h3>${rBody(x.p, [])}</div>`).join('')}</details>`;
      });
      return h || '<p class="muted">Aucune règle chargée.</p>';
    }
    const hits = [];
    R.forEach((c) => c.s.forEach((x) => {
      const head = rnorm(c.n + ' ' + c.t + ' ' + x.n + ' ' + x.t), body = rnorm(x.p.join(' '));
      const all = head + ' ' + body;
      if (terms.every((w) => all.includes(w))) hits.push({ c, x, score: terms.reduce((a, w) => a + (head.includes(w) ? 3 : 0) + (body.split(w).length - 1), 0) });
    }));
    hits.sort((a, b) => b.score - a.score);
    if (!hits.length) return '<p class="muted">Aucune règle ne correspond. Essaie un seul mot (ex. « couvert », « cohésion », « Dangereux »).</p>';
    return `<p class="muted">${hits.length} section(s) trouvée(s)</p>` + hits.map(({ c, x }) => `<div class="card rsec"><div class="muted" style="font-size:.78rem">${esc(c.n)} · ${esc(c.t)}</div><h3><span class="rn">${esc(x.n)}</span> ${esc(x.t)}</h3>${rBody(x.p, terms)}</div>`).join('');
  }
  function viewRules() {
    const R = (typeof RULES11 !== 'undefined' && RULES11) || [];
    return `<h1>Règles</h1><div class="card"><div class="muted" style="margin-bottom:6px">Règles de base de la 11e édition, résumées en français (${R.reduce((a, c) => a + c.s.length, 0)} sections : concepts, phases, décor, objectifs, stratagèmes, actions, règles avancées, aptitudes de base). Non inclus pour l\'instant : constitution d\'armée (Muster Armies). En cas de doute, le texte officiel fait foi.</div><input type="search" id="rq" placeholder="Chercher une règle : couvert, charge, Dangereux, cohésion…" value="${esc(RS.q)}" autocomplete="off"></div><div id="rres">${rulesResults()}</div>`;
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

  /* ----- Compte en ligne + synchronisation entre appareils (Supabase, fusion à trois voies) ----- */
  var SY = { busy: false, msg: '', err: '', timer: null, applying: false, mode: 'login', chg: false };
  const SKEY = 'noobammer.sync.v2';
  const cloud = () => (window.NH_CLOUD && NH_CLOUD.url && NH_CLOUD.key ? { url: NH_CLOUD.url.replace(/\/+$/, ''), key: NH_CLOUD.key } : null);
  const syCfg = () => { try { return JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) { return null; } };
  const sySet = (c) => { try { if (c) localStorage.setItem(SKEY, JSON.stringify(c)); else localStorage.removeItem(SKEY); } catch (e) { /* ignoré */ } };
  const syHash = (o) => { const s = JSON.stringify(o); let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return String(h) + ':' + s.length; };
  const syErr = (j, st) => {
    const m = String((j && (j.msg || j.error_description || j.message || j.error)) || '');
    if (/invalid login/i.test(m)) return 'Email ou mot de passe incorrect.';
    if (/already registered|already been registered/i.test(m)) return 'Un compte existe déjà avec cet email.';
    if (/email not confirmed/i.test(m)) return 'Confirme ton email (lien reçu par mail), puis connecte-toi.';
    if (/password/i.test(m) && /(least|short|weak)/i.test(m)) return 'Mot de passe trop court (6 caractères minimum).';
    if (/database error saving/i.test(m)) return 'Pseudo déjà pris ou invalide.';
    if (/rate limit|too many/i.test(m)) return 'Trop de tentatives, réessaie dans un instant.';
    if (/pseudo|profiles/i.test(m) && /(unique|duplicate)/i.test(m)) return 'Ce pseudo est déjà pris.';
    return m || ('Erreur ' + st + '.');
  };
  async function syReq(path, opt, token) {
    const c = cloud(); if (!c) throw new Error('Compte en ligne non configuré.');
    const o = opt || {}; const headers = Object.assign({ apikey: c.key, Authorization: 'Bearer ' + (token || c.key) }, o.body ? { 'Content-Type': 'application/json' } : {}, o.headers || {});
    let r; try { r = await fetch(c.url + path, Object.assign({}, o, { headers })); } catch (e) { throw new Error('Hors ligne ou serveur inaccessible.'); }
    let j = null; try { j = await r.json(); } catch (e) { /* corps vide */ }
    if (!r.ok) { const er = new Error(syErr(j, r.status)); er.status = r.status; throw er; }
    return j;
  }
  const sySession = (j, prev) => ({ access: j.access_token, refresh: j.refresh_token, exp: Date.now() + (j.expires_in || 3600) * 1000, uid: j.user.id, email: j.user.email, pseudo: ((j.user.user_metadata || {}).pseudo) || (prev && prev.pseudo) || '' });
  async function syToken(cfg) {
    if (cfg.s.exp - Date.now() > 60000) return cfg.s.access;
    try { const j = await syReq('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: cfg.s.refresh }) }); cfg.s = sySession(j, cfg.s); sySet(cfg); return cfg.s.access; }
    catch (e) { if (e.status >= 400 && e.status < 500) { cfg.s = null; sySet(Object.assign({}, cfg, { s: null })); throw new Error('Session expirée : reconnecte-toi.'); } throw e; }
  }
  function syLocal() {
    const armies = {}; libArmies().forEach((a) => { armies[a.id] = { army: a, rules: S.armyRules[a.id] || [], strats: S.customStrats.filter((s) => s.armyId === a.id) }; });
    const games = {}; readGames().forEach((g) => { games[g.id] = g; });
    return { v: 1, armies, games };
  }
  /* Fusion à trois voies par élément : local / distant / dernier état synchronisé (base) */
  function syMerge(L, R, base) {
    const out = { v: 1, armies: {}, games: {} }; let conflicts = 0;
    ['armies', 'games'].forEach((k) => {
      const ids = Array.from(new Set(Object.keys(L[k] || {}).concat(Object.keys(R[k] || {}), Object.keys(base[k] || {}))));
      ids.forEach((id) => {
        const l = (L[k] || {})[id], r = (R[k] || {})[id], b = (base[k] || {})[id];
        const hl = l ? syHash(l) : null, hr = r ? syHash(r) : null;
        let pick;
        if (hl === hr) pick = l;
        else if (hl === b) pick = r;
        else if (hr === b) pick = l;
        else if (!l) pick = r;
        else if (!r) pick = l;
        else if (k === 'games') pick = (l.at || 0) >= (r.at || 0) ? l : r;
        else {
          pick = l; conflicts++;
          const c = JSON.parse(JSON.stringify(r)); const nid = uid(); c.army.id = nid; c.army.name = (c.army.name || 'Armée') + ' (autre appareil)'; c.strats.forEach((s) => { s.armyId = nid; s.id = 'c_' + uid(); });
          out.armies[nid] = c;
        }
        if (pick) out[k][id] = pick;
      });
    });
    out.conflicts = conflicts; return out;
  }
  function syApply(m) {
    const ids = new Set(Object.keys(m.armies)); const old = libArmies();
    const order = old.filter((a) => ids.has(a.id)).map((a) => a.id).concat(Object.keys(m.armies).filter((id) => !old.some((a) => a.id === id)));
    S.armies = S.armies.filter((a) => a.gameOf).concat(order.map((id) => m.armies[id].army));
    const lib = new Set(old.map((a) => a.id).concat(order));
    lib.forEach((id) => { delete S.armyRules[id]; });
    S.customStrats = S.customStrats.filter((s) => !lib.has(s.armyId));
    order.forEach((id) => { const e = m.armies[id]; if (e.rules && e.rules.length) S.armyRules[id] = e.rules; (e.strats || []).forEach((s) => S.customStrats.push(s)); });
    const cur = S.gameId; const gl = readGames(); const keep = {};
    Object.keys(m.games).forEach((id) => { keep[id] = (id === cur && gl.find((g) => g.id === id)) || m.games[id]; });
    if (cur && !keep[cur]) { const g = gl.find((x) => x.id === cur); if (g) keep[cur] = g; }
    writeGames(Object.keys(keep).map((id) => keep[id]).sort((a, b) => (b.at || 0) - (a.at || 0)));
    if (!S.armies.some((a) => a.id === S.armyId && !a.gameOf)) restoreLib();
  }
  async function syncRun(manual) {
    const cfg = syCfg(); if (!cfg || !cfg.s || SY.busy || !cloud()) return;
    SY.busy = true; if (manual) { SY.err = ''; SY.msg = 'Synchronisation…'; render(); }
    try {
      const tok = await syToken(cfg);
      const rows = await syReq('/rest/v1/sync_docs?select=doc&user_id=eq.' + cfg.s.uid, {}, tok);
      const remote = (rows && rows[0] && rows[0].doc) || { v: 1, armies: {}, games: {} };
      remote.armies = remote.armies || {}; remote.games = remote.games || {};
      const L = syLocal(); const base = cfg.base || { armies: {}, games: {} };
      const m = syMerge(L, remote, base);
      const mh = { armies: {}, games: {} }; ['armies', 'games'].forEach((k) => Object.keys(m[k]).forEach((i) => { mh[k][i] = syHash(m[k][i]); }));
      const same = (a, b) => { const ka = Object.keys(a), kb = Object.keys(b); return ka.length === kb.length && ka.every((i) => b[i] && syHash(a[i]) === syHash(b[i])); };
      const changeLocal = !(same(m.armies, L.armies) && same(m.games, L.games));
      const changeRemote = !(same(m.armies, remote.armies) && same(m.games, remote.games)) || !rows.length;
      if (changeRemote) await syReq('/rest/v1/sync_docs?on_conflict=user_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: cfg.s.uid, doc: { v: 1, armies: m.armies, games: m.games }, updated_at: new Date().toISOString() }) }, tok);
      if (changeLocal) { SY.chg = true; SY.applying = true; syApply(m); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignoré */ } SY.applying = false; }
      cfg.base = mh; cfg.last = Date.now(); sySet(cfg);
      SY.err = ''; SY.msg = (changeLocal || changeRemote ? 'Synchronisé : ' + (changeLocal ? 'données reçues' : '') + (changeLocal && changeRemote ? ' et ' : '') + (changeRemote ? 'données envoyées' : '') : 'Déjà à jour') + (m.conflicts ? ' · ' + m.conflicts + ' conflit(s) : copie « (autre appareil) » créée' : '') + '.';
    } catch (e) { SY.applying = false; SY.err = e.message || 'Échec de la synchronisation.'; SY.msg = ''; }
    SY.busy = false; if (manual || SY.err || SY.chg) render(); SY.chg = false;
  }
  async function syAuth(mode) {
    const g = (id) => ((document.getElementById(id) || {}).value || '').trim();
    const email = g('sy-email'), pw = (document.getElementById('sy-pw') || {}).value || '', pseudo = g('sy-pseudo');
    SY.email = email; SY.pseudo = pseudo;
    if (!email || !pw) { SY.err = 'Renseigne email et mot de passe.'; SY.msg = ''; render(); return; }
    if (mode === 'signup' && !/^[A-Za-z0-9_\-]{3,20}$/.test(pseudo)) { SY.err = 'Pseudo : 3 à 20 caractères (lettres, chiffres, _ ou -).'; SY.msg = ''; render(); return; }
    SY.busy = true; SY.err = ''; SY.msg = mode === 'signup' ? 'Création du compte…' : 'Connexion…'; render();
    try {
      let j;
      if (mode === 'signup') {
        j = await syReq('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email, password: pw, data: { pseudo } }) });
        if (!j.access_token) { SY.busy = false; SY.msg = 'Compte créé. Confirme ton email (lien reçu par mail), puis connecte-toi.'; SY.mode = 'login'; render(); return; }
      } else j = await syReq('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password: pw }) });
      sySet({ s: sySession(j), base: { armies: {}, games: {} }, last: 0 }); SY.busy = false; SY.msg = ''; await syncRun(true); frLoad(true);
    } catch (e) { SY.busy = false; SY.err = e.message; SY.msg = ''; render(); }
  }
  function syncSoon() { if (SY.applying || !syCfg() || !syCfg().s) return; clearTimeout(SY.timer); SY.timer = setTimeout(() => syncRun(false), 6000); }
  function syncCard() {
    const c = syCfg(); let h = '<div class="card"><h2>Compte et synchronisation</h2>';
    if (!cloud()) h += '<p class="muted" style="margin:0">Le compte en ligne n\'est pas encore activé sur ce site (configuration du service manquante).</p>';
    else if (!c || !c.s) {
      h += `<p class="muted" style="margin-top:0">Crée un compte pour retrouver tes armées et tes parties sur tous tes appareils (téléphone, PC…).</p>
        <div class="seg"><button type="button" class="${SY.mode === 'login' ? 'on' : ''}" data-act="syMode" data-val="login">Se connecter</button><button type="button" class="${SY.mode === 'signup' ? 'on' : ''}" data-act="syMode" data-val="signup">Créer un compte</button></div>
        ${SY.mode === 'signup' ? `<label>Pseudo</label><input type="text" id="sy-pseudo" value="${esc(SY.pseudo || '')}" autocomplete="nickname" maxlength="20" placeholder="Ton pseudo (visible de tes amis)">` : ''}
        <label>Email</label><input type="text" id="sy-email" value="${esc(SY.email || '')}" inputmode="email" autocomplete="email" placeholder="toi@exemple.fr">
        <label style="margin-top:8px">Mot de passe</label><input type="password" id="sy-pw" autocomplete="${SY.mode === 'signup' ? 'new-password' : 'current-password'}" placeholder="6 caractères minimum">
        <button class="btn" style="margin-top:10px" data-act="${SY.mode === 'signup' ? 'syncUp' : 'syncIn'}" ${SY.busy ? 'disabled' : ''}>${SY.mode === 'signup' ? 'Créer mon compte' : 'Me connecter'}</button>`;
    } else {
      h += `<p style="margin-top:0">✅ Connecté : <b>${esc(c.s.pseudo || c.s.email)}</b> <span class="muted">${esc(c.s.email)}</span></p><p class="muted">${c.last ? 'Dernière synchro : ' + esc(new Date(c.last).toLocaleString('fr-FR')) + '. ' : ''}Synchronisation automatique à l'ouverture, au retour sur l'appli et peu après chaque modification.</p>
        <div class="row"><button class="btn grow" data-act="syncNow" ${SY.busy ? 'disabled' : ''}>🔄 Synchroniser maintenant</button><button class="btn ghost" data-act="syncOff">Se déconnecter</button></div>`;
    }
    if (SY.msg) h += `<div class="note" style="margin-top:8px">${esc(SY.msg)}</div>`;
    if (SY.err) h += `<div class="warn" style="margin-top:8px">${esc(SY.err)}</div>`;
    return h + '</div>';
  }

  /* ----- Amis et invitations de parties en ligne (Supabase) ----- */
  var FR = { friends: [], incoming: [], outgoing: [], invites: [], msg: '', err: '', busy: false, loaded: false, sig: '' };
  const frOn = () => { const c = syCfg(); return !!(cloud() && c && c.s); };
  async function frReq(path, opt) { const cfg = syCfg(); const tok = await syToken(cfg); return syReq(path, opt, tok); }
  async function frLoad(silent) {
    if (!frOn() || FR.busy) return;
    FR.busy = true;
    try {
      const uid = syCfg().s.uid;
      const rows = await frReq('/rest/v1/friendships?select=id,requester,addressee,status');
      const others = Array.from(new Set(rows.map((r) => (r.requester === uid ? r.addressee : r.requester))));
      const prof = others.length ? await frReq('/rest/v1/profiles?select=id,pseudo&id=in.(' + others.join(',') + ')') : [];
      const nm = {}; prof.forEach((p) => { nm[p.id] = p.pseudo; });
      const mk = (r) => ({ fid: r.id, uid: r.requester === uid ? r.addressee : r.requester, pseudo: nm[r.requester === uid ? r.addressee : r.requester] || '?' });
      FR.friends = rows.filter((r) => r.status === 'accepted').map(mk).sort((a, b) => a.pseudo.localeCompare(b.pseudo));
      FR.incoming = rows.filter((r) => r.status === 'pending' && r.addressee === uid).map(mk);
      FR.outgoing = rows.filter((r) => r.status === 'pending' && r.requester === uid).map(mk);
      const inv = await frReq('/rest/v1/game_invites?select=id,from_user,code,created_at&to_user=eq.' + uid + '&order=created_at.desc');
      const fresh = inv.filter((i) => Date.now() - new Date(i.created_at).getTime() < 6 * 3600 * 1000);
      inv.filter((i) => !fresh.includes(i)).forEach((i) => { frReq('/rest/v1/game_invites?id=eq.' + i.id, { method: 'DELETE' }).catch(() => {}); });
      const fn = {}; FR.friends.forEach((f) => { fn[f.uid] = f.pseudo; });
      FR.invites = fresh.map((i) => ({ id: i.id, from: fn[i.from_user] || 'Un ami', code: i.code }));
      FR.err = ''; FR.loaded = true;
    } catch (e) { FR.err = e.message; }
    FR.busy = false;
    const sig = JSON.stringify([FR.friends, FR.incoming, FR.invites, FR.err]);
    if (sig !== FR.sig) { FR.sig = sig; if (!silent || !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) render(); }
  }
  const frDo = async (fn, ok) => { FR.err = ''; FR.msg = ''; while (FR.busy) await new Promise((r) => setTimeout(r, 100)); try { await fn(); FR.msg = ok || ''; } catch (e) { FR.err = e.message; } FR.sig = ''; await frLoad(); render(); };
  function frInvitesHtml() {
    if (!frOn() || !FR.invites.length) return '';
    return FR.invites.map((i) => `<div class="note" style="border-color:var(--accent)"><div class="row sp"><span>🎲 <b>${esc(i.from)}</b> t'invite à une partie en ligne</span><span class="row"><button class="btn small" data-act="frJoin" data-val="${esc(i.id)}">Rejoindre</button><button class="btn small ghost" data-act="frDecline" data-val="${esc(i.id)}">Ignorer</button></span></div></div>`).join('');
  }
  function frInviteButtons() {
    if (!frOn() || !FR.friends.length) return '';
    return `<label style="margin-top:8px">Inviter un ami</label><div class="chips">${FR.friends.map((f) => `<button type="button" class="chip" data-act="frInvite" data-val="${esc(f.uid)}">✉ ${esc(f.pseudo)}</button>`).join('')}</div>`;
  }
  function friendsCard() {
    if (!frOn()) return '';
    let h = '<div class="card"><h2>Amis</h2>';
    if (FR.incoming.length) h += `<label>Demandes reçues</label>${FR.incoming.map((f) => `<div class="row sp" style="margin:4px 0"><b>${esc(f.pseudo)}</b><span class="row"><button class="btn small" data-act="frAccept" data-val="${esc(f.fid)}">Accepter</button><button class="btn small ghost" data-act="frRemove" data-val="${esc(f.fid)}">Refuser</button></span></div>`).join('')}`;
    h += FR.friends.length ? FR.friends.map((f) => `<div class="row sp" style="margin:4px 0"><span>👤 <b>${esc(f.pseudo)}</b></span><span class="row"><button class="btn small" data-act="frInvite" data-val="${esc(f.uid)}">🎲 Inviter</button><button class="btn small ghost" data-act="frRemove" data-val="${esc(f.fid)}" title="Retirer">✕</button></span></div>`).join('') : (FR.loaded ? '<p class="muted" style="margin:0 0 6px">Aucun ami pour l\'instant.</p>' : '<p class="muted" style="margin:0 0 6px">Chargement…</p>');
    if (FR.outgoing.length) h += `<div class="muted">En attente de réponse : ${FR.outgoing.map((f) => esc(f.pseudo)).join(', ')}</div>`;
    h += `<label style="margin-top:8px">Ajouter un ami (son pseudo)</label><div class="row"><input type="text" id="fr-pseudo" maxlength="20" placeholder="Pseudo exact" style="flex:1" autocomplete="off" autocapitalize="off"><button class="btn" data-act="frAdd">Ajouter</button></div>`;
    if (FR.msg) h += `<div class="note" style="margin-top:8px">${esc(FR.msg)}</div>`;
    if (FR.err) h += `<div class="warn" style="margin-top:8px">${esc(FR.err)}</div>`;
    return h + '</div>';
  }
  const frInvitesCardHome = () => (frOn() && FR.invites.length ? `<div class="card"><h2>Invitations</h2>${frInvitesHtml()}</div>` : '');
  const frActions = {
    frAdd() {
      const p = ((document.getElementById('fr-pseudo') || {}).value || '').trim(); if (!p) { FR.err = 'Entre le pseudo de ton ami.'; render(); return; }
      frDo(async () => {
        const uid = syCfg().s.uid;
        const r = await frReq('/rest/v1/rpc/find_user', { method: 'POST', body: JSON.stringify({ p }) });
        if (!r || !r[0]) throw new Error('Aucun joueur avec ce pseudo.');
        const t = r[0];
        const inc = FR.incoming.find((f) => f.uid === t.id);
        if (inc) { await frReq('/rest/v1/friendships?id=eq.' + inc.fid, { method: 'PATCH', body: JSON.stringify({ status: 'accepted' }) }); return; }
        if (FR.friends.some((f) => f.uid === t.id)) throw new Error(t.pseudo + ' est déjà dans tes amis.');
        if (FR.outgoing.some((f) => f.uid === t.id)) throw new Error('Demande déjà envoyée à ' + t.pseudo + '.');
        await frReq('/rest/v1/friendships', { method: 'POST', body: JSON.stringify({ requester: uid, addressee: t.id }) });
      }, 'Demande envoyée (ou ami ajouté).');
    },
    frAccept(id) { frDo(() => frReq('/rest/v1/friendships?id=eq.' + id, { method: 'PATCH', body: JSON.stringify({ status: 'accepted' }) }), 'Ami ajouté.'); },
    frRemove(id) { if (!confirm('Retirer cette personne de tes amis ?')) return; frDo(() => frReq('/rest/v1/friendships?id=eq.' + id, { method: 'DELETE' }), 'Retiré.'); },
    frInvite(uid) {
      const f = FR.friends.find((x) => x.uid === uid); if (!f) return;
      frDo(async () => {
        if (!(S.net.code && S.net.role === 'h' && net.status !== 'off')) { S.net.nick = S.net.nick && S.net.nick !== 'Joueur' ? S.net.nick : (syCfg().s.pseudo || 'Joueur'); const code = newCode(); ensureGame('Partie en ligne ' + code); netStart('h', code); }
        await frReq('/rest/v1/game_invites', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ from_user: syCfg().s.uid, to_user: uid, code: S.net.code }) });
      }, 'Invitation envoyée à ' + f.pseudo + '. Ta partie est créée (code ' + (S.net.code || '') + ') : va dans « Parties » pour l\'attendre.');
    },
    frJoin(id) {
      const i = FR.invites.find((x) => x.id === id); if (!i) return;
      if (S.enemy && !S.enemy.live && !confirm('Rejoindre une partie en ligne ? Ton armée adverse locale sera remplacée par celle de ton adversaire.')) return;
      if (!S.net.nick || S.net.nick === 'Joueur') S.net.nick = (syCfg().s.pseudo) || 'Joueur';
      ensureGame('Partie en ligne ' + i.code); netStart('g', i.code); S.tab = 'game';
      frReq('/rest/v1/game_invites?id=eq.' + id, { method: 'DELETE' }).catch(() => {}); FR.invites = FR.invites.filter((x) => x.id !== id); FR.sig = '';
    },
    frDecline(id) { frDo(() => frReq('/rest/v1/game_invites?id=eq.' + id, { method: 'DELETE' }), ''); },
  };

  /* ----- Accueil, hub des parties, écran de partie ----- */
  function viewHome() {
    const a = army(); const l = readGames();
    let h = `<h1 style="text-align:center;margin:4px 0 2px">NoobHammer40k</h1><p class="muted" style="text-align:center;margin:0 0 10px">Ton aide-mémoire de table : dés à jeter, bonus, stratagèmes et cibles.</p><div class="hero" style="margin-top:0"><img src="icons/accueil.jpg" alt="Un eldar et un ork face a face autour d une table de jeu de figurines" width="477" height="441"></div><div style="height:12px"></div>`;
    h += `<div class="card">`;
    h += `<div class="row"><button class="btn grow" data-act="tab" data-val="game">🎲 Parties${l.length ? ' (' + l.length + ')' : ''}</button><button class="btn ghost grow" data-act="tab" data-val="army">🛡️ Mes armées</button></div></div>`;
    h += syncCard() + frInvitesCardHome() + friendsCard();
    return h;
  }
  function newGameCard() {
    const ng = S.ui.ng || {}; const a = army(); const lib = libArmies();
    const quick = '';
    if (!ng.open) return `${quick}<button class="btn" style="width:100%;margin-bottom:12px" data-act="ngToggle">➕ Nouvelle partie</button>`;
    const seg = (act, cur, items) => `<div class="seg">${items.map(([v, l]) => `<button type="button" class="${cur === v ? 'on' : ''}" data-act="${act}" data-val="${v}">${l}</button>`).join('')}</div>`;
    let h = `${quick}<div class="card"><div class="row sp"><h2 style="margin:0">Nouvelle partie</h2><button class="btn small ghost" data-act="ngToggle">Fermer</button></div>
      <label style="margin-top:8px">Type de partie</label>${seg('ngMode', ng.mode || '', [['local', '🏠 Locale'], ['online', '🌐 En ligne']])}`;
    if (!ng.mode) return h + '<p class="muted">Locale : vous jouez à la même table. En ligne : chacun sur son appareil, avec un code ou en invitant un ami.</p></div>';
    h += `<label>Ma liste d'armée</label><select data-bind="armyId">${lib.map((x) => `<option value="${x.id}" ${x.id === S.armyId ? 'selected' : ''}>${esc(x.name)}</option>`).join('') || '<option value="">(aucune armée)</option>'}</select>
      ${a ? '' : '<div class="warn" style="margin-top:8px">Importe ou crée d\'abord une armée (onglets Armées ou Creator).</div>'}
      <label style="margin-top:8px">Nom de la partie (facultatif)</label><input type="text" data-bind="ui.ngName" value="${esc(S.ui.ngName || '')}" placeholder="${esc(defaultGameName())}">`;
    if (ng.mode === 'local') {
      h += S.enemy ? `<div class="note" style="margin-top:8px">Adversaire : <b>${esc(S.enemy.name)}</b>${S.enemy.live ? ' (en direct)' : ''} · ${S.enemy.units.length} unités.${S.enemy.live ? '' : ' <button class="btn small ghost" data-act="enemyDrop">Retirer</button>'}</div>`
        : '<details style="margin-top:8px"><summary>Armée adverse (facultatif)</summary>' + enemyImportCard() + '</details><p class="muted">Tu pourras aussi l\'ajouter plus tard, pendant la partie.</p>';
    } else {
      const on = frOn();
      h += `<label style="margin-top:8px">Comment inviter l'adversaire ?</label>${seg('ngOnline', ng.online || 'code', [['code', '🔑 Avec un code'], ['friend', '👥 Inviter un ami']])}`;
      if ((ng.online || 'code') === 'code') h += '<p class="muted">Un code à 5 caractères sera créé : donne-le à ton adversaire, qui le saisit dans « Rejoindre une partie ».</p>';
      else if (!on) h += '<div class="warn">Connecte-toi à ton compte (page d\'accueil) pour inviter un ami.</div>';
      else if (!FR.friends.length) h += '<div class="muted">Tu n\'as pas encore d\'ami : ajoute-en depuis la page d\'accueil.</div>';
      else h += `<div class="chips">${FR.friends.map((f) => `<button type="button" class="chip${ng.friend === f.uid ? ' on' : ''}" data-act="ngFriend" data-val="${esc(f.uid)}">${esc(f.pseudo)}</button>`).join('')}</div>`;
    }
    const can = !!a && (ng.mode === 'local' || (ng.online || 'code') === 'code' || !!ng.friend);
    return h + `<div class="row" style="margin-top:12px"><button class="btn grow" data-act="gameCreate" ${can ? '' : 'disabled'}>🎲 Créer la partie</button></div></div>`;
  }
  function viewHub() {
    let h = `<h1>Parties</h1>` + newGameCard();
    h += frInvitesHtml() ? `<div class="card"><h2>Invitations</h2>${frInvitesHtml()}</div>` : '';
    h += onlineCard() + gamesCard();
    return h;
  }
  function viewGame() {
    if (!S.inGame) return viewHub();
    const head = `<div class="row sp" style="margin-bottom:8px"><button class="btn small ghost" data-act="gameClose">← Parties</button><span class="muted" style="flex:1;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${S.gameId ? esc(S.gameName) : 'Partie rapide'}</span><button class="btn small" data-act="gameSave">💾</button></div>${army() ? `<div class="muted" style="margin:-4px 0 8px;text-align:center">Liste associée : <b>${esc(army().name)}</b> · <span data-act="tab" data-val="army" style="color:var(--accent);cursor:pointer;text-decoration:underline">voir / changer</span></div>` : ''}${S.gameId ? `<div class="chips" style="margin-bottom:8px">${tog('Sauvegarde automatique', 'autoGame')}</div>` : '<div class="muted" style="margin-bottom:8px">Partie rapide non enregistrée : appuie sur 💾 pour la nommer et la garder.</div>'}${S.ui.gameMsg ? `<div class="note">${esc(S.ui.gameMsg)}</div>` : ''}`;
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
    ngToggle() { const ng = S.ui.ng || {}; S.ui = Object.assign({}, S.ui, { ng: Object.assign({}, ng, { open: !ng.open }) }); },
    ngMode(v) { S.ui = Object.assign({}, S.ui, { ng: Object.assign({}, S.ui.ng, { mode: v }) }); },
    ngOnline(v) { S.ui = Object.assign({}, S.ui, { ng: Object.assign({}, S.ui.ng, { online: v }) }); },
    ngFriend(v) { S.ui = Object.assign({}, S.ui, { ng: Object.assign({}, S.ui.ng, { friend: v }) }); },
    gameCreate() {
      const a = army(); if (!a) { alert('Importe ou crée d\'abord une armée.'); return; }
      const ng = S.ui.ng || {}; const typed = (S.ui.ngName || '').trim();
      if (ng.mode === 'online') {
        if (S.enemy && !S.enemy.live && !confirm('Créer une partie en ligne ? Ton armée adverse locale sera remplacée par celle de ton adversaire.')) return;
        if (!S.net.nick || !S.net.nick.trim()) S.net.nick = (frOn() && syCfg().s.pseudo) || 'Joueur';
        const code = newCode(); ensureGame(typed || ('Partie en ligne ' + code)); netStart('h', code);
        S.ui = { gameMsg: '✓ Partie en ligne créée (code ' + code + ').' };
        if ((ng.online || 'code') === 'friend' && ng.friend) {
          const f = FR.friends.find((x) => x.uid === ng.friend);
          frReq('/rest/v1/game_invites', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ from_user: syCfg().s.uid, to_user: ng.friend, code }) })
            .then(() => { S.ui = Object.assign({}, S.ui, { gameMsg: '✓ Partie créée. Invitation envoyée à ' + (f ? f.pseudo : 'ton ami') + ' (code ' + code + ').' }); render(); })
            .catch((e) => { S.ui = Object.assign({}, S.ui, { gameMsg: 'Partie créée (code ' + code + ') mais invitation non envoyée : ' + e.message }); render(); });
        }
        return;
      }
      const name = typed || defaultGameName();
      flushGameSave(); freshGame(); const g = { id: uid(), name, at: Date.now() }; S.park = null; attachGameArmy(g.id);
      S.gameId = g.id; S.gameName = name; S.inGame = true; S.tab = 'game'; S.ui = { gameMsg: `✓ Partie « ${name} » créée.` };
      g.state = snapshot(); const l = readGames(); l.unshift(g); writeGames(l);
    },

    bDet(id) { const i = B.dets.indexOf(id); if (i >= 0) { B.dets.splice(i, 1); B.units.forEach((e) => { if (e.enh && e.enh.startsWith(id + '|')) e.enh = ''; }); } else B.dets.push(id); bsave(); },
    dbRetry() { dbs.err = ''; dbs.loading = false; },
    dbMode(v) { dbs.mode = v; dbs.unit = null; dbs.det = null; dbs.msg = ''; },
    dbBack() { if (dbs.mode === 'det') dbs.det = null; else dbs.unit = null; dbs.msg = ''; },
    dbDet(id) { dbs.det = id; },
    dbKw(v) { const d = dbs.unit; dbs.mode = 'units'; if (d) dbs.fac = d.fac; dbs.kw = v; dbs.q = ''; dbs.unit = null; },
    dbOpen(id) { dbs.msg = ''; Wahap.unit(id).then((u) => { dbs.unit = u; render(); }).catch((e) => { dbs.msg = e.message; render(); }); },
    dbTarget() {
      const d = dbs.unit; if (!d) return; const u = Wahap.toApp(d, uid);
      Object.assign(S.play.target, targetFrom({ base: u, leaders: [], keywords: u.keywords.concat(u.factionKw), abilities: u.abilities, nowModels: 1 })); S.play.targetUnitId = null;
      dbs.msg = `Cible réglée sur « ${u.name} » (1 figurine : ajuste l'effectif dans la section Cible de l'écran Partie).`;
    },
    dbAdd() { const a = army(); const d = dbs.unit; if (!a || !d) return; const u = Wahap.toApp(d, uid); a.units.push(u); dbs.msg = `« ${u.name} » ajoutée à « ${a.name} » (points non renseignés).`; },
    dbAddStrats() {
      const a = army(); const f = Wahap.cached(dbs.detFac); const d = f && f.detachments.find((x) => x.id === dbs.det); if (!a || !d) return;
      const n = addDetTo(a, d); dbs.msg = `${n} stratagème(s) et ${(d.abilities || []).length} règle(s) ajoutés à « ${a.name} ».`;
    },
    bRetry() { B.err = ''; B.facErr = ''; B.loading = false; B.facLoad = false; },
    bGrp(v) { B.grp = v; bsave(); },
    bFold(id) { B.fold[id] = !B.fold[id]; bsave(); },
    bFoldAll(v) { B.units.forEach((e) => { B.fold['u' + e.k] = !!v; }); bsave(); },
    bAdd(id) { const f = bfac(); const d = f && bdef1(f, id); if (!d) return; const k = uid(); B.units.push({ k, id, models: ((d.pc && d.pc.t.length && d.pc.t[0][1].length) ? d.pc.t[0][1][0][0] : 1), pts: 0, wg: {}, to: '', enh: '', woff: [], aoff: [] }); B.open = k; B.msg = ''; bsave(); },
    bOpen(k) { B.open = B.open === k ? null : k; },
    bDup(k) { const e = B.units.find((x) => x.k === k); if (!e) return; const c = JSON.parse(JSON.stringify(e)); c.k = uid(); c.enh = ''; c.to = ''; B.units.splice(B.units.indexOf(e) + 1, 0, c); bsave(); },
    bDel(k) { B.units = B.units.filter((x) => x.k !== k); B.units.forEach((x) => { if (x.to === k) x.to = ''; }); bsave(); },
    bCopy() { const a = army(); const t = a ? yellowFromArmy(a) : ''; const ta = document.getElementById('ysTxt'); const ok = () => { B.msg = 'Texte copié : colle-le dans YellowScribe.'; }; try { navigator.clipboard.writeText(t).then(() => { B.msg = 'Texte copié : colle-le dans YellowScribe.'; render(); }, () => { if (ta) { ta.select(); document.execCommand('copy'); } ok(); }); } catch (e) { if (ta) { ta.select(); document.execCommand('copy'); } ok(); } },
    bReset() { if (confirm('Vider la liste en cours ?')) { B.units = []; B.dets = []; B.open = null; bsave(); } },
    bCreate() { const a = bBuildArmy(); B.editId = ''; B.msg = ''; S.tab = 'army'; S.ui = Object.assign({}, S.ui, { importMsg: `Armée « ${a.name} » créée depuis la liste : ${a.units.length} unité(s), ${a.total.points} pts.` }); },
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
    ...frActions,
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
      if (!confirm('Remettre la partie à zéro (round, PC, stratagèmes, effectifs, Choc de Bataille) ? Les armées sont conservées.')) return;
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
      if (S.bs[u.id]) { alert('Unité en Choc de Bataille : elle ne peut pas être ciblée par un stratagème.'); return; }
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
    asStyle(v) { const l = AS.styles || []; AS.styles = l.includes(v) ? l.filter((x) => x !== v) : l.concat(v); if (!AS.styles.length) AS.styles = ['equilibre']; AS.res = []; asave(); },
    asKw(v) { const c = AS.kws[v] || 0; const n = c === 0 ? 1 : c === 1 ? -1 : 0; if (n) AS.kws[v] = n; else delete AS.kws[v]; AS.res = []; asave(); },
    asExpand() { AS.expand = !AS.expand; },
    asRun() { const f = AS.fac ? Wahap.cached(AS.fac) : null; if (!f) { AS.err = 'Choisis une faction.'; return; } const o = asRunOpts(f); AS.res = [0, 1, 2].map((i) => aBuild(f, o, [0.1, 0.3, 0.5][i], AS.seed * 7 + i * 13 + 1, i)).filter(Boolean); AS.err = AS.res.length ? '' : 'Aucune unité utilisable avec ces critères.'; asave(); },
    asMore() { AS.seed++; actions.asRun(); },
    asOpen(i) { if (asLoadB(+i)) S.tab = 'build'; },
    asCreate(i) { if (!asLoadB(+i)) return; const a = bBuildArmy(); B.msg = ''; S.tab = 'army'; S.ui = Object.assign({}, S.ui, { importMsg: `Armée « ${a.name} » créée par l'assistant : ${a.units.length} unité(s), ${a.total.points} pts.` }); },
    bCm(v) { B.cm = v; S.editUnit = null; bsave(); },
    bNew() { B.editId = ''; B.units = []; B.dets = []; B.warlord = ''; B.name = ''; B.open = null; B.cm = 'build'; bsave(); },
    bUpdate() { const a = bBuildArmy(B.editId); B.msg = ''; S.tab = 'army'; S.ui = Object.assign({}, S.ui, { importMsg: `Armée « ${a.name} » mise à jour : ${a.units.length} unité(s), ${a.total.points} pts.` }); bsave(); },
    bReopen() { const a = army(); if (!a || !a.build) return; const b = JSON.parse(JSON.stringify(a.build)); Object.assign(B, bdef(), b, { cm: 'build', editId: a.id, fold: {}, open: null, q: '', msg: '' }); bsave(); },
    armyNew() { actions.bNew(); S.tab = 'build'; },
    gameSetList() {
      const id = (document.getElementById('gameList') || {}).value; const src = S.armies.find((x) => x.id === id && !x.gameOf); if (!src || !S.inGame) return;
      if (!confirm('Associer « ' + src.name + ' » à cette partie ? Les effectifs et les pertes actuels seront remis à zéro.')) return;
      dropGameArmies(); S.libId = src.id; const c = makeGameArmy(src, S.gameId || 'quick'); S.armies.push(c); S.armyId = c.id; S.editUnit = null; S.play.unitId = null; S.play.nModelsUnit = null; S.play.weaponIdx = 0; syncTarget();
    },
    armyOpen(id) { S.ui = Object.assign({}, S.ui, { openArmy: S.ui.openArmy === id ? '' : id }); },
    armySel(id) { S.armyId = id; S.ui = Object.assign({}, S.ui, { importMsg: '' }); },
    armyEdit(id) { S.armyId = id; B.cm = 'edit'; S.editUnit = null; bsave(); S.tab = 'build'; },
    armyDel(id) { const x = S.armies.find((y) => y.id === id); if (!x || !confirm('Supprimer l\'armée « ' + x.name + ' » ?')) return; S.customStrats = S.customStrats.filter((c) => c.armyId !== id); delete S.armyRules[id]; S.armies = S.armies.filter((y) => y.id !== id); if (B.editId === id) B.editId = ''; if (S.armyId === id) S.armyId = libArmies()[0] ? libArmies()[0].id : null; },
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
    resetAll() { if (confirm('Effacer toutes les données de l\'appli ?' + (syCfg() ? '\n\nLa synchronisation sera déconnectée pour ne pas effacer tes autres appareils.' : ''))) { sySet(null); S = defaults(); } },
    syMode(v) { SY.mode = v; SY.err = ''; SY.msg = ''; },
    syncIn() { syAuth('login'); },
    syncUp() { syAuth('signup'); },
    syncNow() { syncRun(true); frLoad(true); },
    syncOff() { if (confirm('Te déconnecter sur cet appareil ? Tes données restent ici et dans ton compte.')) { sySet(null); SY.msg = 'Déconnecté.'; SY.err = ''; FR.friends = []; FR.incoming = []; FR.outgoing = []; FR.invites = []; FR.loaded = false; } },
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
    const fn = actions[el.dataset.act]; if (!fn) return;
    fn(el.dataset.val, el); render();
  });
  document.addEventListener('input', (e) => { if (e.target.id === 'rq') { RS.q = e.target.value; const r = document.getElementById('rres'); if (r) r.innerHTML = rulesResults(); } if (e.target.id === 'dbq') { dbs.q = e.target.value; const r = document.getElementById('dbres'); if (r) r.innerHTML = dbResults(); } if (e.target.id === 'asq') { AS.q = e.target.value; const f = AS.fac ? Wahap.cached(AS.fac) : null; const r = document.getElementById('askw'); if (r && f) r.innerHTML = asKwChips(f); } if (e.target.id === 'bq') { B.q = e.target.value; const r = document.getElementById('bres'); const f = bfac(); if (r && f) r.innerHTML = bResults(f); } });
  document.addEventListener('toggle', (e) => { const d = e.target; if (d && d.dataset && d.dataset.rid) RS.open[d.dataset.rid] = d.open; }, true);
  document.addEventListener('change', (e) => {
    if (e.target.dataset && e.target.dataset.dbfac) { if (dbs.mode === 'det') { dbs.detFac = e.target.value; dbs.det = null; } else { dbs.fac = e.target.value; dbs.unit = null; } dbs.ch = ''; dbs.kw = ''; render(); return; }
    if (e.target.dataset && e.target.dataset.dbch !== undefined) { dbs.ch = e.target.value; dbs.det = null; dbs.unit = null; render(); return; }
    if (e.target.dataset && e.target.dataset.dbkw !== undefined) { dbs.kw = e.target.value; dbs.unit = null; render(); return; }
    const t0 = e.target, ds = t0.dataset || {};
    if (ds.bf) { const v = t0.value; if (ds.bf === 'fac') { B.facErr = ''; B.fac = v; B.dets = []; B.units = []; B.open = null; B.ch = ''; B.kw = ''; } else if (ds.bf === 'ch') bChapter(v); else if (ds.bf === 'kw') B.kw = v; else if (ds.bf === 'warlord') B.warlord = v; else if (ds.bf === 'allEnh') B.allEnh = !!t0.checked; else if (ds.bf === 'fmt') { B.fmt = v; if (+v) B.limit = +v; } else if (ds.bf === 'limit') B.limit = +v || 0; else B.name = v; bsave(); render(); return; }
    if (ds.bu) { const en = B.units.find((x) => x.k === ds.bu); if (en) { if (ds.bw != null) { const j = +ds.bw; en.woff = (en.woff || []).filter((x) => x !== j); if (!t0.checked) en.woff.push(j); } else if (ds.bg != null) { en.wg = en.wg || {}; en.wg[ds.bg] = Math.max(0, +t0.value || 0); } else if (ds.ba != null) { const j = +ds.ba; en.aoff = (en.aoff || []).filter((x) => x !== j); if (!t0.checked) en.aoff.push(j); } else en[ds.bk] = ['models', 'pts'].includes(ds.bk) ? Math.max(0, +t0.value || 0) : t0.value; bsave(); render(); } return; }
    if (ds.af) { const v = t0.value; if (ds.af === 'fac') { AS.fac = v; AS.ch = ''; AS.det = ''; AS.kws = {}; AS.q = ''; AS.err = ''; } else if (ds.af === 'ch') { AS.ch = v; AS.det = ''; AS.kws = {}; } else if (ds.af === 'fmt') { AS.fmt = v; if (+v) AS.limit = +v; } else if (ds.af === 'limit') AS.limit = +v || 0; else AS[ds.af] = v; AS.res = []; asave(); render(); return; }
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
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncRun(false); });
  render();
  setTimeout(() => syncRun(false), 800);
  setTimeout(() => frLoad(true), 1500);
  setInterval(() => { if (document.visibilityState === 'visible') frLoad(true); }, 20000);
})();
