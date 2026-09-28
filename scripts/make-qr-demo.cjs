// Generates a fake (demo-only) Sham-Cash QR-looking SVG.
const fs = require('fs')
const path = require('path')

// deterministic PRNG so the file is stable
let seed = 20260927
const rnd = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff
  return seed / 0x7fffffff
}

const N = 25 // modules
const cell = 8
const size = N * cell
let rects = ''

const inFinder = (x, y) => (x < 7 && y < 7) || (x >= N - 7 && y < 7) || (x < 7 && y >= N - 7)
const inTiming = (x, y) => x === 6 || y === 6

for (let y = 0; y < N; y++) {
  for (let x = 0; x < N; x++) {
    if (inFinder(x, y)) continue
    if (inTiming(x, y)) {
      if ((x + y) % 2 === 0) rects += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}"/>`
      continue
    }
    if (rnd() < 0.45) rects += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}"/>`
  }
}

function finder(cx, cy) {
  return `
  <rect x="${cx * cell}" y="${cy * cell}" width="${7 * cell}" height="${7 * cell}" rx="${cell}"/>
  <rect x="${(cx + 1) * cell}" y="${(cy + 1) * cell}" width="${5 * cell}" height="${5 * cell}" fill="#fff"/>
  <rect x="${(cx + 2) * cell}" y="${(cy + 2) * cell}" width="${3 * cell}" height="${3 * cell}" rx="${cell}"/>
  `
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
<rect width="${size}" height="${size}" fill="#ffffff"/>
<g fill="#111827">${rects}${finder(0, 0)}${finder(N - 7, 0)}${finder(0, N - 7)}</g>
<text x="${size / 2}" y="${size - 6}" text-anchor="middle" font-size="26" font-weight="700" fill="#0e7a43" font-family="Arial">Sham Cash — DEMO</text>
</svg>`

const out = path.join(process.cwd(), 'public', 'demo', 'qr-shamcash.svg')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, svg)
console.log('demo QR written:', out)
