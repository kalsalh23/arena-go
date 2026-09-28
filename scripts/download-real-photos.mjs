// Downloads real stadium photos (Wikimedia Commons, free licenses) for the demo venues
// + the splash background (Messi & Ronaldo face-off, CC BY 3.0).
import { writeFileSync, mkdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const outDir = join(process.cwd(), 'public', 'demo', 'real')
mkdirSync(outDir, { recursive: true })

const VENUES = {
  v1: [
    'FC Barcelona, Camp Nou 01.jpg',
    'FC Barcelona, Camp Nou 02.jpg',
    'FC Barcelona, Camp Nou 03.jpg',
    'FC Barcelona, Camp Nou 05.jpg',
    'FC Barcelona, Camp Nou 09.jpg',
  ],
  v2: [
    'Allianz Arena at night, lit in red.JPG',
    'Allianz Arena by night.jpg',
    'Allianz Arena at Night (168589194).jpg',
    'Allianz Arena by night 1. (4967797446).jpg',
    'Allianz Arena illuminated red at night - Munich, Germany.jpg',
  ],
  v3: [
    'Santiago Bernabéu Stadium 0.JPG',
    'Madrid Santiago Bernabéu Stadium 1.jpg',
    'Santiago Bernabéu Stadium view Sideview 5, Madrid in 2019.jpg',
    'Estadio Santiago Bernabéu - 01.jpg',
    'Santiago Bernabéu Stadium 8.JPG',
  ],
  v4: [
    'Mecz piłkarski Wisła Kraków - Zagłębie Sosnwoiec, 28 października 2022, Pożegnanie Stadionu Ludowego, KP.jpg',
    'Saputo Stadium Impact New York 2012-07-28.jpg',
    'Swangard Stadium for Vancouver Rise FC soccer game.png',
    'Bobcat Stadium - Montana State University - Bozeman, Montana - 2013-07-09.jpg',
    'RWS at night.jpg',
  ],
  v5: [
    'Bank of America Stadium, Charlotte, North Carolina (47543696161).jpg',
    'Bank of America Stadium, Charlotte, North Carolina (46820059464).jpg',
    'Bank of America Stadium, Charlotte, North Carolina (47543695591).jpg',
    'Michigan Stadium, University of Michigan, Ann Arbor, Michigan (21123566963).jpg',
    'Bank of America Stadium, Charlotte, North Carolina (47490942382).jpg',
  ],
}

const SPLASH = 'Cristiano Ronaldo (L), Lionel Messi (R) – Portugal vs. Argentina, 9th February 2011 (1).jpg'

async function download(filename, dest, width) {
  const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=${width}`
  const r = await fetch(url, { headers: { 'User-Agent': 'ArenaGo/1.0 (demo; contact: kosaialsalh1@gmail.com)' }, redirect: 'follow' })
  if (!r.ok) throw new Error(`${r.status} for ${filename}`)
  const buf = Buffer.from(await r.arrayBuffer())
  if (buf.length < 8000) throw new Error(`too small (${buf.length}b) for ${filename}`)
  writeFileSync(dest, buf)
  return buf.length
}

let ok = 0, fail = 0
for (const [v, files] of Object.entries(VENUES)) {
  for (let i = 0; i < files.length; i++) {
    const dest = join(outDir, `${v}-${i + 1}.jpg`)
    try {
      const size = await download(files[i], dest, 1000)
      console.log(`✓ ${v}-${i + 1}.jpg  ${(size / 1024).toFixed(0)} KB`)
      ok++
    } catch (e) {
      console.log(`✗ ${v}-${i + 1}: ${e.message}`)
      fail++
    }
  }
}

try {
  const size = await download(SPLASH, join(outDir, '..', 'splash-stars.jpg'), 1600)
  console.log(`✓ splash-stars.jpg  ${(size / 1024).toFixed(0)} KB`)
  ok++
} catch (e) {
  console.log('✗ splash: ' + e.message)
  fail++
}

console.log(`\nDONE — ${ok} downloaded, ${fail} failed`)
