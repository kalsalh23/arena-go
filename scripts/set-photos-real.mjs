// Point demo venues at the downloaded real stadium photos.
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
if (!TOKEN) { console.error('set SUPABASE_ACCESS_TOKEN'); process.exit(1) }
async function db(sql) {
  const r = await fetch('https://api.supabase.com/v1/projects/bptovjzwozkbsmjdmqfd/database/query', {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  const t = await r.text()
  console.log(r.status, t.slice(0, 200))
  if (r.status !== 200 && r.status !== 201) process.exit(1)
  return t ? JSON.parse(t) : []
}

const sets = [
  ["ملعب النخبة الإمام", 'v1'],
  ["ملعب الشهيد محمد", 'v2'],
  ["ملعب السلام", 'v3'],
  ["ملعب الفيصل", 'v4'],
  ["ملعب النور", 'v5'],
]
for (const [name, base] of sets) {
  const arr = `array[${[1, 2, 3, 4, 5].map((i) => `'/demo/real/${base}-${i}.jpg'`).join(',')}]`
  await db(`update public.venues set images = ${arr} where name = '${name}' returning name`)
}
console.log('venues now use real stadium photos')
