// Quick test of admin_create_venue_owner RPC: create → login → cleanup.
const SUPABASE_URL = 'https://bptovjzwozkbsmjdmqfd.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwdG92anp3b3prYnNtamRtcWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0Njc0MjUsImV4cCI6MjEwNjA0MzQyNX0.8BFRiyhEC_Oo6kLkOedMYiP2tQxo5un3BK0GD-GPawE'
const MGMT_TOKEN = process.env.SUPABASE_ACCESS_TOKEN
if (!MGMT_TOKEN) { console.error('set SUPABASE_ACCESS_TOKEN'); process.exit(1) }

const ADMIN_PHONE = '963900000001'
const ADMIN_PASSWORD = 'Aren4Go!Admin#2026'
const TEST_PHONE = '963900000099'
const TEST_PASSWORD = 'Wh@tsAppTest77'

async function login(phone, password) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `${phone}@phone.arenago.app`, password }),
  })
  return { status: r.status, body: await r.json() }
}

// 1. admin login
const admin = await login(ADMIN_PHONE, ADMIN_PASSWORD)
if (!admin.body.access_token) { console.error('admin login failed', admin); process.exit(1) }
console.log('admin login: OK')

// 2. create venue owner
const cr = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_create_venue_owner`, {
  method: 'POST',
  headers: { apikey: ANON_KEY, Authorization: `Bearer ${admin.body.access_token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ p_phone: TEST_PHONE, p_full_name: 'صاحب ملعب واتساب (اختبار)', p_password: TEST_PASSWORD }),
})
console.log('create:', cr.status, await cr.text())

// 3. login as the created owner
const owner = await login(TEST_PHONE, TEST_PASSWORD)
console.log('owner login:', owner.status, owner.body.user?.id ?? JSON.stringify(owner.body).slice(0, 150))

// 4. check profile role
const pf = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=full_name,role&id=eq.${owner.body.user?.id}`, {
  headers: { apikey: ANON_KEY, Authorization: `Bearer ${owner.body.access_token}` },
})
console.log('profile:', await pf.text())

// 5. cleanup
const del = await fetch(`https://api.supabase.com/v1/projects/bptovjzwozkbsmjdmqfd/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${MGMT_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: `delete from auth.users where id = '${owner.body.user?.id}'` }),
})
console.log('cleanup:', del.status, (await del.text()).slice(0, 100))
