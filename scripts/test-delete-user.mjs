// Verify admin_delete_user RPC end-to-end: deletes the test owner account.
const SUPABASE_URL = 'https://bptovjzwozkbsmjdmqfd.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwdG92anp3b3prYnNtamRtcWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0Njc0MjUsImV4cCI6MjEwNjA0MzQyNX0.8BFRiyhEC_Oo6kLkOedMYiP2tQxo5un3BK0GD-GPawE'
const MGMT_TOKEN = process.env.SUPABASE_ACCESS_TOKEN

async function login(identifier, password) {
  const email = identifier.includes('@') ? identifier : `${identifier}@phone.arenago.app`
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const j = await r.json()
  if (!j.access_token) throw new Error('login failed: ' + JSON.stringify(j).slice(0, 150))
  return j
}

const admin = await login('kosaialsalh1@gmail.com', 'Oday2001#')
const H = { apikey: ANON_KEY, Authorization: `Bearer ${admin.access_token}`, 'Content-Type': 'application/json' }

// find test owner أبو أحمد (963955123456) via his venues' owner_id
const venues = await (await fetch(`${SUPABASE_URL}/rest/v1/venues?select=id,name,owner_id&owner_id=not.is.null`, { headers: H })).json()
// find the user by checking profiles (can't see phone); use management API to locate phone
async function db(sql) {
  const r = await fetch('https://api.supabase.com/v1/projects/bptovjzwozkbsmjdmqfd/database/query', {
    method: 'POST', headers: { Authorization: `Bearer ${MGMT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  return JSON.parse(await r.text())
}
const target = await db(`select user_id from user_phones where phone = '963955123456'`)
if (!target.length) { console.log('target not found (already deleted) — OK'); process.exit(0) }
const uid = target[0].user_id

const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_delete_user`, {
  method: 'POST', headers: H, body: JSON.stringify({ p_user: uid }),
})
console.log('delete rpc:', r.status, await r.text())

// verify gone everywhere
const gone = await db(`select
  (select count(*)::int from auth.users where id = '${uid}') as auth_user,
  (select count(*)::int from public.profiles where id = '${uid}') as profile,
  (select count(*)::int from public.venues where owner_id = '${uid}') as venues`)
console.log('remaining rows:', JSON.stringify(gone[0]))
