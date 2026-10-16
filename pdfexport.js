/* Export d'une liste d'armée en PDF (générateur minimal, polices Helvetica standard, aucune dépendance). */
(function () {
  const W = { 32: 278, 33: 278, 34: 355, 35: 556, 36: 556, 37: 889, 38: 667, 39: 191, 40: 333, 41: 333, 42: 389, 43: 584, 44: 278, 45: 333, 46: 278, 47: 278, 58: 278, 59: 278, 60: 584, 61: 584, 62: 584, 63: 556, 64: 1015, 91: 278, 92: 278, 93: 278, 94: 469, 95: 556, 96: 333, 123: 334, 124: 260, 125: 334, 126: 584 };
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach((c, i) => { W[65 + i] = [667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611][i]; });
  'abcdefghijklmnopqrstuvwxyz'.split('').forEach((c, i) => { W[97 + i] = [556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500][i]; });
  for (let d = 48; d <= 57; d++) W[d] = 556;
  const MAP = { '’': "'", '‘': "'", '“': '"', '”': '"', '–': '-', '—': '-', '…': '...', '✦': '*', '👑': '', '→': '>', '≥': '>=', '≤': '<=', '×': 'x', '−': '-', ' ': ' ', ' ': ' ', '•': '\x95', '€': '\x80', 'œ': '\x9c', 'Œ': '\x8c' };
  const clean = (s) => String(s == null ? '' : s).replace(/[^\x00-\xff]|[’‘“”–—…✦→≥≤−•€œŒ  ×]/g, (c) => (c in MAP ? MAP[c] : '?')).replace(/[\r\t]/g, ' ');
  const cw = (c, bold) => ((W[c.charCodeAt(0)] || (c.charCodeAt(0) > 127 ? 556 : 556)) * (bold ? 1.06 : 1)) / 1000;
  const tw = (s, size, bold) => { let w = 0; for (let i = 0; i < s.length; i++) w += cw(s[i], bold); return w * size; };
  const esc = (s) => s.replace(/[\\()]/g, '\\$&');
  function wrap(text, size, bold, width) {
    const out = [];
    clean(text).split('\n').forEach((para) => {
      let line = '';
      para.split(' ').forEach((w) => {
        const t = line ? line + ' ' + w : w;
        if (tw(t, size, bold) * 1.03 <= width || !line) line = t; else { out.push(line); line = w; }
      });
      out.push(line);
    });
    return out;
  }
  function build(a, rules) {
    const PW = 595, PH = 842, M = 42, CW = PW - 2 * M; const pages = []; let cur = null, y = 0;
    const newPage = () => { cur = []; pages.push(cur); y = PH - M; };
    const room = (h) => { if (y - h < M + 18) newPage(); };
    const text = (s, x, size, bold) => { cur.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${esc(s)}) Tj ET`); };
    const para = (s, size, bold, indent, gap) => { const lh = size * 1.28; wrap(s, size, bold, CW - (indent || 0)).forEach((l) => { room(lh); y -= lh; text(l, M + (indent || 0), size, bold); }); y -= gap || 0; };
    const rule = () => { cur.push(`0.6 w ${M} ${(y - 3).toFixed(1)} m ${PW - M} ${(y - 3).toFixed(1)} l S`); y -= 8; };
    newPage();
    para(a.name || 'Armée', 18, true, 0, 2);
    const pts = a.total && a.total.points != null ? a.total.points : (a.units || []).reduce((t, u) => t + (+u.pts || 0), 0);
    const figs = (a.units || []).reduce((t, u) => t + (+u.models || 0), 0);
    para([a.faction, a.chapter, pts + ' pts', (a.units || []).length + ' unités', figs ? figs + ' figurines' : ''].filter(Boolean).join('  ·  '), 10, false, 0, 4);
    rule();
    if ((a.detachments || []).length) { para('Détachements', 12, true, 0, 1); a.detachments.forEach((d) => para('• ' + d, 10, false, 8, 0)); y -= 6; }
    const rl = (rules || []).filter((r) => r && r.name);
    if (rl.length) { rule(); para("Règles d'armée et de détachement", 12, true, 0, 2); rl.forEach((r) => { para(r.name, 10, true, 0, 0); if (r.text) para(r.text, 8.5, false, 8, 3); }); y -= 4; }
    rule(); para('Unités', 12, true, 0, 3);
    (a.units || []).forEach((u) => {
      room(40); y -= 14;
      const right = (u.pts ? u.pts + ' pts' : '');
      const left = (u.warlord ? '[Seigneur de guerre] ' : '') + clean(u.name) + (u.models ? '  (' + u.models + ' fig.)' : '');
      text(wrap(left, 11, true, CW - 70)[0], M, 11, true); if (right) text(right, PW - M - tw(right, 11, true), 11, true);
      const stat = [u.M && 'M ' + u.M, u.T && 'E ' + u.T, u.sv && 'Sv ' + u.sv + (u.inv ? ' (inv. ' + u.inv + '+)' : ''), u.W && 'PV ' + u.W, u.Ld && 'CD ' + u.Ld, u.OC && 'CO ' + u.OC, u.fnp && 'ID ' + u.fnp + '+'].filter(Boolean).join('   ');
      if (stat) para(stat, 8.5, false, 0, 0);
      if (u.enhancement) para('Amélioration : ' + u.enhancement, 9, true, 0, 0);
      if (u.equipment) para('Équipement : ' + u.equipment, 8.5, false, 0, 0);
      if ((u.options || []).filter((o) => o !== u.enhancement).length) para('Options : ' + u.options.filter((o) => o !== u.enhancement).join(' ; '), 8.5, false, 0, 0);
      if (u.ptsNote) para(u.ptsNote, 8, false, 0, 0);
      (u.weapons || []).forEach((w) => para('• ' + w.name + (w.abilities ? ' [' + w.abilities + ']' : '') + ' — ' + (w.range || '') + '  A' + w.A + '  ' + w.skill + '  F' + w.S + '  PA' + w.AP + '  D' + w.D, 8, false, 8, 0));
      const ab = (u.abilities || []).filter((x) => x && x.name).map((x) => x.name);
      if (ab.length) para('Aptitudes : ' + ab.join(', '), 8, false, 0, 0);
      y -= 4; cur.push(`0.3 w ${M} ${(y).toFixed(1)} m ${PW - M} ${(y).toFixed(1)} l S`); y -= 2;
    });
    // assemblage
    const n = pages.length; const objs = [];
    const add = (s) => { objs.push(s); return objs.length; };
    add('<< /Type /Catalog /Pages 2 0 R >>');
    add(`<< /Type /Pages /Kids [${pages.map((_, i) => (6 + i * 2) + ' 0 R').join(' ')}] /Count ${n} >>`);
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    pages.forEach((p, i) => {
      const foot = `BT /F1 8 Tf ${M} 24 Td (NoobHammer40k  -  page ${i + 1}/${n}) Tj ET`;
      const body = p.join('\n') + '\n' + foot;
      add(`<< /Length ${body.length} >>\nstream\n${body}\nendstream`);
      add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${4 + i * 2 + 1} 0 R >>`);
    });
    // numéros : objets 5.. = contenu(5), page(6)... ; les pages sont aux numéros pairs → on corrige les Kids
    let out = '%PDF-1.4\n'; const off = [];
    objs.forEach((o, i) => { off.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const xr = out.length;
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + off.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF`;
    const bytes = new Uint8Array(out.length); for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
    return bytes;
  }
  window.ArmyPdf = { build };
})();
