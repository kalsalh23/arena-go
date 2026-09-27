// Generates demo pitch SVGs (public/demo) — varied aerial football-pitch looks.
const fs = require('fs')
const path = require('path')

const palettes = [
  { a: '#1d7a43', b: '#14532d', line: 'rgba(255,255,255,0.85)' },
  { a: '#238a4c', b: '#0f3f24', line: 'rgba(255,255,255,0.8)' },
  { a: '#2a6e3f', b: '#123826', line: 'rgba(240,255,245,0.85)' },
  { a: '#1a6b3c', b: '#0b2e1c', line: 'rgba(255,255,255,0.75)' },
  { a: '#2f8a52', b: '#154f2e', line: 'rgba(255,255,255,0.85)' },
  { a: '#176b3a', b: '#0d3520', line: 'rgba(255,255,255,0.8)' },
]

function pitch(i, [w, h]) {
  const p = palettes[i % palettes.length]
  const gid = `g${i}_${w}`
  const stripes = []
  const n = 10
  for (let s = 0; s < n; s++) {
    if (s % 2 === 0) continue
    stripes.push(`<rect x="${(w / n) * s}" y="0" width="${w / n}" height="${h}" fill="rgba(255,255,255,0.045)"/>`)
  }
  const mx = w / 2, my = h / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
<defs>
<linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${p.a}"/><stop offset="1" stop-color="${p.b}"/>
</linearGradient>
<radialGradient id="${gid}l" cx="0.85" cy="0.08" r="0.7">
<stop offset="0" stop-color="rgba(255,244,214,0.28)"/><stop offset="1" stop-color="rgba(255,244,214,0)"/>
</radialGradient>
</defs>
<rect width="${w}" height="${h}" fill="url(#${gid})"/>
${stripes.join('\n')}
<rect width="${w}" height="${h}" fill="url(#${gid}l)"/>
<g fill="none" stroke="${p.line}" stroke-width="${Math.max(2, w / 240)}">
<rect x="${w * 0.06}" y="${h * 0.08}" width="${w * 0.88}" height="${h * 0.84}" rx="4"/>
<line x1="${mx}" y1="${h * 0.08}" x2="${mx}" y2="${h * 0.92}"/>
<circle cx="${mx}" cy="${my}" r="${Math.min(w, h) * 0.13}"/>
<circle cx="${mx}" cy="${my}" r="3" fill="${p.line}" stroke="none"/>
<rect x="${w * 0.06}" y="${h * 0.3}" width="${w * 0.14}" height="${h * 0.4}"/>
<rect x="${w * 0.8}" y="${h * 0.3}" width="${w * 0.14}" height="${h * 0.4}"/>
<rect x="${w * 0.06}" y="${h * 0.4}" width="${w * 0.055}" height="${h * 0.2}"/>
<rect x="${w * 0.885}" y="${h * 0.4}" width="${w * 0.055}" height="${h * 0.2}"/>
</g>
</svg>`
}

function badge(letter, i) {
  const p = palettes[(i + 2) % palettes.length]
  const gid = `b${i}`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
<defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${p.a}"/><stop offset="1" stop-color="${p.b}"/>
</linearGradient></defs>
<circle cx="60" cy="60" r="58" fill="url(#${gid})" stroke="rgba(255,255,255,0.55)" stroke-width="4"/>
<circle cx="60" cy="60" r="44" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2" stroke-dasharray="6 5"/>
<text x="60" y="76" text-anchor="middle" font-size="46" font-weight="800" fill="#ffffff" font-family="Arial">${letter}</text>
</svg>`
}

const out = path.join(process.cwd(), 'public', 'demo')
fs.mkdirSync(out, { recursive: true })
// venue covers (16:10-ish) + tournament covers
const sizes = [[800, 500], [800, 500], [800, 500], [800, 500], [800, 500], [800, 500]]
sizes.forEach(([w, h], i) => fs.writeFileSync(path.join(out, `venue-${i + 1}.svg`), pitch(i, [w, h])))
fs.writeFileSync(path.join(out, 'tournament-1.svg'), pitch(3, [900, 560]))
fs.writeFileSync(path.join(out, 'tournament-2.svg'), pitch(5, [900, 560]))
// team badges
const letters = ['أ', 'ش', 'ا', 'م']
letters.forEach((l, i) => fs.writeFileSync(path.join(out, `team-${i + 1}.svg`), badge(l, i)))
console.log('demo images written to public/demo')
