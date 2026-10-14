/* Illustration d'accueil (dessin original) : un brute à peau verte et un être élancé aux grandes oreilles jouent une partie sur table. */
const HomeArt = `<svg viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Un ork et un eldar jouent une partie de figurines autour d'une table de jeu">
<defs>
  <linearGradient id="ha-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2218"/><stop offset="1" stop-color="#15110c"/></linearGradient>
  <radialGradient id="ha-lamp" cx="50%" cy="0%" r="70%"><stop offset="0" stop-color="#ffd27a" stop-opacity=".55"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>
  <linearGradient id="ha-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a5230"/><stop offset="1" stop-color="#3f2916"/></linearGradient>
  <linearGradient id="ha-mat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#55633d"/><stop offset="1" stop-color="#3b472b"/></linearGradient>
</defs>
<rect width="400" height="260" fill="url(#ha-bg)"/>
<rect width="400" height="260" fill="url(#ha-lamp)"/>
<!-- lampe -->
<line x1="200" y1="0" x2="200" y2="22" stroke="#6b5a42" stroke-width="2"/>
<path d="M176 40 Q200 14 224 40 Z" fill="#c9a24a"/>
<ellipse cx="200" cy="41" rx="24" ry="3" fill="#ffe29a" opacity=".9"/>
<!-- étagère en fond : boîtes et fioles -->
<rect x="0" y="86" width="400" height="3" fill="#3a2d1d"/>
<rect x="150" y="62" width="22" height="24" fill="#6a3b2d"/><rect x="176" y="68" width="18" height="18" fill="#2e5a55"/><rect x="198" y="58" width="26" height="28" fill="#6b5a42"/><rect x="228" y="70" width="16" height="16" fill="#7a2f2a"/>

<!-- ORK (gauche) -->
<g>
  <!-- torse -->
  <path d="M8 215 Q10 150 52 138 L96 138 Q140 150 142 215 Z" fill="#4a2a22"/>
  <path d="M52 138 L96 138 L84 170 L64 170 Z" fill="#6a9a3a"/>
  <path d="M30 160 L48 150 L56 215 L26 215 Z" fill="#2d1b16"/><path d="M118 160 L100 150 L92 215 L122 215 Z" fill="#2d1b16"/>
  <rect x="64" y="146" width="20" height="7" fill="#c9a24a"/>
  <!-- cou et tête -->
  <rect x="58" y="116" width="32" height="28" rx="8" fill="#5b8a30"/>
  <path d="M34 92 Q34 58 74 56 Q114 58 114 92 Q116 124 100 134 Q74 142 48 134 Q32 124 34 92 Z" fill="#6a9a3a"/>
  <!-- oreilles -->
  <path d="M34 90 L12 74 L22 98 L36 104 Z" fill="#5b8a30"/><path d="M114 90 L136 74 L126 98 L112 104 Z" fill="#5b8a30"/>
  <!-- casque de cuir bricolé -->
  <path d="M36 82 Q40 54 74 52 Q108 54 112 82 Q94 70 74 70 Q54 70 36 82 Z" fill="#6b3d1f"/>
  <path d="M74 52 L74 70" stroke="#3b2210" stroke-width="3"/><circle cx="52" cy="66" r="3" fill="#b9b3a3"/><circle cx="96" cy="66" r="3" fill="#b9b3a3"/>
  <!-- arcade et yeux -->
  <path d="M44 88 L72 94 L72 86 L46 80 Z" fill="#2c4a14"/><path d="M104 88 L76 94 L76 86 L102 80 Z" fill="#2c4a14"/>
  <ellipse cx="58" cy="96" rx="7" ry="5" fill="#f2e6b0"/><ellipse cx="90" cy="96" rx="7" ry="5" fill="#f2e6b0"/>
  <circle cx="60" cy="97" r="2.6" fill="#7a1f12"/><circle cx="88" cy="97" r="2.6" fill="#7a1f12"/>
  <!-- nez et bouche -->
  <ellipse cx="74" cy="108" rx="9" ry="6" fill="#4f7a28"/><circle cx="70" cy="109" r="1.8" fill="#243d0e"/><circle cx="78" cy="109" r="1.8" fill="#243d0e"/>
  <path d="M48 118 Q74 130 100 118 L98 126 Q74 138 50 126 Z" fill="#2a1410"/>
  <path d="M56 121 L52 106 L63 120 Z" fill="#f4eedb"/><path d="M92 121 L96 106 L85 120 Z" fill="#f4eedb"/>
  <path d="M40 112 l6 2 M104 114 l6 -2" stroke="#4f7a28" stroke-width="2"/>
</g>

<!-- ELDAR (droite) -->
<g>
  <path d="M262 215 Q264 160 300 150 L356 150 Q392 160 392 215 Z" fill="#1f5c66"/>
  <path d="M286 152 L370 152 L360 176 L296 176 Z" fill="#e0b84a"/>
  <path d="M300 176 L356 176 L346 215 L310 215 Z" fill="#17434b"/>
  <circle cx="328" cy="164" r="6" fill="#e8484a"/><circle cx="328" cy="164" r="2.4" fill="#ffd0c8"/>
  <path d="M276 160 Q262 172 266 196 L286 188 Z" fill="#e0b84a"/><path d="M380 160 Q394 172 390 196 L370 188 Z" fill="#e0b84a"/>
  <!-- cou fin -->
  <rect x="318" y="112" width="20" height="42" rx="7" fill="#d9d4c3"/>
  <!-- visage allongé -->
  <path d="M304 78 Q304 54 328 52 Q352 54 352 78 Q352 108 336 124 Q328 130 320 124 Q304 108 304 78 Z" fill="#e4dfce"/>
  <!-- oreilles effilées -->
  <path d="M304 82 L276 62 L300 96 Z" fill="#d9d4c3"/><path d="M352 82 L380 62 L356 96 Z" fill="#d9d4c3"/>
  <!-- casque à crête -->
  <path d="M302 78 Q300 48 326 44 Q342 42 348 40 Q350 56 352 78 Q330 64 302 78 Z" fill="#1f5c66"/>
  <path d="M344 44 Q382 34 398 72 Q370 56 350 62 Z" fill="#e8484a"/>
  <path d="M302 78 Q330 64 352 78" fill="none" stroke="#e0b84a" stroke-width="3"/>
  <circle cx="327" cy="62" r="3.5" fill="#e0b84a"/>
  <!-- yeux en amande -->
  <path d="M308 90 Q318 84 326 92 Q316 96 308 90 Z" fill="#fff"/><path d="M348 90 Q338 84 330 92 Q340 96 348 90 Z" fill="#fff"/>
  <circle cx="318" cy="91" r="2.6" fill="#1b6fa8"/><circle cx="338" cy="91" r="2.6" fill="#1b6fa8"/>
  <path d="M306 86 Q316 80 326 88 M350 86 Q340 80 330 88" fill="none" stroke="#7d7466" stroke-width="1.6"/>
  <path d="M328 94 L326 106 L331 106" fill="none" stroke="#b5ab97" stroke-width="1.4"/>
  <path d="M319 116 Q328 121 337 116" fill="none" stroke="#8a5a52" stroke-width="2"/>
</g>

<!-- TABLE -->
<rect x="0" y="212" width="400" height="48" fill="url(#ha-wood)"/>
<rect x="0" y="212" width="400" height="4" fill="#9a6d42"/>
<path d="M78 246 L106 214 L294 214 L322 246 Z" fill="url(#ha-mat)"/>
<path d="M78 246 L106 214 L294 214 L322 246 Z" fill="none" stroke="#2a3320" stroke-width="2"/>
<!-- décors : ruines -->
<g>
  <rect x="176" y="198" width="22" height="16" fill="#6e6a62"/><rect x="176" y="190" width="9" height="8" fill="#6e6a62"/><rect x="190" y="194" width="8" height="4" fill="#6e6a62"/>
  <rect x="204" y="202" width="14" height="12" fill="#58554f"/>
  <path d="M236 214 L246 198 L262 214 Z" fill="#4a5a35"/>
</g>
<!-- figurines orks (vertes) -->
<g fill="#5b8a30">
  <circle cx="128" cy="206" r="3.6"/><rect x="124.5" y="209" width="7" height="8" rx="2" fill="#6b3d1f"/>
  <circle cx="142" cy="212" r="3.6"/><rect x="138.5" y="215" width="7" height="8" rx="2" fill="#6b3d1f"/>
  <circle cx="116" cy="219" r="3.6"/><rect x="112.5" y="222" width="7" height="8" rx="2" fill="#6b3d1f"/>
  <circle cx="150" cy="224" r="3.6"/><rect x="146.5" y="227" width="7" height="8" rx="2" fill="#6b3d1f"/>
</g>
<!-- figurines élancées (bleues) -->
<g fill="#d9d4c3">
  <circle cx="272" cy="205" r="3"/><rect x="269.5" y="208" width="5" height="11" rx="2" fill="#1f5c66"/>
  <circle cx="258" cy="213" r="3"/><rect x="255.5" y="216" width="5" height="11" rx="2" fill="#1f5c66"/>
  <circle cx="284" cy="220" r="3"/><rect x="281.5" y="223" width="5" height="11" rx="2" fill="#1f5c66"/>
  <circle cx="246" cy="224" r="3"/><rect x="243.5" y="227" width="5" height="11" rx="2" fill="#1f5c66"/>
</g>
<!-- mètre ruban -->
<g><rect x="164" y="232" width="74" height="7" rx="1.5" fill="#e0b84a"/><g stroke="#2a2218" stroke-width="1"><path d="M172 232v4 M180 232v3 M188 232v4 M196 232v3 M204 232v4 M212 232v3 M220 232v4 M228 232v3"/></g></g>
<!-- dés -->
<g>
  <rect x="198" y="222" width="14" height="14" rx="3" fill="#f6f1e4" stroke="#b9b3a3" transform="rotate(-12 205 229)"/>
  <g fill="#222" transform="rotate(-12 205 229)"><circle cx="201.5" cy="225.5" r="1.5"/><circle cx="208.5" cy="225.5" r="1.5"/><circle cx="201.5" cy="229" r="1.5"/><circle cx="208.5" cy="229" r="1.5"/><circle cx="201.5" cy="232.5" r="1.5"/><circle cx="208.5" cy="232.5" r="1.5"/></g>
  <rect x="216" y="224" width="12" height="12" rx="3" fill="#e8484a" stroke="#8a2a2c" transform="rotate(14 222 230)"/>
  <g fill="#fff" transform="rotate(14 222 230)"><circle cx="219" cy="227" r="1.4"/><circle cx="225" cy="233" r="1.4"/><circle cx="222" cy="230" r="1.4"/></g>
</g>
<!-- bras / poings sur la table -->
<path d="M30 218 Q44 200 84 206 Q106 210 112 226 Q100 240 70 236 Q40 234 30 218 Z" fill="#6a9a3a"/>
<path d="M70 206 Q86 202 98 212" fill="none" stroke="#4f7a28" stroke-width="2"/>
<path d="M312 222 Q326 206 352 210 Q372 214 374 228 Q360 240 336 236 Q316 234 312 222 Z" fill="#e4dfce"/>
<path d="M326 214 L322 204 M334 212 L332 200 M342 212 L342 200" stroke="#e4dfce" stroke-width="5" stroke-linecap="round"/>
<!-- bulles -->
<g font-family="system-ui, sans-serif" font-size="11" font-weight="700">
  <rect x="6" y="6" width="132" height="26" rx="10" fill="#f6f1e4"/><path d="M52 32 L60 44 L68 32 Z" fill="#f6f1e4"/>
  <text x="72" y="23" text-anchor="middle" fill="#2a2218">Ça touche sur 2+ !</text>
  <rect x="250" y="6" width="144" height="26" rx="10" fill="#f6f1e4"/><path d="M322 32 L330 44 L338 32 Z" fill="#f6f1e4"/>
  <text x="322" y="23" text-anchor="middle" fill="#2a2218">Et le couvert, alors ?</text>
</g>
</svg>`;
if (typeof module !== 'undefined') module.exports = HomeArt;
