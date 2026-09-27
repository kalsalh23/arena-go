const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const REF = 'bptovjzwozkbsmjdmqfd'
async function db(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  console.log(r.status, await r.text())
}
await db(`
select column_name, is_generated, generation_expression, is_nullable, data_type
from information_schema.columns
where table_schema = 'auth' and table_name = 'users'
  and column_name in ('email','email_change','phone','phone_change','is_sso_user','instance_id')
order by column_name;
`)
