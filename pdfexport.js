/* Export d'une liste d'armée en PDF : une page A4 paysage, tout synthétisé dans un tableau
   (une ligne par unité, chefs et appuis regroupés sous leur unité). Générateur minimal, polices standard. */
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
        line.push({ s: lead + word, b: sg.b, g: sg.g }); x += (lead ? tw(' ', size, sg.b) : 0) + ww;
      });
    });
    if (line.length) lines.push(line);
    return lines;
  }
  const shortAb = (s) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > 26 ? s.slice(0, 25) + '.' : s; };

  function build(a, rules) {
    const PW = 842, PH = 595, M = 22, CW = PW - 2 * M;
    const units = a.units || []; const byId = {}; units.forEach((u) => { byId[u.id] = u; });
    const att = {}; units.forEach((u) => { if (u.attachedTo && byId[u.attachedTo] && u.attachedTo !== u.id) (att[u.attachedTo] = att[u.attachedTo] || []).push(u); });
    const attached = new Set(); Object.keys(att).forEach((k) => att[k].forEach((u) => attached.add(u.id)));
    const rows = []; let gi = 0;
    units.filter((u) => !attached.has(u.id)).forEach((u) => { const grp = (att[u.id] || []).length ? ++gi : 0; rows.push({ u, g: grp, lead: null }); (att[u.id] || []).forEach((e) => rows.push({ u: e, g: grp, lead: u })); });
    const pts = a.total && a.total.points != null ? a.total.points : units.reduce((t, u) => t + (+u.pts || 0), 0);
    const figs = units.reduce((t, u) => t + (+u.models || 0), 0);
    const COLS = [['Unité', 118], ['Fig.', 22], ['Pts', 26], ['Profil', 92], ['Armes (principales)', 282], ['Aptitudes', 160], ['Mots-clés', CW - 700]];

    function render(s) {
      const pages = []; let cur = null, y = 0;
      const emit = (c) => cur.push(c);
      const newPage = () => { cur = []; pages.push(cur); y = PH - M; };
      const sz = { title: 15, sub: 8, head: 7 * s, name: 7.4 * s, body: 6.4 * s };
      const fillRect = (x, top, w, h, g) => emit(`${g} g ${x.toFixed(1)} ${(top - h).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f 0 g`);
      const strokeRect = (x, top, w, h, lw) => emit(`${lw} w ${x.toFixed(1)} ${(top - h).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re S`);
      const vline = (x, y1, y2, lw) => emit(`${lw} w ${x.toFixed(1)} ${y1.toFixed(1)} m ${x.toFixed(1)} ${y2.toFixed(1)} l S`);
      const seg = (sg, x, base, size) => { const gg = sg.g != null; emit(`${gg ? sg.g + ' g ' : ''}BT /${sg.b ? 'F2' : 'F1'} ${size} Tf ${x.toFixed(1)} ${base.toFixed(1)} Td (${esc(sg.s)}) Tj ET${gg ? ' 0 g' : ''}`); return tw(sg.s, size, sg.b); };
      const lineOut = (segs, x, base, size) => { let cx = x; segs.forEach((sg) => { cx += seg(sg, cx, base, size); }); };
      const textLine = (t, x, size, bold, gray) => { y -= size * 1.25; seg({ s: clean(t), b: bold, g: gray }, x, y + size * 0.22, size); };

      newPage();
      textLine(a.name || 'Armée', M, sz.title, true); y -= 1;
      textLine([a.faction, a.chapter, pts + ' pts', units.length + ' unités', figs ? figs + ' figurines' : ''].filter(Boolean).join('  -  '), M, sz.sub + 1, false, 0.25);
      if ((a.detachments || []).length) { y -= 1; textLine('Détachement : ' + a.detachments.join('  |  '), M, sz.sub, true); }
      const rl = (rules || []).filter((r) => r && r.name).map((r) => r.name);
      if (rl.length) { const ls = wrapSegs([{ s: "Règles d'armée et de détachement : ", b: true }, { s: rl.join(' - '), g: 0.25 }], sz.sub - 0.5, CW); ls.forEach((l) => { y -= (sz.sub - 0.5) * 1.25; lineOut(l, M, y + 1.6, sz.sub - 0.5); }); }
      y -= 5;

      const xs = []; let ax = M; COLS.forEach((c) => { xs.push(ax); ax += c[1]; });
      const header = () => { const hh = sz.head * 1.9; fillRect(M, y, CW, hh, 0.82); strokeRect(M, y, CW, hh, 0.6); COLS.forEach((c, i) => { if (i) vline(xs[i], y, y - hh, 0.4); seg({ s: c[0], b: true }, xs[i] + 3, y - hh + sz.head * 0.62, sz.head); }); y -= hh; };
      header();
      let lastG = -1;
      rows.forEach((r) => {
        const u = r.u; const pad = 2.2, lh = sz.body * 1.22, lhn = sz.name * 1.22;
        // cellule unité
        const tags = [r.lead ? (u.role === 'support' ? 'Appui' : 'Chef') + ' > ' + r.lead.name : '', u.warlord ? 'Seigneur de guerre' : '', u.enhancement ? '* ' + u.enhancement : ''].filter(Boolean).join(' / ');
        const c0 = wrapSegs([{ s: (r.lead ? '+ ' : '') + u.name, b: true }], sz.name, COLS[0][1] - 6).map((l) => ({ l, size: sz.name, lh: lhn })).concat(tags ? wrapSegs([{ s: tags, g: 0.3 }], sz.body - 0.4, COLS[0][1] - 6).map((l) => ({ l, size: sz.body - 0.4, lh })) : []);
        const c1 = [{ l: [{ s: String(u.models || ''), b: false }], size: sz.body, lh }], c2 = [{ l: [{ s: String(u.pts || ''), b: true }], size: sz.body, lh }];
        const st = [u.M && 'M' + u.M, u.T && 'E' + u.T, u.sv && 'Sv' + u.sv + (u.inv ? '/' + u.inv + '++' : ''), u.W && 'PV' + u.W, u.Ld && 'CD' + u.Ld, u.OC && 'CO' + u.OC, u.fnp && 'ID' + u.fnp + '+'].filter(Boolean).join('  ');
        const c3 = wrapSegs([{ s: st }], sz.body, COLS[3][1] - 6).map((l) => ({ l, size: sz.body, lh }));
        // armes : 4 meilleurs tirs + 2 meilleures mêlées
        const ws = (u.weapons || []); const rg = ws.filter((w) => !isMelee(w)).sort((p, q) => score(q) - score(p)), ml = ws.filter(isMelee).sort((p, q) => score(q) - score(p));
        const pick = rg.slice(0, 4).concat(ml.slice(0, 2)); const rest = ws.length - pick.length;
        const wsegs = []; pick.forEach((w, i) => { if (i) wsegs.push({ s: ' ·', g: 0.5 }); wsegs.push({ s: w.name, b: true }); wsegs.push({ s: `(${isMelee(w) ? 'M' : (w.range || '')} A${w.A} F${w.S} PA${w.AP} D${w.D}${w.abilities ? ' ' + shortAb(w.abilities) : ''})`, g: 0.25 }); });
        if (rest > 0) wsegs.push({ s: ` +${rest} autre(s)`, g: 0.5 });
        const c4 = wrapSegs(wsegs, sz.body, COLS[4][1] - 6).map((l) => ({ l, size: sz.body, lh }));
        const abn = []; (u.abilities || []).forEach((x) => { if (x && x.name && !/^Amélioration/.test(x.name) && !abn.includes(x.name)) abn.push(x.name); });
        const c5 = wrapSegs([{ s: abn.join(', ') }], sz.body, COLS[5][1] - 6).map((l) => ({ l, size: sz.body, lh }));
        const kw = (u.keywords || []).concat(u.factionKw || []);
        const c6 = wrapSegs([{ s: kw.join(', '), g: 0.3 }], sz.body - 0.5, COLS[6][1] - 6).map((l) => ({ l, size: sz.body - 0.5, lh: lh - 0.4 }));
        const cells = [c0, c1, c2, c3, c4, c5, c6]; const rh = Math.max(...cells.map((c) => c.reduce((t, o) => t + o.lh, 0))) + pad * 2;
        if (y - rh < M + 12) { newPage(); header(); }
        if (r.g && r.g !== lastG || (r.g && r.g === lastG)) fillRect(M, y, CW, rh, 0.955);
        strokeRect(M, y, CW, rh, 0.35); COLS.forEach((c, i) => { if (i) vline(xs[i], y, y - rh, 0.25); });
        if (r.g) { emit(`1.6 w ${(M + 0.8).toFixed(1)} ${y.toFixed(1)} m ${(M + 0.8).toFixed(1)} ${(y - rh).toFixed(1)} l S`); }
        lastG = r.g;
        cells.forEach((c, i) => { let cy = y - pad; c.forEach((o) => { cy -= o.lh; lineOut(o.l, xs[i] + 3, cy + o.lh * 0.28, o.size); }); });
        y -= rh;
      });
      return pages;
    }
    let pages = null, s = 1.4;
    for (; s >= 0.52; s -= 0.04) { pages = render(s); if (pages.length === 1) break; }
    if (pages.length > 1) pages = render(0.6);

    const n = pages.length; const objs = []; const add = (t) => { objs.push(t); return objs.length; };
    add('<< /Type /Catalog /Pages 2 0 R >>');
    add(`<< /Type /Pages /Kids [${pages.map((_, i) => (6 + i * 2) + ' 0 R').join(' ')}] /Count ${n} >>`);
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    pages.forEach((p, i) => {
      const foot = `0.4 g BT /F1 6.5 Tf ${M} 12 Td (NoobHammer40k  -  ${n > 1 ? 'page ' + (i + 1) + '/' + n + '  -  ' : ''}liste de ${clean(a.name || '')}) Tj ET 0 g`;
      const body = p.join('\n') + '\n' + foot;
      add(`<< /Length ${body.length} >>\nstream\n${body}\nendstream`);
      add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${5 + i * 2} 0 R >>`);
    });
    let out = '%PDF-1.4\n'; const off = [];
    objs.forEach((o, i) => { off.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const xr = out.length;
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + off.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF`;
    const bytes = new Uint8Array(out.length); for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
    return bytes;
  }
  window.ArmyPdf = { build };
})();
