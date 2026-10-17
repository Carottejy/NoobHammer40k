/* Lecture des effets de règles / stratagèmes (texte français ALN) -> modificateurs pour le moteur.
   Tout ce qui n'est pas reconnu reste affiché comme rappel, jamais deviné. */
const Effects = (() => {
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
  const fold = (s) => String(s).replace(/[\s\S]/g, (ch) => { const f = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); return f.length === 1 ? f : ch.toLowerCase(); }).replace(/[’‘]/g, "'");
  const num = (s) => parseInt(String(s).replace(/[−–]/g, '-').replace(/\s/g, ''), 10);

  /* ---------- Vocabulaire ---------- */
  const KW_LIST = 'gravis|infanterie|vehicules?|monstres?|personnages?|terminator|tacticus|phobos|volant|bete|nuee|titanesque|titanic|psyker|walker|fortification|aeronef';
  const KW_ID = { infanterie: 'infantry', vehicule: 'vehicle', monstre: 'monster', personnage: 'character', volant: 'fly', bete: 'beast', nuee: 'swarm', titanesque: 'titanic', aeronef: 'aircraft' };
  const kwId = (k) => { const x = String(k).trim(); const y = x.replace(/s$/, ''); return KW_ID[x] || KW_ID[y] || x; };
  const parseKws = (s) => [...String(s).matchAll(new RegExp('\\b(' + KW_LIST + ')\\b', 'g'))].map((m) => kwId(m[1]));
  const cap = (s) => { s = String(s || '').trim(); return s.charAt(0).toUpperCase() + s.slice(1); };
  const KWFR = { infantry: 'infanterie', vehicle: 'véhicule', monster: 'monstre', character: 'personnage', fly: 'volant', beast: 'bête', swarm: 'nuée', titanic: 'titanesque', aircraft: 'aéronef' };
  const kwFr = (k) => String(KWFR[k] || k).toUpperCase();

  /* ---------- Conditions ---------- */
  const SVT_OP = { gt: '>', ge: '≥', lt: '<', le: '≤', eq: '=' };
  function svtCond(t) {
    let m = t.match(/\bforce\b[^,.;]{0,40}?\best\s+(superieure|inferieure|egale)(?:\s+ou\s+(egale|inferieure|superieure))?\s+a\s+(.{0,60})/);
    if (!m) m = t.match(/\bune f\s+(superieure|inferieure|egale)(?:\s+ou\s+(egale|inferieure|superieure))?\s+a\s+(.{0,40})/);
    if (!m || !/endurance|\bl'e\b/.test(m[3])) return null;
    const a = m[1], b = m[2];
    const op = !b ? ({ superieure: 'gt', inferieure: 'lt', egale: 'eq' })[a] : (/superieure/.test(a + b) ? 'ge' : 'le');
    return { t: 'svt', op, label: 'Force ' + SVT_OP[op] + ' Endurance' };
  }
  /* conditions que l'appli sait vérifier (role : 'self' = l'unité qui joue, 'target' = la cible) */
  function modelCond(t, role) {
    const out = [];
    if (role === 'self') t = t.replace(/\([^)]*\)/g, ' ');
    if (/mouvement normal/.test(t)) out.push({ t: 'moved_normal' });
    if (/mouvement d'arrivee/.test(t)) out.push({ t: 'setUp' });
    if (/\b(a charge|mouvement de charge)\b/.test(t) && !/impact/.test(t)) out.push({ t: 'charged' });
    if (/unite[^.]{0,30}\bengagee\b/.test(t)) out.push({ t: 'engaged' });
    if (/a demi-portee|a la moitie de (?:la |leur )?portee/.test(t)) out.push({ t: 'sit', key: 'halfRange', label: 'À mi-portée' });
    if (/\bcachee?s?\b|non visible/.test(t)) out.push({ t: 'sit', key: 'hiddenTarget', label: 'Cible cachée / non visible' });
    const sv = svtCond(t); if (sv) out.push(sv);
    const fm = t.match(/faction d'armee est ([a-z' \-]+?)\s*(?:[,.;:]|$)/);
    if (fm) out.push({ t: 'army_faction', kw: fm[1].trim() });
    const dm = t.match(/doctrine (d'assaut|assaut|tactique|de devastation|devastation) (?:est|sont) active/);
    if (dm) out.push({ t: 'doctrine', d: dm[1].replace(/^d'|^de /, '') });
    const tgt = role === 'target' || (role !== 'self' && /cibl|ennemie|adverse/.test(t));
    if (tgt) {
      const neg = []; let rest = t;
      const KWG = '(?:' + KW_LIST + ')'; const KWL = KWG + '(?:\\s*(?:\\/|,|ou|et)\\s*' + KWG + ')*';
      for (const mm of t.matchAll(/non-?\s*(monstres?|vehicules?|infanterie|personnages?|volant|psyker|titanesque|walker)\b/g)) neg.push(kwId(mm[1]));
      rest = rest.replace(/non-?\s*(?:monstres?|vehicules?|infanterie|personnages?|volant|psyker|titanesque|walker)\b/g, ' ');
      for (const mm of rest.matchAll(new RegExp("n'est pas (?:un |une |des )?(?:unite )?(" + KWL + ')', 'g'))) { neg.push(...parseKws(mm[1])); rest = rest.replace(mm[0], ' '); }
      const ex = rest.match(/a l'exclusion des?\s+([^)]*)/);
      if (ex) { neg.push(...parseKws(ex[1])); rest = rest.replace(ex[0], ' '); }
      const pos = parseKws(rest);
      if (neg.length) out.push({ t: 'target_not', kws: [...new Set(neg)] });
      if (pos.length) out.push({ t: 'target_is', kws: [...new Set(pos)] });
    }
    if (!tgt || role === 'any') {
      const uk = t.match(new RegExp('unites? (?:de |d\'|du )?(?:l\')?(' + KW_LIST + ')\\b'));
      if (uk && !tgt) out.push({ t: 'unit_kw', kw: kwId(uk[1]) });
      const um = t.match(/(?:votre unite est|c'est|si c'est) (?:une |un )?unites? ([a-z' \-]+?)\s*(?:[,.;:]|\bet\b|$)/) || t.match(/votre unite (?:a|possede) le mot-cle ([a-z' \-]+?)\s*(?:[,.;:]|\bet\b|$)/);
      if (um && !(uk && !tgt)) {
        const names = um[1].split(/\s*(?:\bou\b|\/|,)\s*/).map((x) => x.trim()).filter(Boolean);
        const isKw = new RegExp('^(?:' + KW_LIST + ')$');
        if (names.length && names.every((x) => isKw.test(x))) out.push({ t: 'unit_kw', kw: kwId(names[0]), kws: names.map(kwId) });
        else if (names.length) out.push({ t: 'unit_is', names });
      }
    }
    return out;
  }
  const trivialObj = (o) => !/\b(?:a|dans) (?:\d+|plus de)|portee|sous (?:son|la|l')|en choc|qui (?:est|n'est|sont|contient|a|ont)\b|visible|eligible|cachee/.test(o) || /^son unite \w+ee$/.test(o.trim());

  /* toutes les conditions d'une phrase (modélisées si possible, sinon rappel à confirmer) */
  function clauseConds(tc, oc, chosenEnemy) {
    const out = [], seen = new Set();
    const add = (c) => { const k = c.t === 'manual' ? 'm|' + c.label : JSON.stringify([c.t, c.kw, c.kws, c.key, c.op, c.names, c.d]); if (!seen.has(k)) { seen.add(k); out.push(c); } };
    const lab = (idx, len) => cap(oc.slice(idx, idx + len).replace(/\s+/g, ' ').replace(/[\s,.;:]+$/, '').replace(/\s+(?:peuvent|peut|ont|doivent)$/i, '').replace(/\)+$/, ''));
    if (/choisissez l'une des|choisissez une des|choisissez un des|choisissez l'un des/.test(tc)) add({ t: 'manual', label: 'Option / posture choisie' });
    else if (/choisissez (?:une|1|l'|cette) ?unite ennemie/.test(tc)) add({ t: 'manual', soft: true, label: 'Cible = unité ennemie choisie' });
    else if (/choisissez/.test(tc)) add({ t: 'manual', label: 'Choix à confirmer' });
    if (chosenEnemy && !/choisissez/.test(tc) && /cibl\w*\s+cette unite|cette unite ennemie/.test(tc)) add({ t: 'manual', soft: true, label: 'Cible = unité ennemie choisie' });
    const sv = svtCond(tc); if (sv) add(sv);
    const tcp = tc.replace(/\([^)]*\)/g, (x) => ' '.repeat(x.length));
    let m;
    const phrases = [];
    const rs = /\b(si|s'il|tant qu'|tant que)\s*([^,.;:]+)/g;
    while ((m = rs.exec(tcp))) {
      phrases.push(m[2]);
      let mc = modelCond(m[2], 'any');
      const st = m[2].match(/^une? unite est (\w+)\s*$/);
      if (st) { const w = oc.slice(m.index + m[0].length - st[1].length, m.index + m[0].length); add({ t: 'manual', soft: true, label: 'Unité visée : ' + w.replace(/\s+$/, '') }); continue; }
      if (mc.length && /\bou\s+(?:en |a |sous |qui |dans )/.test(m[2])) mc = [];
      if (mc.length) mc.forEach(add); else add({ t: 'manual', label: lab(m.index, m[0].length) });
    }
    const rt = /\bcibl(?:e|ent|er|ant|ees?)\s+([^,.;:]+)/g;
    while ((m = rt.exec(tcp))) {
      const obj = m[1].replace(/\s(?:ont|peuvent|peut|doivent|ayant)\b[\s\S]*$/, '').trim();
      if (/^(?:votre|cette|ses|sa|leur)\b/.test(obj) && !/^cette unite ennemie/.test(obj)) continue;
      if (phrases.some((p) => p.includes(obj) || obj.includes(p))) continue;
      let mc = modelCond(obj, 'target');
      if (mc.some((c) => c.t === 'target_is' || c.t === 'target_not') && /\bou\s+(?:en |a |sous |qui |dans )/.test(obj)) { mc = []; add({ t: 'manual', label: 'Cible : ' + lab(m.index + m[0].indexOf(obj), obj.length) }); continue; }
      mc.forEach(add);
      const consumed = mc.some((c) => ['target_is', 'target_not'].includes(c.t)) ? 1 : 0;
      const hasSit = mc.some((c) => ['sit', 'svt', 'engaged'].includes(c.t));
      if (!trivialObj(obj) && !hasSit) add({ t: 'manual', label: 'Cible : ' + lab(m.index + m[0].indexOf(obj), obj.length) });
      else if (!trivialObj(obj) && hasSit) { /* déjà modélisé */ }
    }
    const wm = tcp.match(/\bavec (?:des |les )?armes? (?!a distance|de tir|de melee)([^,.;:]+?)(?=\s+(?:ont|peuvent|peut)\b|[,.;:]|$)/);
    if (wm) add({ t: 'manual', label: 'Armes : ' + lab(wm.index + wm[0].indexOf(wm[1]), wm[1].length) });
    const rj = /\bsur (?:un (?:jet|resultat)|une? (?:blessure|touche) critique)[^,.;:]*/g;
    while ((m = rj.exec(tcp))) add({ t: 'manual', label: lab(m.index, m[0].length) });
    const fg = tc.match(/figurines? ([a-z' \-]{3,40}?)(?: de (?:votre|l') ?(?:unite|armee))? effectue(?:nt)? une attaque/);
    if (fg) { const nm = fg[1].replace(/\s+amies?$/, '').trim(); if (nm.length >= 3 && !/^(?:de |ennemie|amie|elle|cette|une|chaque|la\b)/.test(nm) && !/ennemie|\bunite\b/.test(nm)) add({ t: 'manual', soft: true, label: 'Figurines ' + nm.toUpperCase() + ' seulement' }); }
    return out;
  }
  /* conditions globales issues du QUAND / CIBLE d'un stratagème (elles décrivent l'unité qui joue) */
  function condsFromText(t, label) {
    const out = modelCond(t, 'self').filter((c) => !['target_is', 'target_not', 'unit_kw', 'unit_is'].includes(c.t));
    if (/choisissez l'une des|choisissez une des|choisissez un des|choisissez l'un des/.test(t)) out.push({ t: 'manual', label: 'Option / posture choisie' });
    else if (/choisissez (?:une|1|l'|cette) ?unite ennemie/.test(t)) out.push({ t: 'manual', soft: true, label: 'Cible = unité ennemie choisie' });
    else if (/choisissez/.test(t)) out.push({ t: 'manual', label: 'Choix à confirmer' });
    if (!out.length && label) out.push({ t: 'manual', label });
    return out;
  }
  const qualifier = (tail) => {
    const m = tail.match(/^\]?\s*:?\s*non-?\s*([a-z\/ ]+?)\s*(?:[\]\.,;]|$)/);
    if (m) { const kws = m[1].split(/\s*\/\s*/).map((x) => kwId(x.trim())).filter(Boolean); return kws.length ? { t: 'target_not', kws } : null; }
    const p = tail.match(/^\s*:\s*([a-z][a-z\/ ]*?)\s*[\]\.,;]/);
    if (!p) return null;
    const kws = p[1].split(/\s*\/\s*/).map((x) => kwId(x.trim())).filter(Boolean);
    return kws.length ? { t: 'target_is', kws } : null;
  };
  const sustAvg = (x) => { const m = String(x).toLowerCase().match(/^(\d*)d(\d+)(?:\+(\d+))?$/); return m ? (m[1] ? +m[1] : 1) * (+m[2] + 1) / 2 + (m[3] ? +m[3] : 0) : (parseInt(x, 10) || 0); };

  /* ---------- Filtres d'armes ---------- */
  const WKEY = { 'blessures devastatrices': 'devastatingWounds', 'touches letales': 'lethalHits', 'touches soutenues': 'sustainedHits', 'combat rapproche': 'pistol', 'tir indirect': 'indirectFire', 'un seul tir': 'oneShot', 'one shot': 'oneShot', 'tir rapide': 'rapidFire', torrent: 'torrent', fusion: 'melta', melta: 'melta', psychiques: 'psychic', psychique: 'psychic', pistolet: 'pistol', lourd: 'heavy', assaut: 'assault', blast: 'blast', explosion: 'blast', deflagration: 'blast', precision: 'precision', lance: 'lance', jumele: 'twinLinked', dangereux: 'hazardous' };
  const WLAB = { devastatingWounds: 'Blessures dévastatrices', lethalHits: 'Touches létales', sustainedHits: 'Touches soutenues', pistol: 'Combat rapproché', indirectFire: 'Tir indirect', oneShot: 'Un seul tir', rapidFire: 'Tir rapide', torrent: 'Torrent', melta: 'Fusion', psychic: 'Psychique', heavy: 'Lourd', assault: 'Assaut', blast: 'Explosion', precision: 'Précision', lance: 'Lance', twinLinked: 'Jumelé', hazardous: 'Dangereux' };
  const WKRE = Object.keys(WKEY).sort((a, b) => b.length - a.length).join('|');
  const keysIn = (s) => { const out = []; for (const m of String(s).matchAll(new RegExp('\\b(' + WKRE + ')(?![a-z\\-])', 'g'))) out.push(WKEY[m[1]]); return [...new Set(out)]; };
  function weaponReqOf(t) {
    const re = new RegExp('(?:armes?|attaques?)(?: de tir| de melee| a distance| equipees?)?\\s+(?:a |avec (?:la |les )?(?:capacites? )?)?\\[?(' + WKRE + ')(?![a-z\\-])(?: \\d+)?\\]?(?:\\s*(?:/|ou)\\s*\\[?(' + WKRE + ')(?![a-z\\-])\\]?)?', 'g');
    const out = []; let m;
    while ((m = re.exec(t))) { out.push(WKEY[m[1]]); if (m[2]) out.push(WKEY[m[2]]); }
    return [...new Set(out)];
  }
  const GEN_START = /^(?:(?:armes?|attaques?|figurines?|unites?|modeles?|de|du|des|a distance|equipe\w*|votre|cette|leur|toutes?|tous|chaque|ses|vos|la|le|les|un|une|ce|ces|elles?|ils?|eux|celles?|ceux|qui|que|dont|et|ou|ont|a)(?![a-z0-9])|d'|l')/;
  const GEN_WORD = /\b(?:distance|melee|tir|unite|unites|votre|cette|figurine|figurines|arme|armes|attaque|attaques|ennemie|equipe|equipee|equipees|equipes|phase|capacite|capacites|caracteristique|chaque|jet|jets|touche|blessure|force|degats|choisie|choisies|ci-dessus|suivante|suivantes|vous|pouvez|si|ce|ces|est|sont|jusqu|debut|fin|fois|qu|peut|peuvent|doit|apres|avant|lors|pendant|tant|que|pour|dans|sur|avec|sans|test|raté|rate)\b/;
  function cleanNames(list) {
    const out = [];
    String(list).split(/\s*,\s*|\s+et\s+/).forEach((x0) => {
      let x = x0.trim().replace(/^(?:armes?|attaques?)\s+/, '').replace(/\s+(?:qui|que|dont|ont|a)$/, '').trim();
      if (x.length < 3 || GEN_START.test(x) || GEN_WORD.test(x) || /^[0-9\W]+$/.test(x)) return;
      if (WKEY[x]) return;
      out.push(x);
    });
    return out;
  }
  function weaponNamesOf(t) {
    const names = [];
    const anchors = /\s(?:equipee?s?\s+par\b|de (?:votre|cette) unite|de l'unite|ont\b)/g; let m;
    while ((m = anchors.exec(t))) {
      const pre = t.slice(Math.max(0, m.index - 160), m.index);
      const cut = Math.max(pre.lastIndexOf(' les '), pre.lastIndexOf(' des '), pre.lastIndexOf(' armes '), pre.lastIndexOf(' arme '), pre.lastIndexOf(' ces '), pre.lastIndexOf(' tous les '), pre.lastIndexOf(': '), pre.lastIndexOf('. '), pre.lastIndexOf('• '));
      let cand = (cut >= 0 ? pre.slice(cut).replace(/^(?: les | des | armes | arme | ces | tous les |: |\. |• )/, '') : pre.replace(/^(?:les |des |armes? |tous les )/, '')).trim();
      cand = cand.replace(/^(?:les |des |armes? )+/, '');
      if (cand) names.push(...cleanNames(cand));
    }
    return [...new Set(names)];
  }
  /* « (à l'exclusion des … ) » : armes exclues ou cibles exclues */
  function exclusions(tc) {
    const w = { keys: [], names: [] }; const tNot = [], mEx = []; let m;
    const re = /\(\s*a l'exclusion (?:des?|d')\s*([^)]*)\)/g;
    while ((m = re.exec(tc))) {
      const body = m[1];
      const ks = keysIn(body);
      if (/\barmes?\b|\battaques?\b|\[/.test(body) || ks.length) { w.keys.push(...ks); const rest = body.replace(/\b(?:armes?|attaques?)\b/g, ' ').replace(new RegExp('\\[?(?:' + WKRE + ')(?![a-z\\-])(?: \\d+)?\\]?', 'g'), ' ').replace(/[\[\]]/g, ' ').trim(); if (rest) w.names.push(...cleanNames(rest)); }
      else if (parseKws(body).length) { if (/figurines?\s*$/.test(tc.slice(Math.max(0, m.index - 25), m.index))) mEx.push(...parseKws(body)); else tNot.push(...parseKws(body)); }
      else w.names.push(...cleanNames(body));
    }
    return { w: { keys: [...new Set(w.keys)], names: [...new Set(w.names)] }, tNot: [...new Set(tNot)], mEx: [...new Set(mEx)] };
  }

  /* ---------- Bonus de caractéristiques (« +1 en A et en F », « ajoutez 1 aux caractéristiques d'Attaques et de Force ») ---------- */
  const STATW = { a: 'extraA', f: 'strength', pa: 'apImp', d: 'dmg', ct: 'hit', cc: 'hit' };
  function statGrants(t) {
    const out = [];
    const ST = "(?:pa|ct|cc|f|d(?![a-z0-9'])|a(?=\\s*(?:$|[.,;:•)\\]]|\\bet\\b|\\bde\\b|\\bdes\\b|\\bdu\\b|\\baux?\\b|\\bpour\\b|\\bjusqu)))(?![a-z0-9])";
    const sh = new RegExp("([+\\-−]\\s?\\d)\\s*(?:(?:en|aux?)\\s+)?(" + ST + ")((?:\\s*(?:,|et)\\s*(?:en\\s+)?" + ST + ")*)", 'g');
    let m;
    while ((m = sh.exec(t))) {
      if (/d\d$/.test(t.slice(Math.max(0, m.index - 2), m.index))) continue;
      const n = num(m[1]); const mods = {};
      [m[2], ...(m[3].match(/(?:^|[\s,])(pa|ct|cc|f|d|a)(?![a-z0-9'])/g) || []).map((x) => x.replace(/^[\s,]+/, ''))].forEach((k) => { mods[STATW[k]] = (mods[STATW[k]] || 0) + n; });
      out.push({ idx: m.index, mods });
    }
    const jt = /([+\-−]\s?\d)\s*aux jets de (touche|blessure)(?:\s*(?:,|et)\s*(?:aux jets de |de |les jets de )?(touche|blessure))?/g;
    while ((m = jt.exec(t))) {
      const n = num(m[1]); const mods = {};
      [m[2], m[3]].filter(Boolean).forEach((k) => { mods[k === 'touche' ? 'hit' : 'wound'] = n; });
      out.push({ idx: m.index, mods });
    }
    const jp = /([+\-−]\s?\d)\s*pour (toucher|blesser)(?:\s*(?:,|et)\s*(?:pour )?(toucher|blesser))?/g;
    while ((m = jp.exec(t))) {
      const n = num(m[1]); const mods = {};
      [m[2], m[3]].filter(Boolean).forEach((k) => { mods[k === 'toucher' ? 'hit' : 'wound'] = n; });
      out.push({ idx: m.index, mods });
    }
    const ja = /ajoutez (\d) aux jets de (touche|blessure)(?:\s*(?:,|et)\s*(?:aux jets de |de |les jets de )?(touche|blessure))?/g;
    while ((m = ja.exec(t))) {
      const mods = {};
      [m[2], m[3]].filter(Boolean).forEach((k) => { mods[k === 'touche' ? 'hit' : 'wound'] = +m[1]; });
      out.push({ idx: m.index, mods });
    }
    const lg = /(ajoutez(?: aussi)?|ameliorez(?: aussi)? de)(?: a la place)? (\d) (?:a |aux? |au )?(?:la |les |sa |leur )?caracteristiques? /g;
    while ((m = lg.exec(t))) {
      const n = +m[2]; const seg = t.slice(lg.lastIndex, lg.lastIndex + 100);
      const stop = seg.search(/\b(?:des|du)\b|\bde (?:votre|cette|ce|chaque|ses|la|l')|\bequipe|[.;:]/);
      const part = stop >= 0 ? seg.slice(0, stop) : seg; const mods = {};
      if (/attaques?/.test(part)) mods.extraA = n;
      if (/\bforce\b/.test(part)) mods.strength = n;
      if (/degats/.test(part)) mods.dmg = n;
      if (/penetration|\bpa\b/.test(part)) mods.apImp = n;
      if (/^ameliorez/.test(m[1]) && /capacite de (?:tir|combat)|\bct\b|\bcc\b/.test(part)) mods.hit = n;
      if (Object.keys(mods).length) out.push({ idx: m.index, mods, repl: /a la place/.test(m[0]) });
    }
    return out;
  }

  /* ---------- Jetons d'effet ---------- */
  const rrOf = (k) => (k === 'touche' ? 'rrHit' : k === 'blessure' ? 'rrWound' : 'rrDmg');
  const TOKENS = [
    [/(ajoutez(?: aussi)?|soustrayez) (\d) au jet de (touche|blessure)(?: et (\d) au jet de (touche|blessure))?/g, (m) => { const sgn = /^ajoutez/.test(m[1]) ? 1 : -1; const o = {}; o[m[3] === 'touche' ? 'hit' : 'wound'] = sgn * +m[2]; if (m[5]) o[m[5] === 'touche' ? 'hit' : 'wound'] = sgn * +m[4]; return o; }],
    [/\bforce\s*([+\-−]\s?\d)/g, (m) => ({ strength: num(m[1]) })],
    [/relanc\w+ (?:tous )?les jets de (touche|blessure|degats)(?: de (1)( et 2)?)?(?:\s+et\s+(?:les\s+)?(?:jets\s+)?(?:de\s+)?(touche|blessure|degats)(?: de (1)( et 2)?)?)?/g, (m) => {
      const o = {}; const val = (k, one) => (k === 'degats' ? true : one ? 'ones' : 'all');
      const k1 = m[1], k2 = m[4], one1 = !!m[2], one2 = !!m[5];
      if (k2) { o[rrOf(k1)] = val(k1, one1 || (!m[2] && one2)); o[rrOf(k2)] = val(k2, one2); } else o[rrOf(k1)] = val(k1, one1);
      if (m[3] || m[6]) o.approx = ['relance des 1 et 2 : seule la relance des 1 est comptée'];
      return o;
    }],
    [/touches? (?:fatales?|letales?)|coups? fatals?/g, () => ({ lethal: true }), true],
    [/blessures? devastatrices?/g, () => ({ dev: true }), true],
    [/touches? soutenues? (d?\d)/g, (m) => ({ sust: /d/.test(m[1]) ? m[1].toUpperCase() : +m[1] }), true],
    [/\[assaut\]|aptitude assaut/g, () => ({ addAbil: ['assault'] })],
    [/\[ignore le couvert\]/g, () => ({ addAbil: ['ignoresCover'] })],
    [/(?:n'ont pas|perdent la capacite|perd la capacite) \[?lourd/g, () => ({ removeAbil: ['heavy'] })],
    [/(?:n'ont pas|perdent la capacite|perd la capacite) \[?(?:deflagration|blast|explosion)/g, () => ({ removeAbil: ['blast'] })],
    [/ne peut pas beneficier du couvert|ne beneficie(?:nt)? pas du couvert/g, () => ({ noCover: true })],
    [/(?:unites?|figurines?) ennemies? beneficient du couvert contre cette attaque/g, () => ({ forceCover: true })],
    [/anti[- ](non-)?([a-z\/]+) (\d)\+/g, (m) => ({ antis: [{ kw: (m[1] ? 'non-' : '') + kwId(m[2].split('/')[0]), x: +m[3] }] })],
  ];
  /* le jeton est-il une capacité accordée (et non un simple filtre : « avec la capacité [X] », « n'ont pas », exclusions) ? */
  const NOT_GRANT = /(?:avec (?:la |les )?(?:capacites? )?|possede(?:nt)? |a deja (?:la )?(?:capacite )?|n'ont pas |n'a pas |sans |non-?)\[?\s*$/;

  function scopeRaw(t) {
    const rng = /attaques? de tir|armes? de tir|attaques? a distance|armes? a distance|phase de tir|\btir\b(?! rapide)|tirer/.test(t), mel = /attaques? de melee|armes? de melee|phase de combat|combattre/.test(t);
    if (rng && !mel) return 'ranged';
    if (mel && !rng) return 'melee';
    return null;
  }
  const scopeOf = (t, hint) => scopeRaw(t) || hint || 'both';

  /* Découpe en phrases (une puce = une phrase qui hérite de l'introduction de la liste) */
  function clausesOf(o) {
    const SUB_A = /,\s*(?:et|mais|puis)\s+(?=si\b|jusqu['’][aà]|chaque fois|tant que|la caract|les caract|d[ée]pensez|vous pouvez)/i;
    const SUB_B = /,\s*ou\s+(?=la capacit[ée]\s*\[|d[ée]pensez|si\b)/i;
    const sent = (s0) => s0.replace(/([.!?])\s+(?=[A-ZÉÈÀÂÎÔÛ\[])/g, '$1\u0001').split('\u0001').flatMap((x) => {
      const parts = x.split(SUB_A).flatMap((y) => y.split(SUB_B));
      return parts.map((y, i) => ({ text: y.trim(), cont: i > 0 })).filter((y) => y.text);
    });
    const parts = o.split(/\s*•\s*/);
    if (parts.length === 1) return sent(o).map((c) => ({ text: c.text, lead: '', cont: c.cont }));
    const lead = sent(parts[0]); const intro = lead.length ? lead[lead.length - 1].text : parts[0];
    const out = lead.map((c) => ({ text: c.text, lead: '', cont: c.cont }));
    parts.slice(1).forEach((b) => sent(b).forEach((c) => out.push({ text: c.text, lead: intro, cont: c.cont })));
    return out;
  }

  /* Un segment = une alternative (séparée par « Ou : »). Retourne des items (un par jeu de filtres et de conditions). */
  function parseSegment(seg, opts = {}) {
    const o0 = String(seg || '').replace(/\s+/g, ' ').trim();
    let o = o0, lead = [];
    const lm = fold(o).match(/^\s*si\s+([^,]+),\s*/);
    if (lm) { const phr = o.slice(lm.index + lm[0].indexOf(lm[1]), lm.index + lm[0].indexOf(lm[1]) + lm[1].length).trim(); lead = modelCond(lm[1], 'any'); if (!lead.length) lead = [{ t: 'manual', label: 'Si ' + phr }]; o = o.slice(lm[0].length); }
    const tAll = fold(o);
    const chosenEnemy = /choisissez (?:une |1 )?unite\b|cette unite ennemie|chaque unite ennemie|tant qu'une unite est (?:neutralisee|etourdie|assommee|poursuivie|marquee|haie|reperee|affligee)/.test(tAll);
    const segScope = scopeOf(tAll, opts.scope);
    const selfConds = opts.condText ? condsFromText(norm(opts.condText), null) : [];
    const DEF_BASE = "cibl\\w*\\s+(?:une |un |la )?(?:figurine\\s+(?:\\w+\\s+)?de\\s+)?(?:votre|WHO) unite|allouees? a (?:votre|WHO) unite|figurines? ennemies? effectue|(?:attaques?|armes?|figurines?)[^.:;]{0,50}(?:de|par les figurines de) (?:cette|l') ?unite (?:ennemie|attaquante)|ennemie effectue|tant qu'une unite[^.]*?figurines? de cette unite effectue une attaque(?! contre)";
    const DEF = new RegExp(DEF_BASE.replace(/WHO/g, chosenEnemy ? 'votre' : '(?:votre|cette)') + (chosenEnemy ? '|figurines? (?:de cette unite|de celle-ci) effectue une attaque(?! contre)|attaques? (?:\\w+ )?de cette unite ont' : '|cibl\\w*\\s+cette unite'));
    const groups = new Map();
    let carry = { scope: null, req: null, names: null };
    const lastVal = {};
    clausesOf(o).forEach((c) => {
      const oc = (c.lead ? c.lead + ' ' : '') + c.text, tc = fold(oc);
      const ownLen = c.text.length, offs = tc.length - ownLen;
      const tcs = tc.replace(/\([^)]*\)/g, (x) => ' '.repeat(x.length));     // sans les parenthèses d'exclusion
      const ex = exclusions(tc);
      const own = scopeRaw(fold(c.text)) || (c.lead ? scopeRaw(fold(c.lead)) : null);
      const ana = !!c.cont || /\bces armes?\b|cette arme|telle arme|ces attaques|cette attaque|\belles\b/.test(tc);
      const scope = own || (ana && carry.scope) || segScope;
      if (own) carry.scope = own;
      let req = weaponReqOf(tcs), names = weaponNamesOf(tcs);
      if (req.length || names.length) { carry.req = req; carry.names = names; } else if (ana) { req = carry.req || []; names = carry.names || []; }
      const conds = [...lead, ...clauseConds(tc, oc, chosenEnemy)];
      if (ex.tNot.length) conds.push({ t: 'target_not', kws: ex.tNot });
      if (ex.mEx.length) conds.push({ t: 'manual', soft: true, label: 'Figurines hors ' + ex.mEx.map((k) => kwFr(k)).join('/') });
      const found = [];
      TOKENS.forEach(([re, fn, wantsQual]) => {
        re.lastIndex = 0; let m;
        while ((m = re.exec(tcs))) {
          if (m.index < offs) continue;
          if (NOT_GRANT.test(tcs.slice(Math.max(0, m.index - 45), m.index))) continue;
          const mods = fn(m); const cc = [];
          if (wantsQual) { const q = qualifier(tcs.slice(m.index + m[0].length, m.index + m[0].length + 120)); if (q) cc.push(q); }
          const before = tcs.slice(0, m.index);
          found.push({ idx: m.index, mods, conds: cc, side: DEF.test(before) || mods.forceCover ? 'def' : 'att' });
        }
      });
      statGrants(tcs).forEach((g) => { if (g.idx >= offs) found.push({ idx: g.idx, replFlag: g.repl, mods: g.mods, conds: [], side: DEF.test(tcs.slice(0, g.idx)) ? 'def' : 'att' }); });
      /* capacités d'arme accordées : « ont [TORRENT] », « ont la capacité [JUMELÉ] »… (hors celles déjà lues ci-dessus) */
      if (typeof Engine !== 'undefined' && !/choisi\w* l'une des|l'une des capacites/.test(tcs)) {
        const HANDLED = /^(touches? (fatales?|letales?)|coups? fatals?|blessures? devastatrices?|touches? soutenues?|anti[- ]|assaut|ignore le couvert|aptitude assaut)/;
        const re = /\[([^\]]+)\]/g; let m;
        while ((m = re.exec(tcs))) {
          if (m.index < offs) continue;
          const tok = m[1].trim(); if (HANDLED.test(tok)) continue;
          const pre = ((c.lead ? fold(c.lead) + ' ' : '') + tcs.slice(offs, m.index)).slice(-80);
          if (/armes? (?:de tir |de melee |a distance )?a $|equipees? de $|ayant $|avec (?:la |les )?(?:capacites? )?$/.test(pre) || NOT_GRANT.test(pre)) continue;
          if (!/(?:\bont|\ba|gagnent|obtiennent|possedent|(?:ou|et) la capacites?|(?:ou|et) les capacites|(?:pa|f|a|d)\s*(?:,|et))\s*(?:(?:la capacite|les capacites|aussi|egalement)\s*)*:?\s*[•\-]?\s*(?:\[[^\]]+\]\s*(?:,|et|;)?\s*)*$/.test(pre)) continue;
          const parsed = Engine.parseAbilities(tok); const keys = Object.keys(parsed).filter((k) => k !== 'other' && k !== 'qual');
          if (!keys.length || keys.every((k) => ['lethalHits', 'devastatingWounds', 'sustainedHits', 'anti', 'antis', 'assault', 'ignoresCover'].includes(k))) continue;
          const side = DEF.test(pre) || DEF.test(tcs.slice(0, m.index)) ? 'def' : 'att';
          found.push({ idx: m.index, mods: keys.length === 1 && keys[0] === 'pistol' ? { addAbil: ['pistol'] } : { addAbilTok: [tok] }, conds: [], side });
        }
      }
      const STK = ['hit', 'wound', 'strength', 'extraA', 'apImp', 'dmg'];
      found.sort((x, y) => (x.idx || 0) - (y.idx || 0));
      found.forEach((f) => {
        const ks = Object.keys(f.mods).filter((k) => STK.includes(k) && f.mods[k]);
        if (f.replFlag) { f.repl = {}; ks.forEach((k) => { if (lastVal[k]) f.repl[k] = lastVal[k]; }); } else ks.forEach((k) => { lastVal[k] = f.mods[k]; });
      });
      found.forEach((f) => {
        const cs = [...selfConds, ...conds, ...f.conds];
        const key = [f.side, scope, req.join(), names.join(), ex.w.keys.join(), ex.w.names.join(), JSON.stringify(cs.map((x) => [x.t, x.kw || '', (x.kws || []).join(), x.label || '', x.key || '', x.op || '', (x.names || []).join(), x.d || '']).sort()), JSON.stringify(f.repl || null)].join('|');
        const g = groups.get(key) || { scope, weaponReq: req, weaponNames: names, weaponExcl: ex.w, side: f.side, conds: cs, mods: {}, alt: !!opts.alt, repl: f.repl && Object.keys(f.repl).length ? f.repl : null };
        mergeInto(g.mods, f.mods); groups.set(key, g);
      });
    });
    return [...groups.values()];
  }

  /* Texte complet -> items (gère « Ou : », les choix de capacité et les doctrines) */
  function optionItems(prefix, toks, remainder, opts) {
    const items = [];
    let rem = String(remainder || '').replace(/^[\s.;,]+/, '').trim();
    /* « Vous pouvez à la place choisir les capacités [A] et [B] » : combinaison proposée en plus */
    let combo = [];
    const ci = fold(rem).search(/vous pouvez (?:a la place )?choisir|a la place,? (?:choisissez|vous pouvez)/);
    if (ci >= 0) { combo = [...rem.slice(ci).matchAll(/\[([^\]]+)\]/g)].map((x) => x[1].trim()); rem = rem.slice(0, ci).trim(); }
    const build = (label, tk) => {
      const txt = rem && /choisies?\b/i.test(rem) ? rem.replace(/choisies?\b/i, tk) : 'Les attaques de cette unité ont ' + tk + '.';
      parseSegment((prefix || '') + ' ' + txt, Object.assign({}, opts, { alt: true })).forEach((it) => { it.conds = [...it.conds, { t: 'manual', label: 'Option choisie : ' + label }]; items.push(it); });
    };
    toks.forEach((tk) => build(tk, '[' + tk + ']'));
    if (combo.length > 1) build(combo.join(' + '), combo.map((x) => '[' + x + ']').join(' et '));
    return items;
  }
  function parseText(text, opts = {}) {
    const T = String(text || '').replace(/Exemple\s*:[\s\S]*?(?=[A-ZÉÈÀÂÊÎÔÛÇ]{4,}|$)/g, ' ');
    const cm = T.match(/^([\s\S]*?)choisissez(?:\s+ensuite)?\s+l['’]une des (?:capacit\S+|options) suivantes?[^:]*:\s*((?:[•\-\s]*\[[^\]]+\][\s;,.]*(?:ou\s*)?)+)([\s\S]*)$/i);
    if (cm) return optionItems(cm[1], [...cm[2].matchAll(/\[([^\]]+)\]/g)].map((x) => x[1].trim()), cm[3], opts);
    const c2 = T.match(/^([\s\S]*?)choisissez\s+(?:la capacit\S+\s+|une capacit\S+\s+)?((?:\[[^\]]+\]\s*(?:,|;|ou)\s*)+\[[^\]]+\])([\s\S]*)$/i);
    if (c2) return optionItems(c2[1], [...c2[2].matchAll(/\[([^\]]+)\]/g)].map((x) => x[1].trim()), c2[3], opts);
    const alts = T.replace(/(PC)(Ou\s*:)/g, '$1 $2').split(/\s+Ou\s*:\s*/i);
    const items = [];
    let scope = null;
    alts.forEach((seg, i) => {
      const its = parseSegment(seg, Object.assign({}, opts, { alt: alts.length > 1, scope: scope || opts.scope }));
      if (i === 0 && its[0]) scope = its[0].scope === 'both' ? null : its[0].scope;
      items.push(...its);
    });
    return items;
  }
  /* Doctrines de combat : une source par doctrine */
  function splitDoctrines(text) {
    const re = /DOCTRINE\s+([A-ZÉÈ'’ ]+?)\s*:/g; const marks = []; let m;
    while ((m = re.exec(text))) marks.push({ name: m[1].trim(), i: m.index, end: re.lastIndex });
    return marks.map((k, n) => ({ name: 'Doctrine ' + k.name.charAt(0) + k.name.slice(1).toLowerCase(), text: text.slice(k.end, n + 1 < marks.length ? marks[n + 1].i : undefined).replace(/Sauf mention contraire[\s\S]*$/i, '').trim() }));
  }

  /* ---------- Fusion / agrégation ---------- */
  const RR = { none: 0, ones: 1, all: 2 };
  function mergeInto(a, b) {
    ['hit', 'wound', 'strength', 'extraA', 'apImp', 'dmg', 'dmgRed'].forEach((k) => { if (b[k]) a[k] = (a[k] || 0) + b[k]; });
    ['rrHit', 'rrWound'].forEach((k) => { if (b[k] && (RR[b[k]] || 0) > (RR[a[k]] || 0)) a[k] = b[k]; });
    ['rrDmg', 'lethal', 'dev'].forEach((k) => { if (b[k]) a[k] = true; });
    if (b.sust && (!a.sust || sustAvg(b.sust) > sustAvg(a.sust))) a.sust = b.sust;
    ['noCover', 'forceCover'].forEach((k) => { if (b[k]) a[k] = true; });
    if (b.anti && !a.anti) a.anti = b.anti;
    if (b.antis) a.antis = [...(a.antis || []), ...b.antis.filter((x) => !(a.antis || []).some((y) => y.kw === x.kw && y.x === x.x))];
    if (b.approx) a.approx = [...new Set([...(a.approx || []), ...b.approx])];
    ['addAbil', 'removeAbil', 'addAbilTok'].forEach((k) => { if (b[k]) a[k] = [...new Set([...(a[k] || []), ...b[k]])]; });
    return a;
  }
  const aggregate = (items) => items.reduce((acc, it) => { mergeInto(acc, it.mods); if (it.repl) Object.keys(it.repl).forEach((k) => { acc[k] = (acc[k] || 0) - it.repl[k]; }); return acc; }, {});

  /* ---------- Évaluation des conditions ---------- */
  const sing = (x) => String(x).replace(/[\s\-_]+/g, '').replace(/s$/, '');
  const nameHit = (wn, list) => { const w = sing(norm(wn)); return list.some((n) => { const x = sing(norm(n)); return x && (w.includes(x) || x.includes(w)); }); };
  function evalItem(it, ctx) {
    const res = { applicable: true, why: '', manual: [] };
    const no = (why) => ({ applicable: false, why, manual: [] });
    if (it.side === 'def' && !ctx.asTarget) return no('effet défensif');
    if (it.scope === 'ranged' && ctx.mode === 'melee') return no('tir seulement');
    if (it.scope === 'melee' && ctx.mode !== 'melee') return no('mêlée seulement');
    const ab = ctx.ab || {};
    if (it.weaponReq && it.weaponReq.length && !it.weaponReq.some((k) => ab[k])) return no('ne concerne pas cette arme (' + it.weaponReq.map((k) => WLAB[k] || k).join('/') + ' seulement)');
    if (it.weaponNames && it.weaponNames.length && ctx.wname && !nameHit(ctx.wname, it.weaponNames)) return no('ne concerne pas cette arme (' + it.weaponNames.map(cap).join(', ') + ' seulement)');
    if (it.weaponExcl) {
      const k = it.weaponExcl.keys.find((x) => ab[x]); if (k) return no('arme exclue (' + (WLAB[k] || k) + ')');
      if (it.weaponExcl.names.length && ctx.wname && nameHit(ctx.wname, it.weaponExcl.names)) return no('arme exclue (' + it.weaponExcl.names.map(cap).join(', ') + ')');
    }
    const kws = (ctx.unit && ctx.unit.keywords || []).map(norm);
    const ALIAS = { infantry: ['infantry', 'infanterie'], vehicle: ['vehicle', 'vehicule'], monster: ['monster', 'monstre'], character: ['character', 'personnage'] };
    for (const c of it.conds) {
      if (c.t === 'moved_normal' && ctx.mode !== 'melee' && ctx.sit.moved !== 'normal') return no('l\'unité n\'a pas fait de mouvement normal');
      if (c.t === 'setUp' && !ctx.sit.setUp) return no('pas de mouvement d\'arrivée ce tour');
      if (c.t === 'charged' && ctx.mode === 'melee' && !ctx.sit.charged) return no('l\'unité n\'a pas chargé');
      if (c.t === 'engaged' && ctx.mode !== 'melee' && !ctx.sit.engaged) return no('unité non engagée');
      if (c.t === 'sit') {
        if (c.key === 'halfRange' && ctx.mode === 'melee') continue;
        if (ctx.sit && !ctx.sit[c.key]) return no(c.label + ' non coché dans la situation');
      }
      if (c.t === 'svt') {
        if (ctx.wS > 0 && ctx.tT > 0) {
          const ok = { gt: ctx.wS > ctx.tT, ge: ctx.wS >= ctx.tT, lt: ctx.wS < ctx.tT, le: ctx.wS <= ctx.tT, eq: ctx.wS === ctx.tT }[c.op];
          if (!ok) return no(c.label + ' non vérifié (F' + ctx.wS + ' contre E' + ctx.tT + ')');
        } else res.manual.push(c.label);
      }
      if (c.t === 'unit_kw' && kws.length) {
        const wanted = c.kws || [c.kw];
        if (!wanted.some((w) => kws.some((k) => (ALIAS[w] || [w]).includes(k)))) return no('unité non ' + wanted.map((w) => String(w).toUpperCase()).join('/'));
      }
      if (c.t === 'unit_is') {
        const nm = ctx.unit && ctx.unit.name ? [ctx.unit.name] : [];
        const okk = c.names.some((n) => nameHit(n, nm) || kws.includes(norm(n)) || kws.some((k) => sing(k) === sing(norm(n))));
        if (!okk) res.manual.push('Unité : ' + c.names.map(cap).join(' ou '));
      }
      if (c.t === 'target_not') {
        const tk = (ctx.target && ctx.target.kw || []);
        const hit = c.kws.find((k) => Engine.hasKw(tk, k));
        if (hit) return no('cible ' + hit.toUpperCase() + ' exclue');
      }
      if (c.t === 'target_is') {
        const tk = (ctx.target && ctx.target.kw || []);
        if (tk.length && !c.kws.some((k) => Engine.hasKw(tk, k))) return no('cible hors ' + c.kws.map((k) => k.toUpperCase()).join('/'));
      }
      if (c.t === 'doctrine') {
        const ds = ctx.doctrines;
        if (ds) { if (!ds.some((x) => x.includes(c.d))) return no('doctrine ' + c.d + ' non active (coche-la dans « Doctrines de combat »)'); }
        else res.manual.push('Doctrine ' + c.d + ' active');
      }
      if (c.t === 'army_faction') {
        const af = (ctx.armyKw || []); const w = norm(c.kw);
        if (af.length) { if (!af.includes(w)) return no('faction d\'armée ≠ ' + c.kw.toUpperCase()); }
        else res.manual.push(c.label || ('Faction d\'armée : ' + c.kw.toUpperCase()));
      }
      if (c.t === 'manual') { if (c.soft) (res.soft = res.soft || []).push(c.label); else res.manual.push(c.label); }
    }
    return res;
  }

  /* ---------- Libellés ---------- */
  const sg = (n) => (n > 0 ? '+' : '−') + Math.abs(n);
  const ABIL = { assault: 'Assaut', ignoresCover: 'Ignore le couvert', pistol: 'Combat rapproché', heavy: 'Lourd', blast: 'Explosion' };
  const TOKFR = { 'combat rapproche': 'Combat rapproché', precision: 'Précision', jumele: 'Jumelé', pistolet: 'Pistolet', dangereux: 'Dangereux', lourd: 'Lourd', lance: 'Lance', psychique: 'Psychique', torrent: 'Torrent', assaut: 'Assaut', blast: 'Explosion', explosion: 'Explosion', deflagration: 'Explosion', cleave: 'Fente', fente: 'Fente', 'tir indirect': 'Tir indirect', 'tir rapide': 'Tir rapide', melta: 'Fusion', fusion: 'Fusion', 'un seul tir': 'Un seul tir' };
  const prettyTok = (k) => { const s = String(k).trim(); const m = s.match(/^([a-z' \-]+?)(?:\s+(\d.*))?$/); const base = m ? m[1].trim() : s; return (TOKFR[base] || cap(base)) + (m && m[2] ? ' ' + m[2] : ''); };
  function summarize(m) {
    const o = [];
    if (m.hit) o.push(sg(m.hit) + ' touche'); if (m.wound) o.push(sg(m.wound) + ' blessure');
    if (m.strength) o.push(sg(m.strength) + ' Force'); if (m.extraA) o.push(sg(m.extraA) + ' attaque(s)/fig.');
    if (m.apImp) o.push('PA ' + sg(m.apImp)); if (m.dmg) o.push(sg(m.dmg) + ' dégâts');
    if (m.rrHit) o.push(m.rrHit === 'ones' ? 'relance touches (1)' : 'relance touches'); if (m.rrWound) o.push(m.rrWound === 'ones' ? 'relance blessures (1)' : 'relance blessures');
    if (m.rrDmg) o.push('relance dégâts'); if (m.lethal) o.push('Touches létales'); if (m.dev) o.push('Blessures dévastatrices');
    if (m.sust) o.push('Touches soutenues ' + m.sust);
    (m.antis || (m.anti ? [m.anti] : [])).forEach((a) => { const neg = /^non-/.test(a.kw); o.push('Anti-' + (neg ? 'non-' : '') + kwFr(String(a.kw).replace(/^non-/, '')).toLowerCase() + ' ' + a.x + '+'); });
    if (m.noCover) o.push('cible sans couvert'); if (m.forceCover) o.push('cible à couvert');
    (m.addAbilTok || []).forEach((k) => o.push(prettyTok(k)));
    (m.addAbil || []).forEach((k) => o.push(ABIL[k] || k)); (m.removeAbil || []).forEach((k) => o.push('sans ' + (ABIL[k] || k)));
    if (m.approx && o.length) o.push('(' + m.approx.join(' ; ') + ')');
    return o;
  }
  function condLabel(c) {
    switch (c.t) {
      case 'moved_normal': return 'mouvement normal';
      case 'setUp': return 'mouvement d\'arrivée';
      case 'charged': return 'a chargé ce tour';
      case 'engaged': return 'unité engagée';
      case 'sit': return String(c.label || c.key).toLowerCase();
      case 'svt': return c.label;
      case 'unit_kw': return 'unité ' + (c.kws || [c.kw]).map(kwFr).join('/');
      case 'unit_is': return 'unité ' + c.names.map(cap).join(' ou ');
      case 'doctrine': return 'doctrine ' + c.d + ' active';
      case 'army_faction': return 'faction ' + String(c.kw || '').toUpperCase();
      case 'target_is': return 'cible ' + (c.kws || []).map(kwFr).join('/');
      case 'target_not': return 'cible hors ' + (c.kws || []).map(kwFr).join('/');
      default: return c.label || c.t;
    }
  }
  /* « Armes Torrent · tir » : à quelles armes / attaques l'effet s'applique */
  function filterLabel(it) {
    const f = [];
    if (it.weaponReq && it.weaponReq.length) f.push('armes ' + it.weaponReq.map((k) => WLAB[k] || k).join('/'));
    if (it.weaponNames && it.weaponNames.length) f.push(it.weaponNames.map(cap).join(', '));
    if (it.weaponExcl) { const x = [...it.weaponExcl.keys.map((k) => WLAB[k] || k), ...it.weaponExcl.names.map(cap)]; if (x.length) f.push('sauf ' + x.join(', ')); }
    if (it.scope === 'ranged') f.push('tir'); else if (it.scope === 'melee') f.push('mêlée');
    return f.join(' · ');
  }
  /* Résumé complet d'un effet : filtre + effets + conditions */
  function describe(it) {
    const s = summarize(it.mods).join(', '); if (!s) return '';
    const f = filterLabel(it); const c = it.conds.map(condLabel).join(' ; ');
    return (f ? f + ' : ' : '') + (it.repl ? 'à la place : ' : '') + s + (c ? ' — sous condition : ' + c : '');
  }
  return { parseText, parseSegment, splitDoctrines, aggregate, mergeInto, evalItem, summarize, describe, filterLabel, condLabel, norm };
})();
if (typeof module !== 'undefined') module.exports = Effects;
