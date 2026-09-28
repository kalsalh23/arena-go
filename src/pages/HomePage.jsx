import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Layout from '../components/Layout'
import HeroCarousel from '../components/HeroCarousel'
import Icon from '../components/Icon'
import { Spinner, Empty } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useVillages, VillageSelect } from '../hooks/useVillages'
import { supabase } from '../lib/supabase'
import { sypText, VENUE_TYPES } from '../lib/constants'

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

  const villageName = profile?.village_id ? (villages || []).find((v) => v.id === profile.village_id)?.name : null

  return (
    <Layout title="الرئيسية">
      <div className="row between" style={{ marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16.5 }}>
            {user ? `أهلاً ${profile?.full_name || ''} 👋` : 'أهلاً بك في Arena Go'}
          </div>
          <div className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icon name="pin" size={13} /> {villageName || 'ريف حماة'}
          </div>
        </div>
        {!user && <Link to="/auth" className="btn sm">تسجيل الدخول</Link>}
      </div>

      {/* الهيرو: بطاقة إعلانات/عروض/بطولات متبادلة */}
      <HeroCarousel />

      <div style={{ position: 'relative', marginBottom: 14 }}>
        <input
          className="input"
          style={{ paddingInlineStart: 42 }}
          placeholder="ابحث عن ملعب…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Icon name="search" size={18} style={{ position: 'absolute', top: 13, insetInlineStart: 14, color: 'var(--text-3)' }} />
      </div>

      <div className="filter-row">
        <VillageSelect villages={villages} value={village} onChange={setVillage} />
      </div>

      <div className="grid-4">
        <Link to="/venues" className="tile">
          <div className="tile-ic"><Icon name="building" size={21} /></div>
          <div className="tile-lbl">الملاعب</div>
        </Link>
        <Link to="/teams" className="tile">
          <div className="tile-ic"><Icon name="ball" size={21} /></div>
          <div className="tile-lbl">الفرق</div>
        </Link>
        <Link to="/tournaments" className="tile">
          <div className="tile-ic"><Icon name="trophy" size={21} /></div>
          <div className="tile-lbl">البطولات</div>
        </Link>
        <Link to={user ? '/profile' : '/auth'} className="tile">
          <div className="tile-ic"><Icon name="calendar" size={21} /></div>
          <div className="tile-lbl">حجوزاتي</div>
        </Link>
      </div>

      <div className="section">
        <div className="section-head">
          <h2><Icon name="building" size={17} /> ملاعب قريبة</h2>
          <Link to="/venues" className="see-all">الكل ›</Link>
        </div>
        {venues.isLoading ? <Spinner /> : venues.data?.length === 0 ? <Empty icon="building" text="لا توجد ملاعب بعد" /> : (
          venues.data?.map((v) => (
            <Link key={v.id} to={`/venues/${v.id}`} className="card tap" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ position: 'relative' }}>
                {v.images?.[0] ? (
                  <img src={v.images[0]} alt={v.name} style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div className="hero-bg" style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><Icon name="image" size={30} /></div>
                )}
                <div className="img-chip" style={{ top: 10, insetInlineStart: 10 }}>{VENUE_TYPES[v.venue_type]}</div>
              </div>
              <div style={{ padding: '10px 14px 12px' }}>
                <div className="row between" style={{ gap: 8 }}>
                  <b style={{ fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</b>
                  {v.rating > 0 && <span className="badge success" style={{ flexShrink: 0 }}><Icon name="star" size={11} /> {v.rating}</span>}
                </div>
                <div className="row between" style={{ marginTop: 6 }}>
                  <span className="tiny"><Icon name="pin" size={11} /> {v.village?.name}</span>
                  <span className="price" style={{ fontSize: 14 }}>{sypText(v.price_per_hour)}<span className="tiny" style={{ fontWeight: 600 }}> / ساعة</span></span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {profile?.role === 'venue_owner' && (
        <div className="section" style={{ marginTop: 16 }}>
          <Link to="/dashboard" className="btn secondary block"><Icon name="sliders" size={17} /> لوحة تحكم صاحب الملعب</Link>
        </div>
      )}
    </Layout>
  )
}
