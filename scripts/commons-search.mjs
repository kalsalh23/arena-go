// Search Wikimedia Commons API for free-license stadium & player photos.
async function search(term, limit = 12) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent('filetype:bitmap ' + term)}&gsrlimit=${limit}&gsrnamespace=6&prop=imageinfo&iiprop=url%7Cextmetadata%7Csize&iiurlwidth=1000&format=json&origin=*`
  const r = await fetch(url, { headers: { 'User-Agent': 'ArenaGo-demo/1.0' } })
  const j = await r.json()
  const pages = j.query?.pages || {}
  const out = []
  for (const p of Object.values(pages)) {
    const ii = p.imageinfo?.[0]
    if (!ii) continue
    const lic = ii.extmetadata?.LicenseShortName?.value || '?'
    out.push({ title: p.title, w: ii.width, h: ii.height, lic, thumb: ii.thumburl })
  }
  return out
}

const queries = process.argv.slice(2)
for (const q of queries) {
  console.log('\n=== ' + q + ' ===')
  const res = await search(q)
  for (const r of res) console.log(`[${r.lic}] ${r.w}x${r.h} ${r.title}\n   ${r.thumb}`)
}
