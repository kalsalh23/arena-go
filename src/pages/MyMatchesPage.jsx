import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import Icon from '../components/Icon'
import { Spinner, Empty } from '../components/ui'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { MatchCard } from './tournaments/TournamentDetailPage'

export default function MyMatchesPage() {
  const { user } = useAuth()

  const myTeams = useQuery({
    queryKey: ['my-team-ids', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('team_members').select('team_id').eq('player_id', user.id)
      if (error) throw error
      return data.map((m) => m.team_id)
    },
  })

  const matches = useQuery({
    queryKey: ['my-matches', myTeams.data],
    enabled: (myTeams.data || []).length > 0,
    queryFn: async () => {
      const teamIds = myTeams.data
      const { data, error } = await supabase
        .from('tournament_matches')
        .select(`
          *, tournament:tournaments(id, name),
          home:teams!tournament_matches_home_team_id_fkey(id, name),
          away:teams!tournament_matches_away_team_id_fkey(id, name)
        `)
        .or(`home_team_id.in.(${teamIds.join(',')}),away_team_id.in.(${teamIds.join(',')})`)
        .order('match_date', { ascending: true, nullsFirst: false })
        .limit(50)
      if (error) throw error
      return data
    },
  })

  if (!user) return null
  if (myTeams.isLoading) return <Layout title="مبارياتي" titleIcon="calendar"><Spinner /></Layout>
  if (!myTeams.data?.length) {
    return (
      <Layout title="مبارياتي" titleIcon="calendar">
        <Empty icon="ball" text="أنت لست عضواً في أي فريق بعد" />
        <Link to="/teams" className="btn block">تصفح الفرق</Link>
      </Layout>
    )
  }

  const upcoming = (matches.data || []).filter((m) => m.status === 'scheduled')
  const past = (matches.data || []).filter((m) => m.status !== 'scheduled')

  return (
    <Layout title="مبارياتي" titleIcon="calendar">
      <div className="section" style={{ marginTop: 0 }}>
        <div className="section-head"><h2><Icon name="clock" size={16} /> القادمة</h2></div>
        {matches.isLoading ? <Spinner /> : upcoming.length === 0 ? <Empty icon="calendar" text="لا مباريات قادمة" /> : (
          upcoming.map((m) => (
            <div key={m.id}>
              <div className="tiny" style={{ margin: '8px 0 -8px', fontWeight: 800, color: 'var(--brand-strong)' }}>
                <Icon name="trophy" size={12} /> {m.tournament?.name}
              </div>
              <MatchCard m={m} />
            </div>
          ))
        )}
      </div>
      <div className="section">
        <div className="section-head"><h2><Icon name="checkC" size={16} /> سابقة</h2></div>
        {past.length === 0 ? <Empty icon="calendar" text="لا مباريات سابقة" /> : (
          past.map((m) => (
            <div key={m.id}>
              <div className="tiny" style={{ margin: '8px 0 -8px', fontWeight: 800, color: 'var(--brand-strong)' }}>
                <Icon name="trophy" size={12} /> {m.tournament?.name}
              </div>
              <MatchCard m={m} />
            </div>
          ))
        )}
      </div>
    </Layout>
  )
}
