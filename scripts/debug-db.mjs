const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const REF = 'bptovjzwozkbsmjdmqfd'
async function db(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  const t = await r.text()
  console.log(r.status, t)
}
console.log('--- match_events ---')
await db("select match_id, player_id, team_id, event_type from match_events order by created_at desc limit 8")
console.log('--- player_stats ---')
await db("select player_id, goals, assists, matches_played from tournament_player_stats limit 8")
console.log('--- recent matches ---')
await db("select id, home_score, away_score, status, result_entered_by from tournament_matches where status='completed' order by updated_at desc limit 3")
