const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
async function db(sql) {
  const r = await fetch('https://api.supabase.com/v1/projects/bptovjzwozkbsmjdmqfd/database/query', {
    method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  console.log(r.status, (await r.text()).slice(0, 700))
}
await db(`
select tt.id, tt.status, t.name as team_name, t.captain_id, up.phone as captain_phone
from tournament_teams tt
join teams t on t.id = tt.team_id
left join user_phones up on up.user_id = t.captain_id
where tt.status = 'pending'
`)
