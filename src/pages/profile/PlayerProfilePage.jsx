import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Layout from '../../components/Layout'
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

  if (player.isLoading) return <Layout title="اللاعب"><Spinner /></Layout>
  if (!player.data) return <Layout title="اللاعب"><Empty icon="👤" text="اللاعب غير موجود" /></Layout>
  const p = player.data

  return (
    <Layout title="👤 اللاعب">
      <div className="card center">
        <div className="avatar lg" style={{ margin: '0 auto 10px' }}>
          {p.avatar_url
            ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (p.full_name || '؟').charAt(0)}
        </div>
        <div className="row" style={{ justifyContent: 'center', gap: 6 }}>
          <h2 style={{ margin: 0 }}>{p.full_name || 'لاعب'}</h2>
          {p.is_premium && <span className="badge warn">★ Premium</span>}
        </div>
        <div className="tiny">
          📍 {p.village?.name || '—'}
          {p.position ? ` • ${p.position}` : ''}
          {p.jersey_number ? ` • رقم ${p.jersey_number}` : ''}
        </div>
        {p.bio && <p className="muted mt8">{p.bio}</p>}
      </div>

      <div className="section">
        <div className="section-head"><h2>⚽ الفرق</h2></div>
        {memberships.isLoading ? <Spinner /> : memberships.data?.length === 0 ? <Empty icon="⚽" text="لا فرق" /> : (
          memberships.data.map((m) => (
            <Link key={m.id} to={`/teams/${m.team.id}`} className="card tap">
              <div className="row between">
                <b>{m.team.name}</b>
                {m.role === 'captain' && <span className="badge dark">🅒 Captain</span>}
              </div>
            </Link>
          ))
        )}
      </div>

      <div className="section">
        <div className="section-head"><h2>🏆 البطولات والإحصائيات</h2></div>
        {stats.isLoading ? <Spinner /> : stats.data?.length === 0 ? <Empty icon="📊" text="لا إحصائيات بعد" /> : (
          stats.data.map((s) => (
            <Link key={s.id} to={`/tournaments/${s.tournament.id}`} className="card tap">
              <div className="row between">
                <b>{s.tournament.name}</b>
                <span className="badge dark">⚽ {s.goals} أهداف</span>
              </div>
              <div className="tiny">{s.matches_played} مباريات • 🅰️ {s.assists} صناعة • 🟨 {s.yellow_cards} • 🟥 {s.red_cards}</div>
            </Link>
          ))
        )}
      </div>
    </Layout>
  )
}
