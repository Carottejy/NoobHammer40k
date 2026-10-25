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
    /* Kit officiel de 16 empreintes : 4 grands rectangles, 2 triangles, 4 moyens, 2 lignes longues, 4 lignes courtes. */
    let bigLeft = 4;
    objs.forEach((o) => {
      if (done.has(o.i)) return;
      const mirror = objs.find((q) => q.i !== o.i && Math.abs(q.x - (W - o.x)) < 0.6 && Math.abs(q.y - (H - o.y)) < 0.6);
      const big = o.k === 'C'; let horiz = R() < 0.5;
      const mk = (hz) => { const w = big ? (hz ? 11.5 : 7) : (hz ? OBJ.w : OBJ.h), h = big ? (hz ? 7 : 11.5) : (hz ? OBJ.h : OBJ.w); const q = { k: big ? 'D' : 'L', s: 'R', c: 0, x: o.x, y: o.y, w, h, obj: o.i }; q.x = Math.round(q.x - w / 2) + w / 2; q.y = Math.round(q.y - h / 2) + h / 2; return q; };
      let p = mk(horiz);
      if (mirror && gap(p, rot(p)) < 0.5) { const p2 = mk(!horiz); if (gap(p2, rot(p2)) > gap(p, rot(p))) p = p2; }
      if (!inside(p)) { p.x = Math.min(Math.max(p.x, 1 + p.w / 2), W - 1 - p.w / 2); p.y = Math.min(Math.max(p.y, 1 + p.h / 2), H - 1 - p.h / 2); }
      add(p); done.add(o.i); if (big) bigLeft--;
      if (mirror) { const m = rot(p); m.obj = mirror.i; add(m); done.add(mirror.i); if (big) bigLeft--; }
    });
    // décors supplémentaires : paires symétriques tirées dans le reste du kit
    const pool = [['D', 8, 11.5, 'T'], ['L', 10, 2.5, 'R'], ['L', 6, 2, 'R'], ['L', 6, 2, 'R']];
    for (let i = 0; i < Math.floor(bigLeft / 2); i++) pool.push(['D', 11.5, 7, 'R']);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    pool.forEach((sz) => {
      for (let tries = 0; tries < 120; tries++) {
        const horiz = R() < 0.5; const w = horiz ? sz[1] : sz[2], h = horiz ? sz[2] : sz[1];
        const p = { k: sz[0], s: sz[3], c: Math.floor(R() * 4), x: 3 + R() * (W - 6), y: 3 + R() * (H - 6), w, h };
        p.x = Math.round(p.x - w / 2) + w / 2; p.y = Math.round(p.y - h / 2) + h / 2;
        if (!inside(p)) continue;
        const m = rot(p);
        if (gap(p, m) < 3) continue;
        if (pieces.some((q) => gap(p, q) < 3 || gap(m, q) < 3)) continue;
        if (objs.some((o) => Math.hypot(Math.max(Math.abs(o.x - p.x) - p.w / 2, 0), Math.max(Math.abs(o.y - p.y) - p.h / 2, 0)) < 3.5 || Math.hypot(Math.max(Math.abs(o.x - m.x) - m.w / 2, 0), Math.max(Math.abs(o.y - m.y) - m.h / 2, 0)) < 3.5)) continue;
        add(p); add(m); break;
      }
    });
    pieces.forEach((p, i) => { p.n = i + 1; });
    return { objs, pieces };
  }
  const poly = (a) => a.map((p) => p.join(',')).join(' ');
  /* Bord irrégulier (comme les dalles de ruines réelles) : un côté, déterministe, sur le côté le plus long. */
  function ragged(pts, p) {
    const n = pts.length; let bi = 0, bl = 0;
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l > bl + 0.01 && (i + p.n) % 2 === 0 || l > bl + 3) { bl = l; bi = i; } }
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push(pts[i]);
      if (i !== bi || bl < 4) continue;
      const a = pts[i], b = pts[(i + 1) % n]; const steps = Math.floor(bl / 1.3); const nx = -(b[1] - a[1]) / bl, ny = (b[0] - a[0]) / bl;
      const cx = p.x, cy = p.y; const sgn = ((a[0] + b[0]) / 2 - cx) * nx + ((a[1] + b[1]) / 2 - cy) * ny >= 0 ? -1 : 1; // vers l'intérieur
      for (let k = 1; k < steps; k++) { const t = k / steps; const h = Math.abs(Math.sin((k + p.n * 3.7) * 12.9898) * 43758.5453) % 1; const d = sgn * (0.1 + h * 0.55); out.push([r1(a[0] + (b[0] - a[0]) * t + nx * d), r1(a[1] + (b[1] - a[1]) * t + ny * d)]); }
    }
    return out;
  }
  /* Dessin SVG (style « plan imprimé » : fond crème quadrillé, zones pleines, empreintes hachurées, murs verts, obstacles orange). */
  function svg(depId, lay, opts) {
    opts = opts || {}; const d = BD().DEPLOY[depId]; const nm = opts.names || {}; const uid = 'm' + (opts.id || '0');
    const cut = (t) => (t.length > 20 ? t.slice(0, 19) + '…' : t); const A = cut(nm.a || 'Attaquant'), D = cut(nm.d || 'Défenseur');
    const RED = '#944a47', BLU = '#3b4d63', INK = '#1d1d1d', WALL = '#3f6b46', OBS = '#d28a2e', PAPER = '#f1ece0';
    let s = `<svg class="bmap" viewBox="-7 -7 58 74" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Plan de bataille"><defs>`
      + `<pattern id="${uid}h" width="1.1" height="1.1" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.1" height="1.1" fill="#ebe7da"/><line x1="0" y1="0" x2="0" y2="1.1" stroke="#9c9a90" stroke-width=".22"/></pattern>`
      + `<pattern id="${uid}g" width="1" height="1" patternUnits="userSpaceOnUse"><path d="M1 0H0V1" fill="none" stroke="#000" stroke-opacity=".10" stroke-width=".05"/></pattern>`;
    if (d.circle) s += `<mask id="${uid}"><rect x="0" y="0" width="${W}" height="${H}" fill="#fff"/><circle cx="${CX}" cy="${CY}" r="${d.circle}" fill="#000"/></mask>`;
    s += `</defs><rect x="-7" y="-7" width="58" height="74" fill="${PAPER}"/><rect x="0" y="0" width="${W}" height="${H}" fill="${PAPER}"/><rect x="0" y="0" width="${W}" height="${H}" fill="url(#${uid}g)"/>`;
    const mk = d.circle ? ` mask="url(#${uid})"` : '';
    s += `<polygon points="${poly(d.a)}" fill="${RED}"${mk}/><polygon points="${poly(d.d)}" fill="${BLU}"${mk}/><rect x="0" y="0" width="${W}" height="${H}" fill="url(#${uid}g)" opacity=".9"/>`;
    if (d.circle) s += `<circle cx="${CX}" cy="${CY}" r="${d.circle}" fill="none" stroke="${INK}" stroke-opacity=".5" stroke-width=".15" stroke-dasharray=".8 .6"/>`;
    s += `<line x1="${d.line[0][0]}" y1="${d.line[0][1]}" x2="${d.line[1][0]}" y2="${d.line[1][1]}" stroke="${INK}" stroke-opacity=".7" stroke-width=".18" stroke-dasharray="1.2 .9"/>`;
    const cotes = opts.cotes !== false;
    const wall = (ax, ay, bx, by) => `<line x1="${r1(ax)}" y1="${r1(ay)}" x2="${r1(bx)}" y2="${r1(by)}" stroke="${WALL}" stroke-width=".6" stroke-linecap="square"/>`;
    const obs = (ax, ay, bx, by) => `<line x1="${r1(ax)}" y1="${r1(ay)}" x2="${r1(bx)}" y2="${r1(by)}" stroke="${OBS}" stroke-width=".5" stroke-linecap="square"/>`;
    lay.pieces.forEach((p) => {
      const dense = p.k === 'D'; const x0 = r1(p.x - p.w / 2), y0 = r1(p.y - p.h / 2), x1 = r1(p.x + p.w / 2), y1 = r1(p.y + p.h / 2);
      let pts;
      if (p.s === 'T') pts = p.c === 0 ? [[x0, y0], [x1, y0], [x0, y1]] : p.c === 1 ? [[x0, y0], [x1, y0], [x1, y1]] : p.c === 2 ? [[x1, y0], [x1, y1], [x0, y1]] : [[x0, y0], [x0, y1], [x1, y1]];
      else pts = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
      pts = ragged(pts, p);
      s += `<g><polygon points="${poly(pts)}" fill="url(#${uid}h)" stroke="${INK}" stroke-width=".28" stroke-linejoin="round"/>`;
      const e = 1.6; // longueur des équerres
      if (p.s === 'T') {
        const q = pts; // sommet à angle droit = celui dont les deux côtés sont horizontaux/verticaux
        const rc = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]][p.c];
        const sx = rc[0] === x0 ? 1 : -1, sy = rc[1] === y0 ? 1 : -1;
        s += wall(rc[0], rc[1], rc[0] + sx * Math.min(p.w * .7, 6), rc[1]) + wall(rc[0], rc[1], rc[0], rc[1] + sy * Math.min(p.h * .7, 6));
      } else if (dense) {
        // ruine : deux équerres de murs verts sur coins opposés + un mur partiel, orange sur un coin
        const f = p.n % 2; const L = Math.min(p.w, p.h) * .8, M = p.w * .45;
        if (f) s += wall(x0 + .3, y0 + .3, x0 + .3 + Math.min(p.w * .8, 9), y0 + .3) + wall(x0 + .3, y0 + .3, x0 + .3, y0 + .3 + L) + wall(x1 - .3, y1 - .3, x1 - .3 - M, y1 - .3) + wall(x1 - .3, y1 - .3, x1 - .3, y1 - .3 - L * .8) + obs(x1 - .3, y0 + .3, x1 - .3 - e, y0 + .3) + obs(x1 - .3, y0 + .3, x1 - .3, y0 + .3 + e);
        else s += wall(x1 - .3, y0 + .3, x1 - .3 - Math.min(p.w * .8, 9), y0 + .3) + wall(x1 - .3, y0 + .3, x1 - .3, y0 + .3 + L) + wall(x0 + .3, y1 - .3, x0 + .3 + M, y1 - .3) + wall(x0 + .3, y1 - .3, x0 + .3, y1 - .3 - L * .8) + obs(x0 + .3, y0 + .3, x0 + .3 + e, y0 + .3) + obs(x0 + .3, y0 + .3, x0 + .3, y0 + .3 + e);
      } else if (Math.min(p.w, p.h) <= 2.6) {
        // ligne : mur vert avec barre orange (obstacle) au milieu
        const horiz = p.w >= p.h; if (horiz) s += wall(x0 + .5, p.y, x1 - .5, p.y) + obs(p.x - 1.2, p.y, p.x + 1.2, p.y); else s += wall(p.x, y0 + .5, p.x, y1 - .5) + obs(p.x, p.y - 1.2, p.x, p.y + 1.2);
      } else {
        // rectangle moyen : équerres orange (obstacles) sur deux coins opposés
        const f = p.n % 2; const c1 = f ? [x0, y0, 1, 1] : [x1, y0, -1, 1], c2 = f ? [x1, y1, -1, -1] : [x0, y1, 1, -1];
        [c1, c2].forEach((c) => { s += obs(c[0] + c[2] * .3, c[1] + c[3] * .3, c[0] + c[2] * (.3 + e), c[1] + c[3] * .3) + obs(c[0] + c[2] * .3, c[1] + c[3] * .3, c[0] + c[2] * .3, c[1] + c[3] * (.3 + e)); });
      }
      s += `<text x="${p.x}" y="${r1(p.obj ? y1 - .7 : p.y + .55)}" font-size="1.45" font-weight="700" text-anchor="middle" fill="${INK}" stroke="${PAPER}" stroke-width=".35" paint-order="stroke">${p.w}×${p.h}</text>`;
      s += '</g>';
      if (cotes) {
        const t = (x, y, v, rot) => `<text x="${x}" y="${y}" font-size="1.25" font-weight="700" text-anchor="middle" fill="${INK}" stroke="${PAPER}" stroke-width=".3" paint-order="stroke"${rot ? ` transform="rotate(-90 ${x} ${y})"` : ''}>${v}</text>`;
        const L = x0, Rr = r1(W - x1), T = y0, B = r1(H - y1);
        if (Math.min(L, Rr) > 0.4) { const left = L <= Rr; const v = left ? L : Rr; s += `<line x1="${left ? 0 : x1}" y1="${p.y}" x2="${left ? x0 : W}" y2="${p.y}" stroke="#fff" stroke-width=".16" stroke-dasharray=".4 .3"/><line x1="${left ? 0 : x1}" y1="${p.y}" x2="${left ? x0 : W}" y2="${p.y}" stroke="${INK}" stroke-width=".08"/>` + t(r1(left ? x0 / 2 : (x1 + W) / 2), r1(p.y - .35), v + '"'); }
        if (Math.min(T, B) > 0.4) { const top = T <= B; const v = top ? T : B; s += `<line x1="${p.x}" y1="${top ? 0 : y1}" x2="${p.x}" y2="${top ? y0 : H}" stroke="#fff" stroke-width=".16" stroke-dasharray=".4 .3"/><line x1="${p.x}" y1="${top ? 0 : y1}" x2="${p.x}" y2="${top ? y0 : H}" stroke="${INK}" stroke-width=".08"/>` + t(r1(p.x - .35), r1(top ? y0 / 2 : (y1 + H) / 2), v + '"', true); }
      }
    });
    lay.objs.forEach((o) => {
      const home = o.k === 'A' || o.k === 'D', centre = o.k === 'C';
      s += `<circle cx="${o.x}" cy="${o.y}" r="3" fill="none" stroke="${INK}" stroke-opacity=".45" stroke-width=".12" stroke-dasharray=".5 .4"/><circle cx="${o.x}" cy="${o.y}" r="1.35" fill="#fff" stroke="${home ? RED : centre ? INK : '#2f7f8a'}" stroke-width=".25"/>`;
      if (home) s += `<path d="M${o.x - .7} ${o.y + .6}V${o.y - .2}H${o.x - .7}V${o.y - .6}H${o.x - .35}V${o.y - .35}H${o.x - .1}V${o.y - .6}H${o.x + .1}V${o.y - .35}H${o.x + .35}V${o.y - .6}H${o.x + .7}V${o.y + .6}Z" fill="${RED}"/>`;
      else if (centre) s += `<circle cx="${o.x}" cy="${r1(o.y - .15)}" r=".6" fill="${INK}"/><rect x="${r1(o.x - .3)}" y="${r1(o.y + .2)}" width=".6" height=".45" fill="${INK}"/>`;
      else s += `<path d="M${o.x - .45} ${o.y + .7}V${o.y - .7}M${o.x - .45} ${o.y - .7}H${o.x + .6}L${o.x + .2} ${o.y - .3}L${o.x + .6} ${o.y + .1}H${o.x - .45}" fill="#2f7f8a" stroke="#2f7f8a" stroke-width=".18"/>`;
    });
    for (let x = 0; x <= W; x += 6) s += `<text x="${x}" y="-1.6" font-size="1.6" text-anchor="middle" fill="#6a665c">${x}"</text>`;
    for (let y = 0; y <= H; y += 6) s += `<text x="-1" y="${y + 0.6}" font-size="1.6" text-anchor="end" fill="#6a665c">${y}"</text>`;
    s += `<rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="${INK}" stroke-width=".5"/>`;
    if (d.side === 'v') s += `<text x="${CX}" y="-3.8" font-size="2.1" font-weight="800" text-anchor="middle" fill="${RED}">${A.toUpperCase()}</text><text x="${CX}" y="${H + 4.4}" font-size="2.1" font-weight="800" text-anchor="middle" fill="${BLU}">${D.toUpperCase()}</text>`;
    else s += `<text transform="translate(-5.2 ${CY}) rotate(-90)" font-size="2.1" font-weight="800" text-anchor="middle" fill="${RED}">${A.toUpperCase()}</text><text transform="translate(${W + 5.2} ${CY}) rotate(90)" font-size="2.1" font-weight="800" text-anchor="middle" fill="${BLU}">${D.toUpperCase()}</text>`;
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
