/* Lecture des effets de règles / stratagèmes (texte français ALN) -> modificateurs pour le moteur.
   Tout ce qui n'est pas reconnu reste affiché comme rappel, jamais deviné. */
const Effects = (() => {
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
  const fold = (s) => String(s).replace(/[\s\S]/g, (ch) => { const f = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); return f.length === 1 ? f : ch.toLowerCase(); }).replace(/[’‘]/g, "'");
  const num = (s) => parseInt(String(s).replace(/[−–]/g, '-').replace(/\s/g, ''), 10);
  const KW_LIST = 'gravis|infanterie|vehicule|monstre|personnage|terminator|tacticus|phobos|volant|bete|nuee|titanesque';
  const KW_ID = { infanterie: 'infantry', vehicule: 'vehicle', monstre: 'monster', personnage: 'character', volant: 'fly', bete: 'beast', nuee: 'swarm', titanesque: 'titanic' };
  const kwId = (k) => KW_ID[k] || k;

  /* ---------- Conditions ---------- */
  function condsFromText(t, label) {
    const out = [];
    if (/mouvement normal/.test(t)) out.push({ t: 'moved_normal' });
    if (/mouvement d'arrivee/.test(t)) out.push({ t: 'setUp' });
    if (/\b(a charge|mouvement de charge)\b/.test(t) && !/impact/.test(t)) out.push({ t: 'charged' });
    if (/unite[^.]{0,30}\bengagee\b/.test(t)) out.push({ t: 'engaged' });
    const uk = t.match(new RegExp('unites? (?:de |d\'|du )?(?:l\')?(' + KW_LIST + ')\\b'));
    if (uk) out.push({ t: 'unit_kw', kw: kwId(uk[1]) });
    const fm = t.match(/faction d'armee est ([a-z' \-]+?)\s*(?:[,.;:]|$)/);
    if (fm) out.push({ t: 'army_faction', kw: fm[1].trim(), label });
    if (/choisissez l'une des|choisissez une des|choisissez un des|choisissez l'un des/.test(t)) out.push({ t: 'manual', label: 'Option / posture choisie' });
    else if (/choisissez (?:une|1|l'|cette) ?unite ennemie|choisissez une unite ennemie/.test(t)) out.push({ t: 'manual', soft: true, label: 'Cible = unité ennemie choisie' });
    else if (/choisissez/.test(t)) out.push({ t: 'manual', label: 'Choix à confirmer' });
    else {
      const d = t.match(/(?:cibl\w*|ennemie)[^.]{0,60}?\ba (?:moins de )?(\d+)\s*ps/);
      if (d) out.push({ t: 'manual', label: `Cible à ${d[1]}ps ou moins` });
    }
    const dm = t.match(/doctrine (d'assaut|assaut|tactique|de devastation|devastation) (?:est|sont) active/);
    if (dm) out.push({ t: 'doctrine', d: dm[1].replace(/^d'|^de /, '') });
    if (!out.length && label) out.push({ t: 'manual', label });
    return out;
  }
  const qualifier = (tail) => {
    const m = tail.match(/^\]?\s*:?\s*non-?\s*([a-z\/ ]+?)\s*(?:[\]\.,;]|$)/);
    if (m) { const kws = m[1].split(/\s*\/\s*/).map((x) => kwId(x.trim())).filter(Boolean); return kws.length ? { t: 'target_not', kws } : null; }
    const p = tail.match(/^\s*:\s*([a-z][a-z\/ ]*?)\s*[\]\.,;]/);
    if (!p) return null;
    const kws = p[1].split(/\s*\/\s*/).map((x) => kwId(x.trim())).filter(Boolean);
    return kws.length ? { t: 'target_is', kws } : null;
  };
  const sustAvg = (x) => { const m = String(x).toLowerCase().match(/^(\d*)d(\d+)(?:\+(\d+))?$/); return m ? (m[1] ? +m[1] : 1) * (+m[2] + 1) / 2 + (m[3] ? +m[3] : 0) : (parseInt(x, 10) || 0); };

  /* ---------- Jetons d'effet ---------- */
  const TOKENS = [
    [/([+\-−]\s?\d)\s*aux jets de touche/g, (m) => ({ hit: num(m[1]) })],
    [/([+\-−]\s?\d)\s*pour toucher/g, (m) => ({ hit: num(m[1]) })],
    [/([+\-−]\s?\d)\s*aux jets de blessure/g, (m) => ({ wound: num(m[1]) })],
    [/([+\-−]\s?\d)\s*en f\b/g, (m) => ({ strength: num(m[1]) })],
    [/\bforce\s*([+\-−]\s?\d)/g, (m) => ({ strength: num(m[1]) })],
    [/([+\-−]\s?\d)\s*en a\b/g, (m) => ({ extraA: num(m[1]) })],
    [/([+\-−]\s?\d)\s*en pa\b/g, (m) => ({ apImp: num(m[1]) })],
    [/([+\-−]\s?\d)\s*en d\b/g, (m) => ({ dmg: num(m[1]) })],
    [/ajoutez (\d) aux caracteristiques? d'attaques?/g, (m) => ({ extraA: +m[1] })],
    [/ajoutez (\d) a la caracteristique de force/g, (m) => ({ strength: +m[1] })],
    [/ajoutez (\d) a la caracteristique de degats/g, (m) => ({ dmg: +m[1] })],
    [/ajoutez (\d) a la caracteristique de pa\b/g, (m) => ({ apImp: +m[1] })],
    [/ameliorez de (\d) la caracteristique de pa\b/g, (m) => ({ apImp: +m[1] })],
    [/ameliorez de (\d) la caracteristique de capacite de (?:tir|combat)/g, (m) => ({ hit: +m[1] })],
    [/ajoutez (\d) au jet de touche/g, (m) => ({ hit: +m[1] })],
    [/ajoutez (\d) au jet de blessure/g, (m) => ({ wound: +m[1] })],
    [/soustrayez (\d) au jet de touche/g, (m) => ({ hit: -m[1] })],
    [/soustrayez (\d) au jet de blessure/g, (m) => ({ wound: -m[1] })],
    [/relancer les jets de touche de 1\b/g, () => ({ rrHit: 'ones' })],
    [/relancer les jets de touche(?! de 1\b)/g, () => ({ rrHit: 'all' })],
    [/relancer les jets de blessure de 1\b/g, () => ({ rrWound: 'ones' })],
    [/relancer les jets de blessure(?! de 1\b)/g, () => ({ rrWound: 'all' })],
    [/relancer les jets de degats/g, () => ({ rrDmg: true })],
    [/touches? (?:fatales?|letales?)|coups? fatals?/g, () => ({ lethal: true }), true],
    [/blessures? devastatrices?/g, () => ({ dev: true }), true],
    [/touches? soutenues? (d?\d)/g, (m) => ({ sust: /d/.test(m[1]) ? m[1].toUpperCase() : +m[1] }), true],
    [/\[assaut\]|aptitude assaut/g, () => ({ addAbil: ['assault'] })],
    [/\[ignore le couvert\]/g, () => ({ addAbil: ['ignoresCover'] })],
    [/\bont \[?combat rapproche/g, () => ({ addAbil: ['pistol'] })],
    [/n'ont pas \[?lourd/g, () => ({ removeAbil: ['heavy'] })],
    [/n'ont pas \[?deflagration/g, () => ({ removeAbil: ['blast'] })],
    [/ne peut pas beneficier du couvert|ne beneficie(?:nt)? pas du couvert/g, () => ({ noCover: true })],
    [/(?:unites?|figurines?) ennemies? beneficient du couvert contre cette attaque/g, () => ({ forceCover: true })],
    [/anti[- ]([a-z\/]+) (\d)\+/g, (m) => ({ anti: { kw: kwId(m[1].split('/')[0]), x: +m[2] } })],
  ];

  function scopeOf(t, hint) {
    const rng = /attaques? de tir|armes? de tir|phase de tir|\btir\b|tirer/.test(t), mel = /attaques? de melee|armes? de melee|phase de combat|combattre/.test(t);
    if (rng && !mel) return 'ranged';
    if (mel && !rng) return 'melee';
    return hint || 'both';
  }
  function weaponReqOf(t) {
    const m = t.match(/(?:armes?|attaques?)(?: de tir| de melee)? a \[?(torrent|fusion)\]?(?:\s*\/\s*\[?(torrent|fusion)\]?)?/);
    if (!m) return [];
    return [...new Set([m[1], m[2]].filter(Boolean).map((x) => (x === 'fusion' ? 'melta' : 'torrent')))];
  }

  /* Un segment = une alternative (séparée par « Ou : »). Retourne des items (un par jeu de conditions). */
  function parseSegment(seg, opts = {}) {
    const o0 = String(seg || '').replace(/\s+/g, ' ').trim();
    let o = o0, lead = [];
    const lm = fold(o).match(/^\s*si\s+([^,]+),\s*/);
    if (lm) { lead = condsFromText(lm[1], 'Si ' + o.slice(lm.index + lm[0].indexOf(lm[1]), lm.index + lm[0].indexOf(lm[1]) + lm[1].length).trim()); o = o.slice(lm[0].length); }
    const t = fold(o);
    const scope = scopeOf(t, opts.scope);
    const weaponReq = weaponReqOf(t);
    const globalT = t.replace(/\bsi\b[^.;]*/g, ' ');
    const baseConds = [...lead, ...condsFromText(opts.condText ? norm(opts.condText) + ' ' + globalT : globalT)];
    const DEF = /cibl\w+ cette unite|allouees? a cette|cible cette unite|cible votre unite|ciblent votre unite/;
    const found = [];
    TOKENS.forEach(([re, fn, wantsQual]) => {
      re.lastIndex = 0; let m;
      while ((m = re.exec(t))) {
        const mods = fn(m); const conds = [];
        const end = m.index + m[0].length;
        const tail = t.slice(end, end + 120);
        const tm = tail.match(/^[\s,]*si\s+([^.;\-]+)/);
        if (tm) { const st = end + tm[0].indexOf(tm[1]); conds.push(...condsFromText(tm[1], 'Si ' + o.slice(st, st + tm[1].length).trim())); }
        if (wantsQual) { const q = qualifier(tail); if (q) conds.push(q); }
        const before = t.slice(Math.max(0, t.lastIndexOf('. ', m.index), t.lastIndexOf(': ', m.index)), m.index);
        found.push({ mods, conds, side: (DEF.test(before) || mods.forceCover) ? 'def' : 'att' });
      }
    });
    /* capacités d'arme accordées : « ont [TORRENT] », « ont la capacité [JUMELÉ] »… (hors celles déjà lues ci-dessus) */
    if (typeof Engine !== 'undefined' && !/choisi\w* l'une des|l'une des capacites/.test(t)) {
      const HANDLED = /^(touches? (fatales?|letales?)|coups? fatals?|blessures? devastatrices?|touches? soutenues?|anti[- ]|assaut|ignore le couvert|aptitude assaut)/;
      const re = /\[([^\]]+)\]/g; let m;
      while ((m = re.exec(t))) {
        const tok = m[1].trim(); if (HANDLED.test(tok)) continue;
        const pre = t.slice(Math.max(0, m.index - 60), m.index);
        if (/armes? (?:de tir |de melee |a distance )?a $|equipees? de $|ayant $/.test(pre)) continue;
        if (!/(?:\bont|\ba|gagnent|obtiennent|possedent|capacites?)\s*(?:la capacite\s*|les capacites\s*|aussi\s*)?:?\s*[•\-]?\s*(?:\[[^\]]+\]\s*(?:,|et|;)?\s*)*$/.test(pre)) continue;
        const parsed = Engine.parseAbilities(tok); const keys = Object.keys(parsed).filter((k) => k !== 'other' && k !== 'qual');
        if (!keys.length || keys.every((k) => ['lethalHits', 'devastatingWounds', 'sustainedHits', 'anti', 'assault', 'ignoresCover'].includes(k))) continue;
        found.push({ mods: { addAbilTok: [tok] }, conds: [], side: DEF.test(pre) ? 'def' : 'att' });
      }
    }
    const groups = new Map();
    found.forEach((f) => {
      const conds = [...baseConds, ...f.conds];
      const key = f.side + JSON.stringify(conds.map((c) => [c.t, c.kw || '', (c.kws || []).join(), c.label || '']).sort());
      const g = groups.get(key) || { scope, weaponReq, side: f.side, conds, mods: {}, alt: !!opts.alt };
      mergeInto(g.mods, f.mods); groups.set(key, g);
    });
    return [...groups.values()];
  }

  /* Texte complet -> items (gère « Ou : » et les doctrines) */
  function parseText(text, opts = {}) {
    const cm = String(text || '').match(/^([\s\S]*?)choisissez l['’]une des (?:capacit\S+|options) suivantes?[^:]*:\s*((?:[•\-\s]*\[[^\]]+\][\s;,.]*(?:ou\s*)?)+)/i);
    if (cm) {
      const toks = [...cm[2].matchAll(/\[([^\]]+)\]/g)].map((x) => x[1].trim());
      const items = [];
      toks.forEach((tk) => { parseSegment((cm[1] || '') + ' Les attaques de cette unité ont [' + tk + '].', Object.assign({}, opts, { alt: true })).forEach((it) => { it.conds = [...it.conds, { t: 'manual', label: 'Option choisie : ' + tk }]; items.push(it); }); });
      return items;
    }
    const alts = String(text || '').split(/\s+Ou\s*:\s*/i);
    const items = [];
    let scope = null;
    alts.forEach((seg, i) => {
      const its = parseSegment(seg, Object.assign({}, opts, { alt: alts.length > 1, scope: scope || opts.scope }));
      if (i === 0 && its[0]) scope = its[0].scope === 'both' ? null : its[0].scope;
      items.push(...its);
    });
    return items;
  }
  /* Doctrines de combat : une source par doctrine */
  function splitDoctrines(text) {
    const re = /DOCTRINE\s+([A-ZÉÈ'’ ]+?)\s*:/g; const marks = []; let m;
    while ((m = re.exec(text))) marks.push({ name: m[1].trim(), i: m.index, end: re.lastIndex });
    return marks.map((k, n) => ({ name: 'Doctrine ' + k.name.charAt(0) + k.name.slice(1).toLowerCase(), text: text.slice(k.end, n + 1 < marks.length ? marks[n + 1].i : undefined).replace(/Sauf mention contraire[\s\S]*$/i, '').trim() }));
  }

  /* ---------- Fusion / agrégation ---------- */
  const RR = { none: 0, ones: 1, all: 2 };
  function mergeInto(a, b) {
    ['hit', 'wound', 'strength', 'extraA', 'apImp', 'dmg', 'dmgRed'].forEach((k) => { if (b[k]) a[k] = (a[k] || 0) + b[k]; });
    ['rrHit', 'rrWound'].forEach((k) => { if (b[k] && (RR[b[k]] || 0) > (RR[a[k]] || 0)) a[k] = b[k]; });
    ['rrDmg', 'lethal', 'dev'].forEach((k) => { if (b[k]) a[k] = true; });
    if (b.sust && (!a.sust || sustAvg(b.sust) > sustAvg(a.sust))) a.sust = b.sust;
    ['noCover', 'forceCover'].forEach((k) => { if (b[k]) a[k] = true; });
    if (b.anti && !a.anti) a.anti = b.anti;
    ['addAbil', 'removeAbil', 'addAbilTok'].forEach((k) => { if (b[k]) a[k] = [...new Set([...(a[k] || []), ...b[k]])]; });
    return a;
  }
  const aggregate = (items) => items.reduce((acc, it) => mergeInto(acc, it.mods), {});

  /* ---------- Évaluation des conditions ---------- */
  function evalItem(it, ctx) {
    const res = { applicable: true, why: '', manual: [] };
    if (it.side === 'def' && !ctx.asTarget) return { applicable: false, why: 'effet défensif', manual: [] };
    if (it.scope === 'ranged' && ctx.mode === 'melee') return { applicable: false, why: 'tir seulement', manual: [] };
    if (it.scope === 'melee' && ctx.mode !== 'melee') return { applicable: false, why: 'mêlée seulement', manual: [] };
    if (it.weaponReq.length && !it.weaponReq.some((k) => ctx.ab && ctx.ab[k])) return { applicable: false, why: 'ne concerne pas cette arme (' + it.weaponReq.map((k) => (k === 'melta' ? 'Fusion' : 'Torrent')).join('/') + ')', manual: [] };
    const kws = (ctx.unit && ctx.unit.keywords || []).map(norm);
    for (const c of it.conds) {
      if (c.t === 'moved_normal' && ctx.mode !== 'melee' && ctx.sit.moved !== 'normal') return { applicable: false, why: 'l\'unité n\'a pas fait de mouvement normal', manual: [] };
      if (c.t === 'setUp' && !ctx.sit.setUp) return { applicable: false, why: 'pas de mouvement d\'arrivée ce tour', manual: [] };
      if (c.t === 'charged' && ctx.mode === 'melee' && !ctx.sit.charged) return { applicable: false, why: 'l\'unité n\'a pas chargé', manual: [] };
      if (c.t === 'engaged' && ctx.mode !== 'melee' && !ctx.sit.engaged) return { applicable: false, why: 'unité non engagée', manual: [] };
      if (c.t === 'unit_kw' && kws.length) {
        const alias = { infantry: ['infantry', 'infanterie'], vehicle: ['vehicle', 'vehicule'], monster: ['monster', 'monstre'], character: ['character', 'personnage'] }[c.kw] || [c.kw];
        if (!kws.some((k) => alias.includes(k))) return { applicable: false, why: 'unité non ' + c.kw.toUpperCase(), manual: [] };
      }
      if (c.t === 'target_not') {
        const tk = (ctx.target && ctx.target.kw || []);
        const hit = c.kws.find((k) => Engine.hasKw(tk, k));
        if (hit) return { applicable: false, why: 'cible ' + hit.toUpperCase() + ' exclue', manual: [] };
      }
      if (c.t === 'target_is') {
        const tk = (ctx.target && ctx.target.kw || []);
        if (tk.length && !c.kws.some((k) => Engine.hasKw(tk, k))) return { applicable: false, why: 'cible hors ' + c.kws.map((k) => k.toUpperCase()).join('/'), manual: [] };
      }
      if (c.t === 'doctrine') {
        const ds = ctx.doctrines;
        if (ds) { if (!ds.some((x) => x.includes(c.d))) return { applicable: false, why: 'doctrine ' + c.d + ' non active (coche-la dans « Doctrines de combat »)', manual: [] }; }
        else res.manual.push('Doctrine ' + c.d + ' active');
      }
      if (c.t === 'army_faction') {
        const af = (ctx.armyKw || []); const w = norm(c.kw);
        if (af.length) { if (!af.includes(w)) return { applicable: false, why: 'faction d\'armée ≠ ' + c.kw.toUpperCase(), manual: [] }; }
        else res.manual.push(c.label || ('Faction d\'armée : ' + c.kw.toUpperCase()));
      }
      if (c.t === 'manual') { if (c.soft) (res.soft = res.soft || []).push(c.label); else res.manual.push(c.label); }
    }
    return res;
  }

  /* ---------- Libellés ---------- */
  const sg = (n) => (n > 0 ? '+' : '−') + Math.abs(n);
  const ABIL = { assault: 'Assaut', ignoresCover: 'Ignore le couvert', pistol: 'Combat rapproché', heavy: 'Lourd', blast: 'Déflagration' };
  function summarize(m) {
    const o = [];
    if (m.hit) o.push(sg(m.hit) + ' touche'); if (m.wound) o.push(sg(m.wound) + ' blessure');
    if (m.strength) o.push(sg(m.strength) + ' Force'); if (m.extraA) o.push(sg(m.extraA) + ' attaque(s)/fig.');
    if (m.apImp) o.push('PA ' + sg(m.apImp)); if (m.dmg) o.push(sg(m.dmg) + ' dégâts');
    if (m.rrHit) o.push(m.rrHit === 'ones' ? 'relance touches (1)' : 'relance touches'); if (m.rrWound) o.push(m.rrWound === 'ones' ? 'relance blessures (1)' : 'relance blessures');
    if (m.rrDmg) o.push('relance dégâts'); if (m.lethal) o.push('Coups fatals'); if (m.dev) o.push('Blessures dévastatrices');
    if (m.sust) o.push('Touches soutenues ' + m.sust); if (m.anti) o.push('Anti-' + m.anti.kw + ' ' + m.anti.x + '+');
    if (m.noCover) o.push('cible sans couvert'); if (m.forceCover) o.push('cible à couvert');
    (m.addAbilTok || []).forEach((k) => o.push('[' + k + ']'));
    (m.addAbil || []).forEach((k) => o.push(ABIL[k] || k)); (m.removeAbil || []).forEach((k) => o.push('sans ' + (ABIL[k] || k)));
    return o;
  }
  const KWFR = { infantry: 'infanterie', vehicle: 'véhicule', monster: 'monstre', character: 'personnage' };
  function condLabel(c) {
    switch (c.t) {
      case 'moved_normal': return 'mouvement normal';
      case 'setUp': return 'mouvement d\'arrivée';
      case 'charged': return 'a chargé ce tour';
      case 'engaged': return 'unité engagée';
      case 'unit_kw': return 'unité ' + String(KWFR[c.kw] || c.kw).toUpperCase();
      case 'doctrine': return 'doctrine ' + c.d + ' active';
      case 'army_faction': return 'faction ' + String(c.kw || '').toUpperCase();
      case 'target_is': return 'cible ' + (c.kws || []).map((k) => String(KWFR[k] || k).toUpperCase()).join('/');
      case 'target_not': return 'cible hors ' + (c.kws || []).map((k) => String(KWFR[k] || k).toUpperCase()).join('/');
      default: return c.label || c.t;
    }
  }
  return { parseText, parseSegment, splitDoctrines, aggregate, mergeInto, evalItem, summarize, condLabel, norm };
})();
if (typeof module !== 'undefined') module.exports = Effects;
