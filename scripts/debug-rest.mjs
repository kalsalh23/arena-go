const URLBASE = 'https://bptovjzwozkbsmjdmqfd.supabase.co'
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwdG92anp3b3prYnNtamRtcWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0Njc0MjUsImV4cCI6MjEwNjA0MzQyNX0.8BFRiyhEC_Oo6kLkOedMYiP2tQxo5un3BK0GD-GPawE'

async function login(phone, password) {
  const r = await fetch(URLBASE + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: phone + '@phone.arenago.app', password }),
  })
  return (await r.json()).access_token
}

const token = await login('963900000021', 'Aren4Go!Demo#2026')

// A: plain query
let r = await fetch(URLBASE + '/rest/v1/venues?select=id,name&limit=1', {
  headers: { apikey: KEY, Authorization: 'Bearer ' + token },
})
console.log('A plain:', r.status)

// B: encoded Arabic filter
r = await fetch(URLBASE + '/rest/v1/venues?select=id,name&name=eq.' + encodeURIComponent('ملعب النخبة الإمام'), {
  headers: { apikey: KEY, Authorization: 'Bearer ' + token },
})
console.log('B arabic-encoded:', r.status, (await r.text()).slice(0, 120))

// C: raw Arabic in query (not encoded)
r = await fetch(URLBASE + '/rest/v1/venues?select=id,name&name=eq.ملعب النخبة الإمام', {
  headers: { apikey: KEY, Authorization: 'Bearer ' + token },
})
console.log('C arabic-raw:', r.status, (await r.text()).slice(0, 120))
