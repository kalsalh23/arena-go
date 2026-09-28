// Player books a slot via API — used to trigger a realtime notification for the owner.
const SUPABASE_URL = 'https://bptovjzwozkbsmjdmqfd.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwdG92anp3b3prYnNtamRtcWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0Njc0MjUsImV4cCI6MjEwNjA0MzQyNX0.8BFRiyhEC_Oo6kLkOedMYiP2tQxo5un3BK0GD-GPawE'

async function login(phone, password) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `${phone}@phone.arenago.app`, password }),
  })
  return (await r.json()).access_token
}
const player = await login('963900000035', 'Aren4Go!Demo#2026')
const venues = await (await fetch(`${SUPABASE_URL}/rest/v1/venues?select=id&limit=1`, { headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + player } })).json()
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
const start = process.argv[2] || '20:00:00'
const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/create_booking`, {
  method: 'POST',
  headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + player, 'Content-Type': 'application/json' },
  body: JSON.stringify({ p_venue_id: venues[0].id, p_date: tomorrow, p_start: start, p_hours: 1.5 }),
})
const text = await r.text()
console.log('booking:', r.status, text.slice(0, 120))
