const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
async function db(sql) {
  const r = await fetch('https://api.supabase.com/v1/projects/bptovjzwozkbsmjdmqfd/database/query', {
    method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  console.log(r.status, (await r.text()).slice(0, 600))
}
await db("select tt.status, count(*)::int c from tournament_teams tt group by tt.status")
await db("select t.name, count(tt.id)::int c from tournaments t left join tournament_teams tt on tt.tournament_id = t.id group by t.name")
