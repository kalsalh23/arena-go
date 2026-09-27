import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Layout from '../../components/Layout'
import { Spinner, Empty, ErrorBox, OkBox } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { TOURNAMENT_TYPE_LABELS, TOURNAMENT_STATUS_LABELS, sypText, dateAr, timeAr, roundName } from '../../lib/constants'
import { statusBadge } from './TournamentsPage'

const TABS = [
  { key: 'overview', label: 'نظرة عامة' },
  { key: 'matches', label: 'المباريات' },
  { key: 'standings', label: 'الترتيب' },
  { key: 'scorers', label: 'الهدافين' },
  { key: 'teams', label: 'الفرق' },
]

export default function TournamentDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const qc = useQueryClient()
  const [tab, setTab] = useState('overview')
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [myTeamId, setMyTeamId] = useState('')

  const tournament = useQuery({
    queryKey: ['tournament', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*, venue:venues(name, id), village:villages(name)')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  const ttRows = useQuery({
    queryKey: ['tournament-teams', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournament_teams')
        .select('*, team:teams(id, name, logo_url, village:villages(name))')
        .eq('tournament_id', id)
        .order('joined_at')
      if (error) throw error
      return data
    },
  })

  // my teams (as captain) for the register action
  const myTeams = useQuery({
    queryKey: ['my-captain-teams', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('id, name').eq('captain_id', user.id).eq('is_active', true)
      if (error) throw error
      return data
    },
  })

  const register = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('register_team_in_tournament', { p_tournament_id: id, p_team_id: myTeamId })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      setErr(''); setOk('تم إرسال طلب المشاركة — بانتظار موافقة منظم البطولة.')
      qc.invalidateQueries({ queryKey: ['tournament-teams', id] })
    },
    onError: (e) => { setOk(''); setErr(e.message) },
  })

  if (tournament.isLoading) return <Layout title="البطولة"><Spinner /></Layout>
  if (!tournament.data) return <Layout title="البطولة"><Empty icon="🏆" text="البطولة غير موجودة أو غير متاحة" /></Layout>
  const t = tournament.data
  const approvedCount = ttRows.data?.filter((r) => r.status === 'approved').length || 0
  const myRegistration = user && ttRows.data?.find((r) => r.team && myTeams.data?.some((mt) => mt.id === r.team.id))

  return (
    <Layout title={t.name}>
      <div className="card">
        <div className="row between">
          <h2 style={{ margin: 0 }}>{t.name}</h2>
          {statusBadge(t.status)}
        </div>
        <div className="tiny">📍 {t.village?.name} • 🏟️ {t.venue?.name}</div>
        {t.description && <p className="muted mt8">{t.description}</p>}
        <div className="kv"><span className="k">نظام البطولة</span><span className="v">{TOURNAMENT_TYPE_LABELS[t.tournament_type]}</span></div>
        <div className="kv"><span className="k">عدد الفرق</span><span className="v">{approvedCount} / {t.max_teams}</span></div>
        <div className="kv"><span className="k">عدد اللاعبين لكل فريق</span><span className="v">{t.players_per_team}</span></div>
        <div className="kv"><span className="k">رسوم الاشتراك</span><span className="v">{t.registration_fee > 0 ? sypText(t.registration_fee) : 'مجانية'}</span></div>
        {t.start_date && <div className="kv"><span className="k">تاريخ البداية</span><span className="v">{dateAr(t.start_date)}</span></div>}
        {t.end_date && <div className="kv"><span className="k">النهاية المتوقعة</span><span className="v">{dateAr(t.end_date)}</span></div>}
        {t.registration_deadline && <div className="kv"><span className="k">آخر موعد للتسجيل</span><span className="v">{dateAr(t.registration_deadline)}</span></div>}
        {t.prize_description && <div className="kv"><span className="k">🏆 الجوائز</span><span className="v">{t.prize_description}</span></div>}
      </div>

      {t.conditions && (
        <div className="card">
          <div className="card-title">📋 شروط المشاركة</div>
          <p className="muted" style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{t.conditions}</p>
        </div>
      )}

      <ErrorBox>{err}</ErrorBox>
      <OkBox>{ok}</OkBox>

      {t.status === 'registration_open' && user && (
        <div className="card">
          <div className="card-title">🎮 تسجيل فريقك في البطولة</div>
          {myTeams.data?.length ? (
            <>
              <div className="field">
                <select className="select" value={myTeamId} onChange={(e) => setMyTeamId(e.target.value)}>
                  <option value="">— اختر فريقك —</option>
                  {myTeams.data.map((mt) => (
                    <option key={mt.id} value={mt.id} disabled={ttRows.data?.some((r) => r.team_id === mt.id)}>
                      {mt.name}{ttRows.data?.some((r) => r.team_id === mt.id) ? ' (مسجل بالفعل)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn block" disabled={!myTeamId || register.isPending} onClick={() => register.mutate()}>
                {register.isPending ? 'جارٍ الإرسال…' : 'تسجيل فريقي في البطولة'}
              </button>
            </>
          ) : (
            <p className="muted mb0">أنت لست كابتن فريق — الكابتن فقط يمكنه تسجيل الفريق. <Link to="/teams/create" style={{ color: 'var(--info)' }}>أنشئ فريقاً</Link></p>
          )}
        </div>
      )}
      {t.status === 'full' && <div className="card center"><span className="badge warn">البطولة مكتملة العدد — التسجيل مغلق</span></div>}
      {myRegistration && (
        <div className="card center">
          <span className={`badge ${myRegistration.status === 'approved' ? 'success' : myRegistration.status === 'pending' ? 'warn' : 'danger'}`}>
            فريقك: {myRegistration.status === 'approved' ? 'مشارك ✓' : myRegistration.status === 'pending' ? 'قيد المراجعة' : 'لم يُقبل'}
          </span>
        </div>
      )}

      <div className="tabs mt16">
        {TABS.map((x) => (
          <button key={x.key} className={tab === x.key ? 'active' : ''} onClick={() => setTab(x.key)}>{x.label}</button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab t={t} approved={approvedCount} />}
      {tab === 'matches' && <MatchesTab t={t} />}
      {tab === 'standings' && <StandingsTab t={t} />}
      {tab === 'scorers' && <ScorersTab t={t} />}
      {tab === 'teams' && <TeamsTab rows={ttRows.data} />}
    </Layout>
  )
}

function OverviewTab({ t, approved }) {
  return (
    <div className="card">
      <div className="kv"><span className="k">نقاط الفوز</span><span className="v">{t.points_win}</span></div>
      <div className="kv"><span className="k">نقاط التعادل</span><span className="v">{t.points_draw}</span></div>
      <div className="kv"><span className="k">نقاط الخسارة</span><span className="v">{t.points_loss}</span></div>
      <div className="kv"><span className="k">الفرق المسجلة (بعد القبول)</span><span className="v">{approved} / {t.max_teams}</span></div>
    </div>
  )
}

export function MatchesTab({ t }) {
  const matches = useQuery({
    queryKey: ['tournament-matches', t.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournament_matches')
        .select(`
          *, group:tournament_groups(name),
          home:teams!tournament_matches_home_team_id_fkey(id, name),
          away:teams!tournament_matches_away_team_id_fkey(id, name)
        `)
        .eq('tournament_id', t.id)
        .order('round')
        .order('match_date', { ascending: true, nullsFirst: false })
      if (error) throw error
      return data
    },
  })
  if (matches.isLoading) return <Spinner />
  if (!matches.data?.length) return <Empty icon="📅" text="لم تُجرَ القرعة بعد — المباريات تظهر بعد القرعة" />

  const maxRound = Math.max(...matches.data.map((m) => m.round))
  const groups = [...new Set(matches.data.map((m) => m.group?.name || 'خروج المغلوب'))]

  return groups.map((g) => {
    const list = matches.data.filter((m) => (m.group?.name || 'خروج المغلوب') === g)
    return (
      <div key={g} className="section" style={{ marginTop: 12 }}>
        <div className="section-head"><h2>{g}</h2></div>
        {list.map((m) => (
          <MatchCard key={m.id} m={m} maxRound={m.group_id ? null : maxRound} />
        ))}
      </div>
    )
  })
}

export function MatchCard({ m, maxRound }) {
  const done = m.status === 'completed'
  return (
    <div className="card">
      {maxRound && <div className="tiny" style={{ marginBottom: 4 }}>{roundName(m.round, maxRound)}</div>}
      {m.group_id && m.group?.name && <div className="tiny" style={{ marginBottom: 4 }}>{m.group.name} — الدور {m.round}</div>}
      <div className="row between" style={{ padding: '4px 0' }}>
        <b style={{ flex: 1 }}>{m.home?.name}</b>
        <span className={`badge ${done ? 'success' : 'neutral'}`} style={{ fontSize: 14, padding: '4px 12px' }}>
          {done ? `${m.home_score} - ${m.away_score}` : '×'}
        </span>
        <b style={{ flex: 1, textAlign: 'left' }}>{m.away?.name}</b>
      </div>
      <div className="tiny center">
        {m.match_date ? `📅 ${dateAr(m.match_date)}` : '📅 الموعد يُحدد لاحقاً'}
        {m.start_time ? ` • ⏰ ${timeAr(m.start_time)}` : ''}
        {m.status === 'cancelled' && ' • ملغاة'}
      </div>
    </div>
  )
}

export function StandingsTab({ t }) {
  const withGroups = t.tournament_type !== 'knockout'
  const standings = useQuery({
    queryKey: ['tournament-standings', t.id],
    enabled: withGroups,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournament_standings')
        .select('*, team:teams(id, name)')
        .eq('tournament_id', t.id)
        .order('points', { ascending: false })
        .order('goal_difference', { ascending: false })
      if (error) throw error
      return data
    },
  })
  const groups = useQuery({
    queryKey: ['tournament-groups', t.id],
    enabled: withGroups,
    queryFn: async () => {
      const { data, error } = await supabase.from('tournament_groups').select('*').eq('tournament_id', t.id).order('group_order')
      if (error) throw error
      return data
    },
  })

  if (!withGroups) return <Empty icon="🥊" text="نظام خروج مغلق — الترتيب عبر شجرة المباريات" />
  if (standings.isLoading || groups.isLoading) return <Spinner />
  if (!standings.data?.length) return <Empty icon="📊" text="يظهر الترتيب بعد إجراء القرعة وتسجيل النتائج" />

  return (groups.data || []).map((g) => {
    const rows = standings.data.filter((s) => s.group_id === g.id).sort((a, b) => a.rank - b.rank)
    if (!rows.length) return null
    return (
      <div key={g.id} className="section" style={{ marginTop: 12 }}>
        <div className="section-head"><h2>{g.name}</h2></div>
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th><th>الفريق</th><th>لعب</th><th>فاز</th><th>تعادل</th><th>خسر</th><th>له</th><th>عليه</th><th>+/-</th><th>نقاط</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td><b>{s.rank}</b></td>
                  <td><b>{s.team?.name}</b></td>
                  <td>{s.played}</td><td>{s.wins}</td><td>{s.draws}</td><td>{s.losses}</td>
                  <td>{s.goals_for}</td><td>{s.goals_against}</td><td>{s.goal_difference > 0 ? `+${s.goal_difference}` : s.goal_difference}</td>
                  <td><b>{s.points}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  })
}

export function ScorersTab({ t }) {
  const stats = useQuery({
    queryKey: ['tournament-scorers', t.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournament_player_stats')
        .select('*, player:profiles(id, full_name), team:teams(name)')
        .eq('tournament_id', t.id)
        .gt('goals', 0)
        .order('goals', { ascending: false })
        .limit(30)
      if (error) throw error
      return data
    },
  })
  if (stats.isLoading) return <Spinner />
  if (!stats.data?.length) return <Empty icon="⚽" text="لا توجد أهداف بعد" />
  const medals = ['🥇', '🥈', '🥉']
  return (
    <div className="card">
      {stats.data.map((s, i) => (
        <div key={s.id} className="list-item">
          <div className="avatar">{medals[i] || i + 1}</div>
          <div style={{ flex: 1 }}>
            <b>{s.player?.full_name}</b>
            <div className="tiny">{s.team?.name} • {s.matches_played} مباريات</div>
          </div>
          <span className="badge dark">{s.goals} أهداف</span>
        </div>
      ))}
    </div>
  )
}

export function TeamsTab({ rows }) {
  if (!rows) return <Spinner />
  if (!rows.length) return <Empty icon="👥" text="لا توجد فرق مسجلة بعد" />
  const approved = rows.filter((r) => r.status === 'approved')
  const pending = rows.filter((r) => r.status === 'pending')
  return (
    <>
      {approved.length > 0 && (
        <div className="section" style={{ marginTop: 0 }}>
          <div className="section-head"><h2>الفرق المشاركة ({approved.length})</h2></div>
          {approved.map((r) => <TeamRow key={r.id} r={r} />)}
        </div>
      )}
      {pending.length > 0 && (
        <div className="section">
          <div className="section-head"><h2>بانتظار الموافقة ({pending.length})</h2></div>
          {pending.map((r) => <TeamRow key={r.id} r={r} />)}
        </div>
      )}
    </>
  )
}

function TeamRow({ r }) {
  return (
    <Link to={`/teams/${r.team?.id}`} className="card tap">
      <div className="row">
        <div className="logo-box">{r.team?.logo_url ? <img src={r.team.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '⚽'}</div>
        <div style={{ flex: 1 }}>
          <div className="card-title">{r.team?.name}</div>
          <div className="tiny">📍 {r.team?.village?.name || '—'}</div>
        </div>
        <span className={`badge ${r.status === 'approved' ? 'success' : r.status === 'pending' ? 'warn' : 'danger'}`}>
          {r.status === 'approved' ? 'مشارك' : r.status === 'pending' ? 'بانتظار' : r.status === 'withdrawn' ? 'منسحب' : 'مرفوض'}
        </span>
      </div>
    </Link>
  )
}
