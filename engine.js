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
    ['rapidFire', /^(?:rapid fire|tir rapide|rafale)\s*(\d*d?\d+)$/],
    ['sustainedHits', /^(?:sustained hits|touches? soutenues?)\s*(\d*d?\d+)$/],
    ['lethalHits', /^(?:lethal hits|coups? fatals?|touches? fatales?|touches? mortelles?)$/],
    ['devastatingWounds', /^(?:devastating wounds|blessures? devastatrices?)$/],
    ['anti', /^anti[- ]?(.+?)\s*(\d)\+$/],
    ['melta', /^(?:melta|fusion)\s*(\d*d?\d+)$/],
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
    ['extraAttacks', /^(?:extra attacks|attaques? supplementaires?)$/],
    ['psychic', /^(?:psychic|psychique)$/],
  ];
  function parseAbilities(str) {
    const out = { other: [] };
    String(str || '').split(/[,;]/).map((x) => norm(x).replace(/[\[\]]/g, '').trim()).filter(Boolean).forEach((tok) => {
      for (const [key, re] of PATTERNS) {
        const m = tok.match(re);
        if (m) {
          if (key === 'anti') out.anti = { kw: m[1].trim(), x: +m[2] };
          else if (m[1] !== undefined) out[key] = parseDice(m[1]);
          else out[key] = true;
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
    const aBase = parseDice(w.A);
    const parts = [{ label: 'Attaques de base', dice: aBase }];
    if (!melee && ab.rapidFire && s.halfRange) parts.push({ label: `Tir rapide ${ab.rapidFire.text} (mi-portée)`, dice: ab.rapidFire });
    if (!melee && ab.blast && t.models >= 5) {
      const b = Math.floor(t.models / 5);
      parts.push({ label: `Explosion (${t.models} figs ciblées)`, dice: parseDice(String(b)) });
    }
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
      const cover = !melee && (t.inCover || t.stealth);
      if (cover) {
        if (ab.ignoresCover) addNote('Ignore le couvert : le malus −1 CT du couvert (et de Furtivité) ne s\'applique pas.');
        else hitMods.push({ label: t.inCover ? 'Cible à couvert' : 'Cible Furtive (= couvert)', v: -1 });
      }
      if (ab.indirectFire && !melee) hitMods.push({ label: 'Tir indirect', v: -1 });
      if (m.hit) hitMods.push({ label: 'Autres modificateurs (règles/stratagèmes)', v: m.hit });
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
    const lethal = !!ab.lethalHits || !!m.lethal;
    const sustDice = ab.sustainedHits || (m.sust ? parseDice(String(m.sust)) : null);
    const hitsBase = N * hitEff;
    const crits = N * critEff;
    const extraHits = sustDice ? crits * sustDice.avg : 0;
    const autoWounds = lethal ? crits : 0;
    const totalHits = hitsBase + extraHits;
    const rolledHits = totalHits - autoWounds;
    if (!torrent) {
      const hs = res.steps[res.steps.length - 1];
      if (lethal) hs.details.push('Coups fatals : chaque touche critique (6 non modifié) blesse automatiquement.');
      if (sustDice) hs.details.push(`Touches soutenues ${sustDice.text} : chaque critique ajoute ${sustDice.text} touche(s).`);
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
    let critW = 6, antiOn = false;
    if (ab.anti && hasKw(t.kw, ab.anti.kw)) { critW = ab.anti.x; antiOn = true; }
    else if (m.anti && hasKw(t.kw, m.anti.kw || '')) { critW = m.anti.x; antiOn = true; }
    let pW = Math.max(pRoll(reqW), antiOn ? (7 - critW) / 6 : 0);
    let pCW = (7 - critW) / 6;
    let rrW = m.rrWound || 'none';
    if (ab.twinLinked && rrW === 'none') rrW = 'all';
    if (rrW === 'all') { pCW = pCW + (1 - pW) * pCW; pW = pW + (1 - pW) * pW; }
    else if (rrW === 'ones') { pCW = pCW + (1 / 6) * pCW; pW = pW + (1 / 6) * pW; }
    const dev = !!ab.devastatingWounds || !!m.dev;
    const wDetails = [`Force ${S} contre Endurance ${T || '?'}`];
    if (antiOn) wDetails.push(`Anti-${ab.anti ? ab.anti.kw : m.anti.kw} ${critW}+ : blessure critique (réussite auto) sur ${critW}+ non modifié.`);
    if (dev) wDetails.push('Blessures dévastatrices : chaque blessure critique inflige des blessures mortelles (dégâts de l\'arme), sans sauvegarde.');
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
    const unsaved = normalWounds * (1 - savProb);

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
    const woundsDealt = (unsaved + critWounds) * (1 - pFnp);
    const dmgTotal = (unsaved * effD + critWounds * dAvg) * (1 - pFnp);
    res.expected = {
      attacks: N, hits: totalHits, wounds: normalWounds + critWounds, unsaved: unsaved + critWounds,
      damage: dmgTotal, kills: W ? dmgTotal / W : null, mortal: critWounds, woundsDealt,
    };

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
