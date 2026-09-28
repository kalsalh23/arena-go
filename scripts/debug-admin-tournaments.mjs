// Reproduce the admin tournaments query as the admin user
const SUPABASE_URL = 'https://bptovjzwozkbsmjdmqfd.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwdG92anp3b3prYnNtamRtcWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0Njc0MjUsImV4cCI6MjEwNjA0MzQyNX0.8BFRiyhEC_Oo6kLkOedMYiP2tQxo5un3BK0GD-GPawE'

const lr = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'kosaialsalh1@gmail.com', password: 'Oday2001#' }),
})
const admin = await lr.json()

const q = encodeURIComponent('*,venue:venues(name),village:villages(name),owner:profiles(full_name)')
const r = await fetch(`${SUPABASE_URL}/rest/v1/tournaments?select=${q}&order=created_at.desc&limit=60`, {
  headers: { apikey: ANON_KEY, Authorization: `Bearer ${admin.access_token}` },
})
console.log('status:', r.status)
console.log('body:', (await r.text()).slice(0, 400))
