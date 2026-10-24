/* Export « Tabletop Simulator » (format noobhammer-tts v1) — module pur : aucune dépendance au DOM, testable sous Node.
   TtsExport.build(ctx) -> { data, json, errors, warnings }     TtsExport.validate(data, opts) -> [{ unit, msg }] */
(function (root) {
  'use strict';
  const FORMAT = 'noobhammer-tts', VERSION = 1;
  const strip = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘`]/g, "'").toLowerCase();
  const nrm = (s) => strip(s).replace(/[^a-z0-9']+/g, ' ').trim();
  const stripN = (n) => String(n || '').replace(/\s*#\d+$/, '').trim();
  /* nom de base d'une arme : « Plasma Pistol - Supercharge » -> « plasma pistol » (même règle que l'appli) */
  const wn1 = (x) => strip(x).replace(/\s+/g, ' ').trim();
  const wbn = (x) => wn1(String(x || '').split(/\s+[–-]\s+/)[0]);
  const num = (v) => { const n = parseInt(v, 10); return isNaN(n) ? 0 : n; };

  /* ---- texte brut : ni HTML, ni Markdown, ni BBCode ---- */
  const BB = 'b|i|u|s|url|color|size|center|left|right|img|quote|code|list|spoiler|font|table|tr|td|th|h1|h2|h3';
  const BBRE = new RegExp('\\[\\/?(' + BB + ')(=[^\\]]*)?\\]', 'gi');
  function clean(s, keepNl) {
    let t = String(s == null ? '' : s).replace(/<br\s*\/?>/gi, '\n').replace(/<\/?[a-z][^>]*>/gi, '').replace(BBRE, '')
      .replace(/\*\*|__|`/g, '').replace(/^#{1,6}\s+/gm, '').replace(/\u00a0/g, ' ').replace(/\r\n?/g, '\n');
    t = keepNl ? t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim() : t.replace(/\s*\n+\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
    return t;
  }
  /* noms et mots-clés : jamais de [ ] (remplacés par des parenthèses) */
  const name = (s) => clean(s).replace(/\[/g, '(').replace(/\]/g, ')').trim();
  const cap = (w) => w.split('-').map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : p)).join('-');
  /* « BLAST 1 » -> « Blast 1 » ; « Rapid Fire 2 » inchangé */
  function kwTitle(k) {
    const t = name(k); if (!t) return '';
    if (/[a-zà-ÿ]/.test(t)) return t;
    return t.split(/\s+/).map((w) => (/^\d/.test(w) ? w : cap(w))).join(' ');
  }
  const splitKw = (s) => String(s || '').split(/\s*,\s*/).map(kwTitle).filter(Boolean);
  const stat = (v) => { const t = clean(v).replace(/[−–—]/g, '-'); return t === '' ? '-' : t; };
  const inch = (v) => { const t = clean(v); if (!t) return '-'; return /^\d+(\+)?$/.test(t) ? t.replace(/\+$/, '') + '"' : t; };
  const sv = (v) => { const t = clean(v); if (!t) return '-'; return /^\d$/.test(t) ? t + '+' : t; };
  const inv = (v) => { const t = clean(v); if (!t || t === '-') return ''; return /^\d$/.test(t) ? t + '+' : t.replace(/\+\+$/, '+'); };

  /* ---- figurines « chef » (sergent, meneur de meute…) ---- */
  const SPECIAL = /sergeant|serg\b|leader|champion|master|boss|\bnob\b|huntmaster|captain|superior|exarch|sarge|alpha|prime\b|chief|sergent|chef\b|meneur/i;
  const isSpecial = (n) => SPECIAL.test(String(n || ''));

  function mapAbilityType(t) {
    const k = strip(t);
    if (k === 'core') return 'core'; if (k === 'faction') return 'faction'; if (k === 'datasheet') return 'datasheet';
    if (/^wargear/.test(k)) return 'wargear'; if (k === 'enhancement') return 'enhancement';
    return 'other';
  }

  /* ---- armes ---- */
  function weaponOut(w, nm) {
    const melee = w.type === 'melee' || /^m(e|ê)l(e|é)e$/i.test(String(w.range || ''));
    return {
      name: name(nm), type: melee ? 'melee' : 'ranged', range: melee ? 'Melee' : inch(w.range),
      A: stat(w.A), skill: clean(w.skill) ? stat(w.skill) : 'N/A', S: stat(w.S), AP: stat(w.AP === '' || w.AP == null ? '0' : w.AP), D: stat(w.D),
      keywords: splitKw(w.kw != null ? w.kw : w.abEn != null ? w.abEn : w.ab)
    };
  }
  /* correspondance entre une arme de la liste (nom FR/EN) et une arme de la fiche */
  function matchWeapon(dw, aw) { const k = wbn(aw.name); return dw.filter((w) => wbn(w.e || w.name) === k || wbn(w.name) === k); }

  /* ---- profils ---- */
  function profilesOf(U) {
    const d = U.en, a = U.app || {};
    if (d && (d.models || []).length) return d.models.map((m) => ({ name: name(m.name), M: inch(m.M), T: stat(m.T), SV: sv(m.Sv), W: stat(m.W), LD: stat(m.Ld), OC: stat(m.OC), invulnerableSave: inv(m.inv) }));
    const ps = (a.profiles || []).length ? a.profiles : [{ name: stripN(a.name), M: a.M, T: a.T, W: a.W, Ld: a.Ld, OC: a.OC, sv: a.sv, inv: a.inv }];
    return ps.map((m) => ({ name: name(m.name || stripN(a.name)), M: inch(m.M), T: stat(m.T), SV: sv(m.sv || m.Sv), W: stat(m.W), LD: stat(m.Ld), OC: stat(m.OC), invulnerableSave: inv(m.inv) }));
  }

  /* ---- équipement de base par type de figurine, lu dans le texte « est équipé de » ---- */
  function parseLoadout(text, dw, profs) {
    const out = {}; if (!text) return out;
    String(text).split(/\n+/).forEach((line) => {
      const m = line.match(/^(.*?)\b(is equipped with|are equipped with|est équipé de|est équipée de|sont équipés de)\b\s*:?\s*(.*)$/i); if (!m) return;
      const subj = nrm(m[1]); const items = m[3].replace(/\.\s*$/, '').split(/\s*;\s*/).map((x) => x.trim()).filter(Boolean);
      const base = {};
      items.forEach((it) => {
        const q = (it.match(/^(\d+)\s+/) || [0, '1'])[1]; const k = wn1(it.replace(/^\d+\s+/, '').replace(/\.$/, ''));
        const hit = dw.find((w) => { const b = wbn(w.e || w.name); return b === k || b.replace(/s\b/g, '') === k.replace(/s\b/g, ''); });
        if (hit) base[wbn(hit.e || hit.name)] = Math.max(1, +q);
      });
      if (!Object.keys(base).length) return;
      let best = -1, bl = 0; profs.forEach((p, i) => { const pn = nrm(p.name); if (pn && subj.includes(pn) && pn.length > bl) { best = i; bl = pn.length; } });
      out[best] = base; /* -1 = « chaque figurine » */
    });
    return out;
  }

  /* ---- répartition des armes entre les figurines ---- */
  function distribute(U, profs, total, warnings, label) {
    const d = U.en, e = U.build, a = U.app || {};
    const dw = d ? (d.weapons || []) : [];
    const chosen = (a.weapons || []);
    let universe = dw;
    const flagged = dw.some((w) => w.b);
    const baseAll = (flagged ? dw.filter((w) => w.b) : dw);
    let extras = [];
    if (!e && d && chosen.length) {
      const keep = new Set(); chosen.forEach((aw) => matchWeapon(dw, aw).forEach((w) => keep.add(wbn(w.e || w.name))));
      if (keep.size) { universe = dw.filter((w) => keep.has(wbn(w.e || w.name))); extras = universe.filter((w) => !baseAll.includes(w)); }
    }
    /* groupes de départ (profil, effectif) */
    const sp = []; const ot = [];
    profs.forEach((p, i) => (isSpecial(p.name) && profs.length > 1 ? sp : ot).push(i));
    if (!ot.length) ot.push(sp.shift());
    let groups = [];
    if (profs.length === 1 || total === 1) groups = [{ pi: ot[0], n: Math.max(1, total) }];
    else {
      let left = total; const put = (pi, n) => { if (n > 0) { groups.push({ pi, n }); left -= n; } };
      sp.forEach((pi) => put(pi, Math.min(1, left - 1)));
      ot.slice(1).forEach((pi) => put(pi, Math.min(1, left - 1)));
      groups.unshift({ pi: ot[0], n: left }); groups = groups.filter((g) => g.n > 0);
    }
    const ld = d ? parseLoadout(d.loadout, dw, profs) : {};
    const baseKeys = (pi) => {
      const src = ld[pi] || ld[-1];
      if (src) return Object.assign({}, src);
      const o = {}; baseAll.forEach((w) => { o[wbn(w.e || w.name)] = 1; }); return o;
    };
    groups.forEach((g) => { g.load = baseKeys(g.pi); g.extra = []; g.gear = []; });
    if (!d) {
      /* pas de fiche : on donne toutes les armes de la liste à chaque figurine */
      warnings.push(label + ' : fiche introuvable dans la base, armes de la liste attribuées à toutes les figurines.');
    }
    const woff = (e && e.woff) || [];
    if (e && d) woff.forEach((ix) => { const w = (d.weapons || [])[ix]; if (w) groups.forEach((g) => { delete g.load[wbn(w.e || w.name)]; }); });
    const rules = (d && d.wr) || [];
    const sentences = (d && d.wo) || [];
    if (e && d) {
      rules.forEach((r, ri) => {
        if (r.k === 't') return;
        const sel = (e.sel || {})[ri] || [];
        const sentence = sentences[r.i] || '';
        const sergOnly = /^(the|le|la|l')\s*[\w' -]{0,45}?(sergeant|sergent|leader|champion|boss|nob|huntmaster|superior|exarch|master)\b[\w' -]{0,45}?\s(can|may|peut|peuvent)\b/i.test(strip(sentence));
        sel.forEach((c, ai) => {
          let left = Math.max(0, +c || 0); if (!left) return;
          const alt = (r.alts || [])[ai] || [];
          const order = groups.slice().sort((x, y) => {
            const sx = sp.includes(x.pi) ? 1 : 0, sy = sp.includes(y.pi) ? 1 : 0; return sergOnly ? sy - sx : sx - sy;
          });
          for (const g of order) {
            if (left <= 0) break;
            if (sergOnly && !sp.includes(g.pi) && sp.length) continue;
            if (r.k === 'r' && !(r.src || []).every((s) => g.load[s])) continue;
            const t = Math.min(left, g.n); left -= t;
            let tgt = g;
            if (t < g.n) { tgt = { pi: g.pi, n: t, load: Object.assign({}, g.load), extra: g.extra.slice(), gear: g.gear.slice() }; g.n -= t; groups.push(tgt); }
            if (r.k === 'r') (r.src || []).forEach((s) => { delete tgt.load[s]; });
            alt.forEach((it) => {
              if (it.w) tgt.load[it.w] = (tgt.load[it.w] || 0) + (it.q || 1);
              else { tgt.gear.push(name(it.e || it.n)); }
              tgt.extra.push(name(it.e || it.n));
            });
          }
          if (left > 0) warnings.push(label + ' : ' + left + ' choix d\'option sans figurine disponible (ignoré).');
        });
      });
    }
    if (e && d && d.pc && d.pc.w) d.pc.w.forEach((w, j) => {
      const q = +((e.wg || {})[j]) || 0; const key = wbn(w[0]); if (q <= 0 || !dw.some((x) => wbn(x.e || x.name) === key)) return;
      const main = groups.find((g) => !sp.includes(g.pi)) || groups[0]; main.load[key] = (main.load[key] || 0) + 1;
    });
    if (extras.length) {
      const main = groups.find((g) => !sp.includes(g.pi)) || groups[0];
      extras.forEach((w) => { main.load[wbn(w.e || w.name)] = 1; });
      warnings.push(label + ' : options d\'armement lues dans la liste sans répartition (' + extras.map((w) => w.e || w.name).join(', ') + ') — attribuées au groupe principal.');
    }
    if (!d) groups.forEach((g) => { g.noSheet = true; });
    return { groups, universe, chosen, dw };
  }

  /* ---- une unité ---- */
  function buildUnit(U, id, idOf, warnings, errors) {
    const a = U.app || {}; const label = stripN(a.name) || id;
    const d = U.en, loc = U.loc || U.en;
    const profs = profilesOf(U);
    let total = num(a.models); if (total < 1) total = 1;
    const dist = distribute(U, profs, total, warnings, label);
    const dw = dist.dw;
    /* armes utilisées + noms uniques */
    const wOut = []; const nameOf = new Map();
    const getW = (key) => {
      if (nameOf.has(key)) return nameOf.get(key);
      const hits = dw.filter((w) => wbn(w.e || w.name) === key);
      const res = hits.map((w) => { let nm = name(w.e || w.name); let i = 2; while (wOut.some((o) => o.name === nm)) nm = name(w.e || w.name) + ' (' + i++ + ')'; const o = weaponOut(w, nm); wOut.push(o); return o.name; });
      nameOf.set(key, res); return res;
    };
    let models = [];
    dist.groups.forEach((g) => {
      const wl = []; const keys = Object.keys(g.load);
      keys.forEach((k) => getW(k).forEach((nm) => wl.push({ name: nm, count: g.load[k] })));
      if (g.noSheet) {
        (a.weapons || []).forEach((aw) => { let nm = name(aw.name); let o = wOut.find((x) => x.name === nm); if (!o) { o = weaponOut(Object.assign({}, aw, { kw: aw.abilities }), nm); wOut.push(o); } wl.push({ name: o.name, count: 1 }); });
      }
      const p = profs[g.pi]; const sfx = g.extra.length ? ' w/ ' + g.extra.join(' + ') : '';
      models.push({ key: g.pi + '|' + wl.map((x) => x.name + 'x' + x.count).sort().join(',') + '|' + g.gear.slice().sort().join(','), name: name(p.name) + sfx, profile: p.name, count: g.n, weapons: wl, abilities: [], gear: g.gear.slice() });
    });
    /* groupes identiques regroupés */
    const merged = []; models.forEach((m) => { const x = merged.find((y) => y.key === m.key); if (x) x.count += m.count; else merged.push(m); });
    models = merged.sort((x, y) => profs.findIndex((p) => p.name === x.profile) - profs.findIndex((p) => p.name === y.profile) || y.count - x.count);
    /* aptitudes */
    const abil = []; const seen = new Set();
    const addAb = (n, type, desc) => { const nm = name(n); if (!nm) return; const k = type + '|' + nrm(nm); if (seen.has(k)) return; seen.add(k); abil.push({ name: nm, type, description: type === 'core' || type === 'faction' ? '' : clean(desc, true) }); };
    const aoff = (U.build && U.build.aoff) || [];
    const lAb = (loc && loc.abilities) || (a.abilities || []);
    const eAb = d && d.abilities && loc && loc.abilities && d.abilities.length === loc.abilities.length ? d.abilities : null;
    const enhRe = /^(Amélioration|Enhancement)\s*[—-]\s*/i;
    let enhAb = null;
    /* équipement réellement choisi (noms anglais normalisés) : sert à filtrer les aptitudes « Wargear » */
    const have = new Set(); const dp = d && d.pc && d.pc.w || [];
    dist.groups.forEach((g) => { Object.keys(g.load).forEach((k) => have.add(wn1(k))); g.gear.forEach((x) => have.add(wn1(x))); });
    if (U.build) dp.forEach((w, j) => { if ((+((U.build.wg || {})[j]) || 0) > 0) have.add(wn1(w[0])); });
    const optText = wn1([].concat(a.options || [], a.equipment || '', (a.weapons || []).map((w) => w.name)).join(' ; '));
    lAb.forEach((x, j) => {
      if (loc && loc.abilities && aoff.includes(j)) return; if (!x.name) return;
      if (enhRe.test(x.name)) { enhAb = x; return; }
      const type = mapAbilityType(x.type || 'Datasheet');
      if (type === 'wargear' && d) {
        const en1 = wn1(eAb ? eAb[j].name : x.name), loc1 = wn1(x.name);
        const ok = U.build ? have.has(en1) : (optText.indexOf(en1) >= 0 || optText.indexOf(loc1) >= 0);
        if (!ok) return;
      }
      addAb(x.name + (x.param ? ' ' + x.param : ''), type, x.text);
    });
    /* équipements payants choisis qui ne sont pas des aptitudes de la fiche */
    const lp = loc && loc.pc && loc.pc.w || [];
    if (U.build) dp.forEach((w, j) => {
      if ((+((U.build.wg || {})[j]) || 0) <= 0) return;
      const nm = name((lp[j] && lp[j][0]) || w[0]);
      const isWeapon = dist.dw.some((x) => wn1(x.e || x.name).split(' - ')[0] === wn1(w[0]));
      if (!isWeapon && !abil.some((x) => nrm(x.name) === nrm(nm))) addAb(nm, 'wargear', '');
    });
    /* équipements non-armes choisis (bouclier tempête…) : nom localisé si la fiche en a un */
    models.forEach((m) => m.gear.forEach((gname) => {
      const j = eAb ? eAb.findIndex((x) => wn1(x.name) === wn1(gname)) : -1;
      const nm = name(j >= 0 ? loc.abilities[j].name : gname);
      addAb(nm, 'wargear', j >= 0 ? loc.abilities[j].text : ''); if (!m.abilities.includes(nm)) m.abilities.push(nm);
    }));
    if (!enhAb) enhAb = (a.abilities || []).find((x) => enhRe.test(x.name || '')) || null;
    const enhName = (a.enhancement || (enhAb && enhAb.name.replace(enhRe, '')) || '').trim();
    if (enhName) addAb(enhName, 'enhancement', (enhAb && enhAb.text) || '');
    const official = stripN((loc && (loc.name && (loc.name.en || loc.name))) || '') || stripN((d && d.name) || '') || stripN(a.name);
    const cn = stripN(a.name); const custom = cn && nrm(cn) !== nrm(official) && !(d && nrm(cn) === nrm(d.name)) ? cn : '';
    const fk = ((d && d.fkw) || []).map(kwTitle); (a.factionKw || []).forEach((k) => { const t = kwTitle(k); if (t && !fk.some((x) => nrm(x) === nrm(t))) fk.push(t); });
    const kw = d ? (d.kw || []).map(kwTitle) : (a.keywords || []).map(kwTitle);
    return {
      id, name: name(official), customName: name(custom), points: num(a.pts),
      factionKeywords: fk.filter(Boolean), keywords: kw.filter(Boolean),
      profiles: profs, weapons: wOut,
      abilities: abil,
      models: models.map((m) => ({ name: m.name, profile: m.profile, count: m.count, weapons: m.weapons, abilities: m.abilities })),
      attachedTo: a.attachedTo && idOf[a.attachedTo] ? idOf[a.attachedTo] : ''
    };
  }

  function build(ctx) {
    const warnings = [], errors = [];
    const units = ctx.units || []; const pad = units.length > 99 ? 3 : 2;
    const idOf = {}; units.forEach((U, i) => { idOf[(U.app || {}).id] = 'u' + String(i + 1).padStart(pad, '0'); });
    const out = units.map((U, i) => buildUnit(U, idOf[(U.app || {}).id], idOf, warnings, errors));
    const pts = out.reduce((s, u) => s + u.points, 0);
    const data = {
      format: FORMAT, version: VERSION, edition: ctx.edition || '11e',
      army: { name: name(ctx.name), faction: name(ctx.faction), subfaction: name(ctx.subfaction), detachment: name((ctx.detachments || []).join(' / ')), points: pts, pointsLimit: num(ctx.pointsLimit) },
      units: out
    };
    const expected = {}; units.forEach((U, i) => { expected[out[i].id] = Math.max(1, num((U.app || {}).models)); });
    const errs = validate(data, { expected });
    return { data, json: JSON.stringify(data), errors: errs, warnings };
  }

  /* ---- validation ---- */
  const HTML = /<\/?[a-z][^>]*>/i, MD = /\*\*|__|`|^#{1,6}\s/m;
  function validate(data, opts) {
    const errs = []; const exp = (opts && opts.expected) || null;
    const err = (unit, msg) => errs.push({ unit: unit || '', msg });
    const isStr = (v) => typeof v === 'string';
    const text = (unit, where, v, nl) => {
      if (!isStr(v)) { err(unit, where + ' : texte attendu.'); return; }
      if (HTML.test(v) || MD.test(v) || new RegExp(BBRE.source, 'i').test(v)) err(unit, where + ' : balise HTML, Markdown ou BBCode interdite.');
      if (!nl && /\n/.test(v)) err(unit, where + ' : retour à la ligne interdit hors description.');
    };
    const label = (u, i) => (u && (u.customName || u.name) ? (u.customName || u.name) + ' (' + (u.id || 'unité ' + (i + 1)) + ')' : 'unité ' + (i + 1));
    if (!data || typeof data !== 'object') { err('', 'JSON vide ou invalide.'); return errs; }
    if (data.format !== FORMAT) err('', 'format doit valoir « ' + FORMAT + ' ».');
    if (data.version !== VERSION) err('', 'version doit valoir 1.');
    if (data.edition !== '10e' && data.edition !== '11e') err('', 'edition doit valoir « 10e » ou « 11e ».');
    const ar = data.army;
    if (!ar || typeof ar !== 'object') err('', 'army manquant.');
    else {
      ['name', 'faction', 'subfaction', 'detachment'].forEach((k) => text('', 'army.' + k, ar[k]));
      ['points', 'pointsLimit'].forEach((k) => { if (!Number.isInteger(ar[k])) err('', 'army.' + k + ' doit être un entier.'); });
    }
    if (!Array.isArray(data.units)) { err('', 'units doit être un tableau.'); return errs; }
    const ids = new Set();
    data.units.forEach((u, i) => {
      const L = label(u, i);
      if (!u || typeof u !== 'object') { err(L, 'unité invalide.'); return; }
      ['id', 'name', 'customName', 'attachedTo'].forEach((k) => text(L, k, u[k]));
      if (!u.id) err(L, 'id manquant.'); else if (ids.has(u.id)) err(L, 'id « ' + u.id + ' » en double.'); else ids.add(u.id);
      if (!Number.isInteger(u.points)) err(L, 'points doit être un entier.');
      ['factionKeywords', 'keywords', 'profiles', 'weapons', 'abilities', 'models'].forEach((k) => { if (!Array.isArray(u[k])) err(L, k + ' doit être un tableau.'); });
      if (u.attachedTo && !data.units.some((x) => x && x.id === u.attachedTo)) err(L, 'attachedTo « ' + u.attachedTo + ' » ne correspond à aucune unité.');
      if (u.attachedTo && u.attachedTo === u.id) err(L, 'une unité ne peut pas être rattachée à elle-même.');
      ['factionKeywords', 'keywords'].forEach((k) => (u[k] || []).forEach((x) => { if (!isStr(x)) err(L, k + ' : texte attendu.'); else { text(L, k + ' « ' + x + ' »', x); if (/[\[\]]/.test(x)) err(L, k + ' « ' + x + ' » : les crochets [ ] sont interdits.'); if (x.indexOf(',') >= 0) err(L, k + ' « ' + x + ' » : virgule interdite.'); } }));
      const pn = new Set();
      (u.profiles || []).forEach((p) => {
        ['name', 'M', 'T', 'SV', 'W', 'LD', 'OC', 'invulnerableSave'].forEach((k) => { if (!isStr(p[k])) err(L, 'profil « ' + (p && p.name) + ' » : ' + k + ' doit être une chaîne (jamais null).'); else text(L, 'profil ' + k, p[k]); });
        if (/[\[\]]/.test(p.name || '')) err(L, 'profil « ' + p.name + ' » : crochets interdits.');
        if (!p.name) err(L, 'profil sans nom.'); pn.add(p.name);
      });
      if (!(u.profiles || []).length) err(L, 'au moins un profil est requis.');
      const wn = new Set();
      (u.weapons || []).forEach((w) => {
        ['name', 'type', 'range', 'A', 'skill', 'S', 'AP', 'D'].forEach((k) => { if (!isStr(w[k])) err(L, 'arme « ' + (w && w.name) + ' » : ' + k + ' doit être une chaîne (jamais null).'); else text(L, 'arme ' + k, w[k]); });
        if (w.type !== 'ranged' && w.type !== 'melee') err(L, 'arme « ' + w.name + ' » : type doit être « ranged » ou « melee ».');
        if (w.type === 'melee' && w.range !== 'Melee') err(L, 'arme « ' + w.name + ' » : la portée doit être « Melee ».');
        if (w.type === 'ranged' && !/"$/.test(w.range || '')) err(L, 'arme « ' + w.name + ' » : la portée doit se terminer par le symbole ".');
        if (!Array.isArray(w.keywords)) err(L, 'arme « ' + w.name + ' » : keywords doit être un tableau.');
        else w.keywords.forEach((x) => { if (!isStr(x)) err(L, 'arme « ' + w.name + ' » : mot-clé invalide.'); else { text(L, 'mot-clé d\'arme', x); if (/[\[\]]/.test(x)) err(L, 'arme « ' + w.name + ' » : crochets interdits dans « ' + x + ' ».'); } });
        if (/[\[\]]/.test(w.name || '')) err(L, 'arme « ' + w.name + ' » : crochets interdits.');
        if (wn.has(w.name)) err(L, 'arme « ' + w.name + ' » en double.'); wn.add(w.name);
      });
      const TYPES = ['core', 'faction', 'datasheet', 'wargear', 'enhancement', 'other'];
      (u.abilities || []).forEach((x) => {
        if (!isStr(x.name) || !x.name) err(L, 'aptitude sans nom.'); else { text(L, 'aptitude « ' + x.name + ' »', x.name); if (/[\[\]]/.test(x.name)) err(L, 'aptitude « ' + x.name + ' » : crochets interdits.'); }
        if (!TYPES.includes(x.type)) err(L, 'aptitude « ' + x.name + ' » : type « ' + x.type + ' » invalide.');
        text(L, 'description de « ' + x.name + ' »', x.description, true);
      });
      let sum = 0;
      (u.models || []).forEach((m) => {
        if (!isStr(m.name)) err(L, 'figurine sans nom.'); else text(L, 'figurine ' + m.name, m.name);
        if (!pn.has(m.profile)) err(L, 'figurine « ' + m.name + ' » : le profil « ' + m.profile + ' » n\'existe pas dans profiles.');
        if (!Number.isInteger(m.count) || m.count < 1) err(L, 'figurine « ' + m.name + ' » : count doit être un entier ≥ 1.'); else sum += m.count;
        if (!Array.isArray(m.weapons)) err(L, 'figurine « ' + m.name + ' » : weapons doit être un tableau.');
        else m.weapons.forEach((w) => { if (!wn.has(w.name)) err(L, 'figurine « ' + m.name + ' » : l\'arme « ' + w.name + ' » n\'existe pas dans weapons.'); if (!Number.isInteger(w.count) || w.count < 1) err(L, 'figurine « ' + m.name + ' » : count d\'arme invalide pour « ' + w.name + ' ».'); });
        if (!Array.isArray(m.abilities)) err(L, 'figurine « ' + m.name + ' » : abilities doit être un tableau.');
      });
      if (!(u.models || []).length) err(L, 'au moins un groupe de figurines est requis.');
      if (exp && u.id in exp && sum !== exp[u.id]) err(L, 'la somme des figurines (' + sum + ') ne correspond pas au nombre de figurines de la liste (' + exp[u.id] + ').');
    });
    /* aucun null / undefined nulle part */
    (function walk(v, path) {
      if (v === null || v === undefined) { err('', 'valeur nulle à ' + path + '.'); return; }
      if (Array.isArray(v)) v.forEach((x, i) => walk(x, path + '[' + i + ']'));
      else if (typeof v === 'object') Object.keys(v).forEach((k) => walk(v[k], path + '.' + k));
    })(data, '$');
    return errs;
  }

  /* ---- préparation : retrouve les fiches (FR + EN) de chaque unité d'une armée de l'appli ---- */
  async function prepare(a, W, opts) {
    const lang = (opts && opts.lang) === 'en' ? 'en' : 'fr';
    await W.ready(); const ix = W.index();
    const facs = W.facIds(a.faction || ''); const bu = a.build && Array.isArray(a.build.units) && a.build.units.length === a.units.length ? a.build.units : null;
    const entry = (u) => {
      if (u.wahapId) { const e = ix.units.find((x) => x.id === u.wahapId); if (e) return e; }
      const k = W.norm(stripN(u.name));
      const hits = ix.units.filter((x) => W.norm(x.n) === k || W.norm(x.e) === k);
      return hits.find((x) => facs.includes(x.f)) || hits[0] || null;
    };
    const ents = a.units.map(entry); const need = [...new Set(ents.filter(Boolean).map((e) => e.f))];
    const fr = {}, en = {};
    await Promise.all(need.map(async (f) => { fr[f] = await W.faction(f); en[f] = await W.enFaction(f); }));
    const units = a.units.map((u, i) => {
      const e = ents[i]; const dFr = e && fr[e.f] ? fr[e.f].units.find((x) => x.id === e.id) : null; const dEn = e && en[e.f] ? en[e.f].units.find((x) => x.id === e.id) : null;
      const b = bu && bu[i] && u.wahapId && bu[i].id === u.wahapId ? bu[i] : null;
      return { app: u, en: dEn || null, loc: (lang === 'en' ? dEn : dFr) || dEn || null, build: b };
    });
    return { name: a.name, faction: a.faction, subfaction: a.chapter || '', detachments: (a.detachments || []).map((d) => String(d).replace(/\s*\(\d+ pts?\)\s*$/, '')), pointsLimit: a.build && a.build.limit, edition: '11e', units };
  }

  const api = { prepare, build, validate, clean, kwTitle, wbn, FORMAT, VERSION };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TtsExport = api;
})(typeof window !== 'undefined' ? window : globalThis);
