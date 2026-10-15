/* Filtrage par mots-clés : compare les conditions d'un texte (améliorations, stratagèmes) aux mots-clés d'une unité. */
const Kw = (() => {
  const norm = (s) => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘`]/g, "'").replace(/[^a-z0-9']+/g, ' ').trim();
  const stem = (w) => (w.length > 3 && /s$/.test(w) ? w.slice(0, -1) : w);
  const STOP = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'd', 'l', 'unite', 'unites', 'figurine', 'figurines', 'model', 'models', 'unit', 'units', 'amie', 'amies', 'ami', 'amis', 'autre', 'autres', 'votre', 'armee', 'et', 'with', 'avec', 'sans', 'the', 'of']);
  /* équivalences anglais -> français (les mots-clés des fiches sont en français, les textes mélangent les deux) */
  const AL = { tyranid: ['tyranide'], tyranids: ['tyranide'], titanic: ['titanesque'], infantry: ['infanterie'], vehicle: ['vehicule'], monster: ['monstre'], character: ['personnage'], mounted: ['monte'], walker: ['marcheur'], aircraft: ['aeronef'], fly: ['vol'], beast: ['bete'], beasts: ['bete'], swarm: ['nuee'], officer: ['officier'], platoon: ['peloton'], cult: ['culte'], transport: ['transport'], vanguard: ['avant', 'garde'], invader: ['envahisseur'], battleline: ['ligne'], epic: ['heros', 'epique'], hero: ['heros'], daemon: ['demon'], psyker: ['psyker'], grenades: ['grenade'], smoke: ['fumigene'], gigantic: ['gigantesque'], speeder: ['speeder'], terminator: ['terminator'], sorcerer: ['sorcier'], priest: ['pretre'], captain: ['capitaine'], chaplain: ['chapelain'], librarian: ['librarian'], ancient: ['ancien'], champion: ['champion'], primarch: ['primarque'], fortification: ['fortification'], dreadnought: ['dreadnought'], assassin: ['assassin'], inquisitor: ['inquisiteur'], penitent: ['penitent'], mutant: ['mutant'], damned: ['damne'], possessed: ['possede'], destroyer: ['destroyer'], sword: ['sword'], squad: ['squad'] };
  const words = (s) => { const out = []; norm(s).replace(/'/g, ' ').split(' ').forEach((w0) => { if (!w0 || STOP.has(w0)) return; const a = AL[w0] || AL[stem(w0)]; (a || [w0]).forEach((x) => { x = stem(x); if (x && !STOP.has(x)) out.push(x); }); }); return out; };
  /* sac de mots d'une unité (mots-clés, mots-clés de faction, noms, rôle) */
  let MAP = {}, REV = {};
  function bag(u) {
    const b = new Set();
    [].concat(u.kw || u.keywords || [], u.fkw || u.factionKw || [], [u.name, u.en, u.role, u.chapter]).forEach((x) => { if (typeof x === 'string' && (MAP[x] || REV[x])) words(MAP[x] || REV[x]).forEach((w) => b.add(w)); if (x) words(typeof x === 'string' ? x : x.en || x.fr || '').forEach((w) => b.add(w)); if (x && typeof x === 'object' && x.en) words(x.en).forEach((w) => b.add(w)); });
    return b;
  }
  const splitAlt = (s) => s.split(/\s*\/\s*|\s+ou\s+|\s+or\s+|\s*,\s*/i).map((x) => x.trim()).filter(Boolean);
  /* Extrait { alts: [[mots]], excl: [[mots]] } d'un texte, ou null si aucune condition lisible. */
  function parse(text, kind) {
    const t = String(text || '').replace(/\s+/g, ' ').trim(); if (!t) return null;
    let phrase = '', rest = '';
    if (kind === 'enh') {
      const m = t.match(/^(?:\(.*?\)\s*)?(?:Figurines?|Unités?|Models?|Units?)\s+(.+?)\s+(?:uniquement|only)\b(.*)$/i);
      if (!m) return null; phrase = m[1].split(/\s+(?:avec|with|équipée?s?|equipped)\b/i)[0]; rest = m[2];
    } else {
      const m = t.match(/(?:une|un|jusqu'à (?:deux|trois|quatre)|chaque|toutes? les)\s+(?:autres?\s+)?(?:unités?|figurines?)\s+(.+?)(?=\s+(?:de votre armée|amies?|alliée?s?|ennemies?|adverses?|qui|que|dont|à |à |dans|ayant|avec|n'|ne |peut|vient|est|a |ont|pas|éligible|sous|entièrement|visible|en |ou plus)|[,.;:]|$)/i);
      if (!m) return null; phrase = m[1]; rest = t.slice(m.index + m[0].length);
    }
    const ex = (phrase + ' ' + rest).match(/\(?\s*à l'exclusion (?:des|de la|du|de|d')\s*(?:unités?|figurines?)?\s*([^).]+)/i);
    if (ex) phrase = phrase.replace(/\(?\s*à l'exclusion.*$/i, '');
    const alts = splitAlt(phrase.replace(/\(.*?\)/g, '')).map(words).filter((a) => a.length);
    if (!alts.length) return null;
    const excl = ex ? splitAlt(ex[1].replace(/\bet\b/gi, ',')).map(words).filter((a) => a.length) : [];
    return { alts, excl };
  }
  /* true = compatible ou condition illisible ; false = mots-clés manquants */
  function ok(text, unit, kind) {
    const p = parse(text, kind); if (!p) return true; const b = bag(unit);
    const has = (a) => a.every((w) => b.has(w));
    if (p.excl.some(has)) return false;
    return p.alts.some(has);
  }
  return { norm, words, bag, parse, ok, setMap(m) { MAP = m || {}; REV = {}; Object.keys(MAP).forEach((k) => { REV[MAP[k]] = k; }); } };
})();
if (typeof window !== 'undefined') window.Kw = Kw;
if (typeof module !== 'undefined') module.exports = Kw;
