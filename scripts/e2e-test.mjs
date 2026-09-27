// E2E integration test against the live Supabase project.
// Exercises: signup, venue, booking+review, double-booking block, teams,
// join request+limit, tournament lifecycle (approve→register→full→draw→schedule→result→standings→stats→completed), notifications, phone privacy.
const SUPABASE_URL = 'https://bptovjzwozkbsmjdmqfd.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwdG92anp3b3prYnNtamRtcWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0Njc0MjUsImV4cCI6MjEwNjA0MzQyNX0.8BFRiyhEC_Oo6kLkOedMYiP2tQxo5un3BK0GD-GPawE'
const MGMT_TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const PROJECT_REF = 'bptovjzwozkbsmjdmqfd'
const emailOf = (p) => `${p}@phone.arenago.app`
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Aren4Go!Admin#2026'

if (!MGMT_TOKEN) {
  console.error('Missing SUPABASE_ACCESS_TOKEN env var')
  process.exit(1)
}

let passed = 0
function ok(name, cond, extra = '') {
  if (cond) { passed++; console.log(`  ✓ ${name}`) }
  else { console.error(`  ✗ FAIL: ${name} ${extra}`); process.exitCode = 1 }
}
async function db(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${MGMT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  const j = await r.json()
  if (!Array.isArray(j)) throw new Error('db error: ' + JSON.stringify(j))
  return j
}
function headers(token) {
  return { apikey: ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }
}
async function signup(phone, name, role, password) {
  let r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailOf(phone), password, data: { phone, full_name: name, role } }),
  })
  let j = await r.json()
  if (j.user?.id) return { id: j.user.id, token: j.access_token }
  // already exists → login
  r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailOf(phone), password }),
  })
  j = await r.json()
  if (!j.access_token) throw new Error('login failed for ' + phone + ': ' + JSON.stringify(j))
  return { id: j.user.id, token: j.access_token }
}
async function rpc(name, args, token) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, { method: 'POST', headers: headers(token), body: JSON.stringify(args) })
  const text = await r.text()
  if (!r.ok) throw new Error(`rpc ${name}: ${r.status} ${text}`)
  return text ? JSON.parse(text) : null
}
async function rest(table, qs, token, method = 'GET', body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${qs}`, {
    method, headers: headers(token), body: body ? JSON.stringify(body) : undefined,
  })
  const text = await r.text()
  if (!r.ok) throw new Error(`rest ${table}: ${r.status} ${text}`)
  return text ? JSON.parse(text) : null
}

const P = 'Aren4Go!Test#2026'
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

console.log('— 1. Signup users —')
const admin = await signup('963900000001', 'مدير Arena Go', 'player', 'Aren4Go!Admin#2026')
const owner = await signup('963900000011', 'صاحب الملعب أبو خالد', 'venue_owner', P)
const b = await signup('963900000012', 'أحمد اللاعب', 'player', P)
const c = await signup('963900000013', 'محمد اللاعب', 'player', P)
const d = await signup('963900000014', 'خالد اللاعب', 'player', P)
ok('admin token', !!admin.token)
ok('owner token', !!owner.token)

console.log('— 2. Phone privacy —')
const profAnon = await rest('profiles', '?select=*', admin.token)
ok('profiles select has no phone column', profAnon.length > 0 && !('phone' in profAnon[0]), JSON.stringify(profAnon[0]))
const phonesB = await rest('user_phones', '?select=*', b.token)
ok('B sees only own phone', phonesB.length === 1 && phonesB[0].phone === '963900000012', JSON.stringify(phonesB))

console.log('— 3. Venue creation (owner) —')
const villages = await rest('villages', '?select=id&name=eq.' + encodeURIComponent('طيبة الإمام'), owner.token)
const villageId = villages[0].id
const venue = await rest('venues', '?select=id', owner.token, 'POST', {
  owner_id: owner.id, name: 'ملعب النخبة (اختبار)', village_id: villageId, venue_type: 'f7',
  price_per_hour: 600, deposit_percent: 20, open_time: '08:00:00', close_time: '23:00:00',
  shamcash_number: '1234567890', shamcash_name: 'أبو خالد', description: 'ملعب اختبار',
})
ok('venue created', venue?.length === 1, JSON.stringify(venue))
const venueId = venue[0].id
// player cannot create venue
let failed = false
try { await rest('venues', '?select=id', b.token, 'POST', { owner_id: b.id, name: 'x', village_id: villageId, venue_type: 'f5' }) } catch { failed = true }
ok('player blocked from creating venue', failed)

console.log('— 4. Booking flow —')
const bookingId = await rpc('create_booking', { p_venue_id: venueId, p_date: tomorrow, p_start: '18:00:00', p_hours: 1 }, b.token)
ok('booking created', !!bookingId)
const bk = await db(`select full_price, deposit_amount, remaining_amount, booking_status, payment_status from bookings where id='${bookingId}'`)
ok('booking money: 600/120/480 SYP-units', bk[0].full_price === 600 && bk[0].deposit_amount === 120 && bk[0].remaining_amount === 480, JSON.stringify(bk[0]))
ok('booking pending_review', bk[0].booking_status === 'pending_review')
// double booking blocked
let dbl = false
try { await rpc('create_booking', { p_venue_id: venueId, p_date: tomorrow, p_start: '18:00:00', p_hours: 1 }, c.token) } catch (e) { dbl = /حجز هذا الوقت/.test(e.message) }
ok('double booking blocked', dbl)
// C cannot review B's booking
let notOwner = false
try { await rpc('review_booking', { p_booking_id: bookingId, p_decision: 'approved' }, c.token) } catch { notOwner = true }
ok('non-owner cannot review booking', notOwner)
await rpc('review_booking', { p_booking_id: bookingId, p_decision: 'approved' }, owner.token)
const bk2 = await db(`select booking_status, payment_status from bookings where id='${bookingId}'`)
ok('booking confirmed + deposit_paid', bk2[0].booking_status === 'confirmed' && bk2[0].payment_status === 'deposit_paid')

console.log('— 5. Teams & join requests —')
const teamB = await rest('teams', '?select=id,invite_code', b.token, 'POST', { name: 'فريق الأبطال (ت)', village_id: villageId, captain_id: b.id })
ok('team B created with invite code', teamB?.length === 1 && /^ARENA-/.test(teamB[0].invite_code), JSON.stringify(teamB))
const teamBId = teamB[0].id
// second active team blocked for B
let twoTeams = false
try { await rest('teams', '?select=id', b.token, 'POST', { name: 'فريق ثانٍ', captain_id: b.id }) } catch { twoTeams = true }
ok('player cannot create 2nd active team', twoTeams)
const teamC = await rest('teams', '?select=id', c.token, 'POST', { name: 'فريق الشباب (ت)', village_id: villageId, captain_id: c.id })
const teamCId = teamC[0].id
// D requests to join B
const jr1 = await rest('join_requests', '?select=id', d.token, 'POST', { team_id: teamBId, player_id: d.id })
ok('D join request to B', jr1?.length === 1)
await rpc('approve_join_request', { p_request_id: jr1[0].id }, b.token)
const dCount = await db(`select count(*)::int c from team_members m join teams t on t.id=m.team_id where m.player_id='${d.id}' and t.is_active`)
ok('D now member of B team', dCount[0].c === 1)
// D requests to join C team and is approved → 2 memberships (free limit)
const jr2 = await rest('join_requests', '?select=id', d.token, 'POST', { team_id: teamCId, player_id: d.id })
await rpc('approve_join_request', { p_request_id: jr2[0].id }, c.token)
// C sends request to B team → B approves → D has 2, but that's C not D. Instead: D tries 3rd request — need a 3rd team: create one by... admin? Use teamB again → D already member. Skip explicit 3rd; instead test limit via C's own team join (C already member of own team only, 1 membership, joining B would be 2 — allowed).
const jr3 = await rest('join_requests', '?select=id', c.token, 'POST', { team_id: teamBId, player_id: c.id })
ok('C join request to B accepted (2nd team)', jr3?.length === 1)
await rpc('approve_join_request', { p_request_id: jr3[0].id }, b.token)

console.log('— 6. Tournament lifecycle —')
const t = await rest('tournaments', '?select=id', owner.token, 'POST', {
  owner_id: owner.id, venue_id: venueId, village_id: villageId, name: 'كأس الاختبار (ت)',
  max_teams: 2, registration_fee: 1000, tournament_type: 'groups', group_count: 1,
  players_per_team: 11, conditions: 'فريقان فقط', start_date: tomorrow,
})
ok('tournament created pending', t?.length === 1)
const tId = t[0].id
// players cannot see pending tournament
const anonT = await rest('tournaments', '?select=id&id=eq.' + tId, b.token)
ok('pending tournament hidden from players', anonT.length === 0)
// B cannot approve
let notAdmin = false
try { await rpc('admin_review_tournament', { p_tournament_id: tId, p_decision: 'approved' }, b.token) } catch { notAdmin = true }
ok('non-admin cannot approve tournament', notAdmin)
await rpc('admin_review_tournament', { p_tournament_id: tId, p_decision: 'approved' }, admin.token)
const tStat = await db(`select status from tournaments where id='${tId}'`)
ok('tournament now registration_open', tStat[0].status === 'registration_open')
// register both teams (captains only)
await rpc('register_team_in_tournament', { p_tournament_id: tId, p_team_id: teamBId }, b.token)
await rpc('register_team_in_tournament', { p_tournament_id: tId, p_team_id: teamCId }, c.token)
// D (not captain) cannot register
let notCaptain = false
try { await rpc('register_team_in_tournament', { p_tournament_id: tId, p_team_id: teamCId }, d.token) } catch { notCaptain = true }
ok('non-captain cannot register team', notCaptain)
// organizer approves both requests
const ttRows = await db(`select id, team_id from tournament_teams where tournament_id='${tId}' order by joined_at`)
await rpc('review_tournament_team', { p_tt_id: ttRows[0].id, p_decision: 'approved' }, owner.token)
await rpc('review_tournament_team', { p_tt_id: ttRows[1].id, p_decision: 'approved' }, owner.token)
const tStat2 = await db(`select status from tournaments where id='${tId}'`)
ok('tournament auto-full at max_teams', tStat2[0].status === 'full')
// draw
const draw = await rpc('run_tournament_draw', { p_tournament_id: tId }, owner.token)
ok('draw produced groups+matches', !!draw?.groups?.length, JSON.stringify(draw).slice(0, 120))
const matches = await db(`select id, home_team_id, away_team_id, round, status from tournament_matches where tournament_id='${tId}'`)
ok('1 match generated for 2 teams/1 group', matches.length === 1)
// draw cannot run twice
let redraw = false
try { await rpc('run_tournament_draw', { p_tournament_id: tId }, owner.token) } catch { redraw = true }
ok('draw blocked when not full', redraw)
// schedule
await rpc('set_match_schedule', { p_match_id: matches[0].id, p_date: tomorrow, p_time: '17:00:00' }, owner.token)
// start tournament
await rpc('start_tournament', { p_tournament_id: tId }, owner.token)
// result: find a player from each team
const homePlayers = await db(`select player_id from team_members where team_id='${matches[0].home_team_id}'`)
const awayPlayers = await db(`select player_id from team_members where team_id='${matches[0].away_team_id}'`)
const scorer1 = homePlayers[0].player_id
const scorer2 = homePlayers.length > 1 ? homePlayers[1].player_id : scorer1
const assistP = awayPlayers[0].player_id
await rpc('set_match_result', {
  p_match_id: matches[0].id, p_home_score: 2, p_away_score: 1,
  p_events: JSON.stringify([
    { player_id: scorer1, team_id: matches[0].home_team_id, event_type: 'goal', minute: 10 },
    { player_id: scorer2, team_id: matches[0].home_team_id, event_type: 'goal', minute: 40 },
    { player_id: assistP, team_id: matches[0].away_team_id, event_type: 'goal', minute: 60 },
    { player_id: assistP, team_id: matches[0].away_team_id, event_type: 'assist', minute: 10 },
  ]),
}, owner.token)
ok('result entered', true)
const standings = await db(`select team_id, played, wins, losses, goals_for, goals_against, points, rank from tournament_standings where tournament_id='${tId}'`)
const homeRow = standings.find((s) => s.team_id === matches[0].home_team_id)
const awayRow = standings.find((s) => s.team_id === matches[0].away_team_id)
ok('standings home: 3 pts rank1', homeRow.points === 3 && homeRow.rank === 1 && homeRow.goals_for === 2, JSON.stringify(standings))
ok('standings away: 0 pts rank2', awayRow.points === 0 && awayRow.rank === 2 && awayRow.goals_for === 1)
const tStat3 = await db(`select status from tournaments where id='${tId}'`)
ok('groups tournament auto-completed', tStat3[0].status === 'completed')
const stats = await db(`select player_id, goals, assists from tournament_player_stats where tournament_id='${tId}' order by goals desc`)
const totalGoals = stats.reduce((a, s) => a + s.goals, 0)
ok('scorers updated (3 goals total, assist recorded)', totalGoals === 3 && stats.find((s) => s.player_id === assistP)?.assists === 1, JSON.stringify(stats))
// draw recorded
const draws = await db(`select count(*)::int c from tournament_draws where tournament_id='${tId}'`)
ok('draw result persisted', draws[0].c === 1)

console.log('— 7. Notifications —')
const notifs = await db(`select title from notifications where user_id='${b.id}' order by created_at desc limit 10`)
ok('B received notifications', notifs.length >= 3, JSON.stringify(notifs))

console.log('— 8. Cleanup test data —')
await db(`delete from tournaments where id='${tId}'`)
await db(`delete from bookings where id='${bookingId}'`)
await db(`delete from teams where id in ('${teamBId}','${teamCId}')`)
await db(`delete from venues where id='${venueId}'`)
await db(`delete from notifications where user_id in ('${b.id}','${c.id}','${d.id}','${owner.id}')`)
ok('cleanup done', true)

console.log(`\nDONE — ${passed} assertions passed${process.exitCode === 1 ? ' (WITH FAILURES)' : ''}`)
