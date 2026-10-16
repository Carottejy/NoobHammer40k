/* Export d'une liste d'armée en PDF : une page A4 paysage, un bloc par unité façon tableur
   (profil, aptitudes, tableau d'armes aligné ; chefs et appuis regroupés sous leur unité). Générateur minimal, polices standard. */
(function () {
  const W = { 32: 278, 33: 278, 34: 355, 35: 556, 36: 556, 37: 889, 38: 667, 39: 191, 40: 333, 41: 333, 42: 389, 43: 584, 44: 278, 45: 333, 46: 278, 47: 278, 58: 278, 59: 278, 60: 584, 61: 584, 62: 584, 63: 556, 64: 1015, 91: 278, 92: 278, 93: 278, 94: 469, 95: 556, 96: 333, 123: 334, 124: 260, 125: 334, 126: 584 };
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach((c, i) => { W[65 + i] = [667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611][i]; });
  'abcdefghijklmnopqrstuvwxyz'.split('').forEach((c, i) => { W[97 + i] = [556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500][i]; });
  for (let d = 48; d <= 57; d++) W[d] = 556;
  const MAP = { '’': "'", '‘': "'", '“': '"', '”': '"', '–': '-', '—': '-', '…': '...', '✦': '*', '👑': '', '→': '>', '↳': '>', '≥': '>=', '≤': '<=', '−': '-', ' ': ' ', ' ': ' ', '•': '\x95', '€': '\x80', 'œ': '\x9c', 'Œ': '\x8c' };
  const clean = (s) => String(s == null ? '' : s).replace(/[^\x00-\xff]|[’‘“”–—…✦→↳≥≤−•€œŒ  ]/g, (c) => (c in MAP ? MAP[c] : '?')).replace(/[\r\t\n]/g, ' ');
  const cw = (c, bold) => ((W[c.charCodeAt(0)] || 556) * (bold ? 1.06 : 1)) / 1000;
  const tw = (s, size, bold) => { let w = 0; for (let i = 0; i < s.length; i++) w += cw(s[i], bold); return w * size; };
  const esc = (s) => s.replace(/[\\()]/g, '\\$&');
  const num = (x) => { const m = String(x == null ? '' : x).match(/^(\d*)D(\d+)(?:\+(\d+))?$/i); if (m) return (+(m[1] || 1)) * ((+m[2] + 1) / 2) + (+(m[3] || 0)); const n = parseFloat(String(x).replace(/[^\d.\-]/g, '')); return isNaN(n) ? 0 : n; };
  const score = (w) => Math.max(1, num(w.A)) * Math.max(3, num(w.S)) * (1 + 0.4 * Math.abs(num(w.AP))) * Math.max(1, num(w.D));
  const isMelee = (w) => w.type === 'melee' || /m[eê]l/i.test(String(w.range || ''));
  /* segments {s, b, g} -> lignes de segments qui tiennent dans width */
  function wrapSegs(segs, size, width) {
    const lines = []; let line = [], x = 0;
    segs.forEach((sg) => {
      clean(sg.s).split(' ').filter((w) => w !== '').forEach((word) => {
        const ww = tw(word, size, sg.b), sp = tw(' ', size, sg.b) * (line.length ? 1 : 0);
        if (line.length && x + sp + ww > width) { lines.push(line); line = []; x = 0; }
        const lead = line.length ? ' ' : '';
        line.push({ s: lead + word, b: sg.b, g: sg.g, c: sg.c }); x += (lead ? tw(' ', size, sg.b) : 0) + ww;
      });
    });
    if (line.length) lines.push(line);
    return lines;
  }
  const shortAb = (s) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > 26 ? s.slice(0, 25) + '.' : s; };

  const RED = '0.78 0.08 0.08';
  const normN = (s) => String(s || '').toLowerCase().replace(/\(\d+\)/g, '').replace(/\s+/g, ' ').trim();
  /* aptitude d'un chef / appui qui agit sur l'unité qu'il dirige */
  const LEAD_FX = /dirige|rattach|accompagn|cette unit[ée]|de l'unit[ée]|l'unit[ée] (?:qu|à|a )|unit[ée] men[ée]e|unit[ée] dirig|unit[ée] qui (?:est )?(?:dirig|accompagn)|tant que cette figurine|figurines? de cette unit/i;
  const leadFx = (x) => x && x.name && !/^(meneur|leader|appui|support|chef)\b/i.test(x.name) && !/^Amélioration/.test(x.name) && LEAD_FX.test(String(x.text || ''));
  const SKIP_AB = /^(meneur|leader|appui|support|chef|doctrines?\b|am[ée]lioration|d[ée]ploiement|r[ée]serves? strat|discipline du codex|capacit[ée] de transport|transport|t[ée]l[ée]port|frappe|[ée]claireur|infiltrat|pouvoirs? psychique|psyker|ennemi juré|attaque de flanc)/i;
  const effect = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').replace(/^[^A-Za-zÀ-ÿ0-9+\-]+/, '').replace(/\[[^\]]*\]/g, (m) => m.replace(/\[|\]/g, '')).replace(/\bfigurines?\b/gi, 'fig.').replace(/\bTant que\b/g, 'Si').replace(/\b(?:cette|cet) (?:unit[ée]|fig\.)\b/gi, 'elle').trim(); s = s.split(/(?<=[.!?])\s+/).filter((q) => !/^(exemple|note du concepteur|note\s*:)/i.test(q)).join(' '); if (s.length > 520) { let o = ''; s.split(/(?<=[.!?])\s+/).some((q) => { if (o && (o + ' ' + q).length > 520) return true; o += (o ? ' ' : '') + q; return false; }); s = o; } return s; };
  const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; let c = s.slice(0, n); const sp = c.lastIndexOf(' '); if (sp > n * 0.5) c = c.slice(0, sp); return c.replace(/[\s,;:.\-]+$/, '').replace(/\s+(?:de|du|des|la|le|les|à|au|aux|si|un|une|qu'|d'|l'|et|ou|en)$/i, '') + '...'; };

  function build(a, rules, strats) {
    const PW = 842, PH = 595, M = 20;
    strats = (strats || []).filter((s) => s && s.name);
    const SW = strats.length ? 168 : 0, GAP = strats.length ? 6 : 0, CW = PW - 2 * M - SW - GAP, FULL = PW - 2 * M;
    const units = a.units || []; const byId = {}; units.forEach((u) => { byId[u.id] = u; });
    const att = {}; units.forEach((u) => { if (u.attachedTo && byId[u.attachedTo] && u.attachedTo !== u.id) (att[u.attachedTo] = att[u.attachedTo] || []).push(u); });
    const attached = new Set(); Object.keys(att).forEach((k) => att[k].forEach((u) => attached.add(u.id)));
    const groups = [];
    units.filter((u) => !attached.has(u.id)).forEach((u) => groups.push([{ u, lead: null }].concat((att[u.id] || []).map((e) => ({ u: e, lead: u })))));
    const pts = a.total && a.total.points != null ? a.total.points : units.reduce((t, u) => t + (+u.pts || 0), 0);
    const figs = units.reduce((t, u) => t + (+u.models || 0), 0);
    /* Colonnes calquées sur le tableur « Salamander Listes » ; colonnes chiffrées au plus étroit */
    const fixed = 17 + 13 + 11 + 26 + 12 + 14 + 12 + 20 + 17 + 14 + 17 + 14 + 15 + 12; // hors Figurine, Aptitude, Arme, Mots-clés d'arme
    const flex = CW - fixed; const fW = Math.round(flex * 0.17), aW = Math.round(flex * 0.42), wW = Math.round(flex * 0.20);
    const COLS = [['Pt', 17], ['Figurine', fW], ['Nb', 13], ['M', 14], ['E', 12], ['SV', 27], ['PV', 13], ['CD', 15], ['CO', 13], ['Aptitude', aW], ['Arme', wW], ['P', 20], ['A', 24], ['C/T', 18], ['F', 15], ['PA', 17], ['D', 15], ["Mots-clés d'arme", 0]];
    COLS[17][1] = CW - COLS.reduce((t, c) => t + c[1], 0);
    const NU = 10;

    function render(s, mode, clipN) {
      const pages = []; let cur = null, y = 0; const tops = [];
      const emit = (c) => cur.push(c);
      const newPage = () => { cur = []; pages.push(cur); y = PH - M; };
      const sz = { sub: 8.5, head: 7 * s, name: 7.8 * s, body: 6.8 * s };
      const fillRect = (x, top, w, h, g) => emit(`${g} g ${x.toFixed(1)} ${(top - h).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f 0 g`);
      const strokeRect = (x, top, w, h, lw) => emit(`${lw} w ${x.toFixed(1)} ${(top - h).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re S`);
      const vline = (x, y1, y2, lw) => emit(`${lw} w ${x.toFixed(1)} ${y1.toFixed(1)} m ${x.toFixed(1)} ${y2.toFixed(1)} l S`);
      const hline = (x1, x2, yy, lw) => emit(`${lw} w ${x1.toFixed(1)} ${yy.toFixed(1)} m ${x2.toFixed(1)} ${yy.toFixed(1)} l S`);
      const seg = (sg, x, base, size) => { const col = sg.c ? sg.c + ' rg ' : (sg.g != null ? sg.g + ' g ' : ''); emit(`${col}BT /${sg.b ? 'F2' : 'F1'} ${size} Tf ${x.toFixed(1)} ${base.toFixed(1)} Td (${esc(sg.s)}) Tj ET${col ? ' 0 g' : ''}`); return tw(sg.s, size, sg.b); };
      const lineOut = (segs, x, base, size) => { let cx = x; segs.forEach((sg) => { cx += seg(sg, cx, base, size); }); };
      const textLine = (t, x, size, bold, gray) => { y -= size * 1.25; seg({ s: clean(t), b: bold, g: gray }, x, y + size * 0.22, size); };
      const xs = []; let ax = M; COLS.forEach((c) => { xs.push(ax); ax += c[1]; });
      const xEnd = M + CW;
      const ctr = (t, i, base, size, bold, col) => { const x = xs[i] + (COLS[i][1] - tw(t, size, bold)) / 2; seg({ s: t, b: bold, c: col }, x, base, size); };

      newPage();
      textLine(a.name || 'Armée', M, 16, true); y -= 1;
      textLine([a.faction, a.chapter, pts + ' pts', units.length + ' unités', figs ? figs + ' figurines' : ''].filter(Boolean).join('  -  '), M, sz.sub + 1, false, 0.25);
      if ((a.detachments || []).length) { y -= 1; textLine('Détachement : ' + a.detachments.join('  |  '), M, sz.sub, true); }
      const rl = (rules || []).filter((r) => r && r.name);
      if (rl.length) { const ls = wrapSegs([{ s: "Règles d'armée et de détachement : ", b: true }].concat(rl.map((r, i) => ({ s: (i ? ' - ' : '') + r.name, g: 0.25 }))), sz.sub - 0.5, FULL); ls.forEach((l) => { y -= (sz.sub - 0.5) * 1.25; lineOut(l, M, y + 1.6, sz.sub - 0.5); }); }
      y -= 5; tops[0] = y;

      const header = () => { if (pages.length > 1) tops[pages.length - 1] = y; const hh = sz.head * 1.9; fillRect(M, y, CW, hh, 0.8); strokeRect(M, y, CW, hh, 0.6); COLS.forEach((c, i) => { if (i) vline(xs[i], y, y - hh, 0.4); const left = i === 1 || i === 9 || i === 10 || i === 17; if (left) seg({ s: c[0], b: true }, xs[i] + 3, y - hh + sz.head * 0.62, sz.head); else ctr(c[0], i, y - hh + sz.head * 0.62, sz.head * Math.min(1, (c[1] - 1.5) / Math.max(tw(c[0], sz.head, true), 1)), true); }); y -= hh; };
      header();

      /* mise en forme d'un bloc : renvoie sa hauteur et une fonction de dessin */
      const layout = (r) => {
        const u = r.u; const pad = 2 * Math.min(1, s), lh = sz.body * 1.18, lhn = sz.name * 1.18;
        const sergEq = []; (u.subModels || []).forEach((m) => String(m.equipment || '').split(/\s*,\s*/).forEach((e) => { const k = normN(e); if (k) sergEq.push(k); }));
        const isSerg = (w) => { const k = normN(w.name); return sergEq.some((e) => e === k || e.includes(k) || k.includes(e)); };
        const all = (u.weapons || []).slice(); const rg = all.filter((w) => !isMelee(w)), ml = all.filter(isMelee);
        let ws = rg.concat(ml);
        if (mode >= 2) { const nr = mode >= 4 ? 2 : mode >= 3 ? 3 : 4, nm = mode >= 3 ? 1 : 2; const sr = rg.slice().sort((p, q) => score(q) - score(p)).slice(0, nr), sm = ml.slice().sort((p, q) => score(q) - score(p)).slice(0, nm); ws = sr.concat(sm); }
        const rest = all.length - ws.length;
        const wrows = ws.map((w) => { const red = u.subModels && u.subModels.length && isSerg(w); const kl = wrapSegs([{ s: w.abilities || '', g: 0.25 }], sz.body - 0.4, COLS[17][1] - 5); const nl = wrapSegs([{ s: w.name, b: true, c: red ? RED : undefined }], sz.body, COLS[10][1] - 5); return { w, nl, kl, red, h: Math.max(nl.length, kl.length, 1) * lh + 1.2 * Math.min(1, s) }; });
        if (rest > 0) wrows.push({ more: ` +${rest} autre(s) arme(s)`, nl: [], kl: [], h: lh + 1.2 * Math.min(1, s) });
        const wh = wrows.reduce((t, o) => t + o.h, 0);
        const tags = [r.lead ? (u.role === 'support' ? 'Appui' : 'Chef') + ' > ' + r.lead.name : '', u.warlord ? 'Seigneur de guerre' : '', u.enhancement ? '* ' + u.enhancement : ''].filter(Boolean).join(' / ');
        const sub = tl(u);
        function tl() { return (u.subModels || []).filter((m) => m && (m.name || m.equipment)).map((m) => (m.name ? m.name + ' : ' : '') + (m.equipment || '')); }
        const nameL = wrapSegs([{ s: (r.lead ? '+ ' : '') + u.name, b: true }], sz.name, COLS[1][1] - 5).map((l) => ({ l, size: sz.name, lh: lhn }))
          .concat(tags ? wrapSegs([{ s: tags, g: 0.3 }], sz.body - 0.5, COLS[1][1] - 5).map((l) => ({ l, size: sz.body - 0.5, lh: lh - 0.3 })) : [])
          .concat(sub.reduce((acc, x) => acc.concat(wrapSegs([{ s: x, c: RED }], sz.body - 0.5, COLS[1][1] - 5).map((l) => ({ l, size: sz.body - 0.5, lh: lh - 0.3 }))), []));
        const abil = []; const seen = {}; (u.abilities || []).forEach((x) => { if (x && x.name && !SKIP_AB.test(x.name) && !seen[x.name]) { seen[x.name] = 1; abil.push(x); } });
        const asegs = []; abil.forEach((x, i) => { const red = r.lead && leadFx(x) ? RED : undefined; if (i) asegs.push({ s: ' \x95 ', g: 0.5 }); const tx = x.text ? effect(x.text, 99999) : x.name; asegs.push({ s: tx, c: red, g: red ? undefined : 0.1 }); });
        const abL = wrapSegs(asegs, sz.body - 0.3, COLS[9][1] - 5).map((l) => ({ l, size: sz.body - 0.3, lh: lh - 0.2 }));
        const kw = (u.keywords || []).concat(u.factionKw || []);
        const kwL = kw.length ? wrapSegs([{ s: 'Mots-clés : ', b: true, g: 0.3 }, { s: kw.join(', '), g: 0.35 }], sz.body - 0.6, CW - 6) : [];
        const kwH = kwL.length * (lh - 0.5) + (kwL.length ? 1.5 * Math.min(1, s) : 0);
        const uh = Math.max(nameL.reduce((t, o) => t + o.lh, 0), abL.reduce((t, o) => t + o.lh, 0), 1);
        const mainH = Math.max(wh, uh) + pad * 2, bh = mainH + kwH;
        const draw = (top) => {
          if (r.lead) fillRect(M, top, CW, bh, 0.95);
          strokeRect(M, top, CW, bh, 0.5);
          COLS.forEach((c, i) => { if (i) vline(xs[i], top, top - mainH, 0.25); });
          if (kwH) hline(M, xEnd, top - mainH, 0.25);
          if (r.lead) emit(`1.8 w ${(M + 0.9).toFixed(1)} ${top.toFixed(1)} m ${(M + 0.9).toFixed(1)} ${(top - bh).toFixed(1)} l S`);
          const mid = top - mainH / 2 - sz.body * 0.3;
          const st = [u.pts || '', u.models || '1', u.M || '', u.T || '', u.sv ? (u.sv + (u.inv ? '/' + u.inv + '++' : '')) : '', u.W || '', u.Ld || '', u.OC || ''];
          const stI = [0, 2, 3, 4, 5, 6, 7, 8];
          st.forEach((v, k) => { const i = stI[k]; const tx = clean(String(v)); if (!tx) return; const s2 = sz.body + 0.3; const fit = Math.min(1, (COLS[i][1] - 1.5) / Math.max(tw(tx, s2, k === 0), 1)); ctr(tx, i, mid, s2 * fit, k === 0); });
          let cy = top - pad - Math.max(0, (mainH - pad * 2 - nameL.reduce((t, o) => t + o.lh, 0)) / 2);
          nameL.forEach((o) => { cy -= o.lh; lineOut(o.l, xs[1] + 3, cy + o.lh * 0.28, o.size); });
          cy = top - pad; abL.forEach((o) => { cy -= o.lh; lineOut(o.l, xs[9] + 3, cy + o.lh * 0.28, o.size); });
          cy = top - pad;
          wrows.forEach((o, k) => {
            if (k) hline(xs[NU], xEnd, cy, 0.2);
            const base = cy - lh + lh * 0.28 - 0.4;
            if (o.more) seg({ s: o.more, g: 0.45 }, xs[NU] + 3, base, sz.body);
            else {
              const w = o.w; let yy = cy; o.nl.forEach((l) => { yy -= lh; lineOut(l, xs[10] + 3, yy + lh * 0.28 - 0.4, sz.body); });
              [isMelee(w) ? 'CC' : (w.range || ''), w.A, w.skill, w.S, w.AP, w.D].forEach((v, j) => { const tx = clean(String(v == null ? '' : v)); const i = 11 + j; const f = Math.min(1, (COLS[i][1] - 1.5) / Math.max(tw(tx, sz.body), 1)); ctr(tx, i, base, sz.body * f, false, o.red ? RED : undefined); });
              yy = cy; o.kl.forEach((l) => { yy -= lh; lineOut(l, xs[17] + 3, yy + lh * 0.28 - 0.4, sz.body - 0.4); });
            }
            cy -= o.h;
          });
          if (kwH) { let ky = top - mainH - 0.5; kwL.forEach((l) => { ky -= lh - 0.5; lineOut(l, M + 3, ky + (lh - 0.5) * 0.28, sz.body - 0.6); }); }
        };
        return { bh, draw };
      };
      groups.forEach((g) => {
        const bl = g.map(layout); const gh = bl.reduce((t, b) => t + b.bh, 0);
        if (y - gh < M + 12 && y < tops[pages.length - 1] - 40) { newPage(); header(); }
        bl.forEach((b) => { if (y - b.bh < M + 12) { newPage(); header(); } b.draw(y); y -= b.bh; });
      });

      /* colonne de droite : stratagèmes propres à la liste */
      if (strats.length) {
        const px = M + CW + GAP; const ps = 6.2 * Math.max(0.8, Math.min(s, 1.15));
        const lines = []; let lastDet = null;
        const mk = (pclip) => { lines.length = 0; lastDet = null; strats.forEach((st) => {
          if (st.detachment && st.detachment !== lastDet) { lastDet = st.detachment; wrapSegs([{ s: st.detachment, b: true, g: 0.2 }], ps + 0.3, SW - 8).forEach((l) => lines.push({ l, size: ps + 0.3, gap: 3 })); }
          wrapSegs([{ s: st.name, b: true }, { s: ' (' + (st.cp || 1) + ' PC)', g: 0.3 }], ps, SW - 8).forEach((l, i) => lines.push({ l, size: ps, gap: i ? 0 : 3 }));
          const tx = [st.when, st.effect].filter(Boolean).join(' - ');
          if (tx && pclip) wrapSegs([{ s: clip(tx, pclip), g: 0.25 }], ps - 0.5, SW - 8).forEach((l) => lines.push({ l, size: ps - 0.5, gap: 0 }));
        }); return lines.reduce((q, o) => q + o.size * 1.18 + o.gap, 0); };
        const availH = tops[0] - (M + 12) - 7 * s * 1.9 - 4;
        [900, 450, 300, 200, 130, 80, 0].some((pc) => mk(pc) <= availH);
        let li = 0;
        pages.forEach((pg, pi) => {
          if (li >= lines.length) return;
          cur = pg; const top = pi === 0 ? tops[0] : tops[pi] != null ? tops[pi] : PH - M; let yy = top;
          const hh = 7 * s * 1.9; fillRect(px, yy, SW, hh, 0.8); strokeRect(px, yy, SW, hh, 0.6); seg({ s: pi === 0 ? 'Stratagèmes de la liste' : 'Stratagèmes (suite)', b: true }, px + 3, yy - hh + 7 * s * 0.62, 7 * s); yy -= hh;
          const start = yy; let used = 0;
          while (li < lines.length) { const o = lines[li]; const need = o.size * 1.18 + o.gap; if (yy - need < M + 12) break; yy -= need; lineOut(o.l, px + 4, yy + o.size * 0.28, o.size); li++; used = 1; }
          strokeRect(px, start, SW, start - yy + 3, 0.5);
        });
        if (li < lines.length) pages.overflow = true;
      }
      return pages;
    }
    const hasMore = (pg) => pg.overflow;
    /* une seule page A4 : on cherche la meilleure combinaison (police la plus grande d'abord, puis texte plus court) */
    let pages = null, best = -1;
    const ok = (pg) => pg.length === 1 && !pg.overflow;
    const combos = [[0, 0], [2, 0], [3, 0], [4, 0]];
    /* pour chaque réglage, la plus grande police qui tient ; on garde le meilleur (à égalité, le moins condensé) */
    combos.forEach(([mode, cn]) => { for (let s = 1.4; s >= 0.3; s -= 0.02) { if (s <= best + 0.001) break; const pg = render(s, mode, cn); if (ok(pg)) { best = s; pages = pg; break; } } });
    if (!pages) pages = render(0.3, 4, 30);

    const n = pages.length; const objs = []; const add = (t) => { objs.push(t); return objs.length; };
    add('<< /Type /Catalog /Pages 2 0 R >>'); // remplacé plus bas (référence aux données NoobHammer)
    add(`<< /Type /Pages /Kids [${pages.map((_, i) => (6 + i * 2) + ' 0 R').join(' ')}] /Count ${n} >>`);
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    pages.forEach((p, i) => {
      const foot = `0.4 g BT /F1 6.5 Tf ${M} 10 Td (NoobHammer40k  -  ${n > 1 ? 'page ' + (i + 1) + '/' + n + '  -  ' : ''}liste de ${clean(a.name || '')}) Tj ET 0 g`;
      const body = p.join('\n') + '\n' + foot;
      add(`<< /Length ${body.length} >>\nstream\n${body}\nendstream`);
      add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${5 + i * 2} 0 R >>`);
    });
    /* données de la liste, relisibles par NoobHammer40k à l'import */
    let payload = '';
    try { payload = btoa(unescape(encodeURIComponent(JSON.stringify({ v: 1, army: a, rules: rules || [], strats: strats || [] })))); } catch (e) { payload = ''; }
    if (payload) { const dn = add(`<< /Length ${payload.length + 11} >>\nstream\nNH40KDATA:${payload}\nendstream`); objs[0] = `<< /Type /Catalog /Pages 2 0 R /NHData ${dn} 0 R >>`; }
    let out = '%PDF-1.4\n'; const off = [];
    objs.forEach((o, i) => { off.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const xr = out.length;
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + off.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF`;
    const bytes = new Uint8Array(out.length); for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
    return bytes;
  }
  window.ArmyPdf = { build };
})();
