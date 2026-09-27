import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Layout from '../../components/Layout'
import { Spinner, Empty } from '../../components/ui'
import { useVillages, useVillageFilter } from '../../hooks/useVillages'
import { supabase } from '../../lib/supabase'
import { TOURNAMENT_TYPE_LABELS, TOURNAMENT_STATUS_LABELS, sypText } from '../../lib/constants'

const STATUS_FILTERS = [
  { key: '', label: 'الكل' },
  { key: 'open', label: 'مفتوحة للتسجيل' },
  { key: 'full', label: 'مكتملة' },
  { key: 'ongoing', label: 'جارية' },
  { key: 'completed', label: 'منتهية' },
]

const OPEN_STATUSES = ['registration_open']
const ACTIVE_STATUSES = ['full', 'draw_pending', 'draw_completed', 'ongoing']

function statusBadge(status) {
  const map = {
    registration_open: 'success',
    full: 'warn',
    draw_pending: 'warn',
    draw_completed: 'info',
    ongoing: 'info',
    completed: 'neutral',
    pending_admin_approval: 'warn',
    rejected: 'danger',
    cancelled: 'danger',
    approved: 'info',
  }
  return <span className={`badge ${map[status] || 'neutral'}`}>{TOURNAMENT_STATUS_LABELS[status] || status}</span>
}

export { statusBadge }

export default function TournamentsPage() {
  const { data: villages } = useVillages()
  const [village, setVillage] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')

  const tournaments = useQuery({
    queryKey: ['tournaments', { village, status, search, scope: 'public' }],
    queryFn: async () => {
      let q = supabase
        .from('tournaments')
        .select('*, venue:venues(name), village:villages(name), teams:tournament_teams(count)')
      if (village) q = q.eq('village_id', village)
      if (search) q = q.ilike('name', `%${search}%`)
      if (status === 'open') q = q.in('status', OPEN_STATUSES)
      else if (status === 'ongoing') q = q.in('status', ACTIVE_STATUSES)
      else if (status) q = q.eq('status', status)
      else q = q.in('status', [...OPEN_STATUSES, ...ACTIVE_STATUSES, 'completed'])
      q = q.order('created_at', { ascending: false })
      const { data, error } = await q
      if (error) throw error
      return data
    },
  })

  return (
    <Layout title="🏆 البطولات">
      <input className="input" placeholder="🔍 ابحث عن بطولة…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div style={{ height: 10 }} />
      {useVillageFilter(villages, village, setVillage)}

      <div className="chips">
        {STATUS_FILTERS.map((s) => (
          <button key={s.key} className={`chip ${status === s.key ? 'active' : ''}`} onClick={() => setStatus(s.key)}>
            {s.label}
          </button>
        ))}
      </div>

      {tournaments.isLoading ? <Spinner /> : tournaments.data?.length === 0 ? <Empty icon="🏆" text="لا توجد بطولات" /> : (
        tournaments.data?.map((t) => (
          <Link key={t.id} to={`/tournaments/${t.id}`} className="card tap">
            {t.logo_url && <img src={t.logo_url} alt="" style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 10, marginBottom: 8 }} />}
            <div className="row between">
              <div className="card-title">{t.name}</div>
              {statusBadge(t.status)}
            </div>
            <div className="tiny">📍 {t.village?.name} • 🏟️ {t.venue?.name}</div>
            <div className="tiny">{TOURNAMENT_TYPE_LABELS[t.tournament_type]} • حتى {t.max_teams} فرق • {t.players_per_team} لاعب/فريق</div>
            <div className="row between mt8">
              <span className="tiny">👥 {t.teams?.[0]?.count ?? 0} / {t.max_teams} فريق</span>
              {t.registration_fee > 0
                ? <span className="badge neutral">💵 {sypText(t.registration_fee)}</span>
                : <span className="badge success">مجانية</span>}
            </div>
            {t.registration_deadline && (
              <div className="tiny" style={{ color: 'var(--warn)' }}>⏳ آخر موعد للتسجيل: {t.registration_deadline}</div>
            )}
          </Link>
        ))
      )}
    </Layout>
  )
}
