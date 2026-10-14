/* Import de listes ALN40k (texte / BBCode) et de profils depuis la page ALN.
   Global `Importer` dans le navigateur, module.exports dans Node (chemin texte uniquement). */
const Importer = (() => {
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();

  /* ---------- BBCode ---------- */
  const BB_TAGS = 'b|i|u|s|size|color|colour|url|quote|center|code|list|spoiler|img|font|align|hr|table|tr|td|th|left|right|email';
  function stripBBCode(raw) {
    const urls = [];
    let t = String(raw || '').replace(/\r/g, '');
    t = t.replace(/\[url(?:=([^\]]+))?\]([\s\S]*?)\[\/url\]/gi, (m, u, inner) => { urls.push(u || inner); return inner; });
    t = t.replace(/\[\*\]/g, '\n- ');
    t = t.replace(new RegExp('\\[/?(?:' + BB_TAGS + ')(?:=[^\\]]*)?\\]', 'gi'), '');
    t = t.replace(/<br\s*\/?>/gi, '\n').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
    return { text: t, urls };
  }

  /* ---------- Liste (texte ou BBCode) ---------- */
  function parseList(raw) {
    const { text, urls } = stripBBCode(raw);
    const lines = text.split('\n').map((l) => l.replace(/\t/g, ' ').replace(/\s+/g, ' ').trim());
    const res = { name: '', faction: '', detachments: [], units: [], url: null, total: null, warnings: [] };
    let section = '', inDet = false, last = null, first = true;
    for (const line of lines) {
      if (!line) { inDet = false; continue; }
      if (first) {
        first = false;
        const h = line.match(/^(.+?)\s*:\s*(.+)$/);
        if (h && !/\bpts?\b/i.test(line)) { res.faction = h[1].trim(); res.name = h[2].trim(); continue; }
      }
      if (/^#+\s*d[ée]tachements?/i.test(line) || /^d[ée]tachements?\s*:/i.test(line)) { inDet = true; continue; }
      if (inDet && /^[*•-]\s+/.test(line)) { res.detachments.push(line.replace(/^[*•-]\s+/, '')); continue; }
      inDet = false;
      const sec = line.match(/^-{2,}\s*(.+?)\s*-{2,}$/);
      if (sec) { section = sec[1]; continue; }
      const tot = line.match(/^total\s*:\s*(\d+)\s*points?(?:\s*-\s*(\d+)\s*figurines?)?(?:\s*-\s*(\d+)\s*unit)?/i);
      if (tot) { res.total = { points: +tot[1], models: tot[2] ? +tot[2] : null, units: tot[3] ? +tot[3] : null }; continue; }
      const url = line.match(/^url\s*:\s*(\S+)/i);
      if (url) { res.url = url[1]; continue; }
      const unitM = line.match(/^([^:]*?)\s*:\s*(\d+)\s*pts?\b/i);
      if (unitM) {
        let left = unitM[1].trim(), tag = '', models = null;
        const tg = left.match(/^\[([^\]]{1,12})\]\s*/); if (tg) { tag = tg[1]; left = left.slice(tg[0].length); }
        const md = left.match(/\s*\((\d+)\)\s*$/); if (md) { models = +md[1]; left = left.slice(0, md.index); }
        last = { name: left.trim(), models, pts: +unitM[2], tag, section, options: [], enhancement: '' };
        res.units.push(last);
        continue;
      }
      const opt = line.match(/^[-•*]\s+(.*)$/);
      if (opt && last) {
        let o = opt[1].trim();
        const en = o.match(/^\[([^\]]+)\]\s*(.+)$/);
        if (en) { last.enhancement = en[2].trim(); o = en[2].trim(); }
        last.options.push(o);
        continue;
      }
    }
    if (!res.url) { const m = (text + ' ' + urls.join(' ')).match(/https?:\/\/[^\s\]\)]*armylistnetwork[^\s\]\)]*/i); if (m) res.url = m[0]; }
    if (!res.units.length) res.warnings.push('Aucune unité reconnue (lignes « Nom : 100 pts »).');
    return res;
  }

  /* ---------- Page ALN : flux de lignes et de tableaux ---------- */
  function htmlStream(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script,style,noscript').forEach((n) => n.remove());
    const out = []; let buf = [];
    const flush = () => { const t = buf.join(' ').replace(/\s+/g, ' ').trim(); if (t) out.push({ k: 'line', t }); buf = []; };
    const BLOCK = /^(DIV|P|BR|H[1-6]|LI|UL|OL|TR|SECTION|ARTICLE|HR|DL|DT|DD|HEADER|FOOTER)$/;
    (function walk(n) {
      for (const c of n.childNodes) {
        if (c.nodeType === 3) { buf.push(c.textContent); continue; }
        if (c.nodeType !== 1) continue;
        if (c.tagName === 'TABLE') {
          flush();
          const rows = Array.from(c.rows).map((r) => Array.from(r.cells).map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
          out.push({ k: 'table', rows });
          continue;
        }
        const blk = BLOCK.test(c.tagName);
        if (blk) flush();
        walk(c);
        if (blk) flush();
      }
    })(doc.body || doc);
    flush();
    return out;
  }
  const STAT_RE = /^(\d+)\s*["”″']?\s+(\d+)\s+(\d\+(?:\s*\/\s*\d\+\+?)?)\s+(\d+)\s+(\d\+|-)\s+(\d+)$/;
  const WEAP_RE = /^(.+?)\s+((?:\d+\s*["”″']?)|m[êe]l[ée]e|-)\s+(\d*d\d+(?:\+\d+)?|\d+)\s+(\d\+|n\/?a|-)\s+(\d+|\d*d\d+)\s+(-?\d+)\s+(\d*d\d+(?:\+\d+)?|\d+)(?:\s+(.*))?$/i;
  function textStream(text) {
    const out = [];
    text.replace(/\r/g, '').split('\n').forEach((raw) => {
      const line = raw.replace(/\u00a0/g, ' ').trim(); if (!line) return;
      const cells = line.split(/\t+| {3,}/).map((x) => x.trim()).filter(Boolean);
      const flat = line.replace(/\t+/g, ' ').replace(/\s+/g, ' ');
      if (/^(m|mouv\w*)\s+(e|end\w*)\s+(sv|sauv\w*)/i.test(flat) || /port[ée]e\s+a\s+(c\/t|ct|cc|bs|ws)/i.test(norm(flat).replace(/\s+/g,' ') ) || /port[ée]e\s+a\s+(c\/t|ct|cc)/i.test(flat)) { out.push({ k: 'hdr', t: flat }); return; }
      if (cells.length === 6 && /^\d+/.test(cells[0]) && /^\d\+/.test(cells[2])) { out.push({ k: 'table', rows: [['M', 'E', 'SV', 'PV', 'CD', 'CO'], cells], synth: 'stats' }); return; }
      if (STAT_RE.test(flat)) { out.push({ k: 'table', rows: [['M', 'E', 'SV', 'PV', 'CD', 'CO'], flat.match(STAT_RE).slice(1, 7)], synth: 'stats' }); return; }
      if (cells.length >= 7 && /^[\d"”″' ]+$|^m[êe]l/i.test(cells[1])) { out.push({ k: 'table', rows: [['Arme', 'Portée', 'A', 'C/T', 'F', 'PA', 'D', 'Capacités'], cells], synth: 'weapons' }); return; }
      const w = flat.match(WEAP_RE);
      if (w && !/^(equipement|aptitudes|mots)/i.test(norm(flat))) { out.push({ k: 'table', rows: [['Arme', 'Portée', 'A', 'C/T', 'F', 'PA', 'D', 'Capacités'], w.slice(1, 9).map((x) => (x || '').trim())], synth: 'weapons' }); return; }
      out.push({ k: 'line', t: flat });
    });
    return out;
  }

  const colKey = (h) => {
    const n = norm(h).replace(/[^a-z/]/g, '');
    if (/^(m|mouvement|mouv)$/.test(n)) return 'M';
    if (/^(e|endurance|t)$/.test(n)) return 'T';
    if (/^(sv|svg|sauvegarde|sauv|save)$/.test(n)) return 'sv';
    if (/^(pv|w|pointsdevie|blessures)$/.test(n)) return 'W';
    if (/^(cd|ld|commandement)$/.test(n)) return 'Ld';
    if (/^(co|oc|controledobjectif|controle)$/.test(n)) return 'OC';
    if (/^(portee|range)$/.test(n)) return 'range';
    if (/^a$|^attaques$/.test(n)) return 'A';
    if (/^(c\/t|ct|cc|ct\/cc|cc\/ct|bs|ws|bs\/ws|c\/c|competence)$/.test(n)) return 'skill';
    if (/^(f|force|s)$/.test(n)) return 'S';
    if (/^(pa|ap)$/.test(n)) return 'AP';
    if (/^(d|degats|dmg)$/.test(n)) return 'D';
    if (/^(capacites|capacite|abilities|aptitudes)$/.test(n)) return 'abilities';
    return '';
  };
  const matchHeader = (t) => {
    if (t.length > 110 || /^total\b/i.test(t)) return null;
    let m = t.match(/^(.*?)\s*:\s*(\d+)\s*pts?\b/i) || t.match(/^(.*?)\s*[-–]?\s*\(?\b(\d+)\s*pts?\b\)?\s*$/i);
    if (!m || !m[1].trim()) return null;
    let left = m[1].trim(), models = null;
    left = left.replace(/^\[[^\]]{1,12}\]\s*/, '');
    const md = left.match(/\s*\((\d+)\)\s*$/); if (md) { models = +md[1]; left = left.slice(0, md.index); }
    return { name: left.trim(), models, pts: +m[2] };
  };
  const fnpFrom = (abilities) => {
    for (const a of abilities) { const m = norm(a).match(/insensible a la douleur\s*(\d)\+/); if (m) return +m[1]; }
    return 0;
  };

  function parseAlnPage(input) {
    const isHtml = /<table[\s>]|<div[\s>]|<\/(?:p|td|tr)>/i.test(input);
    const stream = isHtml ? htmlStream(input) : textStream(input);
    const blocks = []; let cur = null, para = [], wType = null;
    const flushPara = () => { if (cur && para.length) cur.para += ' ' + para.join(' '); para = []; };
    for (const it of stream) {
      if (it.k === 'hdr') continue;
      if (it.k === 'line') {
        const h = matchHeader(it.t);
        if (h) { flushPara(); cur = Object.assign(h, { stats: null, weapons: [], para: '' }); blocks.push(cur); wType = null; continue; }
        if (cur) {
          const n = norm(it.t);
          if (/^armes? (de )?tir/.test(n)) wType = 'ranged'; else if (/^armes? (de )?(melee|corps)/.test(n)) wType = 'melee'; else para.push(it.t);
        }
        continue;
      }
      if (!cur) continue;
      flushPara();
      const rows = it.rows.filter((r) => r.length);
      if (!rows.length) continue;
      const hi = rows.findIndex((r) => r.filter((c) => colKey(c)).length >= 4);
      if (hi < 0) continue;
      const head = rows[hi].map(colKey);
      const isWeapons = head.includes('range') && head.includes('AP');
      const isStats = head.includes('T') && head.includes('W');
      rows.slice(hi + 1).forEach((r) => {
        if (r.length === 1) { const n = norm(r[0]); if (/tir/.test(n)) wType = 'ranged'; else if (/melee|corps/.test(n)) wType = 'melee'; return; }
        const o = {}; const off = Math.max(0, r.length - head.length); // décalage si la colonne « nom » n'a pas d'en-tête
        const addName = (c) => { o._name = (o._name ? o._name + ' ' : '') + c; };
        r.forEach((c, i) => { if (i < off) { addName(c); return; } const k = head[i - off]; if (k) o[k] = c; else addName(c); });
        if (isWeapons) {
          const name = o._name || r[0];
          if (!name || !o.range) return;
          const melee = /m[êe]l[ée]e|corps/i.test(o.range) || o.range === '-' || (wType === 'melee' && !/\d/.test(o.range));
          cur.weapons.push({ name: name.trim(), range: o.range, A: o.A || '', skill: o.skill || '', S: o.S || '', AP: o.AP || '0', D: o.D || '', abilities: (o.abilities || '').replace(/^[-–]$/, ''), type: melee ? 'melee' : 'ranged' });
        } else if (isStats && !cur.stats) {
          cur.stats = o;
        }
      });
    }
    flushPara();
    blocks.forEach((b) => {
      const p = b.para.replace(/\s+/g, ' ');
      const g = (re) => { const m = p.match(re); return m ? m[1].trim() : ''; };
      const stop = '(?=\\s*(?:Equipement|Équipement|Aptitudes|Mots-cl[ée]s(?: de faction)?|Optimisations?)\\s*:|$)';
      b.equipment = g(new RegExp('[EÉé]quipement\\s*:\\s*(.*?)' + stop, 'i'));
      b.abilities = g(new RegExp('Aptitudes\\s*:\\s*(.*?)' + stop, 'i')).split(/\s*,\s*/).filter(Boolean);
      b.keywords = g(new RegExp('Mots-cl[ée]s\\s*:\\s*(.*?)' + stop, 'i')).split(/\s*,\s*/).filter(Boolean);
      b.factionKw = g(new RegExp('Mots-cl[ée]s de faction\\s*:\\s*(.*?)' + stop, 'i')).split(/\s*,\s*/).filter(Boolean);
    });
    return blocks;
  }

  /* ---------- Rapprochement liste <-> profils ---------- */
  const key = (s) => norm(s).replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();
  const tokens = (s) => new Set(key(s).split(' ').filter((x) => x.length > 2));
  const jacc = (a, b) => { const A = tokens(a), B = tokens(b); if (!A.size || !B.size) return 0; let i = 0; A.forEach((x) => { if (B.has(x)) i++; }); return i / (A.size + B.size - i); };
  function findProfile(name, models, blocks) {
    const k = key(name);
    const exact = blocks.filter((b) => key(b.name) === k);
    if (exact.length) return exact.find((b) => models && b.models === models) || exact[0];
    const part = blocks.filter((b) => { const kb = key(b.name); return kb && (kb.includes(k) || k.includes(kb)); });
    if (part.length) return part.find((b) => models && b.models === models) || part[0];
    let best = null, bs = 0;
    blocks.forEach((b) => { const s = jacc(name, b.name); if (s > bs) { bs = s; best = b; } });
    return bs >= 0.5 ? best : null;
  }
  const AUTO_PHASE = { furtivite: ['def'], infiltrateurs: ['move'], 'frappe en profondeur': ['move'], 'eclaireurs': ['move'], 'combat en premier': ['fight'], 'tir indirect': ['shoot'] };
  function toUnit(uid, listUnit, p) {
    const u = { id: uid(), name: listUnit.name, models: listUnit.models || p?.models || '', pts: listUnit.pts, section: listUnit.section || '', options: listUnit.options || [], enhancement: listUnit.enhancement || '', weapons: [], abilities: [] };
    if (p) applyProfile(u, p);
    return u;
  }
  function applyProfile(u, p) {
    const st = p.stats || {};
    const svM = String(st.sv || '').match(/(\d)\+(?:\s*\/\s*(\d)\+\+?)?/);
    Object.assign(u, { M: st.M || '', T: st.T || '', sv: svM ? svM[1] + '+' : st.sv || '', inv: svM && svM[2] ? svM[2] : '', W: st.W || '', Ld: st.Ld || '', OC: st.OC || '' });
    u.fnp = fnpFrom(p.abilities) || u.fnp || '';
    u.weapons = p.weapons.map((w) => Object.assign({}, w));
    u.abilities = p.abilities.map((a) => ({ name: a, phases: AUTO_PHASE[norm(a)] || ['all'], text: '' }));
    u.keywords = p.keywords; u.factionKw = p.factionKw; u.equipment = p.equipment;
    u.hasProfile = !!(p.stats || p.weapons.length);
    return u;
  }
  function enrichArmy(army, blocks, uid) {
    const rep = { matched: 0, missing: [], noStats: [], noWeapons: [] };
    army.units.forEach((u) => {
      const p = findProfile(u.name, +u.models || null, blocks);
      if (!p) { rep.missing.push(u.name); return; }
      const keep = { id: u.id, name: u.name, models: u.models || p.models || '', pts: u.pts, section: u.section, options: u.options, enhancement: u.enhancement };
      applyProfile(u, p); Object.assign(u, keep);
      rep.matched++;
      if (!p.stats) rep.noStats.push(u.name);
      if (!p.weapons.length) rep.noWeapons.push(u.name);
    });
    return rep;
  }
  return { parseList, parseAlnPage, enrichArmy, toUnit, stripBBCode, norm, findProfile };
})();
if (typeof module !== 'undefined') module.exports = Importer;
