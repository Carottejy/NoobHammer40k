/* Base de données Wahapedia (11e) — chargement à la demande, conversion vers le format de l'appli. */
const Wahap = (() => {
  const facs = {}, waiters = {};
  let index = null, indexWait = null;
  const ov = {}, disp = {}, ovWait = {}; let lang = 'fr', dispIx = null;
  const base = 'data/wahapedia/';
  const T = (x) => (x == null ? '' : typeof x === 'string' ? x : x.en ? x.en : String(x));
  const isEn = (x) => !!x && typeof x === 'object' && !!x.en;
  const norm = (s) => String(T(s)).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘`]/g, "'").replace(/[^a-z0-9']+/g, ' ').trim();
  function load(src) {
    return new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = () => ok(); s.onerror = () => ko(new Error('Chargement impossible : ' + src)); document.head.appendChild(s); });
  }
  function mkEn(f, o) {
    if (!o) return f;
    const g = JSON.parse(JSON.stringify(f));
    g.units.forEach((u) => {
      const e = o.u && o.u[u.id]; if (!e) return;
      u.name = e.n || u.name; u.role = e.ro || u.role;
      (u.models || []).forEach((m, i) => { if (e.m && e.m[i]) m.name = e.m[i]; });
      if (e.k && e.k.length === (u.kw || []).length) u.kw = e.k; if (e.fk && e.fk.length === (u.fkw || []).length) u.fkw = e.fk;
      (u.weapons || []).forEach((w) => { if (w.e) w.name = w.e; if (w.abEn != null) w.ab = w.abEn; if (w.range === 'Mêlée') w.range = 'Melee'; });
      if (e.a && e.a.length === (u.abilities || []).length) u.abilities.forEach((a, i) => { a.name = e.a[i][0]; a.text = e.a[i][1]; });
      if (e.wo) u.wo = e.wo; if (e.l != null) u.loadout = e.l; if (e.tr) u.transport = e.tr; if (e.ln) u.leaderNote = e.ln;
      if (u.pc && u.pc.w && e.pw && e.pw.length === u.pc.w.length) u.pc.w.forEach((w, i) => { w[0] = e.pw[i]; });
    });
    (g.detachments || []).forEach((d) => {
      const e = o.d && o.d[d.id]; if (!e) return; d.name = e.n || d.name;
      if (e.a && e.a.length === d.abilities.length) d.abilities.forEach((a, i) => { a.name = e.a[i][0]; a.text = e.a[i][1]; });
      d.strats.forEach((s) => { const x = e.s && e.s[s.id]; if (x) { s.name = x[0]; s.text = x[1]; } });
      if (e.e && e.e.length === d.enh.length) d.enh.forEach((a, i) => { a.name = e.e[i][0]; a.text = e.e[i][1]; });
    });
    return g;
  }
  const api = {
    T, isEn, norm,
    regEn(id, data) { ov[id] = data; (ovWait[id] || []).forEach((f) => f()); },
    get lang() { return lang; },
    setLang(l) { lang = l === 'en' ? 'en' : 'fr'; },
    /* Version d'affichage (anglais d'origine) d'une faction ; null tant qu'elle n'est pas chargée */
    shown(id) { if (lang !== 'en') return facs[id] || null; return disp[id] || null; },
    async showFaction(id) {
      const f = await api.faction(id); if (lang !== 'en') return f; if (disp[id]) return disp[id];
      if (!ov[id]) { try { await load(base + 'en/' + id + '.js?v=' + (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '')); } catch (e) { return f; } }
      disp[id] = mkEn(f, ov[id]); return disp[id];
    },
    shownIndex() { if (lang !== 'en') return index; return dispIx; },
    async showIndex() {
      const ix = await api.ready(); if (lang !== 'en') return ix; if (dispIx) return dispIx;
      if (!ov.index) { try { await load(base + 'en/index.js?v=' + (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '')); } catch (e) { return ix; } }
      const core = (ov.index && ov.index.core) || {};
      dispIx = Object.assign({}, ix, { units: ix.units.map((u) => Object.assign({}, u, { n: u.e || u.n })), core: (ix.core || []).map((c) => (core[c.id] ? Object.assign({}, c, { name: core[c.id][0], text: core[c.id][1] }) : c)), kwfr: {} });
      return dispIx;
    },
    reg(id, data) { facs[id] = data; (waiters[id] || []).forEach((f) => f()); },
    regIndex(d) { index = d; if (typeof Kw !== 'undefined' && Kw.setMap) Kw.setMap(d.kwfr || {}); },
    kwT(k) { k = T(k); if (lang === 'en') return k; return (index && index.kwfr && index.kwfr[k]) || k; },
    ready() { return index ? Promise.resolve(index) : (indexWait = indexWait || load(base + 'index.js?v=' + (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '')).then(() => { if (!index) throw new Error('Base illisible'); return index; }).catch((e) => { indexWait = null; throw e; })); },
    index() { return index; },
    async faction(id) { if (facs[id]) return facs[id]; await load(base + id + '.js?v=' + (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '')); return facs[id]; },
    cached(id) { return facs[id] || null; },
    search(q, fac) {
      if (!index) return [];
      const n = norm(q || ''); const terms = n.split(' ').filter(Boolean);
      return index.units.filter((u) => (!fac || u.f === fac) && terms.every((t) => norm(u.n).includes(t) || norm(u.e).includes(t) || norm(u.r).includes(t))).slice(0, 80);
    },
    async unit(id) {
      await api.ready(); const e = index.units.find((u) => u.id === id); if (!e) return null;
      const f = await api.faction(e.f); return f.units.find((u) => u.id === id) || null;
    },
    facIds(name) {
      const n = norm(name || ''); const M = { 'space marines': ['SM'], 'dark angels': ['SM'], 'blood angels': ['SM'], 'space wolves': ['SM'], 'black templars': ['SM'], 'deathwatch': ['SM', 'AoI'], 'orks': ['ORK'], 'aeldari': ['AE'], 'drukhari': ['DRU'], 'necrons': ['NEC'], 'tyranids': ['TYR'], 'genestealer cults': ['GC'], 'astra militarum': ['AM'], 'adeptus mechanicus': ['AdM'], 'adeptus custodes': ['AC'], 'adepta sororitas': ['AS'], 'grey knights': ['GK'], 'imperial knights': ['QI'], 'chaos knights': ['QT'], 'chaos space marines': ['CSM'], 'death guard': ['DG'], 'thousand sons': ['TS'], 'world eaters': ['WE'], "emperor's children": ['EC'], 'chaos daemons': ['CD'], "t'au empire": ['TAU'], 'leagues of votann': ['LoV'], 'imperial agents': ['AoI'], 'agents of the imperium': ['AoI'] };
      const k = Object.keys(M).find((x) => n.includes(x)); return k ? M[k] : [];
    },
    factionName(id) { const f = index && index.factions.find((x) => x.id === id); return f ? f.name : id; },
    /* fiche -> unité au format de l'appli */
    toApp(d, uid) {
      const ms = d.models || []; const m = ms[0] || {};
      const num = (v) => String(v || '').replace(/"/g, '');
      const u = {
        id: uid(), name: T(d.name), models: '', pts: 0, ptsNote: '', section: d.role || '', tag: '',
        M: num(m.M), T: m.T || '', sv: m.Sv || '', inv: m.inv || '', W: m.W || '', Ld: m.Ld || '', OC: m.OC || '', fnp: '',
        weapons: (d.weapons || []).map((w) => ({ name: T(w.name), range: w.range === 'Mêlée' ? 'Mêlée' : num(w.range), A: String(w.A), skill: w.skill || '', S: String(w.S), AP: String(w.AP), D: String(w.D), abilities: w.ab || '', type: w.type })),
        abilities: (d.abilities || []).filter((a) => a.name).map((a) => ({ name: T(a.name) + (a.param ? ' ' + a.param : ''), text: T(a.text), phases: (typeof AlnPdf !== 'undefined' ? AlnPdf.phasesFromText(T(a.text) || T(a.name), T(a.name)) : ['all']), en: isEn(a.text) || isEn(a.name) })),
        keywords: (d.kw || []).map((k) => api.kwT(k)), factionKw: (d.fkw || []).map((k) => api.kwT(k)), equipment: T(d.loadout).replace(/\n/g, ' '), subModels: [], enhancement: '', options: [], wargearOpts: (d.wo || []).slice(), hasProfile: true, wahapId: d.id
      };
      if (ms.length > 1) u.profiles = ms.map((x) => ({ name: T(x.name), M: num(x.M), T: x.T, W: x.W, Ld: x.Ld, OC: x.OC, sv: x.Sv, inv: x.inv }));
      return u;
    },
    /* complète les unités sans arme à partir de la base (par nom FR ou EN) */
    async fill(units, facHint) {
      await api.ready(); let n = 0;
      const todo = units.filter((u) => !(u.weapons || []).length); if (!todo.length) return 0;
      const ids = facHint && facHint.length ? facHint : index.factions.map((f) => f.id);
      for (const fid of ids) {
        const f = await api.faction(fid).catch(() => null); if (!f) continue;
        todo.forEach((u) => {
          if ((u.weapons || []).length) return;
          const key = norm(String(u.name).replace(/\s*#\d+$/, ''));
          const d = f.units.find((x) => norm(x.name) === key || norm(x.en) === key);
          if (d) { const a = api.toApp(d, () => 'x'); u.weapons = a.weapons; if (!u.T) { u.T = a.T; u.sv = a.sv; u.inv = a.inv; u.W = a.W; u.Ld = a.Ld; u.OC = a.OC; u.M = a.M; } if (!(u.abilities || []).length) u.abilities = a.abilities; u.hasProfile = true; u.wahapId = d.id; u.wargearOpts = a.wargearOpts; n++; }
        });
      }
      return n;
    }
  };
  return api;
})();
if (typeof window !== 'undefined') window.Wahap = Wahap;
