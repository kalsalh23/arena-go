// Update demo venues with 5-angle photo sets and demo teams with real crests.
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
if (!TOKEN) { console.error('set SUPABASE_ACCESS_TOKEN'); process.exit(1) }
async function db(sql) {
  const r = await fetch('https://api.supabase.com/v1/projects/bptovjzwozkbsmjdmqfd/database/query', {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  const t = await r.text()
  console.log(r.status, t.slice(0, 300))
  if (r.status !== 200 && r.status !== 201) process.exit(1)
  return t ? JSON.parse(t) : []
}

const arr = (base) => `array['/demo/ph/${base}-1.svg','/demo/ph/${base}-2.svg','/demo/ph/${base}-3.svg','/demo/ph/${base}-4.svg','/demo/ph/${base}-5.svg']`

// map each demo venue (by name) to a photo set
const sets = [
  ["ملعب النخبة الإمام", 'v0'],
  ["ملعب الشهيد محمد", 'v1'],
  ["ملعب السلام", 'v2'],
  ["ملعب الفيصل", 'v3'],
  ["ملعب النور", 'v4'],
]
for (const [name, base] of sets) {
  await db(`update public.venues set images = ${arr(base)} where name = '${name}' returning name`)
}

// teams → crests (by creation order)
await db(`
with ranked as (
  select id, row_number() over (order by created_at) rn
  from teams where captain_id in (select user_id from user_phones where phone like '96390000003%')
)
update teams t set logo_url = '/demo/logos/crest-' || ((rn - 1) % 6 + 1) || '.svg'
from ranked r where t.id = r.id returning t.name, t.logo_url
`)
console.log('done')
