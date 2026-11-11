/* Moteur de règles — Warhammer 40 000 (11e édition).
   Fonctionne dans le navigateur (global `Engine`) et dans Node (module.exports). */
const Engine = (() => {
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  /* ---------- Dés ---------- */
  function parseDice(raw) {
    const s = String(raw == null ? '' : raw).toUpperCase().replace(/\s/g, '');
    const m = s.match(/^(\d*)D(\d+)(?:\+(\d+))?$/);
    if (m) {
      const n = m[1] ? +m[1] : 1, f = +m[2], add = m[3] ? +m[3] : 0;
      return { text: s, avg: n * (f + 1) / 2 + add, isDice: true, n, f, add };
    }
    const k = parseInt(s, 10);
    if (!isNaN(k)) return { text: String(k), avg: k, isDice: false, n: 0, f: 0, add: k };
    return { text: s || '?', avg: 0, isDice: false, n: 0, f: 0, add: 0 };
  }
  const parseSkill = (raw) => {
    const m = String(raw || '').match(/(\d)\s*\+/);
    return m ? +m[1] : null;
  };
  // probabilité de réussir un jet « X+ » (1 non modifié échoue toujours, 6 réussit toujours)
  const pRoll = (req) => (req >= 7 ? 1 / 6 : clamp((7 - Math.max(2, req)) / 6, 1 / 6, 5 / 6));
  const pSave = (req) => (req > 6 ? 0 : clamp((7 - Math.max(2, req)) / 6, 0, 5 / 6));
  const shown = (req) => clamp(req, 2, 6);

  /* ---------- Capacités d'armes (FR + EN) ---------- */
  const PATTERNS = [
    ['rapidFire', /^(?:rapid fire|tir rapide|rafale)\s*(\d*d?\d+(?:\+\d+)?)$/],
    ['sustainedHits', /^(?:sustained hits|touches? soutenues?)\s*(\d*d?\d+(?:\+\d+)?)$/],
    ['lethalHits', /^(?:lethal hits|coups? fatals?|touches? (?:fatales?|letales?)|touches? mortelles?)$/],
    ['devastatingWounds', /^(?:devastating wounds|blessures? devastatrices?)$/],
    ['anti', /^anti[- ]?(.+?)\s*(\d)\+$/],
    ['melta', /^(?:melta|fusion)\s*(\d*d?\d+(?:\+\d+)?)$/],
    ['cleave', /^(?:cleave|abattage|fente|fendre)\s*(\d+)$/],
    ['twinLinked', /^(?:twin[- ]?linked|jumelee?s?|tir jumele|tir lie|lie)$/],
    ['torrent', /^torrent$/],
    ['blast', /^(?:blast|explosion|barrage|deflagration)(?:\s*\d+)?$/],
    ['heavy', /^(?:heavy|lourd[e]?)$/],
    ['assault', /^(?:assault|assaut)$/],
    ['pistol', /^(?:pistol|pistolet|combat rapproche)$/],
    ['lance', /^lance$/],
    ['ignoresCover', /^(?:ignores? cover|ignore(?:nt)? (?:le |les )?couverts?)$/],
    ['indirectFire', /^(?:indirect fire|tir indirect)$/],
    ['precision', /^(?:precision)$/],
    ['hazardous', /^(?:hazardous|dangereu[xs]e?|a risque)$/],
    ['extraAttacks', /^(?:extra attacks|attaques? (?:supplementaires?|bonus))$/],
    ['psychic', /^(?:psychic|psychique)$/],
    ['oneShot', /^(?:one shot|un seul tir)$/],
  ];
  function parseAbilities(str) {
    const out = { other: [] };
    String(str || '').split(/[,;]/).map((x) => norm(x).replace(/[\[\]]/g, '').trim()).filter(Boolean).forEach((tok0) => {
      let tok = tok0; const qm = tok0.match(/^([^:]+?)\s*:\s*(.+)$/); let qual = null;
      if (qm && /^(?:lethal hits|touches? (?:fatales?|letales?)|coups? fatals?|devastating wounds|blessures? devastatrices?|sustained hits|touches? soutenues?)/.test(qm[1])) {
        tok = qm[1].trim(); const neg = /^non[- ]/.test(qm[2].trim());
        const kws = qm[2].trim().replace(/^non[- ]*/, '').split(/\s*\/\s*/).map((x) => x.trim()).filter(Boolean);
        qual = { not: neg ? kws : [], only: neg ? [] : kws };
      }
      for (const [key, re] of PATTERNS) {
        const m = tok.match(re);
        if (m) {
          if (key === 'anti') { const an = { kw: m[1].trim(), x: +m[2] }; (out.antis = out.antis || []).push(an); if (!out.anti) out.anti = an; }
          else if (m[1] !== undefined) out[key] = parseDice(m[1]);
          else out[key] = true;
          if (qual && ['lethalHits', 'devastatingWounds', 'sustainedHits'].includes(key)) (out.qual = out.qual || {})[key] = qual;
          return;
        }
      }
      out.other.push(tok);
    });
    return out;
  }
  const KW_ALIASES = {
    infantry: ['infantry', 'infanterie'], vehicle: ['vehicle', 'vehicule'], monster: ['monster', 'monstre'],
    character: ['character', 'personnage'], swarm: ['swarm', 'nuee'], beast: ['beast', 'bete'], fly: ['fly', 'volant'],
    titanic: ['titanic', 'titanesque'], aircraft: ['aircraft', 'aeronef'],
  };
  function hasKw(targetKw, wanted) {
    const w = norm(wanted);
    const list = (targetKw || []).map(norm);
    for (const [, aliases] of Object.entries(KW_ALIASES)) {
      if (aliases.includes(w)) return list.some((k) => aliases.includes(k));
    }
    return list.includes(w);
  }

  /* ---------- Calcul principal ---------- */
  function compute(c) {
    const w = c.weapon || {};
    const mode = c.mode === 'melee' ? 'melee' : 'ranged';
    const melee = mode === 'melee';
    const s = c.situation || {};
    const t = c.target || {};
    const m = c.mods || {};
    const ab = parseAbilities(w.abilities);
    (m.addAbil || []).forEach((k) => { if (!ab[k]) ab[k] = true; });
    if ((m.addAbilTok || []).length) { const ex = parseAbilities(m.addAbilTok.join(',')); Object.keys(ex).forEach((k) => { if (k === 'other' || k === 'qual') return; if (k === 'antis') { ab.antis = (ab.antis || []).concat(ex.antis); return; } if (!ab[k]) ab[k] = ex[k]; }); if (ex.qual) ab.qual = Object.assign({}, ex.qual, ab.qual || {}); }
    const qOk = (key) => { const q = ab.qual && ab.qual[key]; if (!q) return true; const has = (l) => l.some((k) => hasKw(t.kw, k)); if (q.not.length && has(q.not)) return false; if (q.only.length && !has(q.only)) return false; return true; };
    const qTxt = (key) => { const q = ab.qual && ab.qual[key]; return q ? (q.not.length ? ' (sauf cible ' + q.not.join('/').toUpperCase() + ')' : ' (cible ' + q.only.join('/').toUpperCase() + ' seulement)') : ''; };
    (m.removeAbil || []).forEach((k) => { delete ab[k]; });
    const nModels = Math.max(1, +c.nModels || 1);
    const res = { steps: [], warnings: [], notes: [], ab };
    const addNote = (x) => res.notes.push(x);

    /* — Restrictions de mouvement — */
    if (!melee) {
      if (s.moved === 'advanced' && !ab.assault) res.warnings.push("L'unité a Avancé : cette arme ne peut pas tirer (pas Assaut).");
      if (s.moved === 'fellback') res.warnings.push("L'unité a battu en retraite : elle ne peut normalement pas tirer.");
      if (s.engaged && !ab.pistol) res.warnings.push("Unité engagée : seules les armes Pistolet peuvent tirer (hors règles Monstre/Véhicule — à vérifier dans la règle actuelle).");
      if (c.battleShocked) res.notes.push("Unité en Choc de Bataille : OC réduit, aucune action, et aucun stratagème ne peut la cibler.");
    }

    /* — 1. Nombre d'attaques — */
    const aBase = parseDice(m.setA ? String(m.setA) : w.A);
    const parts = [{ label: 'Attaques de base', dice: aBase }];
    if (!melee && ab.rapidFire && s.halfRange) parts.push({ label: `Tir rapide ${ab.rapidFire.text} (mi-portée)`, dice: ab.rapidFire });
    if (!melee && ab.blast && t.models >= 5) {
      const b = Math.floor(t.models / 5);
      parts.push({ label: `Explosion (${t.models} figs ciblées)`, dice: parseDice(String(b)) });
    }
    if (melee && ab.cleave && t.models >= 5) parts.push({ label: `Abattage ${ab.cleave.text} (${t.models} figs ciblées)`, dice: parseDice(String(Math.floor(t.models / 5) * ab.cleave.avg)) });
    if (m.extraA) parts.push({ label: 'Bonus d\'attaques (règle/stratagème)', dice: parseDice(String(m.extraA)) });
    const attacksAvg = parts.reduce((a, p) => a + p.dice.avg, 0);
    const attacksText = parts.map((p) => p.dice.text).join(' + ');
    res.steps.push({
      id: 'attacks', title: 'Attaques',
      main: nModels > 1 ? `${attacksText} par figurine × ${nModels}` : attacksText,
      sub: `≈ ${(attacksAvg * nModels).toFixed(1)} attaques`,
      details: parts.map((p) => `${p.label} : ${p.dice.text}`),
    });
    const N = attacksAvg * nModels;

    /* — 2. Jet de touche — */
    const hitMods = [];
    let hitMain, hitSub = '', pHit, pCrit, torrent = !!ab.torrent;
    const snap = !!s.snap, hiddenTarget = !!s.hiddenTarget;
    let rrHit = m.rrHit || 'none';
    if (torrent) {
      pHit = 1; pCrit = 0;
      hitMain = 'Touche automatique (Torrent)';
      hitSub = 'Aucun jet de touche : pas de modificateur, pas de critique.';
    } else {
      const skill = parseSkill(w.skill);
      if (skill == null) res.warnings.push("CT/CC non renseignée pour cette arme.");
      const base = skill == null ? 4 : skill;
      if (!melee && ab.heavy) {
        const ok = !s.engaged && !s.setUp && (s.moved === 'stationary' || s.moved === 'le3');
        if (ok) hitMods.push({ label: 'Lourde (immobile / ≤ 3″)', v: +1 });
        else addNote("Lourde : +1 pour toucher seulement si l'unité n'est pas engagée, n'a pas été déployée ce tour et a bougé de 3″ ou moins.");
      }
      if (!melee && s.elevated) hitMods.push({ label: 'Tir plongeant (≥ 3″ plus haut)', v: +1 });
      const cover = !melee && (t.inCover || t.stealth || m.forceCover);
      if (cover) {
        if (ab.ignoresCover || m.noCover) addNote('Ignore le couvert : le malus −1 CT du couvert (et de Furtivité) ne s\'applique pas.');
        else hitMods.push({ label: t.inCover ? 'Cible à couvert' : t.stealth ? 'Cible Furtive (= couvert)' : 'Couvert accordé à la cible (règle)', v: -1 });
      }
      if (ab.indirectFire && !melee) hitMods.push({ label: 'Tir indirect', v: -1 });
      if (m.hit) hitMods.push({ label: 'Autres modificateurs (règles/stratagèmes)', v: m.hit });
      if (ab.psychic && hitMods.length) { addNote('Psychique : les modificateurs de touche sont ignorés pour cette arme (' + hitMods.map((x) => x.label).join(', ') + ') — vérifie la règle exacte.'); hitMods.length = 0; }
      const sum = hitMods.reduce((a, x) => a + x.v, 0);
      const net = clamp(sum, -1, 1);
      const req = base - net;
      const onlySix = snap || hiddenTarget;
      pHit = onlySix ? 1 / 6 : pRoll(req);
      const critMin = 6;
      pCrit = (7 - critMin) / 6;
      hitMain = onlySix ? 'Touche sur 6 non modifié' : `${shown(req)}+`;
      hitSub = onlySix ? (snap ? 'Tir de réaction (tir instinctif) : 6 non modifié, relances interdites.' : 'Cible cachée : 6 non modifié seulement.') : `CT/CC ${base}+`;
      if (snap) rrHit = 'none';
      if (!onlySix && sum !== net) addNote(`Modificateurs de touche cumulés ${sum > 0 ? '+' : ''}${sum} : limités à ${net > 0 ? '+1' : '−1'} (un jet ne peut être modifié de plus de ±1).`);
      if (!onlySix && req > 6) addNote('Même avec les modificateurs, un 6 non modifié touche toujours.');
      res.steps.push({
        id: 'hit', title: 'Jet de touche', main: hitMain + (rrHit === 'ones' ? ' — relance les 1' : rrHit === 'all' ? ' — relance tout' : ''),
        sub: hitSub, mods: hitMods, details: [],
      });
    }
    if (torrent) res.steps.push({ id: 'hit', title: 'Jet de touche', main: hitMain, sub: hitSub, mods: [], details: [] });

    let critEff = pCrit, hitEff = pHit;
    if (!torrent) {
      if (rrHit === 'all') { hitEff = pHit + (1 - pHit) * pHit; critEff = pCrit + (1 - pHit) * pCrit; }
      else if (rrHit === 'ones') { hitEff = pHit + (1 / 6) * pHit; critEff = pCrit + (1 / 6) * pCrit; }
    }
    const lethal = (!!ab.lethalHits && qOk('lethalHits')) || !!m.lethal;
    const sustW = ab.sustainedHits && qOk('sustainedHits') ? ab.sustainedHits : null; const sustM = m.sust ? parseDice(String(m.sust)) : null;
    const sustDice = sustW && sustM ? (sustM.avg > sustW.avg ? sustM : sustW) : (sustW || sustM);
    const hitsBase = N * hitEff;
    const crits = N * critEff;
    const extraHits = sustDice ? crits * sustDice.avg : 0;
    const autoWounds = lethal ? crits : 0;
    const totalHits = hitsBase + extraHits;
    const rolledHits = totalHits - autoWounds;
    if (!torrent) {
      const hs = res.steps[res.steps.length - 1];
      if (lethal) hs.details.push('Coups fatals : chaque touche critique (6 non modifié) blesse automatiquement.' + qTxt('lethalHits'));
      else if (ab.lethalHits) hs.details.push('Coups fatals non applicable à cette cible' + qTxt('lethalHits') + '.');
      if (sustDice) hs.details.push(`Touches soutenues ${sustDice.text} : chaque critique ajoute ${sustDice.text} touche(s).` + (sustW && sustDice === sustW ? qTxt('sustainedHits') : ''));
      else if (ab.sustainedHits) hs.details.push('Touches soutenues non applicable à cette cible' + qTxt('sustainedHits') + '.');
    }

    /* — 3. Jet de blessure — */
    const S = (+w.S || 0) + (+m.strength || 0);
    const T = +t.T || 0;
    let baseW;
    if (!T) baseW = 4; else if (S >= 2 * T) baseW = 2; else if (S > T) baseW = 3; else if (S === T) baseW = 4; else if (S * 2 <= T) baseW = 6; else baseW = 5;
    const woundMods = [];
    if (melee && ab.lance && s.charged) woundMods.push({ label: 'Lance (a chargé ce tour)', v: +1 });
    else if (ab.lance) addNote('Lance : +1 pour blesser seulement si l\'unité a chargé ce tour.');
    if (m.wound) woundMods.push({ label: 'Autres modificateurs (règles/stratagèmes)', v: m.wound });
    const wsum = woundMods.reduce((a, x) => a + x.v, 0);
    const wnet = clamp(wsum, -1, 1);
    const reqW = baseW - wnet;
    let critW = 6, antiOn = false, antiName = '';
    const antiHas = (kw) => { const k = String(kw || '').trim(); const neg = /^non[- ]/.test(k); const has = hasKw(t.kw, k.replace(/^non[- ]/, '')); return neg ? !has : has; };
    [].concat(ab.antis || (ab.anti ? [ab.anti] : []), m.antis || [], m.anti ? [m.anti] : []).forEach((a) => { if (a && a.kw && antiHas(a.kw) && (!antiOn || a.x < critW)) { critW = a.x; antiOn = true; antiName = a.kw; } });
    let pW = Math.max(pRoll(reqW), antiOn ? (7 - critW) / 6 : 0);
    let pCW = (7 - critW) / 6;
    let rrW = m.rrWound || 'none';
    if (ab.twinLinked && rrW === 'none') rrW = 'all';
    if (rrW === 'all') { pCW = pCW + (1 - pW) * pCW; pW = pW + (1 - pW) * pW; }
    else if (rrW === 'ones') { pCW = pCW + (1 / 6) * pCW; pW = pW + (1 / 6) * pW; }
    const dev = (!!ab.devastatingWounds && qOk('devastatingWounds')) || !!m.dev;
    const wDetails = [`Force ${S} contre Endurance ${T || '?'}`];
    if (antiOn) wDetails.push(`Anti-${antiName} ${critW}+ : blessure critique (réussite auto) sur ${critW}+ non modifié.`);
    if (dev) wDetails.push('Blessures dévastatrices : chaque blessure critique inflige des blessures mortelles (dégâts de l\'arme), sans sauvegarde.' + qTxt('devastatingWounds'));
    else if (ab.devastatingWounds) wDetails.push('Blessures dévastatrices non applicable à cette cible' + qTxt('devastatingWounds') + '.');
    if (wsum !== wnet) addNote(`Modificateurs de blessure cumulés ${wsum > 0 ? '+' : ''}${wsum} : limités à ±1.`);
    res.steps.push({
      id: 'wound', title: 'Jet de blessure',
      main: `${shown(reqW)}+` + (antiOn ? ` (critique sur ${critW}+)` : '') + (rrW === 'all' ? ' — relance tout' : rrW === 'ones' ? ' — relance les 1' : ''),
      sub: ab.twinLinked ? 'Jumelé : relance du jet de blessure.' : '', mods: woundMods, details: wDetails,
    });
    const woundsFromRolled = rolledHits * pW;
    const critWounds = dev ? rolledHits * pCW : 0;
    const normalWounds = autoWounds + woundsFromRolled - critWounds;

    /* — 4. Sauvegarde — */
    const ap = Math.abs(parseInt(w.AP != null ? w.AP : w.ap, 10) || 0) + (+m.apImp || 0);
    const sv = parseSkill(t.sv) || (+t.sv || 7);
    const inv = +t.inv || 0;
    const modSv = sv + ap;
    const useInv = inv > 0 && inv < modSv;
    const finalSv = useInv ? inv : modSv;
    const savProb = pSave(finalSv);
    const svDetails = [`Sauvegarde ${sv}+ ${ap ? `modifiée par PA −${ap} → ${modSv > 6 ? 'impossible (>6+)' : modSv + '+'}` : '(PA 0)'}`];
    if (inv) svDetails.push(`Invulnérable ${inv}+ (non modifiée par la PA) → ${useInv ? 'meilleure : on l\'utilise' : 'moins bonne : ignorée'}`);
    svDetails.push('En 11e édition, le couvert ne modifie plus la sauvegarde (il pénalise la touche).');
    res.steps.push({
      id: 'save', title: 'Sauvegarde adverse (à lui de jeter)',
      main: finalSv > 6 ? 'Aucune sauvegarde possible' : `${finalSv}+${useInv ? ' (invulnérable)' : ''}`,
      sub: 'Un 1 non modifié échoue toujours.', mods: [], details: svDetails,
    });
    let unsaved = normalWounds * (1 - savProb);

    /* — 5. Dégâts — */
    const dBase = parseDice(w.D);
    const dParts = [dBase];
    let dText = dBase.text;
    if (!melee && ab.melta && s.halfRange) { dParts.push(ab.melta); dText += ` + ${ab.melta.text} (Fusion, mi-portée)`; }
    else if (ab.melta) addNote(`Fusion ${ab.melta.text} : +${ab.melta.text} aux dégâts à mi-portée.`);
    if (m.dmg) { dParts.push(parseDice(String(m.dmg))); dText += ` + ${m.dmg} (règle)`; }
    const rrAvg = (d) => { if (!d.isDice) return d.avg; let s = 0; for (let x = 1; x <= d.f; x++) s += x >= (d.f + 1) / 2 ? x : (d.f + 1) / 2; return d.n * (s / d.f) + d.add; };
    let dAvg = dParts.reduce((a, p) => a + (m.rrDmg && p === dBase ? rrAvg(p) : p.avg), 0);
    if (m.rrDmg) dText += ' (relance des dégâts)';
    const dmgRed = +m.dmgRed || 0;
    if (dmgRed) { dAvg = Math.max(1, dAvg - dmgRed); dText += ` − ${dmgRed} (réduction adverse)`; }
    const fnp = +t.fnp || 0;
    const pFnp = fnp ? (7 - fnp) / 6 : 0;
    const W = +t.W || 0;
    const effD = W ? Math.min(dAvg, W) : dAvg;
    const dmgSteps = [`Dégâts par blessure non sauvegardée : ${dText}`];
    if (fnp) dmgSteps.push(`Ignorer la douleur ${fnp}+ : l'adversaire jette 1 dé par PV perdu (réussite = PV ignoré).`);
    if (dev) dmgSteps.push('Les blessures mortelles ne débordent pas sur les autres figurines au-delà du modèle ciblé (règle de base) — vérifie le cas échéant.');
    res.steps.push({ id: 'damage', title: 'Dégâts', main: dText, sub: fnp ? `Ignorer la douleur ${fnp}+` : '', mods: [], details: dmgSteps });

    /* — Espérance — */
    let woundsDealt = (unsaved + critWounds) * (1 - pFnp);
    let dmgTotal = (unsaved * effD + critWounds * dAvg) * (1 - pFnp);
    let killsTot = W ? dmgTotal / W : null;
    /* Allocation par groupe (unité d'escorte, puis appui, puis meneur) : chaque groupe a ses propres sauvegardes, PV et ignorer la douleur */
    let grp = null;
    if (Array.isArray(t.groups) && t.groups.length > 1) {
      const totW = normalWounds + critWounds; const a = totW > 0 ? normalWounds / totW : 1; let rem = totW; grp = []; let un = 0, pvs = 0, ks = 0;
      const pre = t.pre || [];
      const info = t.groups.map((g, gi) => {
        const sv0 = parseSkill(g.sv) || (+g.sv || 7); const inv0 = +g.inv || 0; const mS = sv0 + ap; const uInv = inv0 > 0 && inv0 < mS; const fS = uInv ? inv0 : mS; const ps = pSave(fS);
        const f = +g.fnp || 0, pf = f ? (7 - f) / 6 : 0; const Wg = +g.W || 1, mg = Math.max(1, +g.models || 1);
        const dN = Math.min(dAvg, Wg); const rate = (a * (1 - ps) * dN + (1 - a) * dN) * (1 - pf);
        return { g, gi, uInv, fS, ps, f, pf, Wg, mg, rate, left: Math.max(0, mg * Wg - (pre[gi] || 0)), x: 0, pre: pre[gi] || 0 };
      });
      /* Précision : les blessures issues de touches critiques peuvent être allouées au personnage rattaché (meneur) */
      let precW = 0; const ld = info.filter((r) => r.g.leader)[0];
      if (ab.precision && ld) {
        precW = Math.min(totW, crits * (lethal ? 1 : pW));
        const x = ld.rate > 0 ? Math.min(precW, ld.left / ld.rate) : precW; ld.x += x; ld.left -= x * ld.rate; rem -= x; ld.prec = x;
      }
      info.forEach((r) => {
        const need = r.rate > 0 ? r.left / r.rate : Infinity; const x = Math.min(rem, need); rem -= x; r.x += x; r.left -= x * r.rate;
      });
      info.forEach((r) => {
        const xn = r.x * a, xm = r.x * (1 - a); const un1 = xn * (1 - r.ps); const dn = Math.min(dAvg, r.Wg); const rawD = (un1 + xm) * dn; const pv = rawD * (1 - r.pf);
        grp.push({ g: r.g, mg: r.mg, Wg: r.Wg, x: r.x, xn, xm, ps: r.ps, fS: r.fS, uInv: r.uInv, f: r.f, pf: r.pf, un1, raw: rawD, pv, kill: pv / r.Wg, full: r.left <= 1e-9, prec: r.prec || 0, pre: r.pre });
        un += un1 + xm; pvs += pv; ks += pv / r.Wg;
      });
      grp.left = rem; unsaved = un - critWounds; dmgTotal = pvs; killsTot = ks; woundsDealt = un * 1;
    }
    res.expected = {
      attacks: N, hits: totalHits, wounds: normalWounds + critWounds, unsaved: unsaved + critWounds,
      damage: dmgTotal, kills: killsTot, mortal: critWounds, woundsDealt, groupPv: grp ? grp.map((r) => r.pv) : null,
    };

    const f1 = (x) => (Math.round(x * 100) / 100).toFixed(2).replace(/\.?0+$/, '');
    const rawDmg = unsaved * effD + critWounds * dAvg;
    const bd = [];
    bd.push(['Attaques', f1(N)]);
    bd.push(['Touches normales (hors critiques)', f1(Math.max(0, hitsBase - crits))]);
    bd.push(['Touches critiques (6 non modifiés)', f1(crits)]);
    if (sustDice) bd.push([`Touches supplémentaires (Touches soutenues ${sustDice.text})`, '+' + f1(extraHits)]);
    bd.push(['Touches totales', f1(totalHits)]);
    if (lethal) bd.push(['Blessures automatiques (Coups fatals)', f1(autoWounds)]);
    bd.push(['Touches à blesser (jet de blessure)', f1(rolledHits)]);
    bd.push(['Blessures obtenues aux dés', f1(woundsFromRolled)]);
    if (dev) bd.push(['… dont critiques → blessures mortelles (Dévastatrices, sans sauvegarde)', f1(critWounds)]);
    bd.push(['Blessures normales à sauvegarder', f1(normalWounds)]);
    if (grp) {
      bd.push(['Allocation des blessures : unité, puis appui, puis meneur', '']);
      grp.forEach((r) => {
        bd.push([`${r.g.name} — ${r.mg} fig. · E${T || '?'} · PV ${r.Wg}`, '']);
        if (r.pre > 0.005) bd.push(['Déjà perdus avant cette arme (PV)', f1(r.pre)]);
        bd.push(['Blessures allouées' + (dev ? ' (normales / mortelles)' : ''), dev ? `${f1(r.x)} (${f1(r.xn)} / ${f1(r.xm)})` : f1(r.x)]);
        if (r.prec > 0.005) bd.push(['… dont allouées par Précision (touches critiques)', f1(r.prec)]);
        bd.push([`Sauvegarde ${r.fS > 6 ? 'impossible' : r.fS + '+'}${r.uInv ? ' (invulnérable)' : ''}`, '−' + f1(r.xn * r.ps) + ' sauvegardées']);
        bd.push(['Non sauvegardées' + (dev ? ' + mortelles' : ''), f1(r.un1 + r.xm)]);
        bd.push(['Dégâts par blessure (plafonné aux PV)', f1(Math.min(dAvg, r.Wg))]);
        bd.push(['Dégâts avant Ignorer la douleur', f1(r.raw)]);
        if (r.f) bd.push([`Ignorer la douleur ${r.f}+ (ignore ${Math.round(r.pf * 100)} %)`, '−' + f1(r.raw * r.pf)]);
        bd.push(['PV perdus / figurines tuées', `${f1(r.pv)} / ${f1(r.kill)}` + (r.full ? ' (groupe détruit)' : '')]);
      });
      if (grp.left > 0.005) bd.push(['Blessures en excès (toute la cible détruite)', f1(grp.left)]);
      bd.push(['PV perdus au total (espérance)', f1(dmgTotal)]);
    } else {
      bd.push(['Sauvegardées par l\'adversaire', '−' + f1(normalWounds * savProb)]);
      bd.push(['Non sauvegardées', f1(unsaved)]);
      if (dev) bd.push(['Blessures mortelles + non sauvegardées', f1(unsaved + critWounds)]);
      bd.push(['Dégâts par blessure', f1(dAvg) + (W && dAvg > W ? ` (plafonné à ${W} sur les blessures normales)` : '')]);
      bd.push(['Dégâts avant Ignorer la douleur', f1(rawDmg)]);
      if (fnp) bd.push([`Ignorer la douleur ${fnp}+ (ignore ${Math.round(pFnp * 100)} %)`, '−' + f1(rawDmg * pFnp)]);
      bd.push(['PV perdus (espérance)', f1(dmgTotal)]);
    }
    res.expected.detail = bd;

    /* — Notes de capacités — */
    if (ab.blast) addNote('Déflagration : le calcul automatique ajoute 1 attaque par tranche de 5 figurines ciblées (règle de la 10e). Vérifie la valeur exacte de la règle 11e.');
    if (ab.hazardous) addNote('Dangereux : après avoir tiré/combattu, teste une arme Dangereux (1 sur D6 = blessures mortelles pour toi).');
    if (ab.precision) addNote('Précision : les touches critiques peuvent être allouées à un Personnage attaché.');
    if (ab.pistol) addNote('Pistolet : peut tirer en étant engagé (sur une unité engagée) mais pas avec d\'autres armes non-Pistolet.');
    if (ab.assault) addNote('Assaut : peut tirer après avoir Avancé.');
    if (ab.extraAttacks) addNote('Attaques supplémentaires : s\'ajoute à tes autres armes, ne les remplace pas.');
    if (ab.indirectFire) addNote('Tir indirect : peut viser une cible non visible ; cible cachée = touche sur 6 non modifié seulement.');
    if (ab.psychic) addNote('Psychique : respecte les règles de Psychique (ex. Périls) si tu les utilises.');
    ab.other.forEach((o) => addNote(`Autre capacité : « ${o} » — vérifie son texte sur la fiche.`));
    return res;
  }

  return { compute, parseAbilities, parseDice, parseSkill, hasKw, norm };
})();
if (typeof module !== 'undefined') module.exports = Engine;
