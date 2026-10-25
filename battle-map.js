/* Plan de bataille : génération déterministe des décors (symétrie centrale) + dessin SVG + cotes. Fonctions pures. */
(function (root) {
  'use strict';
  const BD = () => root.BattleData;
  const W = 44, H = 60, CX = 22, CY = 30;
  const rng = (seed) => { let a = (seed * 2654435761 + 1013904223) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const r1 = (n) => Math.round(n * 10) / 10;
  /* Objectifs : A/D = objectifs de départ, E = expansion, C = central (1 ou 2 si le D6 a fait 6). */
  function objectives(depId, two) {
    const d = BD().DEPLOY[depId]; const o = [];
    o.push({ k: 'A', x: d.home[0][0], y: d.home[0][1], n: 'Départ Attaquant' });
    o.push({ k: 'D', x: d.home[1][0], y: d.home[1][1], n: 'Départ Défenseur' });
    d.exp.forEach((p, i) => o.push({ k: 'E', x: p[0], y: p[1], n: 'Expansion ' + (i + 1) }));
    if (!two) o.push({ k: 'C', x: CX, y: CY, n: 'Central' });
    else {
      const l = d.line; const dx = l[1][0] - l[0][0], dy = l[1][1] - l[0][1]; const m = Math.hypot(dx, dy); const ux = dx / m, uy = dy / m;
      o.push({ k: 'C', x: r1(CX - 6 * ux), y: r1(CY - 6 * uy), n: 'Central 1' }, { k: 'C', x: r1(CX + 6 * ux), y: r1(CY + 6 * uy), n: 'Central 2' });
    }
    o.forEach((x, i) => { x.i = i + 1; });
    return o;
  }
  /* Empreintes officielles 11e : grand rectangle 11,5×7, triangle rectangle 8×11,5, rectangle moyen 6×4, ligne longue 10×2,5, ligne courte 6×2. */
  const SIZES = [['D', 11.5, 7, 'R'], ['D', 11.5, 7, 'R'], ['D', 11.5, 7, 'R'], ['D', 11.5, 8, 'T'], ['L', 6, 4, 'R'], ['L', 10, 2.5, 'R'], ['L', 6, 2, 'R']];
  const OBJ = { w: 6, h: 4 };
  const rot = (p) => ({ k: p.k, x: W - p.x, y: H - p.y, w: p.w, h: p.h, obj: p.obj, s: p.s, c: p.s === 'T' ? (p.c + 2) % 4 : 0 });
  const gap = (a, b) => { const dx = Math.max(Math.abs(a.x - b.x) - (a.w + b.w) / 2, 0), dy = Math.max(Math.abs(a.y - b.y) - (a.h + b.h) / 2, 0); return Math.hypot(dx, dy); };
  const inside = (p) => p.x - p.w / 2 >= 1 && p.x + p.w / 2 <= W - 1 && p.y - p.h / 2 >= 1 && p.y + p.h / 2 <= H - 1;
  /* Retourne { objs, pieces } ; pieces = [{n,k:'D'|'L',x,y,w,h,obj}] (x,y = centre, w = largeur, h = hauteur sur le plan). */
  function layout(depId, seed, two) {
    const R = rng(seed * 97 + 13); const objs = objectives(depId, !!two); const pieces = [];
    const add = (p) => { pieces.push(p); };
    const pick = (a) => a[Math.floor(R() * a.length)];
    // un décor sur chaque objectif (moitié « attaquant » puis symétrique ; le central est seul)
    const done = new Set();
    objs.forEach((o) => {
      if (done.has(o.i)) return;
      const mirror = objs.find((q) => q.i !== o.i && Math.abs(q.x - (W - o.x)) < 0.6 && Math.abs(q.y - (H - o.y)) < 0.6);
      const horiz = R() < 0.5; const w = horiz ? OBJ.w : OBJ.h, h = horiz ? OBJ.h : OBJ.w;
      const p = { k: 'L', s: 'R', c: 0, x: o.x, y: o.y, w, h, obj: o.i };
      if (!inside(p)) { p.x = Math.min(Math.max(p.x, 1 + w / 2), W - 1 - w / 2); p.y = Math.min(Math.max(p.y, 1 + h / 2), H - 1 - h / 2); }
      p.x = Math.round(p.x - w / 2) + w / 2; p.y = Math.round(p.y - h / 2) + h / 2;
      add(p); done.add(o.i);
      if (mirror) { const m = rot(p); m.obj = mirror.i; add(m); done.add(mirror.i); }
    });
    // décors supplémentaires, par paires symétriques
    const want = 4 + Math.floor(R() * 2); let tries = 0, made = 0;
    while (made < want && tries < 400) {
      tries++;
      const s = pick(SIZES); const horiz = R() < 0.5; const w = horiz ? s[1] : s[2], h = horiz ? s[2] : s[1];
      const p = { k: s[0], s: s[3], c: Math.floor(R() * 4), x: r1(3 + R() * (W - 6)), y: r1(3 + R() * (H - 6)), w, h };
      p.x = Math.round(p.x - w / 2) + w / 2; p.y = Math.round(p.y - h / 2) + h / 2;
      if (!inside(p)) continue;
      const m = rot(p);
      if (gap(p, m) < 3) continue;
      if (pieces.some((q) => gap(p, q) < 3 || gap(m, q) < 3)) continue;
      if (objs.some((o) => Math.hypot(Math.max(Math.abs(o.x - p.x) - p.w / 2, 0), Math.max(Math.abs(o.y - p.y) - p.h / 2, 0)) < 3.5 || Math.hypot(Math.max(Math.abs(o.x - m.x) - m.w / 2, 0), Math.max(Math.abs(o.y - m.y) - m.h / 2, 0)) < 3.5)) continue;
      add(p); add(m); made++;
    }
    pieces.forEach((p, i) => { p.n = i + 1; });
    return { objs, pieces };
  }
  const poly = (a) => a.map((p) => p.join(',')).join(' ');
  /* Dessin SVG. opts : { names:{a,d}, ticks:true, id } */
  function svg(depId, lay, opts) {
    opts = opts || {}; const d = BD().DEPLOY[depId]; const nm = opts.names || {}; const uid = 'm' + (opts.id || '0');
    const cut = (t) => (t.length > 20 ? t.slice(0, 19) + '…' : t); const A = cut(nm.a || 'Attaquant'), D = cut(nm.d || 'Défenseur');
    let s = `<svg class="bmap" viewBox="-7 -7 58 74" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Plan de bataille"><defs>`;
    if (d.circle) s += `<mask id="${uid}"><rect x="0" y="0" width="${W}" height="${H}" fill="#fff"/><circle cx="${CX}" cy="${CY}" r="${d.circle}" fill="#000"/></mask>`;
    s += `</defs><rect x="0" y="0" width="${W}" height="${H}" fill="#24332a" stroke="#cfd8cf" stroke-width=".3"/>`;
    for (let x = 6; x < W; x += 6) s += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#fff" stroke-opacity=".12" stroke-width=".1"/>`;
    for (let y = 6; y < H; y += 6) s += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#fff" stroke-opacity=".12" stroke-width=".1"/>`;
    const mk = d.circle ? ` mask="url(#${uid})"` : '';
    s += `<polygon points="${poly(d.a)}" fill="#e05050" fill-opacity=".30" stroke="#e05050" stroke-width=".35"${mk}/>`;
    s += `<polygon points="${poly(d.d)}" fill="#4a86e8" fill-opacity=".30" stroke="#4a86e8" stroke-width=".35"${mk}/>`;
    if (d.circle) s += `<circle cx="${CX}" cy="${CY}" r="${d.circle}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".2" stroke-dasharray=".8 .6"/>`;
    s += `<line x1="${d.line[0][0]}" y1="${d.line[0][1]}" x2="${d.line[1][0]}" y2="${d.line[1][1]}" stroke="#fff" stroke-width=".3" stroke-dasharray="1.6 1.1"/>`;
    const cotes = opts.cotes !== false;
    lay.pieces.forEach((p) => {
      const dense = p.k === 'D'; const x0 = r1(p.x - p.w / 2), y0 = r1(p.y - p.h / 2), x1 = r1(p.x + p.w / 2), y1 = r1(p.y + p.h / 2);
      const col = dense ? '#3c9a55' : '#e0c84a', dk = dense ? '#0f3a1d' : '#6b5d10';
      s += `<g>`;
      s += p.s === 'T' ? `<polygon points="${(p.c === 0 ? [[x0, y0], [x1, y0], [x0, y1]] : p.c === 1 ? [[x0, y0], [x1, y0], [x1, y1]] : p.c === 2 ? [[x1, y0], [x1, y1], [x0, y1]] : [[x0, y0], [x0, y1], [x1, y1]]).map((q) => q.join(',')).join(' ')}" fill="${col}" fill-opacity=".45" stroke="${col}" stroke-width=".3"/>` : `<rect x="${x0}" y="${y0}" width="${p.w}" height="${p.h}" fill="${col}" fill-opacity=".45" stroke="${col}" stroke-width=".3"/>`;
      s += `<circle cx="${r1(x0 + 1.1)}" cy="${r1(y0 + 1.1)}" r="1.05" fill="#0b1a10" fill-opacity=".85" stroke="${col}" stroke-width=".12"/><text x="${r1(x0 + 1.1)}" y="${r1(y0 + 1.75)}" font-size="1.45" font-weight="700" text-anchor="middle" fill="#fff">${p.n}</text>`;
      s += `<text x="${p.x}" y="${r1(p.obj ? y1 - .6 : p.y + .75)}" font-size="1.7" font-weight="700" text-anchor="middle" fill="#fff" stroke="#000" stroke-width=".25" paint-order="stroke">${p.w}×${p.h}</text></g>`;
      if (cotes) {
        const t = (x, y, v, rot) => `<text x="${x}" y="${y}" font-size="1.3" text-anchor="middle" fill="#ffe08a" stroke="#000" stroke-width=".22" paint-order="stroke"${rot ? ` transform="rotate(-90 ${x} ${y})"` : ''}>${v}</text>`;
        const L = x0, Rr = r1(W - x1), T = y0, B = r1(H - y1);
        if (Math.min(L, Rr) > 0.4) { const left = L <= Rr; const v = left ? L : Rr; s += `<line x1="${left ? 0 : x1}" y1="${p.y}" x2="${left ? x0 : W}" y2="${p.y}" stroke="#ffe08a" stroke-width=".14" stroke-dasharray=".4 .3"/>` + t(r1(left ? x0 / 2 : (x1 + W) / 2), r1(p.y - .35), v + '"'); }
        if (Math.min(T, B) > 0.4) { const top = T <= B; const v = top ? T : B; s += `<line x1="${p.x}" y1="${top ? 0 : y1}" x2="${p.x}" y2="${top ? y0 : H}" stroke="#ffe08a" stroke-width=".14" stroke-dasharray=".4 .3"/>` + t(r1(p.x - .35), r1(top ? y0 / 2 : (y1 + H) / 2), v + '"', true); }
      }
    });
    lay.objs.forEach((o) => {
      s += `<circle cx="${o.x}" cy="${o.y}" r="3" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".18" stroke-dasharray=".5 .4"/>`;
      s += `<circle cx="${o.x}" cy="${o.y}" r="1.1" fill="#fff" stroke="#000" stroke-width=".25"/><circle cx="${o.x}" cy="${o.y}" r=".45" fill="#000"/>`;
    });
    // repères de la grille (tous les 6")
    for (let x = 0; x <= W; x += 6) s += `<text x="${x}" y="-1.6" font-size="1.7" text-anchor="middle" fill="#9aa59a">${x}"</text>`;
    for (let y = 0; y <= H; y += 6) s += `<text x="-1" y="${y + 0.6}" font-size="1.7" text-anchor="end" fill="#9aa59a">${y}"</text>`;
    // étiquettes des zones (hors du plateau)
    if (d.side === 'v') s += `<text x="${CX}" y="-3.8" font-size="2.1" font-weight="700" text-anchor="middle" fill="#ffb0b0">${A.toUpperCase()}</text><text x="${CX}" y="${H + 4.4}" font-size="2.1" font-weight="700" text-anchor="middle" fill="#b0ccff">${D.toUpperCase()}</text>`;
    else s += `<text transform="translate(-5.2 ${CY}) rotate(-90)" font-size="2.1" font-weight="700" text-anchor="middle" fill="#ffb0b0">${A.toUpperCase()}</text><text transform="translate(${W + 5.2} ${CY}) rotate(90)" font-size="2.1" font-weight="700" text-anchor="middle" fill="#b0ccff">${D.toUpperCase()}</text>`;
    return s + '</svg>';
  }
  /* Tableau des cotes : centre de chaque décor mesuré depuis le bord gauche et le bord haut, + distances aux autres bords. */
  function measures(lay) {
    return lay.pieces.map((p) => {
      const left = r1(p.x - p.w / 2), top = r1(p.y - p.h / 2);
      return { n: p.n, k: p.k, w: p.w, h: p.h, cx: p.x, cy: p.y, left, top, right: r1(W - (p.x + p.w / 2)), bottom: r1(H - (p.y + p.h / 2)), obj: p.obj ? (lay.objs.find((o) => o.i === p.obj) || {}).n || '' : '', s: p.s, c: p.c, near: [Math.min(r1(p.x - p.w / 2), r1(W - p.x - p.w / 2)), Math.min(r1(p.y - p.h / 2), r1(H - p.y - p.h / 2))] };
    });
  }
  root.BattleMap = { W, H, objectives, layout, svg, measures };
  if (typeof module !== 'undefined') module.exports = root.BattleMap;
})(typeof window !== 'undefined' ? window : globalThis);
