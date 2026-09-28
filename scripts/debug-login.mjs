const URL = 'https://bptovjzwozkbsmjdmqfd.supabase.co'
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwdG92anp3b3prYnNtamRtcWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0Njc0MjUsImV4cCI6MjEwNjA0MzQyNX0.8BFRiyhEC_Oo6kLkOedMYiP2tQxo5un3BK0GD-GPawE'
async function login(phone, password) {
  const r = await fetch(URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: phone + '@phone.arenago.app', password }),
  })
  const j = await r.json()
  console.log(phone, r.status, 'tokenParts:', (j.access_token || 'NONE').split('.').length, j.error || j.msg || '')
}
await login('963900000021', 'Aren4Go!Demo#2026')
await login('963900000035', 'Aren4Go!Demo#2026')
