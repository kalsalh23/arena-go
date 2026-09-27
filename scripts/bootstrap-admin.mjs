// Bootstraps the Arena Go admin account:
// 1. Signs up via the public auth API (fires handle_new_user trigger → profile)
// 2. Promotes the profile to role='admin' via the Management API
//
// Usage (tokens/phone read from env — never commit secrets):
//   ADMIN_PHONE=9639XXXXXXXX ADMIN_PASSWORD=... SUPABASE_ACCESS_TOKEN=sbp_... node scripts/bootstrap-admin.mjs
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://bptovjzwozkbsmjdmqfd.supabase.co'
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const MGMT_TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'bptovjzwozkbsmjdmqfd'
const ADMIN_PHONE = process.env.ADMIN_PHONE
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

if (!ANON_KEY || !MGMT_TOKEN || !ADMIN_PHONE || !ADMIN_PASSWORD) {
  console.error('Required env vars: VITE_SUPABASE_ANON_KEY, SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF, ADMIN_PHONE, ADMIN_PASSWORD')
  process.exit(1)
}

const syntheticEmail = (phone) => `${phone}@phone.arenago.app`

// 1. signup
let res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
  method: 'POST',
  headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: syntheticEmail(ADMIN_PHONE),
    password: ADMIN_PASSWORD,
    data: { phone: ADMIN_PHONE, full_name: 'مدير Arena Go', role: 'player' },
  }),
})
const signup = await res.json()
console.log('signup:', res.status, signup.user?.id ?? JSON.stringify(signup).slice(0, 200))
if (!signup.user?.id) {
  // already exists? try login instead
  res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: syntheticEmail(ADMIN_PHONE), password: ADMIN_PASSWORD }),
  })
  const login = await res.json()
  if (!login.user?.id) {
    console.error('could not create or login admin user')
    process.exit(1)
  }
  signup.user = login.user
}

// 2. promote to admin
res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${MGMT_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `update public.profiles set role='admin', full_name='مدير Arena Go' where id='${signup.user.id}' returning id, role;`,
  }),
})
console.log('promote:', res.status, await res.text())
