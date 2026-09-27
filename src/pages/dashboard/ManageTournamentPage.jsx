import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Layout from '../../components/Layout'
import { Spinner, Empty, ErrorBox, OkBox } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { dateAr, timeAr, roundName, TOURNAMENT_TYPE_LABELS } from '../../lib/constants'
import { statusBadge } from '../tournaments/TournamentsPage'
import { MatchCard } from '../tournaments/TournamentDetailPage'

export default function ManageTournamentPage() {
  const { id } = useParams()
  const qc = useQueryClient()
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  const tournament = useQuery({
    queryKey: ['tournament', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*, venue:venues(name), village:villages(name)')
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
        .select('*, team:teams(id, name, logo_url)')
        .eq('tournament_id', id)
        .order('joined_at')
      if (error) throw error
      return data
    },
  })

  const act = useMutation({
    mutationFn: async ({ fn, args }) => {
      const { error } = await supabase.rpc(fn, args)
      if (error) throw new Error(error.message)
    },
    onSuccess: (_d, vars) => {
      setErr('')
      setOk(vars.msg || 'ØªÙ… Ø§Ù„ØªÙ†ÙÙŠØ° Ø¨Ù†Ø¬Ø§Ø­')
      qc.invalidateQueries({ queryKey: ['tournament', id] })
      qc.invalidateQueries({ queryKey: ['tournament-teams', id] })
      qc.invalidateQueries({ queryKey: ['tournament-matches', id] })
      qc.invalidateQueries({ queryKey: ['tournament-standings', id] })
      qc.invalidateQueries({ queryKey: ['my-tournaments'] })
    },
    onError: (e) => { setOk(''); setErr(e.message) },
  })

  if (tournament.isLoading) return <Layout title="Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø¨Ø·ÙˆÙ„Ø©"><Spinner /></Layout>
  if (!tournament.data) return <Layout title="Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø¨Ø·ÙˆÙ„Ø©"><Empty icon="ðŸ†" text="Ø§Ù„Ø¨Ø·ÙˆÙ„Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©" /></Layout>
  const t = tournament.data
  const approved = ttRows.data?.filter((r) => r.status === 'approved') || []
  const pending = ttRows.data?.filter((r) => r.status === 'pending') || []

  return (
    <Layout title={`Ø¥Ø¯Ø§Ø±Ø©: ${t.name}`}>
      <ErrorBox>{err}</ErrorBox>
      <OkBox>{ok}</OkBox>

      <div className="card">
        <div className="row between">
          <div className="card-title">{t.name}</div>
          {statusBadge(t.status)}
        </div>
        <div className="tiny">ðŸŸï¸ {t.venue?.name} â€¢ {TOURNAMENT_TYPE_LABELS[t.tournament_type]} â€¢ Ø§Ù„ÙØ±Ù‚: {approved.length}/{t.max_teams}</div>
        {t.status === 'rejected' && t.rejection_reason && <div className="tiny" style={{ color: 'var(--danger)' }}>Ø³Ø¨Ø¨ Ø§Ù„Ø±ÙØ¶: {t.rejection_reason}</div>}
        {t.status === 'pending_admin_approval' && (
          <div className="mt8"><span className="badge warn">â³ Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ù…ÙˆØ§ÙÙ‚Ø© Ù…Ø¯ÙŠØ± Arena Go â€” Ù„Ù† ØªØ¸Ù‡Ø± Ù„Ù„Ø§Ø¹Ø¨ÙŠÙ† Ù‚Ø¨Ù„ Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø©</span></div>
        )}

        {t.status === 'full' && (
          <div className="mt8 center">
            <p className="muted">Ø§ÙƒØªÙ…Ù„ Ø¹Ø¯Ø¯ Ø§Ù„ÙØ±Ù‚ â€” Ø§Ù„Ù‚Ø±Ø¹Ø© Ø¹Ø´ÙˆØ§Ø¦ÙŠØ© ØªÙ…Ø§Ù…Ø§Ù‹ ÙˆÙ„Ø§ ÙŠÙ…ÙƒÙ†Ùƒ Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„Ù…ÙˆØ§Ø¬Ù‡Ø§Øª.</p>
            <button
              className="btn block"
              onClick={() => act.mutate({ fn: 'run_tournament_draw', args: { p_tournament_id: id }, msg: 'ØªÙ… Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„Ù‚Ø±Ø¹Ø© ÙˆØ¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ù…Ø¨Ø§Ø±ÙŠØ§Øª ðŸŽ²' })}
              disabled={act.isPending}
            >
              ðŸŽ² Ø§Ø¨Ø¯Ø£ Ø§Ù„Ù‚Ø±Ø¹Ø© Ø§Ù„Ø¢Ù†
            </button>
          </div>
        )}
        {t.status === 'draw_completed' && (
          <div className="mt8">
            <button
              className="btn block"
              onClick={() => act.mutate({ fn: 'start_tournament', args: { p_tournament_id: id }, msg: 'Ø§Ù†Ø·Ù„Ù‚Øª Ø§Ù„Ø¨Ø·ÙˆÙ„Ø© âš½' })}
              disabled={act.isPending}
            >
              â–¶ï¸ Ø§Ù†Ø·Ù„Ù‚ Ø¨Ø§Ù„Ø¨Ø·ÙˆÙ„Ø©
            </button>
            <div className="hint center">Ø­Ø¯Ø¯ Ù…ÙˆØ§Ø¹ÙŠØ¯ Ø§Ù„Ù…Ø¨Ø§Ø±ÙŠØ§Øª Ù…Ù† Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© Ø£Ø¯Ù†Ø§Ù‡ Ù„ØªØµÙ„Ùƒ Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ø§Ù„Ù„Ø§Ø¹Ø¨ÙŠÙ†.</div>
          </div>
        )}
        {t.tournament_type === 'groups_knockout' && t.status === 'ongoing' && (
          <div className="mt8">
            <button
              className="btn block"
              onClick={() => act.mutate({ fn: 'create_knockout_from_groups', args: { p_tournament_id: id }, msg: 'Ø£ÙÙ†Ø´Ø¦Øª Ù…ÙˆØ§Ø¬Ù‡Ø§Øª Ø®Ø±ÙˆØ¬ Ø§Ù„Ù…ØºÙ„ÙˆØ¨ ðŸ”¥' })}
              disabled={act.isPending}
            >
              ðŸ¥Š Ø¥Ù†Ø´Ø§Ø¡ Ø¯ÙˆØ± Ø®Ø±ÙˆØ¬ Ø§Ù„Ù…ØºÙ„ÙˆØ¨ (Ø§Ù„Ù…ØªØ£Ù‡Ù„ÙˆÙ†)
            </button>
          </div>
        )}
      </div>

      {pending.length > 0 && t.status === 'registration_open' && (
        <div className="section" style={{ marginTop: 0 }}>
          <div className="section-head"><h2>ðŸ“¨ Ø·Ù„Ø¨Ø§Øª Ø§Ù„Ù…Ø´Ø§Ø±ÙƒØ© ({pending.length})</h2></div>
          <div className="card">
            {pending.map((r) => (
              <div key={r.id} className="list-item">
                <div className="logo-box">{r.team?.logo_url ? <img src={r.team.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : 'âš½'}</div>
                <div style={{ flex: 1 }}>
                  <b>{r.team?.name}</b>
                  <div className="tiny">Ø§Ù†Ø¶Ù… Ø¨ØªØ§Ø±ÙŠØ® {dateAr(r.joined_at?.slice(0, 10))}</div>
                </div>
                <div className="row">
                  <button className="btn sm success" onClick={() => act.mutate({ fn: 'review_tournament_team', args: { p_tt_id: r.id, p_decision: 'approved' }, msg: 'ØªÙ… Ø§Ù„Ù‚Ø¨ÙˆÙ„' })}>Ù‚Ø¨ÙˆÙ„</button>
                  <button className="btn sm danger" onClick={() => act.mutate({ fn: 'review_tournament_team', args: { p_tt_id: r.id, p_decision: 'rejected' }, msg: 'ØªÙ… Ø§Ù„Ø±ÙØ¶' })}>Ø±ÙØ¶</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-head"><h2>ðŸ“… Ø§Ù„Ù…Ø¨Ø§Ø±ÙŠØ§Øª</h2><Link className="see-all" to={`/tournaments/${id}`}>Ø¹Ø±Ø¶ Ø¹Ø§Ù… â€º</Link></div>
        <MatchesManager t={t} />
      </div>
    </Layout>
  )
}

function MatchesManager({ t }) {
  const qc = useQueryClient()
  const [err, setErr] = useState('')
  const [openResult, setOpenResult] = useState(null)
  const [openSchedule, setOpenSchedule] = useState(null)

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
  if (!matches.data?.length) return <Empty icon="ðŸŽ²" text="Ø³ØªØ¸Ù‡Ø± Ø§Ù„Ù…Ø¨Ø§Ø±ÙŠØ§Øª Ø¨Ø¹Ø¯ Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„Ù‚Ø±Ø¹Ø©" />

  const maxRound = Math.max(...matches.data.map((m) => m.round))

  return (
    <>
      <ErrorBox>{err}</ErrorBox>
      {matches.data.map((m) => (
        <div key={m.id} className="card">
          <MatchCard m={m} maxRound={m.group_id ? null : maxRound} />
          {m.status === 'scheduled' && (
            <div className="btn-row">
              <button className="btn sm" onClick={() => { setOpenResult(openResult === m.id ? null : m.id); setOpenSchedule(null) }}>ðŸ“ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ù†ØªÙŠØ¬Ø©</button>
              <button className="btn sm secondary" onClick={() => { setOpenSchedule(openSchedule === m.id ? null : m.id); setOpenResult(null) }}>ðŸ“… ØªØ­Ø¯ÙŠØ¯ Ø§Ù„Ù…ÙˆØ¹Ø¯</button>
            </div>
          )}
          {openSchedule === m.id && (
            <ScheduleForm m={m} onDone={() => { setOpenSchedule(null); qc.invalidateQueries({ queryKey: ['tournament-matches', t.id] }) }} onError={setErr} />
          )}
          {openResult === m.id && (
            <ResultForm m={m} t={t} onDone={() => { setOpenResult(null); qc.invalidateQueries({ queryKey: ['tournament-matches', t.id] }); qc.invalidateQueries({ queryKey: ['tournament-standings', t.id] }) }} onError={setErr} />
          )}
        </div>
      ))}
    </>
  )
}

function ScheduleForm({ m, onDone, onError }) {
  const [date, setDate] = useState(m.match_date || '')
  const [time, setTime] = useState(m.start_time ? m.start_time.slice(0, 5) : '')
  const save = useMutation({
    mutationFn: async () => {
      if (!date || !time) throw new Error('Ø§Ø®ØªØ± Ø§Ù„ØªØ§Ø±ÙŠØ® ÙˆØ§Ù„ÙˆÙ‚Øª')
      const { error } = await supabase.rpc('set_match_schedule', { p_match_id: m.id, p_date: date, p_time: time + ':00' })
      if (error) throw new Error(error.message)
    },
    onSuccess: onDone,
    onError: (e) => onError(e.message),
  })
  return (
    <div className="card" style={{ background: 'var(--surface-2)' }}>
      <div className="grid-2">
        <div className="field"><label>Ø§Ù„ØªØ§Ø±ÙŠØ®</label><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="field"><label>Ø§Ù„Ø³Ø§Ø¹Ø©</label><input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
      </div>
      <button className="btn sm block" onClick={() => save.mutate()} disabled={save.isPending}>Ø­ÙØ¸ Ø§Ù„Ù…ÙˆØ¹Ø¯ ÙˆØ¥Ø´Ø¹Ø§Ø± Ø§Ù„ÙƒØ¨Ø§ØªÙ†</button>
    </div>
  )
}

function ResultForm({ m, t, onDone, onError }) {
  const [homeScore, setHomeScore] = useState('')
  const [awayScore, setAwayScore] = useState('')
  const [events, setEvents] = useState([]) // {player_id, team_id, event_type, minute}
  const [ev, setEv] = useState({ player_id: '', team_id: m.home_team_id, event_type: 'goal', minute: '' })

  const players = useQuery({
    queryKey: ['squads', m.home_team_id, m.away_team_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('team_id, player:profiles(id, full_name)')
        .in('team_id', [m.home_team_id, m.away_team_id])
      if (error) throw error
      return data
    },
  })

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('set_match_result', {
        p_match_id: m.id,
        p_home_score: parseInt(homeScore, 10),
        p_away_score: parseInt(awayScore, 10),
        p_events: events,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: onDone,
    onError: (e) => onError(e.message),
  })

  const squad = (players.data || []).filter((p) => p.team_id === ev.team_id)

  return (
    <div className="card" style={{ background: 'var(--surface-2)' }}>
      <div className="grid-2">
        <div className="field">
          <label>Ø£Ù‡Ø¯Ø§Ù {m.home?.name}</label>
          <input className="input" type="number" min="0" value={homeScore} onChange={(e) => setHomeScore(e.target.value)} />
        </div>
        <div className="field">
          <label>Ø£Ù‡Ø¯Ø§Ù {m.away?.name}</label>
          <input className="input" type="number" min="0" value={awayScore} onChange={(e) => setAwayScore(e.target.value)} />
        </div>
      </div>

      <div className="tiny" style={{ marginBottom: 6 }}>Ø§Ù„Ø£Ø­Ø¯Ø§Ø« (Ø£Ù‡Ø¯Ø§Ù/Ø¨Ø·Ø§Ù‚Ø§Øª) â€” ØªÙØ­Ø¯ÙŽÙ‘Ø« Ø§Ù„Ù‡Ø¯Ø§ÙÙˆÙ† ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹:</div>
      <div className="grid-2">
        <div className="field">
          <select className="select" value={ev.team_id} onChange={(e) => setEv({ ...ev, team_id: e.target.value, player_id: '' })}>
            <option value={m.home_team_id}>{m.home?.name}</option>
            <option value={m.away_team_id}>{m.away?.name}</option>
          </select>
        </div>
        <div className="field">
          <select className="select" value={ev.event_type} onChange={(e) => setEv({ ...ev, event_type: e.target.value })}>
            <option value="goal">âš½ Ù‡Ø¯Ù</option>
            <option value="assist">ðŸ…°ï¸ ØµÙ†Ø§Ø¹Ø©</option>
            <option value="yellow_card">ðŸŸ¨ Ø¨Ø·Ø§Ù‚Ø© ØµÙØ±Ø§Ø¡</option>
            <option value="red_card">ðŸŸ¥ Ø¨Ø·Ø§Ù‚Ø© Ø­Ù…Ø±Ø§Ø¡</option>
          </select>
        </div>
      </div>
      <div className="grid-2">
        <div className="field">
          <select className="select" value={ev.player_id} onChange={(e) => setEv({ ...ev, player_id: e.target.value })}>
            <option value="">â€” Ø§Ù„Ù„Ø§Ø¹Ø¨ â€”</option>
            {squad.map((p) => <option key={p.player.id} value={p.player.id}>{p.player.full_name}</option>)}
          </select>
        </div>
        <div className="field">
          <input className="input" type="number" min="1" max="130" placeholder="Ø§Ù„Ø¯Ù‚ÙŠÙ‚Ø©" value={ev.minute} onChange={(e) => setEv({ ...ev, minute: e.target.value })} />
        </div>
      </div>
      <button
        className="btn sm secondary"
        disabled={!ev.player_id}
        onClick={() => { setEvents((es) => [...es, { ...ev, minute: parseInt(ev.minute, 10) || null }]); setEv({ ...ev, player_id: '', minute: '' }) }}
      >ï¼‹ Ø¥Ø¶Ø§ÙØ© Ø­Ø¯Ø«</button>

      {events.length > 0 && (
        <div className="mt8">
          {events.map((e, i) => (
            <div key={i} className="row between" style={{ padding: '4px 0' }}>
              <span className="tiny">
                {e.event_type === 'goal' ? 'âš½' : e.event_type === 'assist' ? 'ðŸ…°ï¸' : e.event_type === 'yellow_card' ? 'ðŸŸ¨' : 'ðŸŸ¥'}{' '}
                {(players.data || []).find((p) => p.player.id === e.player_id)?.player.full_name} â€” {e.minute || '?'}'
              </span>
              <button className="btn sm danger" onClick={() => setEvents(events.filter((_, j) => j !== i))}>Ø­Ø°Ù</button>
            </div>
          ))}
        </div>
      )}

      <button className="btn block mt8" onClick={() => save.mutate()} disabled={save.isPending || homeScore === '' || awayScore === ''}>
        {save.isPending ? 'Ø¬Ø§Ø±Ù Ø§Ù„Ø­ÙØ¸â€¦' : 'Ø§Ø¹ØªÙ…Ø§Ø¯ Ø§Ù„Ù†ØªÙŠØ¬Ø© (ØªØ­Ø¯ÙŠØ« Ø§Ù„ØªØ±ØªÙŠØ¨ ÙˆØ§Ù„Ù‡Ø¯Ø§ÙÙŠÙ† ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹)'}
      </button>
    </div>
  )
}
