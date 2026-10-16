/* Export d'une liste d'armée en PDF (générateur minimal, polices Helvetica standard, aucune dépendance).
   Mise en page : chefs/appuis regroupés avec leur unité, bandeau d'unité, cases de caractéristiques,
   mots-clés, tableau d'armes aligné, aptitudes en encarts séparés. */
(function () {
  const W = { 32: 278, 33: 278, 34: 355, 35: 556, 36: 556, 37: 889, 38: 667, 39: 191, 40: 333, 41: 333, 42: 389, 43: 584, 44: 278, 45: 333, 46: 278, 47: 278, 58: 278, 59: 278, 60: 584, 61: 584, 62: 584, 63: 556, 64: 1015, 91: 278, 92: 278, 93: 278, 94: 469, 95: 556, 96: 333, 123: 334, 124: 260, 125: 334, 126: 584 };
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach((c, i) => { W[65 + i] = [667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611][i]; });
  'abcdefghijklmnopqrstuvwxyz'.split('').forEach((c, i) => { W[97 + i] = [556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500][i]; });
  for (let d = 48; d <= 57; d++) W[d] = 556;
  const MAP = { '’': "'", '‘': "'", '“': '"', '”': '"', '–': '-', '—': '-', '…': '...', '✦': '*', '👑': '', '→': '>', '↳': '>', '≥': '>=', '≤': '<=', '−': '-', ' ': ' ', ' ': ' ', '•': '\x95', '€': '\x80', 'œ': '\x9c', 'Œ': '\x8c' };
  const clean = (s) => String(s == null ? '' : s).replace(/[^\x00-\xff]|[’‘“”–—…✦→↳≥≤−•€œŒ  ]/g, (c) => (c in MAP ? MAP[c] : '?')).replace(/[\r\t]/g, ' ');
  const cw = (c, bold) => ((W[c.charCodeAt(0)] || 556) * (bold ? 1.06 : 1)) / 1000;
  const tw = (s, size, bold) => { let w = 0; for (let i = 0; i < s.length; i++) w += cw(s[i], bold); return w * size; };
  const esc = (s) => s.replace(/[\\()]/g, '\\$&');
  function wrap(text, size, bold, width) {
    const out = [];
    clean(text).split('\n').forEach((para) => {
      let line = '';
      para.split(' ').forEach((w) => {
        const t = line ? line + ' ' + w : w;
        if (tw(t, size, bold) * 1.04 <= width || !line) line = t; else { out.push(line); line = w; }
      });
      out.push(line);
    });
    return out;
  }
  const cut = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).trim() + '...' : s; };

  function build(a, rules) {
    const PW = 595, PH = 842, M = 42, CW = PW - 2 * M, TOP = PH - M, BOT = M + 22;
    const pages = []; let cur = null, y = TOP, dry = false, breaks = 0;
    const emit = (s) => { if (!dry) cur.push(s); };
    const newPage = () => { if (dry) { breaks++; y = TOP; return; } cur = []; pages.push(cur); y = TOP; };
    const need = (h, redraw) => { if (y - h < BOT) { newPage(); if (redraw) redraw(); } };
    const fillRect = (x, top, w, h, g) => emit(`${g} g ${x.toFixed(1)} ${(top - h).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f 0 g`);
    const strokeRect = (x, top, w, h, lw) => emit(`${lw || 0.5} w ${x.toFixed(1)} ${(top - h).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re S`);
    const vline = (x, y1, y2, lw) => emit(`${lw || 0.5} w ${x.toFixed(1)} ${y1.toFixed(1)} m ${x.toFixed(1)} ${y2.toFixed(1)} l S`);
    const hline = (y0, lw) => emit(`${lw || 0.6} w ${M} ${y0.toFixed(1)} m ${PW - M} ${y0.toFixed(1)} l S`);
    const txt = (s, x, base, size, bold, gray) => emit(`${gray != null ? gray + ' g ' : ''}BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x.toFixed(1)} ${base.toFixed(1)} Td (${esc(s)}) Tj ET${gray != null ? ' 0 g' : ''}`);
    const para = (s, size, bold, indent, gap, gray) => { const lh = size * 1.3; wrap(s, size, bold, CW - (indent || 0)).forEach((l) => { need(lh); y -= lh; txt(l, M + (indent || 0), y + lh * 0.25, size, bold, gray); }); y -= gap || 0; };
    const measure = (fn, fromTop) => { const sv = { y, dry, breaks }; dry = true; breaks = 0; if (fromTop) y = TOP; const y0 = y; fn(); const r = { fits: breaks === 0, h: y0 - y }; y = sv.y; dry = sv.dry; breaks = sv.breaks; return r; };

    /* ----- boîte de texte encadrée (règles, aptitudes) ----- */
    const box = (title, body) => {
      const lines = body ? wrap(cut(body, 520), 7.5, false, CW - 12) : [];
      const h = 5 + 10 + lines.length * 9.2 + 4;
      need(h + 3); strokeRect(M, y, CW, h, 0.5);
      txt(clean(title), M + 6, y - 11, 8.5, true);
      lines.forEach((l, i) => txt(l, M + 6, y - 21 - i * 9.2, 7.5, false, 0.15));
      y -= h + 3;
    };

    /* ----- bloc d'une unité ----- */
    const roleLabel = (u, host) => (host ? (u.role === 'support' ? 'Appui' : 'Chef') + ' rattaché à : ' + host.name : '');
    function unitBlock(u, host, ledBy) {
      const head = (cont) => {
        need(26); const hh = 22; fillRect(M, y, CW, hh, 0.82); strokeRect(M, y, CW, hh, 0.6);
        const right = [u.models ? u.models + ' fig.' : '', u.pts ? u.pts + ' pts' : ''].filter(Boolean).join('  -  ');
        const left = (u.warlord ? '[Seigneur de guerre] ' : '') + clean(u.name) + (cont ? ' (suite)' : '');
        txt(wrap(left, 11.5, true, CW - tw(right, 11, true) - 24)[0], M + 6, y - 15, 11.5, true); if (right) txt(right, PW - M - 6 - tw(right, 11, true), y - 15, 11, true);
        y -= hh + 3;
      };
      head(false);
      const sub = [host ? roleLabel(u, host) : '', ledBy.length ? 'Avec : ' + ledBy.map((l) => l.name).join(', ') : '', u.enhancement ? 'Amélioration : ' + u.enhancement : ''].filter(Boolean).join('   |   ');
      if (sub) para(sub, 8, true, 2, 1, 0.25);
      // caractéristiques encadrées
      const cells = [['M', u.M], ['E', u.T], ['SV', u.sv ? u.sv + (u.inv ? ' / ' + u.inv + '++' : '') : ''], ['PV', u.W], ['CD', u.Ld], ['CO', u.OC]].concat(u.fnp ? [['ID', u.fnp + '+']] : []).filter((c) => c[1] !== undefined && c[1] !== '' && c[1] !== null);
      if (cells.length) {
        const cwid = Math.min(74, CW / cells.length), ch = 26; need(ch + 4);
        cells.forEach((c, i) => { const x = M + i * cwid; fillRect(x, y, cwid, 9, 0.93); strokeRect(x, y, cwid, ch, 0.6); txt(c[0], x + cwid / 2 - tw(c[0], 6.5, true) / 2, y - 7, 6.5, true, 0.3); const v = clean(String(c[1])); txt(v, x + cwid / 2 - tw(v, 10, true) / 2, y - 20, 10, true); });
        y -= ch + 4;
      }
      // mots-clés
      const kws = (u.keywords || []), fk = (u.factionKw || []);
      if (kws.length) para('MOTS-CLÉS : ' + kws.join(', ').toUpperCase(), 7, true, 2, 0, 0.2);
      if (fk.length) para('FACTION : ' + fk.join(', ').toUpperCase(), 7, true, 2, 0, 0.35);
      if (u.equipment) para('Équipement : ' + u.equipment, 7.5, false, 2, 0);
      const opt = (u.options || []).filter((o) => o !== u.enhancement); if (opt.length) para('Options : ' + opt.join(' ; '), 7.5, false, 2, 0);
      if (u.ptsNote) para(u.ptsNote, 7.5, false, 2, 0, 0.3);
      y -= 3;
      // tableau d'armes
      const isMelee = (w) => w.type === 'melee' || /m[eê]l/i.test(String(w.range || ''));
      const ws = (u.weapons || []).slice().sort((p, q) => (isMelee(p) ? 1 : 0) - (isMelee(q) ? 1 : 0));
      if (ws.length) {
        const cols = [['Arme', 150], ['Portée', 44], ['A', 30], ['CT/CC', 34], ['F', 26], ['PA', 30], ['D', 26], ['Capacités', CW - 340]]; const xs = []; let ax = M; cols.forEach((c) => { xs.push(ax); ax += c[1]; });
        const header = () => { need(14 + 12); fillRect(M, y, CW, 12, 0.9); strokeRect(M, y, CW, 12, 0.6); cols.forEach((c, i) => { if (i) vline(xs[i], y, y - 12, 0.4); txt(c[0], xs[i] + 3, y - 8.5, 7, true); }); y -= 12; };
        header();
        ws.forEach((w) => {
          const nl = wrap(w.name || '', 7.5, false, cols[0][1] - 6), al = wrap(w.abilities || '', 7, false, cols[7][1] - 6);
          const rh = Math.max(nl.length, al.length) * 8.6 + 3.5;
          need(rh, () => { y -= 0; header(); });
          strokeRect(M, y, CW, rh, 0.4); cols.forEach((c, i) => { if (i) vline(xs[i], y, y - rh, 0.3); });
          nl.forEach((l, i) => txt(l, xs[0] + 3, y - 8 - i * 8.6, 7.5, false)); al.forEach((l, i) => txt(l, xs[7] + 3, y - 8 - i * 8.6, 7, false, 0.25));
          const mel = isMelee(w); const vals = [mel ? 'Mêlée' : (w.range || '-'), w.A, w.skill, w.S, w.AP, w.D];
          vals.forEach((v, i) => { const s = clean(String(v == null || v === '' ? '-' : v)); txt(s, xs[i + 1] + 3, y - 8, 7.5, i === 5); });
          y -= rh;
        });
        y -= 5;
      }
      // aptitudes
      const ab = (u.abilities || []).filter((x) => x && x.name);
      ab.forEach((x) => box(x.name, x.text));
      y -= 4;
    }

    /* ----- regroupement chefs / appuis avec leur unité ----- */
    const units = a.units || []; const byId = {}; units.forEach((u) => { byId[u.id] = u; });
    const att = {}; units.forEach((u) => { if (u.attachedTo && byId[u.attachedTo] && u.attachedTo !== u.id) (att[u.attachedTo] = att[u.attachedTo] || []).push(u); });
    const attached = new Set(); Object.keys(att).forEach((k) => att[k].forEach((u) => attached.add(u.id)));
    const groups = units.filter((u) => !attached.has(u.id)).map((u) => ({ host: u, extra: att[u.id] || [] }));
    const drawGroup = (g) => {
      const run = () => { unitBlock(g.host, null, g.extra); g.extra.forEach((e) => unitBlock(e, g.host, [])); };
      const here = measure(run, false);
      if (!here.fits) { const top = measure(run, true); if (top.fits) newPage(); }
      const fin = measure(run, false);
      if (g.extra.length && fin.fits) { const top = y + 3; strokeRect(M - 5, top, CW + 10, fin.h + 6, 1.2); }
      run();
      y -= 4;
    };

    /* ----- document ----- */
    newPage();
    para(a.name || 'Armée', 18, true, 0, 2);
    const pts = a.total && a.total.points != null ? a.total.points : units.reduce((t, u) => t + (+u.pts || 0), 0);
    const figs = units.reduce((t, u) => t + (+u.models || 0), 0);
    para([a.faction, a.chapter, pts + ' pts', units.length + ' unités', figs ? figs + ' figurines' : ''].filter(Boolean).join('  -  '), 10, false, 0, 4, 0.25);
    hline(y); y -= 8;
    if ((a.detachments || []).length) { para('Détachements', 12, true, 0, 2); a.detachments.forEach((d) => para('• ' + d, 10, false, 8, 0)); y -= 6; }
    const rl = (rules || []).filter((r) => r && r.name);
    if (rl.length) { hline(y); y -= 8; para("Règles d'armée et de détachement", 12, true, 0, 3); rl.forEach((r) => box(r.name, r.text)); y -= 4; }
    hline(y); y -= 8; para('Unités', 12, true, 0, 4);
    groups.forEach(drawGroup);

    /* ----- assemblage PDF ----- */
    const n = pages.length; const objs = []; const add = (s) => { objs.push(s); return objs.length; };
    add('<< /Type /Catalog /Pages 2 0 R >>');
    add(`<< /Type /Pages /Kids [${pages.map((_, i) => (6 + i * 2) + ' 0 R').join(' ')}] /Count ${n} >>`);
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    pages.forEach((p, i) => {
      const foot = `0.4 g BT /F1 8 Tf ${M} 24 Td (NoobHammer40k  -  page ${i + 1}/${n}) Tj ET 0 g`;
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
