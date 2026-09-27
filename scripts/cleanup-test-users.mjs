// Cleanup E2E test users/data (idempotent)
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const REF = 'bptovjzwozkbsmjdmqfd'
async function db(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  const t = await r.text()
  console.log(r.status, t.slice(0, 300))
  if (r.status !== 200 && r.status !== 201) process.exit(1)
}
const phones = ['963900000011', '963900000012', '963900000013', '963900000014']
const list = '(' + phones.map((p) => `'${p}'`).join(',') + ')'
const u = `select user_id from user_phones where phone in ${list}`
await db(`delete from bookings where venue_id in (select id from venues where owner_id in (${u}))`)
await db(`delete from bookings where user_id in (${u})`)
await db(`delete from tournaments where owner_id in (${u})`)
await db(`delete from venues where owner_id in (${u})`)
await db(`delete from teams where captain_id in (${u})`)
await db(`delete from notifications where user_id in (${u})`)
await db(`delete from join_requests where player_id in (${u})`)
await db(`delete from auth.users where id in (${u})`)
console.log('cleanup complete')
