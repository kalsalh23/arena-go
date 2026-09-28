import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Layout from '../../components/Layout'
import Icon from '../../components/Icon'
import { Spinner, Empty } from '../../components/ui'
import { useVillages, VillageSelect, ListSelect } from '../../hooks/useVillages'
import { supabase } from '../../lib/supabase'
import { TOURNAMENT_TYPE_LABELS, TOURNAMENT_STATUS_LABELS, sypText, dateAr } from '../../lib/constants'

const OPEN_STATUSES = ['registration_open']
const ACTIVE_STATUSES = ['full', 'draw_pending', 'draw_completed', 'ongoing']

export function statusBadge(status) {
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

  const featured = tournaments.data?.[0]
  const rest = tournaments.data?.slice(1) || []

  return (
    <Layout title="البطولات" titleIcon="trophy">
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <input className="input" style={{ paddingInlineStart: 42 }} placeholder="ابحث عن بطولة…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Icon name="search" size={18} style={{ position: 'absolute', top: 13, insetInlineStart: 14, color: 'var(--text-3)' }} />
      </div>

      <div className="filter-row">
        <VillageSelect villages={villages} value={village} onChange={setVillage} />
        <ListSelect
          label="الحالة"
          value={status}
          onChange={setStatus}
          options={[
            { key: 'open', label: 'مفتوحة للتسجيل' },
            { key: 'ongoing', label: 'جارية' },
            { key: 'completed', label: 'منتهية' },
          ]}
        />
      </div>

      {tournaments.isLoading ? <Spinner /> : tournaments.data?.length === 0 ? <Empty icon="trophy" text="لا توجد بطولات" /> : (
        <>
          {/* البطاقة المميزة للبطولة الأحدث — بأسلوب الصورة المرجعية */}
          {featured && (
            <Link to={`/tournaments/${featured.id}`} className="card tap" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ position: 'relative' }}>
                {featured.logo_url ? (
                  <img src={featured.logo_url} alt="" style={{ width: '100%', height: 165, objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div className="hero-bg" style={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <Icon name="trophy" size={40} />
                  </div>
                )}
                <div className="img-chip" style={{ top: 10, insetInlineStart: 10, position: 'absolute' }}>{statusBadge(featured.status)}</div>
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ fontWeight: 900, fontSize: 17 }}>{featured.name}</div>
                <div className="tiny" style={{ margin: '3px 0 8px' }}>
                  <Icon name="pin" size={11} /> {featured.village?.name} • <Icon name="building" size={11} /> {featured.venue?.name}
                </div>
                <div className="row wrap" style={{ gap: 6 }}>
                  {featured.prize_description && <span className="badge gold"><Icon name="gift" size={11} /> {featured.prize_description}</span>}
                  <span className="badge neutral"><Icon name="money" size={11} /> {featured.registration_fee > 0 ? sypText(featured.registration_fee) : 'مجانية'}</span>
                  <span className="badge neutral"><Icon name="users" size={11} /> {featured.teams?.[0]?.count ?? 0}/{featured.max_teams}</span>
                </div>
                {featured.registration_deadline && (
                  <div className="tiny mt8" style={{ color: 'var(--warn)', fontWeight: 700 }}>
                    <Icon name="clock" size={12} /> آخر موعد للتسجيل: {dateAr(featured.registration_deadline)}
                  </div>
                )}
                {featured.status === 'registration_open' && (
                  <button className="btn block mt8" style={{ pointerEvents: 'none' }}>
                    <Icon name="checkC" size={16} /> تسجيل فريقك في البطولة
                  </button>
                )}
              </div>
            </Link>
          )}

          {rest.map((t) => (
            <Link key={t.id} to={`/tournaments/${t.id}`} className="card tap" style={{ padding: 12 }}>
              <div className="row between">
                <div className="card-title" style={{ fontSize: 14.5 }}>{t.name}</div>
                {statusBadge(t.status)}
              </div>
              <div className="tiny" style={{ margin: '3px 0 6px' }}>
                <Icon name="pin" size={11} /> {t.village?.name} • <Icon name="building" size={11} /> {t.venue?.name}
              </div>
              <div className="row between">
                <span className="tiny"><Icon name="users" size={11} /> {t.teams?.[0]?.count ?? 0} / {t.max_teams} فريق</span>
                {t.registration_fee > 0
                  ? <span className="badge neutral"><Icon name="money" size={11} /> {sypText(t.registration_fee)}</span>
                  : <span className="badge success">مجانية</span>}
              </div>
            </Link>
          ))}
        </>
      )}
    </Layout>
  )
}
