const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
async function db(sql) {
  const r = await fetch('https://api.supabase.com/v1/projects/bptovjzwozkbsmjdmqfd/database/query', {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  console.log(r.status, (await r.text()).slice(0, 900))
}
await db(`
select p.full_name, p.role, count(v.id)::int as venues
from profiles p left join venues v on v.owner_id = p.id
where p.role = 'venue_owner'
group by p.id, p.full_name, p.role
`)
