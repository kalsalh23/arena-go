import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Layout from '../../components/Layout'
import Icon from '../../components/Icon'
import { Spinner, Empty } from '../../components/ui'
import { useVillages, VillageSelect } from '../../hooks/useVillages'
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
    <Layout title="الفرق" titleIcon="ball">
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <input className="input" style={{ paddingInlineStart: 42 }} placeholder="ابحث عن فريق…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Icon name="search" size={18} style={{ position: 'absolute', top: 13, insetInlineStart: 14, color: 'var(--text-3)' }} />
      </div>

      <div className="filter-row">
        <VillageSelect villages={villages} value={village} onChange={setVillage} />
      </div>

      <div className="btn-row" style={{ marginBottom: 14 }}>
        {user && <Link to="/teams/create" className="btn"><Icon name="plus" size={16} /> إنشاء فريق</Link>}
        <Link to="/join/ARENA" className="btn outline"><Icon name="users" size={16} /> انضمام بكود دعوة</Link>
      </div>

      {teams.isLoading ? <Spinner /> : teams.data?.length === 0 ? <Empty icon="ball" text="لا توجد فرق بعد" /> : (
        teams.data?.map((t) => (
          <Link key={t.id} to={`/teams/${t.id}`} className="card tap" style={{ padding: 13 }}>
            <div className="row">
              <div className="logo-box round" style={{ width: 54, height: 54 }}>
                {t.logo_url
                  ? <img src={t.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <Icon name="shirt" size={24} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="card-title" style={{ fontSize: 14.5 }}>{t.name}</div>
                <div className="tiny"><Icon name="pin" size={11} /> {t.village?.name || '—'} • <Icon name="users" size={11} /> {t.members?.[0]?.count ?? 0} لاعب</div>
              </div>
              <Icon name="chevL" size={17} style={{ color: 'var(--text-3)' }} />
            </div>
          </Link>
        ))
      )}
    </Layout>
  )
}
