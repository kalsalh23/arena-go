// Generates realistic-looking venue photos (5 angles) and team crest logos.
// public/demo/ph/*.svg  (venues)   public/demo/logos/*.svg (team crests)
const fs = require('fs')
const path = require('path')

const outPh = path.join(process.cwd(), 'public', 'demo', 'ph')
const outLogo = path.join(process.cwd(), 'public', 'demo', 'logos')
fs.mkdirSync(outPh, { recursive: true })
fs.mkdirSync(outLogo, { recursive: true })

// palettes: day greens + night
const P = [
  { sky1: '#aee3ff', sky2: '#e8f7ff', g1: '#2c8a4e', g2: '#1c5c34', line: 'rgba(255,255,255,0.9)', night: false },
  { sky1: '#b7e7c8', sky2: '#eefaf1', g1: '#339a58', g2: '#175c33', line: 'rgba(255,255,255,0.85)', night: false },
  { sky1: '#ffd9a1', sky2: '#fff3e0', g1: '#2f8a4c', g2: '#1b5430', line: 'rgba(255,248,225,0.9)', night: false },
  { sky1: '#0e2233', sky2: '#173d2a', g1: '#1f6b3d', g2: '#0e3a21', line: 'rgba(210,255,225,0.9)', night: true },
  { sky1: '#9fd8ff', sky2: '#eaf8ff', g1: '#2f925a', g2: '#196139', line: 'rgba(255,255,255,0.88)', night: false },
  { sky1: '#ffedb8', sky2: '#fffdf4', g1: '#3a9d5f', g2: '#20653b', line: 'rgba(255,255,255,0.85)', night: false },
]

const gid = (s) => `g${Math.abs(hash(s))}` 
function hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return h }

function defs(p, key) {
  return `<defs>
<linearGradient id="sky${key}" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="${p.sky1}"/><stop offset="1" stop-color="${p.sky2}"/>
</linearGradient>
<linearGradient id="gr${key}" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${p.g1}"/><stop offset="1" stop-color="${p.g2}"/>
</linearGradient>
<radialGradient id="lamp${key}" cx="0.5" cy="0.5" r="0.5">
<stop offset="0" stop-color="rgba(255,250,220,0.95)"/><stop offset="0.25" stop-color="rgba(255,244,180,0.35)"/><stop offset="1" stop-color="rgba(255,244,180,0)"/>
</radialGradient>
</defs>`
}

function stripes(n, w, h, key) {
  let s = ''
  for (let i = 0; i < n; i += 2) {
    s += `<rect x="${(w / n) * i}" y="0" width="${w / n}" height="${h}" fill="rgba(255,255,255,0.05)"/>`
  }
  return s
}

// ---- Angle 1: aerial full pitch ----
function aerial(p, key) {
  const w = 800, h = 500
  return `<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" viewBox="0 0 ${w} ${h}">${defs(p, key)}
<rect width="${w}" height="${h}" fill="url(#gr${key})"/>
${stripes(10, w, h, key)}
<g fill="none" stroke="${p.line}" stroke-width="3">
<rect x="48" y="40" width="${w - 96}" height="${h - 80}" rx="6"/>
<line x1="${w / 2}" y1="40" x2="${w / 2}" y2="${h - 40}"/>
<circle cx="${w / 2}" cy="${h / 2}" r="62"/>
<circle cx="${w / 2}" cy="${h / 2}" r="4" fill="${p.line}"/>
<rect x="48" y="${h * 0.30}" width="112" height="${h * 0.4}"/>
<rect x="${w - 160}" y="${h * 0.30}" width="112" height="${h * 0.4}"/>
<rect x="48" y="${h * 0.40}" width="44" height="${h * 0.2}"/>
<rect x="${w - 92}" y="${h * 0.40}" width="44" height="${h * 0.2}"/>
<path d="M160 ${h * 0.42} a55 55 0 0 0 0 ${h * 0.16}"/>
<path d="M${w - 160} ${h * 0.42} a55 55 0 0 1 0 ${h * 0.16}"/>
</g>
<rect width="${w}" height="${h}" fill="rgba(255,255,255,0.02)"/>
</svg>`
}

// ---- Angle 2: corner perspective ----
function corner(p, key) {
  const w = 800, h = 500
  return `<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" viewBox="0 0 ${w} ${h}">${defs(p, key)}
<rect width="${w}" height="150" fill="url(#sky${key})"/>
<circle cx="660" cy="70" r="34" fill="rgba(255,250,210,0.9)"/>
<rect y="140" width="${w}" height="${h - 140}" fill="url(#gr${key})"/>
<g fill="none" stroke="${p.line}" stroke-width="4">
<path d="M120 470 L340 190 L700 190 L690 470 Z" fill="rgba(255,255,255,0.04)"/>
<path d="M205 350 L340 245 L560 245 L545 350 Z"/>
<path d="M205 350 L545 350"/>
<path d="M255 282 L535 282"/>
</g>
<g>${floodlight(90, 120, key)}${floodlight(710, 120, key)}</g>
<rect y="455" width="${w}" height="45" fill="rgba(0,0,0,0.22)"/>
</svg>`
}

// ---- Angle 3: goal close-up ----
function goal(p, key) {
  const w = 800, h = 500
  let net = ''
  for (let x = 120; x <= 680; x += 40) net += `<line x1="${x}" y1="80" x2="${x}" y2="360"/>`
  for (let y = 80; y <= 360; y += 40) net += `<line x1="120" y1="${y}" x2="680" y2="${y}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" viewBox="0 0 ${w} ${h}">${defs(p, key)}
<rect width="${w}" height="${h}" fill="url(#gr${key})"/>
${stripes(8, w, h, key)}
<rect x="100" y="60" width="600" height="310" rx="8" fill="rgba(255,255,255,0.06)" stroke="${p.line}" stroke-width="10"/>
<g stroke="rgba(255,255,255,0.55)" stroke-width="2">${net}</g>
<circle cx="400" cy="430" r="26" fill="#ffffff"/>
<path d="M400 404 l9 12 h14 l-11 10 4 14 -16-8 -16 8 4-14 -11-10 h14 z" fill="#111827"/>
<rect width="${w}" height="${h}" fill="rgba(255,255,255,0.02)"/>
</svg>`
}

// ---- Angle 4: stands ----
function stands(p, key) {
  const w = 800, h = 500
  let seats = ''
  const colors = ['#c0392b', '#e67e22', '#f1c40f', '#27ae60', '#2980b9', '#8e44ad']
  for (let row = 0; row < 9; row++) {
    for (let i = 0; i < 26; i++) {
      const c = colors[(row + i) % colors.length]
      seats += `<rect x="${20 + i * 30}" y="${120 + row * 26}" width="22" height="16" rx="3" fill="${c}" opacity="0.85"/>`
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" viewBox="0 0 ${w} ${h}">${defs(p, key)}
<rect width="${w}" height="360" fill="url(#sky${key})"/>
<rect width="${w}" height="40" fill="rgba(255,255,255,0.25)"/>
${seats}
<rect y="350" width="${w}" height="10" fill="rgba(0,0,0,0.25)"/>
<rect y="360" width="${w}" height="140" fill="url(#gr${key})"/>
<g fill="none" stroke="${p.line}" stroke-width="3"><line x1="0" y1="470" x2="${w}" y2="470"/><rect x="300" y="420" width="200" height="50" fill="none"/></g>
<g>${floodlight(100, 60, key)}${floodlight(400, 60, key)}${floodlight(700, 60, key)}</g>
</svg>`
}

// ---- Angle 5: night ----
function night(p, key) {
  const w = 800, h = 500
  const pn = { ...p, line: 'rgba(215,255,230,0.85)' }
  return `<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" viewBox="0 0 ${w} ${h}">${defs(pn, key + 'n')}
<rect width="${w}" height="${h}" fill="#0c1f16"/>
<rect y="0" width="${w}" height="90" fill="url(#sky${key}n)"/>
<circle cx="150" cy="46" r="3" fill="#fff" opacity="0.8"/><circle cx="320" cy="30" r="2.5" fill="#fff" opacity="0.7"/><circle cx="520" cy="52" r="3" fill="#fff" opacity="0.8"/><circle cx="680" cy="34" r="2.5" fill="#fff" opacity="0.7"/>
<rect y="90" width="${w}" height="${h - 90}" fill="url(#gr${key}n)"/>
${stripes(10, w, h - 90, key)}
<g fill="none" stroke="${pn.line}" stroke-width="3">
<rect x="48" y="130" width="${w - 96}" height="${h - 170}" rx="6"/>
<line x1="${w / 2}" y1="130" x2="${w / 2}" y2="${h - 40}"/>
<circle cx="${w / 2}" cy="305" r="60"/>
</g>
${floodlight(80, 60, key + 'n', 1.4)}${floodlight(400, 40, key + 'n', 1.6)}${floodlight(720, 60, key + 'n', 1.4)}
<ellipse cx="400" cy="60" rx="330" ry="46" fill="url(#lamp${key}n)" opacity="0.55"/>
</svg>`
}

function floodlight(x, y, key, s = 1) {
  return `<g transform="translate(${x},${y}) scale(${s})">
<rect x="-3" y="0" width="6" height="70" fill="#455a64"/>
<rect x="-26" y="-18" width="52" height="20" rx="5" fill="#37474f"/>
<circle cx="-14" cy="-8" r="5" fill="#fff8dc"/><circle cx="0" cy="-8" r="5" fill="#fff8dc"/><circle cx="14" cy="-8" r="5" fill="#fff8dc"/>
<ellipse cx="0" cy="-6" rx="52" ry="30" fill="url(#lamp${key})" opacity="0.8"/>
</g>`
}

// ---- Team crest: shield + ball + stripes (no letters) ----
function crest(i) {
  const c1 = ['#0e7a43', '#14532d', '#b45309', '#1d4ed8', '#9f1239', '#4c1d95'][i % 6]
  const c2 = ['#0c241a', '#052e16', '#78350f', '#1e3a8a', '#881337', '#2e1065'][i % 6]
  return `<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" viewBox="0 0 120 132">
<defs><linearGradient id="c${i}" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
<path d="M60 4 L112 22 V66 C112 96 92 116 60 128 C28 116 8 96 8 66 V22 Z" fill="url(#c${i})" stroke="#ffffff" stroke-width="5"/>
<path d="M38 8 V116 M82 8 V116" stroke="rgba(255,255,255,0.28)" stroke-width="9"/>
<circle cx="60" cy="58" r="26" fill="#ffffff"/>
<path d="M60 38 l14 10 -5 17 h-18 l-5-17 z" fill="${c2}"/>
<path d="M60 32 v6 M84 48 l-10 4 M74 76 l7 9 M46 76 l-7 9 M36 48 l10 4" stroke="${c2}" stroke-width="3"/>
<path d="M28 96 C44 108 76 108 92 96" stroke="#fbbf24" stroke-width="7" fill="none"/>
</svg>`
}

// 3 palettes × 5 angles for variety across venues
for (let v = 0; v < 6; v++) {
  const p = P[v % P.length]
  const set = [aerial(p, 'a' + v), corner(p, 'b' + v), goal(p, 'c' + v), stands(p, 'd' + v), night(p, 'e' + v)]
  set.forEach((svg, i) => fs.writeFileSync(path.join(outPh, `v${v}-${i + 1}.svg`), svg))
}
for (let i = 0; i < 6; i++) fs.writeFileSync(path.join(outLogo, `crest-${i + 1}.svg`), crest(i))

console.log('venue photos + crests generated')
