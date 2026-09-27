import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Layout from '../../components/Layout'
import Icon from '../../components/Icon'
import { Spinner, Empty } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function PlayerProfilePage() {
  const { id } = useParams()
  const { user } = useAuth()

  const player = useQuery({
    queryKey: ['player', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, village:villages(name)')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  const memberships = useQuery({
    queryKey: ['player-teams', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*, team:teams(id, name, is_active)')
        .eq('player_id', id)
      if (error) throw error
      return data
    },
  })

  const stats = useQuery({
    queryKey: ['player-stats', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournament_player_stats')
        .select('*, tournament:tournaments(id, name)')
        .eq('player_id', id)
        .order('goals', { ascending: false })
      if (error) throw error
      return data
    },
  })

  if (player.isLoading) return <Layout title="اللاعب" titleIcon="user"><Spinner /></Layout>
  if (!player.data) return <Layout title="اللاعب" titleIcon="user"><Empty icon="user" text="اللاعب غير موجود" /></Layout>
  const p = player.data
  const totals = (stats.data || []).reduce((a, s) => ({
    goals: a.goals + s.goals, matches: a.matches + s.matches_played, assists: a.assists + s.assists,
  }), { goals: 0, matches: 0, assists: 0 })

  return (
    <Layout title="اللاعب" titleIcon="user">
      <div className="profile-hero center">
        <div className="avatar lg" style={{ margin: '0 auto 10px', background: 'rgba(255,255,255,0.14)', color: '#fff', position: 'relative' }}>
          {p.avatar_url
            ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (p.full_name || '؟').charAt(0)}
        </div>
        <div className="row" style={{ justifyContent: 'center', gap: 6, position: 'relative' }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{p.full_name || 'لاعب'}</h2>
          {p.is_premium && <span className="badge gold">★ Premium Player</span>}
        </div>
        <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 3, position: 'relative' }}>
          <Icon name="pin" size={12} /> {p.village?.name || '—'}
          {p.position ? ` • ${p.position}` : ''}
          {p.jersey_number ? ` • رقم ${p.jersey_number}` : ''}
        </div>
        {p.bio && <p style={{ fontSize: 12.5, opacity: 0.8, marginTop: 8, position: 'relative' }}>{p.bio}</p>}
      </div>

      <div className="grid-3" style={{ marginBottom: 12 }}>
        <div className="stat-card"><div className="num">{totals.goals}</div><div className="lbl">أهداف</div></div>
        <div className="stat-card"><div className="num">{totals.assists}</div><div className="lbl">صناعة</div></div>
        <div className="stat-card"><div className="num">{totals.matches}</div><div className="lbl">مباريات</div></div>
      </div>

      <div className="section">
        <div className="section-head"><h2><Icon name="shirt" size={16} /> الفرق</h2></div>
        {memberships.isLoading ? <Spinner /> : memberships.data?.length === 0 ? <Empty icon="ball" text="لا فرق" /> : (
          memberships.data.map((m) => (
            <Link key={m.id} to={`/teams/${m.team.id}`} className="card tap" style={{ padding: 12 }}>
              <div className="row between">
                <b style={{ fontSize: 14 }}>{m.team.name}</b>
                {m.role === 'captain' && <span className="badge dark">🅒 Captain</span>}
              </div>
            </Link>
          ))
        )}
      </div>

      <div className="section">
        <div className="section-head"><h2><Icon name="trophy" size={16} /> البطولات</h2></div>
        {stats.isLoading ? <Spinner /> : stats.data?.length === 0 ? <Empty icon="trophy" text="لا إحصائيات بعد" /> : (
          stats.data.map((s) => (
            <Link key={s.id} to={`/tournaments/${s.tournament.id}`} className="card tap" style={{ padding: 12 }}>
              <div className="row between">
                <b style={{ fontSize: 14 }}>{s.tournament.name}</b>
                <span className="badge dark"><Icon name="ball" size={11} /> {s.goals} أهداف</span>
              </div>
              <div className="tiny">{s.matches_played} مباريات • 🅰️ {s.assists} صناعة • 🟨 {s.yellow_cards} • 🟥 {s.red_cards}</div>
            </Link>
          ))
        )}
      </div>
    </Layout>
  )
}
