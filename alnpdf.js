/* Lecteur du PDF exporté par ALN40k (liste + fiches + règles de détachement + stratagèmes).
   Travaille sur des « lignes » positionnées (cellules avec coordonnée x) extraites par pdf.js. */
const AlnPdf = (() => {
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
  const joinTxt = (a, b) => (!a ? b : !b ? a : /[-‑–]$/.test(a) ? a + b : a + ' ' + b);
  const flat = (r) => r.cells.map((c) => c.s).join(' ').replace(/\s+/g, ' ').trim();

  /* ---------- Extraction pdf.js -> lignes de cellules ---------- */
  async function extractRows(pdfjs, data) {
    const doc = await pdfjs.getDocument({ data: data instanceof Uint8Array ? data : new Uint8Array(data) }).promise;
    const rows = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      const items = tc.items.filter((it) => typeof it.str === 'string' && it.str.trim()).map((it) => ({ s: it.str, x: it.transform[4], y: it.transform[5], w: it.width || 0, h: Math.abs(it.transform[3]) || it.height || 8 }));
      items.sort((a, b) => (Math.abs(b.y - a.y) > 2 ? b.y - a.y : a.x - b.x));
      const lines = [];
      items.forEach((it) => {
        const l = lines[lines.length - 1];
        if (l && Math.abs(l.y - it.y) <= Math.max(2.5, it.h * 0.35)) l.items.push(it); else lines.push({ y: it.y, items: [it] });
      });
      lines.forEach((l) => {
        l.items.sort((a, b) => a.x - b.x);
        const cells = []; let cur = null, end = 0;
        l.items.forEach((it) => {
          const size = it.h || 8, gap = cur ? it.x - end : 0;
          if (!cur || gap > size * 1.3) { cur = { x: it.x, s: it.s, h: size }; cells.push(cur); }
          else cur.s += (cur.h = Math.max(cur.h, size), gap > size * 0.12 && !/\s$/.test(cur.s) && !/^\s/.test(it.s) ? ' ' : '') + it.s;
          end = it.x + it.w;
        });
        cells.forEach((c) => { c.s = c.s.replace(/\s+/g, ' ').trim(); });
        rows.push({ page: p, y: l.y, cells: cells.filter((c) => c.s) });
      });
    }
    return rows;
  }

  /* ---------- Outils de texte ---------- */
  const SMALL = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'et', 'en', 'au', 'aux', 'à', 'avec', 'sur', 'sous']);
  const titleCase = (s) => String(s).split(' ').map((w, i) => {
    const lw = w.toLocaleLowerCase('fr');
    if (/^\[.*\]$/.test(w) || /^\d/.test(w)) return w;
    if (i > 0 && SMALL.has(lw)) return lw;
    return lw.replace(/(^|-)(\p{L})/gu, (m, a, b) => a + b.toLocaleUpperCase('fr'));
  }).join(' ');
  const PH = { commandement: 'command', mouvement: 'move', renforts: 'move', renfort: 'move', tir: 'shoot', charge: 'charge', combat: 'fight' };
  function phaseMatches(text) {
    const out = []; const re = /(votre\s+)?phase\s+(?:de|des|du)\s+(commandement|mouvement|renforts?|tir|charge|combat)(\s+advers\w*)?/gi; let m;
    while ((m = re.exec(text))) out.push({ id: PH[m[2].toLowerCase()], turn: m[3] ? 'opp' : m[1] ? 'mine' : 'either' });
    return out;
  }
  function phasesFromText(text, name) {
    const set = new Set(phaseMatches(text).map((x) => x.id));
    const t = norm(text);
    if (/attaques? de tir|armes? de tir|tirer\b/.test(t)) set.add('shoot');
    if (/attaques? de melee|combattre/.test(t)) set.add('fight');
    if (/mouvement de charge|jets? de charge|declarer une charge/.test(t)) set.add('charge');
    if (/mouvement (d'avance|normal|de retraite)/.test(t)) set.add('move');
    if (/debut du round de bataille/.test(t)) set.add('command');
    if (/cible(?:nt)? cette unite|allouees? a cette|\bsvin\b|invulnerable|si perd un pv/.test(t)) set.add('def');
    if (/^insensible a la douleur/.test(norm(name || ''))) set.add('def');
    return set.size ? [...set] : ['all'];
  }
  function stratTiming(when) {
    const ms = phaseMatches(when);
    if (!ms.length) return { phases: ['command', 'move', 'shoot', 'charge', 'fight'], turn: 'either', turns: null };
    const turns = {}; ms.forEach((m) => { turns[m.id] = turns[m.id] && turns[m.id] !== m.turn ? 'either' : m.turn; });
    const vals = Object.values(turns);
    const turn = vals.every((v) => v === 'mine') ? 'mine' : vals.every((v) => v === 'opp') ? 'opp' : 'either';
    return { phases: Object.keys(turns), turn, turns };
  }

  /* ---------- Reconnaissance des lignes ---------- */
  const PTS_RE = /^(\d+)\s*(?:\(\s*\+\s*(\d+)\s*\))?$/;
  const isUnitHeader = (r) => {
    if (r.cells.length !== 2) return false;
    const [a, b] = r.cells;
    return PTS_RE.test(b.s) && /\p{L}{3}/u.test(a.s) && !/\p{Ll}/u.test(a.s.replace(ROLE_RE, '').replace(/\[\d+x\]/i, ''));
  };
  const ROLE_RE = /^(Meneur|Appui)\s*:\s*/i;
  const LABEL_RE = /^(Equipement|Équipement|Aptitudes|Optimisations?|Mots-cl[ée]s de faction|Mots-cl[ée]s)\s*:\s*(.*)$/i;
  const colKey = (h) => {
    const n = norm(h).replace(/[^a-z/]/g, '');
    return ({ m: 'M', e: 'T', sv: 'sv', pv: 'W', cd: 'Ld', co: 'OC' })[n] || '';
  };

  function parseHeaderName(cell) {
    const m = cell.match(/^(?:\[(\d+)\s*[xX]\]\s*)?(?:\[([^\]]{1,6})\]\s*)?(.+?)(?:\s*\((\d+)\))?$/);
    return { mult: m && m[1] ? +m[1] : 1, tag: m && m[2] ? m[2] : '', name: titleCase(m ? m[3].trim() : cell), models: m && m[4] ? +m[4] : null };
  }

  /* Tableau d'armes : les noms et capacités peuvent passer sur plusieurs lignes, centrés autour de la ligne de chiffres. */
  function parseWeaponRows(rows, h) {
    const numeric = [], nameFr = [], abFr = [];
    const jn = (cs) => cs.reduce((s, c) => joinTxt(s, c.s), '');
    const TK = [/^(\d+|m[êe]l[ée]e)$/i, /^[\dD+]+$/i, /^(\d\+|n\/?a|-)$/i, /^(\d+|D[\dD+]*)$/i, /^-?\d+$/, /^[\dD+]+$/i];
    rows.forEach((r) => {
      const nm = r.cells.filter((c) => c.x < h.xR - 12), rest = r.cells.filter((c) => c.x >= h.xR - 12);
      const toks = []; rest.forEach((c, ci) => c.s.split(/\s+/).filter(Boolean).forEach((t) => toks.push({ t, ci })));
      if (toks.length >= 6 && TK.every((re, k) => re.test(toks[k].t))) {
        const last = toks[5]; const leftover = [];
        const sameCell = toks.filter((q) => q.ci === last.ci).map((q) => q.t); const used = toks.slice(0, 6).filter((q) => q.ci === last.ci).length;
        const tail = sameCell.slice(used).join(' '); if (tail) leftover.push(tail);
        rest.slice(last.ci + 1).forEach((c) => leftover.push(c.s));
        numeric.push({ y: r.y, name: jn(nm), mid: toks.slice(0, 6).map((q) => q.t), ab: leftover.reduce((s, x) => joinTxt(s, x), '') });
      } else { if (nm.length) nameFr.push({ y: r.y, s: jn(nm) }); if (rest.length) abFr.push({ y: r.y, s: jn(rest) }); }
    });
    if (!numeric.length) return [];
    const blocks = (frs, cont) => {
      const out = []; let cur = null;
      frs.sort((p, q) => q.y - p.y).forEach((f) => {
        if (cur && cont(cur.last, f.s)) { cur.s = joinTxt(cur.s, f.s); cur.last = f.s; cur.ys.push(f.y); }
        else { cur = { s: f.s, last: f.s, ys: [f.y] }; out.push(cur); }
      });
      return out.map((b) => ({ s: b.s, y: b.ys.reduce((x, y) => x + y, 0) / b.ys.length, lower: /^\p{Ll}/u.test(b.s) }));
    };
    const nB = blocks(nameFr, (prev, cur) => /^\p{Ll}/u.test(cur) || /[-‑–]$/.test(prev));
    const aB = blocks(abFr, (prev, cur) => /[-‑–,:]$/.test(prev) || /^\p{Ll}/u.test(cur) || /^Non-/.test(cur));
    const near = (b) => {
      const d = numeric.map((n, i) => ({ i, d: Math.abs(n.y - b.y) })).sort((p, q) => p.d - q.d);
      if (d.length > 1 && Math.abs(d[0].d - d[1].d) < 1) { const up = numeric[d[0].i].y > numeric[d[1].i].y ? d[0] : d[1], dn = up === d[0] ? d[1] : d[0]; return (b.lower ? up : dn).i; }
      return d[0].i;
    };
    const pieces = numeric.map((n) => ({ name: n.name ? [{ y: n.y, s: n.name }] : [], ab: n.ab ? [{ y: n.y, s: n.ab }] : [] }));
    nB.forEach((b) => pieces[near(b)].name.push({ y: b.y, s: b.s }));
    aB.forEach((b) => pieces[near(b)].ab.push({ y: b.y, s: b.s }));
    const text = (arr) => arr.sort((p, q) => q.y - p.y).reduce((s, x) => joinTxt(s, x.s), '');
    return numeric.map((n, i) => {
      const c = n.mid; const melee = /m[êe]l[ée]e/i.test(c[0]);
      return { name: text(pieces[i].name), range: c[0], A: c[1], skill: c[2], S: c[3], AP: c[4], D: c[5], abilities: text(pieces[i].ab).replace(/^[-–]$/, ''), type: melee ? 'melee' : 'ranged' };
    });
  }

  function parseUnitBlock(head, rows, section) {
    const [nameCell, ptsCell] = head.cells;
    const rm = nameCell.s.match(ROLE_RE);
    const hn = parseHeaderName(nameCell.s.replace(ROLE_RE, ''));
    const pm = ptsCell.s.match(PTS_RE);
    const u = { role: rm ? (/^appui/i.test(rm[1]) ? 'support' : 'leader') : '', name: hn.name, tag: hn.tag, mult: hn.mult, models: hn.models, pts: +pm[1] + (pm[2] ? +pm[2] : 0), ptsNote: pm[2] ? `base ${pm[1]} + ${pm[2]}` : '', section, M: '', T: '', sv: '', inv: '', W: '', Ld: '', OC: '', weapons: [], abilities: [], keywords: [], factionKw: [], equipment: '', subModels: [], enhancement: null };
    let mode = 'stats', statHead = null, wHead = null, wrows = [], subName = '', abNames = [], extraKnown = [], descRows = [];
    u.profiles = [];
    for (const r of rows) {
      const f = flat(r);
      if (mode === 'desc') { descRows.push(r); continue; }
      const lab = f.match(LABEL_RE);
      if (lab) {
        const key = norm(lab[1]), val = lab[2].trim();
        if (key.startsWith('equipement')) { if (subName) { u.subModels.push({ name: subName, equipment: val }); subName = ''; } else if (!u.equipment) u.equipment = val; extraKnown.push(...val.replace(/\(\d+\)/g, '').split(/\s*,\s*/).filter(Boolean)); }
        else if (key.startsWith('aptitudes')) abNames = val.split(/\s*,\s*/).filter(Boolean);
        else if (key.startsWith('optimisation')) { const em = val.match(/^\[([^\]]+)\]\s*(.+)$/); u.enhancement = { raw: val, detachment: em ? em[1] : '', name: em ? em[2] : val }; }
        else if (key.startsWith('mots-cles de faction')) { u.factionKw = val.split(/\s*,\s*/).filter(Boolean); mode = 'desc'; }
        else if (key.startsWith('mots-cles')) u.keywords = val.split(/\s*,\s*/).filter(Boolean);
        mode = mode === 'desc' ? 'desc' : 'labels';
        continue;
      }
      if (mode === 'stats' || mode === 'weapons' || mode === 'labels') {
        if (r.cells.length >= 5 && r.cells.filter((c) => colKey(c.s)).length >= 5) { statHead = r.cells.map((c) => colKey(c.s)); continue; }
        const looksStat = statHead && r.cells.length >= 5 && /^\d+"?$/.test(r.cells[0].s) && /^\d+\+?(?:\s*\/\s*\d\+\+?)?$/.test((r.cells[2] || {}).s || '') && mode !== 'labels';
        if (looksStat) {
          const o = {}; r.cells.forEach((c, i) => { if (statHead[i]) o[statHead[i]] = c.s; });
          const extra = r.cells.length > statHead.length ? r.cells.slice(statHead.length).map((c) => c.s).join(' ') : '';
          const svm = String(o.sv || '').match(/(\d)\+(?:\s*\/\s*(\d)\+\+?)?/);
          const prof = { name: extra, M: o.M || '', T: o.T || '', W: o.W || '', Ld: o.Ld || '', OC: o.OC || '', sv: svm ? svm[1] + '+' : o.sv || '', inv: svm && svm[2] ? svm[2] : '' };
          u.profiles.push(prof);
          if (!u.T) { Object.assign(u, { M: prof.M, T: prof.T, W: prof.W, Ld: prof.Ld, OC: prof.OC, sv: prof.sv, inv: prof.inv }); mode = 'weapons'; }
          continue;
        }
        const pc = r.cells.find((c) => /^Port[ée]e\b/i.test(c.s));
        if (pc) {
          const dc = r.cells.find((c) => c.s === 'D');
          wHead = { xR: pc.x, xD: dc ? dc.x : pc.x + 150 }; mode = 'weapons'; continue;
        }
        if (mode === 'weapons' && wHead) { wrows.push(r); continue; }
        if (mode === 'weapons' && !wHead && r.cells.length === 1 && u.profiles.length) { const p = u.profiles[u.profiles.length - 1]; p.name = joinTxt(p.name, f); continue; }
        if (r.cells.length === 1 && !/:/.test(f) && u.T) { subName = f; mode = 'labels'; continue; }
      }
      if (mode === 'labels') { if (r.cells.length === 1 && !/:/.test(f)) { subName = f; continue; } descRows.push(r); mode = 'desc'; }
    }

    if (wHead) u.weapons = parseWeaponRows(wrows, wHead);
    if (u.profiles.length < 2) delete u.profiles;

    /* — Aptitudes décrites (colonne gauche = nom, colonne droite = texte) — */
    const known = [...abNames, ...(u.enhancement ? [u.enhancement.raw] : []), ...extraKnown].map(norm);
    const isPrefix = (cand) => { const n = norm(cand); return known.some((k) => k === n || k.startsWith(n)); };
    const withDesc = descRows.find((r) => r.cells.length >= 2);
    const descX = withDesc ? withDesc.cells[1].x : null;
    const parsed = []; let cur = null;
    descRows.forEach((r) => {
      let left = '', right = '';
      r.cells.forEach((c, i) => {
        const isLeft = descX == null ? i === 0 : c.x < descX - 8;
        if (isLeft) left = joinTxt(left, c.s); else right = joinTxt(right, c.s);
      });
      if (left) {
        const cand = cur ? joinTxt(cur.name, left) : null;
        if (cand && isPrefix(cand)) cur.name = cand;
        else { cur = { name: left, text: '' }; parsed.push(cur); }
      }
      if (right && cur) cur.text = joinTxt(cur.text, right);
    });
    const byName = new Map(parsed.map((p) => [norm(p.name), p]));
    const ordered = [];
    abNames.forEach((n) => { const p = byName.get(norm(n)); ordered.push({ name: n, text: p ? p.text : '' }); byName.delete(norm(n)); });
    byName.forEach((p) => ordered.push(p));
    u.abilities = ordered.map((a) => {
      const isEnh = u.enhancement && norm(a.name) === norm(u.enhancement.raw);
      return { name: isEnh ? 'Optimisation : ' + u.enhancement.name : a.name, text: a.text, phases: phasesFromText(a.text || a.name, a.name) };
    });
    const fn = u.abilities.map((a) => norm(a.name).match(/^insensible a la douleur (\d)\+/)).filter(Boolean).map((m) => +m[1]);
    u.fnp = fn.length ? String(Math.min(...fn)) : '';
    u.hasProfile = !!(u.T || u.weapons.length);
    return u;
  }

  /* ---------- Stratagèmes ---------- */
  function parseStrats(rows, detNames) {
    const out = []; let cur = null;
    const qc = rows.flatMap((r) => r.cells).find((c) => /^quand\s*:/i.test(c.s));
    let colX = qc ? qc.x : null;
    if (colX == null) {
      const xs = rows.flatMap((r) => r.cells).filter((c) => /^\d+\s*PC$/i.test(c.s)).map((c) => c.x).sort((p, q) => p - q);
      if (xs.length) colX = xs[Math.floor(xs.length / 2)];
    }
    if (colX == null) return [];
    rows.forEach((r) => {
      let left = '', right = '', cost = null;
      r.cells.forEach((c) => {
        const m = c.s.match(/^(.*?)\s*(\d+)\s*PC$/i);
        if (m && (c.x >= colX - 6 || m[1])) { cost = +m[2]; if (m[1]) left = joinTxt(left, m[1]); return; }
        if (c.x < colX - 6) left = joinTxt(left, c.s); else right = joinTxt(right, c.s);
      });
      if (cost != null) { cur = { left, cp: cost, text: '' }; out.push(cur); return; }
      if (!cur) return;
      if (left) cur.left = joinTxt(cur.left, left);
      if (right) cur.text = joinTxt(cur.text, right);
    });
    const dets = (detNames || []).slice().sort((p, q) => q.length - p.length);
    return out.map((s) => {
      const full = s.left.replace(/\s+/g, ' ').trim();
      let detachment = '', name = '';
      const hit = dets.find((d) => norm(full).startsWith(norm(d)));
      if (hit) { detachment = hit; name = full.slice(hit.length).replace(/^\s*[:\-–]\s*/, '').trim(); }
      else { const ix = full.indexOf(' : '); detachment = ix > 0 ? full.slice(0, ix).trim() : ''; name = ix > 0 ? full.slice(ix + 3).trim() : full; }
      const labels = [...s.text.matchAll(/(Quand|Cible|Effet|Restrictions?)\s*:/gi)];
      const part = (re) => { const i = labels.findIndex((l) => re.test(l[1])); if (i < 0) return ''; const st = labels[i].index + labels[i][0].length, en = i + 1 < labels.length ? labels[i + 1].index : s.text.length; return s.text.slice(st, en).trim(); };
      let when = part(/^quand$/i); const target = part(/^cible$/i);
      let effect = [part(/^effet$/i), part(/^restrictions?$/i) ? 'Restrictions : ' + part(/^restrictions?$/i) : ''].filter(Boolean).join(' ');
      if (!when && labels.length && labels[0].index > 0) when = s.text.slice(0, labels[0].index).trim();
      if (!labels.length) { const sm = s.text.match(/^(.+?[.!])\s+(?=\p{Lu})/u); when = sm ? sm[1] : s.text; effect = s.text; }
      const t = stratTiming(when || s.text);
      return { name, detachment, cp: s.cp, when, target, effect, phases: t.phases, turn: t.turn, turns: t.turns };
    }).filter((s) => s.name);
  }

  /* ---------- Parsing global ---------- */
  function parse(rowsIn) {
    const rows = rowsIn.filter((r) => r.cells.length && !/armylistnetwork\.com/i.test(flat(r)));
    const res = { author: '', faction: '', name: '', detachments: [], units: [], strats: [], rules: [], total: null, warnings: [] };
    if (!rows.length) return res;
    const h = flat(rows[0]).match(/^(.*?)\s*:\s*\[(.+?)\]\s*(.*)$/);
    if (h) { res.author = h[1].trim(); res.faction = h[2].trim(); res.name = h[3].trim(); }
    else res.name = flat(rows[0]);

    let i = 1;
    /* Détachements : colonne gauche = nom (n points), colonne droite = règle */
    const di = rows.findIndex((r) => /^D[ée]tachements?$/i.test(flat(r)));
    if (di >= 0) {
      i = di + 1;
      const first2 = rows.slice(i).find((r) => r.cells.length >= 2);
      const rx = first2 ? first2.cells[1].x : null; let cur = null;
      for (; i < rows.length; i++) {
        const r = rows[i];
        if (isUnitHeader(r) || (r.cells.length === 1 && rows[i + 1] && isUnitHeader(rows[i + 1]))) break;
        let left = '', right = '';
        r.cells.forEach((c) => { if (rx != null && c.x >= rx - 8) right = joinTxt(right, c.s); else left = joinTxt(left, c.s); });
        if (left) {
          if (!cur || cur.done) { cur = { name: left, rule: right, done: false }; res.detachments.push(cur); }
          else { cur.name = joinTxt(cur.name, left); cur.rule = joinTxt(cur.rule, right); }
          cur.done = /\(\s*\d+\s*points?\s*\)\s*$/i.test(cur.name);
        } else if (right && cur) cur.rule = joinTxt(cur.rule, right);
      }
      res.detachments = res.detachments.map((d) => { const m = d.name.match(/^(.*?)\s*\(\s*(\d+)\s*points?\s*\)\s*$/i); return { name: (m ? m[1] : d.name).trim(), dp: m ? +m[2] : null, rule: d.rule.trim() }; });
    }

    /* Unités par sections */
    const hs = rows.flatMap((r) => r.cells.map((c) => c.h || 0)).filter(Boolean).sort((a, b) => a - b);
    const bodyH = hs.length ? hs[Math.floor(hs.length / 2)] : 8;
    let section = '', blockHead = null, block = [], tail = [];
    let lastHost = -1;
    const flush = () => {
      if (blockHead) {
        const u = parseUnitBlock(blockHead, block, section);
        if (u.role) u.attachedToIdx = lastHost; else lastHost = res.units.length;
        res.units.push(u);
      }
      blockHead = null; block = [];
    };
    for (; i < rows.length; i++) {
      const r = rows[i], f = flat(r);
      if (/^Total$/i.test(f)) { flush(); const nx = rows[i + 1] ? flat(rows[i + 1]) : ''; const m = nx.match(/(\d+)\s*points?(?:\s*-\s*(\d+)\s*figurines?)?(?:\s*-\s*(\d+)\s*unit)?/i); if (m) res.total = { points: +m[1], models: m[2] ? +m[2] : null, units: m[3] ? +m[3] : null }; tail = rows.slice(i + 2); break; }
      if (isUnitHeader(r)) { flush(); blockHead = r; continue; }
      if (r.cells.length === 1 && !/[\d:]/.test(f) && f.length <= 40 && (r.cells[0].h || 0) >= bodyH * 1.12) {
        const nx = rows[i + 1];
        if (nx && (isUnitHeader(nx) || (nx.cells.length === 1 && (nx.cells[0].h || 0) >= bodyH * 1.12))) { flush(); section = f; continue; }
      }
      if (blockHead) block.push(r);
    }
    flush();
    res.strats = parseStrats(tail, res.detachments.map((d) => d.name));

    /* Duplication [2X] + règles communes d'armée + règles de détachement */
    const expanded = []; const firstCopy = [];
    res.units.forEach((u, oi) => { firstCopy[oi] = expanded.length; for (let k = 0; k < (u.mult || 1); k++) expanded.push(Object.assign({}, u, { name: (u.mult || 1) > 1 ? `${u.name} #${k + 1}` : u.name, weapons: u.weapons.map((w) => Object.assign({}, w)), abilities: u.abilities.map((a) => Object.assign({}, a)) })); });
    expanded.forEach((u) => { if (u.attachedToIdx != null && u.attachedToIdx >= 0) u.attachedToExp = firstCopy[u.attachedToIdx]; delete u.attachedToIdx; });
    const counts = new Map();
    res.units.forEach((u) => u.abilities.forEach((a) => {
      if (!a.text || !/\bamie?s?\b/i.test(a.text)) return;
      const k = norm(a.name);
      if (!counts.has(k)) counts.set(k, { units: new Set(), a });
      const c = counts.get(k); c.units.add(norm(u.name)); if (a.text.length > c.a.text.length) c.a = a;
    }));
    const common = new Set();
    counts.forEach((v, k) => { if (v.units.size >= 3) { common.add(k); res.rules.push({ name: v.a.name + ' (règle d\'armée)', phases: v.a.phases, text: v.a.text }); } });
    expanded.forEach((u) => { u.abilities = u.abilities.filter((a) => !common.has(norm(a.name))); });
    res.units = expanded;
    res.detachments.forEach((d) => { if (d.rule) res.rules.push({ name: 'Détachement ' + d.name, phases: phasesFromText(d.rule), text: d.rule }); });
    if (!res.units.length) res.warnings.push('Aucune fiche d\'unité reconnue dans ce PDF.');
    return res;
  }
  return { extractRows, parse, norm, phasesFromText, stratTiming };
})();
if (typeof module !== 'undefined') module.exports = AlnPdf;
