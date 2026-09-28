// Test fixed booking slots: 90-minute bookings + 10-minute gap enforcement.
const SUPABASE_URL = 'https://bptovjzwozkbsmjdmqfd.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwdG92anp3b3prYnNtamRtcWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0Njc0MjUsImV4cCI6MjEwNjA0MzQyNX0.8BFRiyhEC_Oo6kLkOedMYiP2tQxo5un3BK0GD-GPawE'
const MGMT_TOKEN = process.env.SUPABASE_ACCESS_TOKEN
if (!MGMT_TOKEN) { console.error('set SUPABASE_ACCESS_TOKEN'); process.exit(1) }

async function db(sql) {
  const r = await fetch('https://api.supabase.com/v1/projects/bptovjzwozkbsmjdmqfd/database/query', {
    method: 'POST', headers: { Authorization: `Bearer ${MGMT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  const t = await r.text()
  if (r.status !== 200 && r.status !== 201) throw new Error('db: ' + t.slice(0, 250))
  return t ? JSON.parse(t) : []
}

async function login(phone, password) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `${phone}@phone.arenago.app`, password }),
  })
  const j = await r.json()
  if (!j.access_token) throw new Error('login failed ' + phone + ': ' + JSON.stringify(j).slice(0, 150))
  return j.access_token
}
async function rpc(name, args, token) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  })
  const t = await r.text()
  return { ok: r.ok, status: r.status, text: t ? JSON.parse(t) : null, raw: t }
}
async function rest(table, qs, token, method = 'GET', body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${qs}`, {
    method,
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const t = await r.text()
  if (!r.ok) throw new Error(`rest ${table}: ${r.status} ${t.slice(0, 200)}`)
  return t ? JSON.parse(t) : null
}

const player = await login('963900000035', 'Aren4Go!Demo#2026')
const owner = await login('963900000021', 'Aren4Go!Demo#2026')
const venues = await rest('venues', '?select=id,name,price_per_hour&limit=5', owner)
const venue = venues[0]
const venueId = venue.id
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

// pre-cleanup: clear tomorrow's bookings on this demo venue
await db(`delete from bookings where venue_id = '${venueId}' and booking_date = '${tomorrow}'`)

const expectedFull = Math.round(venue.price_per_hour * 1.5)

let pass = 0
const ok = (name, cond, extra = '') => {
  console.log((cond ? '  ✓ ' : '  ✗ FAIL: ') + name + (cond ? '' : ' ' + extra))
  if (cond) pass++
  else process.exitCode = 1
}

// 1. 18:00 → fixed 90-min slot
const b1 = await rpc('create_booking', { p_venue_id: venueId, p_date: tomorrow, p_start: '18:00:00', p_hours: 1.5 }, player)
ok('booking at 18:00 created', !!b1.text, b1.raw)
if (b1.text) {
  const rows = await rest('bookings', `?select=start_time,end_time,duration_hours,full_price,deposit_amount&id=eq.${b1.text}`, player)
  ok('end_time = 19:30 (90 min)', rows[0]?.end_time === '19:30:00', JSON.stringify(rows[0]))
  ok('duration = 1.5', Number(rows[0]?.duration_hours) === 1.5)
  ok(`full = ${expectedFull} (${venue.price_per_hour} × 1.5)`, rows[0]?.full_price === expectedFull, JSON.stringify(rows[0]))

  // 2. 19:40 (exactly 10-min gap after 19:30) → allowed
  const b2 = await rpc('create_booking', { p_venue_id: venueId, p_date: tomorrow, p_start: '19:40:00', p_hours: 1.5 }, player)
  ok('booking at 19:40 (exact 10-min gap) allowed', !!b2.text, b2.raw)

  // 3. 19:20 (overlaps) → blocked by 10-min gap rule
  const b3 = await rpc('create_booking', { p_venue_id: venueId, p_date: tomorrow, p_start: '19:20:00', p_hours: 1.5 }, player)
  ok('overlapping booking blocked with gap message', !b3.ok && b3.raw.includes('10 دقائق'), b3.raw)

  // 4. same start again → double booking blocked
  const b4 = await rpc('create_booking', { p_venue_id: venueId, p_date: tomorrow, p_start: '18:00:00', p_hours: 1.5 }, player)
  ok('same slot double-booking blocked', !b4.ok)

  // cleanup
  await db(`delete from bookings where venue_id = '${venueId}' and booking_date = '${tomorrow}'`)
}
console.log(`\nDONE — ${pass} assertions passed${process.exitCode === 1 ? ' (WITH FAILURES)' : ''} (cleaned up)`)
