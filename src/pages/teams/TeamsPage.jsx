import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Layout from '../../components/Layout'
import { Spinner, Empty } from '../../components/ui'
import { useVillages, useVillageFilter } from '../../hooks/useVillages'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

export default function TeamsPage() {
  const { user } = useAuth()
  const { data: villages } = useVillages()
  const [village, setVillage] = useState('')
  const [search, setSearch] = useState('')

  const teams = useQuery({
    queryKey: ['teams', { village, search }],
    queryFn: async () => {
      let q = supabase
        .from('teams')
        .select('*, village:villages(name), members:team_members(count)')
        .eq('is_active', true)
      if (village) q = q.eq('village_id', village)
      if (search) q = q.ilike('name', `%${search}%`)
      q = q.order('created_at', { ascending: false })
      const { data, error } = await q
      if (error) throw error
      return data
    },
  })

  return (
    <Layout title="⚽ الفرق">
      <input className="input" placeholder="🔍 ابحث عن فريق…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div style={{ height: 10 }} />
      {useVillageFilter(villages, village, setVillage)}

      <div className="btn-row" style={{ marginBottom: 14 }}>
        {user && <Link to="/teams/create" className="btn">＋ إنشاء فريق</Link>}
        <Link to="/join/ARENA" className="btn outline">🔑 انضمام بكود دعوة</Link>
      </div>

      {teams.isLoading ? <Spinner /> : teams.data?.length === 0 ? <Empty icon="⚽" text="لا توجد فرق بعد" /> : (
        teams.data?.map((t) => (
          <Link key={t.id} to={`/teams/${t.id}`} className="card tap">
            <div className="row">
              <div className="logo-box">{t.logo_url ? <img src={t.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '⚽'}</div>
              <div style={{ flex: 1 }}>
                <div className="card-title">{t.name}</div>
                <div className="tiny">📍 {t.village?.name || '—'} • 👥 {t.members?.[0]?.count ?? 0} لاعب</div>
              </div>
              <span className="badge neutral">عرض</span>
            </div>
          </Link>
        ))
      )}
    </Layout>
  )
}
