// Misc Supabase Management API helpers used during setup.
// Requires SUPABASE_ACCESS_TOKEN in the environment (never commit tokens).
import { readFileSync } from 'node:fs'

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const REF = 'bptovjzwozkbsmjdmqfd'
const cmd = process.argv[2]

if (!TOKEN) {
  console.error('Missing SUPABASE_ACCESS_TOKEN env var')
  process.exit(1)
}

async function api(path, method = 'GET', body = null) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  console.log(`[${method}] ${path} -> ${res.status}`)
  try { console.log(JSON.stringify(JSON.parse(text), null, 2)) } catch { console.log(text) }
  return { status: res.status, text }
}

switch (cmd) {
  case 'auth-config': {
    await api('/config/auth', 'PATCH', {
      mailer_autoconfirm: true,
      external_anonymous_users_enabled: false,
    })
    break
  }
  case 'sql': {
    const sql = readFileSync(process.argv[3], 'utf8')
    const r = await api('/database/query', 'POST', { query: sql })
    process.exit(r.status === 200 ? 0 : 1)
    break
  }
  default:
    console.log('usage: node scripts/supabase-admin.mjs [auth-config|sql file.sql]')
}
