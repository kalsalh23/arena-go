const URL = 'https://bptovjzwozkbsmjdmqfd.supabase.co'
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwdG92anp3b3prYnNtamRtcWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0Njc0MjUsImV4cCI6MjEwNjA0MzQyNX0.8BFRiyhEC_Oo6kLkOedMYiP2tQxo5un3BK0GD-GPawE'
const h = { apikey: KEY, Authorization: 'Bearer ' + KEY }

let r = await fetch(URL + '/rest/v1/villages?select=*', { headers: h })
console.log('villages:', r.status, (await r.text()).slice(0, 300))
r = await fetch(URL + '/rest/v1/profiles?select=*', { headers: h })
console.log('profiles(anon):', r.status, (await r.text()).slice(0, 300))
r = await fetch(URL + '/rest/v1/venues?select=*', { headers: h })
console.log('venues(anon):', r.status, (await r.text()).slice(0, 200))
r = await fetch(URL + '/rest/v1/rpc/check_phone_available', {
  method: 'POST',
  headers: { ...h, 'Content-Type': 'application/json' },
  body: JSON.stringify({ p_phone: '963900000000' }),
})
console.log('check_phone_available:', r.status, await r.text())
