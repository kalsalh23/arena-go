// Seeds DEMO data for client presentation: venue owner, 5 venues, 4 teams
// (captains + 2 members each), and 1 open tournament with those teams.
// Idempotent: cleans previous demo data first. Run: node scripts/seed-demo.mjs
import { readFileSync } from 'node:fs'

const SUPABASE_URL = 'https://bptovjzwozkbsmjdmqfd.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwdG92anp3b3prYnNtamRtcWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0Njc0MjUsImV4cCI6MjEwNjA0MzQyNX0.8BFRiyhEC_Oo6kLkOedMYiP2tQxo5un3BK0GD-GPawE'
const MGMT_TOKEN = process.env.SUPABASE_ACCESS_TOKEN
if (!MGMT_TOKEN) { console.error('set SUPABASE_ACCESS_TOKEN'); process.exit(1) }

const DEMO_PASSWORD = 'Aren4Go!Demo#2026'
const OWNER = { phone: '963900000021', name: 'أبو سامر (تجريبي)' }
const CAPTAINS = [
  { phone: '963900000031', name: 'أحمد القبطان (تجريبي)' },
  { phone: '963900000032', name: 'محمود القبطان (تجريبي)' },
  { phone: '963900000033', name: 'ياسر القبطان (تجريبي)' },
  { phone: '963900000034', name: 'عمر القبطان (تجريبي)' },
]
const MEMBERS = [
  { phone: '963900000035', name: 'كريم لاعب (تجريبي)' },
  { phone: '963900000036', name: 'زياد لاعب (تجريبي)' },
  { phone: '963900000037', name: 'وسيم لاعب (تجريبي)' },
  { phone: '963900000038', name: 'طه لاعب (تجريبي)' },
  { phone: '963900000039', name: 'رامي لاعب (تجريبي)' },
  { phone: '963900000040', name: 'مازن لاعب (تجريبي)' },
  { phone: '963900000041', name: 'أنس لاعب (تجريبي)' },
  { phone: '963900000042', name: 'بلال لاعب (تجريبي)' },
]
const DEMO_PHONES = [OWNER.phone, ...CAPTAINS.map((c) => c.phone), ...MEMBERS.map((m) => m.phone)]

const emailOf = (p) => `${p}@phone.arenago.app`
const H = (token) => ({ apikey: ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' })

async function db(sql) {
  const r = await fetch('https://api.supabase.com/v1/projects/bptovjzwozkbsmjdmqfd/database/query', {
    method: 'POST', headers: { Authorization: `Bearer ${MGMT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  const t = await r.text()
  if (r.status !== 200 && r.status !== 201) throw new Error('db: ' + t.slice(0, 300))
  return t ? JSON.parse(t) : []
}
async function signup(phone, name, role) {
  let r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST', headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailOf(phone), password: DEMO_PASSWORD, data: { phone, full_name: name, role } }),
  })
  let j = await r.json()
  if (j.user?.id) return { id: j.user.id, token: j.access_token }
  r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailOf(phone), password: DEMO_PASSWORD }),
  })
  j = await r.json()
  if (!j.access_token) throw new Error('login failed ' + phone + ': ' + JSON.stringify(j).slice(0, 200))
  return { id: j.user.id, token: j.access_token }
}
async function rest(table, qs, token, method = 'GET', body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${qs}`, { method, headers: H(token), body: body ? JSON.stringify(body) : undefined })
  const t = await r.text()
  if (!r.ok) throw new Error(`rest ${table}: ${r.status} ${t.slice(0, 250)}`)
  return t ? JSON.parse(t) : null
}
async function rpc(name, args, token) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, { method: 'POST', headers: H(token), body: JSON.stringify(args) })
  const t = await r.text()
  if (!r.ok) throw new Error(`rpc ${name}: ${r.status} ${t.slice(0, 250)}`)
  return t ? JSON.parse(t) : null
}
const days = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)

console.log('— cleanup previous demo data —')
const ph = DEMO_PHONES.map((p) => `'${p}'`).join(',')
const uidList = `select user_id from user_phones where phone in (${ph})`
await db(`delete from tournaments where owner_id in (${uidList})`)
await db(`delete from bookings where venue_id in (select id from venues where owner_id in (${uidList}))`)
await db(`delete from venues where owner_id in (${uidList})`)
await db(`delete from teams where captain_id in (${uidList})`)
await db(`delete from notifications where user_id in (${uidList})`)
await db(`delete from join_requests where player_id in (${uidList})`)
await db(`delete from auth.users where id in (${uidList})`)

console.log('— demo users —')
const owner = await signup(OWNER.phone, OWNER.name, 'venue_owner')
const captainUsers = []
for (const c of CAPTAINS) captainUsers.push(await signup(c.phone, c.name, 'player'))
const memberUsers = []
for (const m of MEMBERS) memberUsers.push(await signup(m.phone, m.name, 'player'))

console.log('— villages —')
const villages = await rest('villages', '?select=id,name', owner.token)
const V = (n) => villages.find((v) => v.name === n).id

console.log('— venues —')
const venueSpecs = [
  { name: 'ملعب النخبة الإمام', village: 'طيبة الإمام', type: 'f11', price: 1500, img: '/demo/venue-1.svg', rating: 4.8, rc: 34 },
  { name: 'ملعب الشهيد محمد', village: 'طيبة الإمام', type: 'f7', price: 1000, img: '/demo/venue-2.svg', rating: 4.6, rc: 21 },
  { name: 'ملعب السلام', village: 'صوران', type: 'f5', price: 600, img: '/demo/venue-3.svg', rating: 4.4, rc: 17 },
  { name: 'ملعب الفيصل', village: 'صوران', type: 'f7', price: 1000, img: '/demo/venue-4.svg', rating: 4.5, rc: 25 },
  { name: 'ملعب النور', village: 'كفرنبودة', type: 'f5', price: 600, img: '/demo/venue-5.svg', rating: 4.2, rc: 9 },
]
const venueIds = []
for (const s of venueSpecs) {
  const v = await rest('venues', '?select=id', owner.token, 'POST', {
    owner_id: owner.id, name: s.name, village_id: V(s.village), venue_type: s.type,
    price_per_hour: s.price, deposit_percent: 20, open_time: '08:00:00', close_time: '23:00:00',
    images: [s.img], rating: s.rating, ratings_count: s.rc,
    amenities: ['إضاءة ليلية', 'مدرجات', 'استراحة', 'موقف سيارات'],
    phone: '0999000000', whatsapp: '963999000000',
    shamcash_number: '1200999999', shamcash_name: s.name, shamcash_active: true,
    shamcash_qr_url: '/demo/qr-shamcash.svg',
    description: 'ملعب تجريبي لأغراض العرض — عشب صناعي عالي الجودة مع إضاءة ليلية كاملة.',
  })
  venueIds.push(v[0].id)
}

console.log('— teams —')
const teamSpecs = [
  { name: 'فريق الأبطال', village: 'طيبة الإمام', captain: 0, members: [0, 1], logo: '/demo/team-1.svg' },
  { name: 'فريق الشباب', village: 'صوران', captain: 1, members: [2, 3], logo: '/demo/team-2.svg' },
  { name: 'فريق الاتحاد', village: 'كفرنبودة', captain: 2, members: [4, 5], logo: '/demo/team-3.svg' },
  { name: 'فريق المدينة', village: 'طيبة الإمام', captain: 3, members: [6, 7], logo: '/demo/team-4.svg' },
]
const teamIds = []
for (const s of teamSpecs) {
  const cap = captainUsers[s.captain]
  const t = await rest('teams', '?select=id,invite_code', cap.token, 'POST', {
    name: s.name, village_id: V(s.village), captain_id: cap.id, logo_url: s.logo,
    description: 'فريق تجريبي لأغراض العرض على العميل.',
  })
  teamIds.push(t[0].id)
  for (const mi of s.members) {
    const jr = await rest('join_requests', '?select=id', memberUsers[mi].token, 'POST', { team_id: t[0].id, player_id: memberUsers[mi].id })
    await rpc('approve_join_request', { p_request_id: jr[0].id }, cap.token)
  }
}

console.log('— tournament (approved + 4 teams) —')
const admin = await loginAdmin()
async function loginAdmin() {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: '963900000001@phone.arenago.app', password: process.env.ADMIN_PASSWORD || 'Aren4Go!Admin#2026' }),
  })
  const j = await r.json()
  if (!j.access_token) throw new Error('admin login failed: ' + JSON.stringify(j).slice(0, 200))
  return { id: j.user.id, token: j.access_token }
}
const t = await rest('tournaments', '?select=id', owner.token, 'POST', {
  owner_id: owner.id, venue_id: venueIds[0], village_id: V('طيبة الإمام'),
  name: 'بطولة كأس الشيخ حسن',
  description: 'بطولة تجريبية لأغراض العرض — جوائز قيمة ومستوى منافسة عالٍ.',
  logo_url: '/demo/tournament-1.svg',
  start_date: days(14), end_date: days(30), registration_deadline: days(10),
  max_teams: 8, registration_fee: 1000, tournament_type: 'groups', group_count: 2,
  players_per_team: 7, prize_description: 'الجائزة الأولى 500,000 ل.س',
  conditions: '• 8 فرق فقط\n• كل فريق 7 لاعبين كحد أقصى\n• يجب أن يكون الفريق مسجلاً في Arena Go\n• الالتزام بأخلاقيات الرياضة',
  status: 'pending_admin_approval',
})
const tId = t[0].id
await rpc('admin_review_tournament', { p_tournament_id: tId, p_decision: 'approved' }, admin.token)
for (let i = 0; i < teamIds.length; i++) {
  const cap = captainUsers[teamSpecs[i].captain]
  await rpc('register_team_in_tournament', { p_tournament_id: tId, p_team_id: teamIds[i] }, cap.token)
}
const ttRows = await db(`select tt.id from tournament_teams tt where tt.tournament_id = '${tId}' order by tt.joined_at`)
for (const row of ttRows) await rpc('review_tournament_team', { p_tt_id: row.id, p_decision: 'approved' }, owner.token)

const stat = await db(`select status from tournaments where id='${tId}'`)
console.log('tournament status:', stat[0].status)

console.log('\n✅ Demo data seeded:')
console.log('   5 venues (طيبة الإمام، صوران، كفرنبودة)')
console.log('   4 teams with 3 players each')
console.log('   1 open tournament (4/8 teams)')
console.log(`   Demo owner login: ${OWNER.phone} / ${DEMO_PASSWORD}`)
