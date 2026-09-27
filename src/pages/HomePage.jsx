import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Layout from '../components/Layout'
import { Spinner, Empty } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useVillages, useVillageFilter } from '../hooks/useVillages'
import { supabase } from '../lib/supabase'
import { sypText, VENUE_TYPES, timeAr } from '../lib/constants'

export default function HomePage() {
  const { user, profile } = useAuth()
  const { data: villages } = useVillages()
  const [village, setVillage] = useState('')
  const [search, setSearch] = useState('')

  const venues = useQuery({
    queryKey: ['venues', { village, search, limit: 4 }],
    queryFn: async () => {
      let q = supabase.from('venues').select('*, village:villages(name)').eq('is_active', true).limit(4)
      if (village) q = q.eq('village_id', village)
      if (search) q = q.ilike('name', `%${search}%`)
      const { data, error } = await q
      if (error) throw error
      return data
    },
  })

  const tournaments = useQuery({
    queryKey: ['tournaments', { village, limit: 3 }],
    queryFn: async () => {
      let q = supabase
        .from('tournaments')
        .select('*, venue:venues(name), village:villages(name)')
        .in('status', ['registration_open', 'full', 'draw_completed', 'ongoing'])
        .order('start_date', { ascending: true })
        .limit(3)
      if (village) q = q.eq('village_id', village)
      const { data, error } = await q
      if (error) throw error
      return data
    },
  })

  return (
    <Layout title="الرئيسية">
      <div className="row between">
        <div>
          <div style={{ fontWeight: 700 }}>
            {user ? `أهلاً ${profile?.full_name || ''} 👋` : 'أهلاً بك في Arena Go'}
          </div>
          <div className="tiny">
            {profile?.village_id
              ? (villages || []).find((v) => v.id === profile.village_id)?.name || 'ريف حماة'
              : 'ريف حماة'}
          </div>
        </div>
        {!user && <Link to="/auth" className="btn sm">تسجيل الدخول</Link>}
      </div>

      <div className="section">
        <input
          className="input"
          placeholder="🔍 ابحث عن ملعب…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid-3 section">
        <Link to="/venues" className="card tap quick mb0">
          <div className="ic">🏟️</div>
          <div className="lbl">احجز ملعباً</div>
        </Link>
        <Link to="/teams" className="card tap quick mb0">
          <div className="ic">⚽</div>
          <div className="lbl">الفرق</div>
        </Link>
        <Link to={user ? '/matches' : '/auth'} className="card tap quick mb0">
          <div className="ic">📅</div>
          <div className="lbl">مبارياتي</div>
        </Link>
      </div>

      <div className="section">
        {useVillageFilter(villages, village, setVillage)}
      </div>

      <div className="section">
        <div className="section-head">
          <h2>🏟️ ملاعب قريبة</h2>
          <Link to="/venues" className="see-all">الكل ›</Link>
        </div>
        {venues.isLoading ? <Spinner /> : venues.data?.length === 0 ? <Empty icon="🏟️" text="لا توجد ملاعب بعد" /> : (
          venues.data?.map((v) => (
            <Link key={v.id} to={`/venues/${v.id}`} className="card tap">
              {v.images?.[0] && <img className="venue-img" src={v.images[0]} alt={v.name} />}
              <div className="row between mt8">
                <div className="card-title">{v.name}</div>
                {v.rating > 0 && <span className="badge neutral">⭐ {v.rating}</span>}
              </div>
              <div className="tiny">{VENUE_TYPES[v.venue_type]} • {v.village?.name}</div>
              <div className="row between mt8">
                <span className="price">{sypText(v.price_per_hour)} / ساعة</span>
                <span className="badge dark">احجز الآن</span>
              </div>
            </Link>
          ))
        )}
      </div>

      <div className="section">
        <div className="section-head">
          <h2>🏆 بطولات نشطة</h2>
          <Link to="/tournaments" className="see-all">الكل ›</Link>
        </div>
        {tournaments.isLoading ? <Spinner /> : tournaments.data?.length === 0 ? <Empty icon="🏆" text="لا توجد بطولات نشطة" /> : (
          tournaments.data?.map((t) => (
            <Link key={t.id} to={`/tournaments/${t.id}`} className="card tap">
              <div className="row between">
                <div className="card-title">{t.name}</div>
                <span className="badge info">{t.status === 'registration_open' ? 'التسجيل مفتوح' : t.status === 'ongoing' ? 'جارية' : 'قادمة'}</span>
              </div>
              <div className="tiny">📍 {t.village?.name} • 🏟️ {t.venue?.name}</div>
              {t.start_date && <div className="tiny">تبدأ: {t.start_date}</div>}
            </Link>
          ))
        )}
      </div>

      {profile?.role === 'venue_owner' && (
        <div className="section">
          <Link to="/dashboard" className="btn secondary block">🛠️ لوحة تحكم صاحب الملعب</Link>
        </div>
      )}
      {profile?.role === 'admin' && (
        <div className="section">
          <Link to="/admin" className="btn secondary block">🛡️ لوحة الإدارة</Link>
        </div>
      )}
    </Layout>
  )
}
