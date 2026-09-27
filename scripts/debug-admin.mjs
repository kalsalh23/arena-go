const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const REF = 'bptovjzwozkbsmjdmqfd'
async function db(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  const t = await r.text()
  console.log(r.status, t.slice(0, 500))
}
await db("select u.id, u.email, p.role from auth.users u left join public.profiles p on p.id = u.id where u.email like '963900000001@%'")
await db("select count(*)::int c from auth.users")
