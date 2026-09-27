import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Layout from '../../components/Layout'
import { Spinner, Empty } from '../../components/ui'
import { useVillages, useVillageFilter } from '../../hooks/useVillages'
import { supabase } from '../../lib/supabase'
import { sypText, VENUE_TYPES } from '../../lib/constants'

const TYPE_FILTERS = [
  { key: '', label: 'الكل' },
  { key: 'f5', label: '5×5' },
  { key: 'f7', label: '7×7' },
  { key: 'f11', label: '11×11' },
]

export default function VenuesPage() {
  const { data: villages } = useVillages()
  const [village, setVillage] = useState('')
  const [type, setType] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [search, setSearch] = useState('')

  const venues = useQuery({
    queryKey: ['venues', { village, type, maxPrice, search }],
    queryFn: async () => {
      let q = supabase.from('venues').select('*, village:villages(name)').eq('is_active', true)
      if (village) q = q.eq('village_id', village)
      if (type) q = q.eq('venue_type', type)
      if (maxPrice) q = q.lte('price_per_hour', parseInt(maxPrice, 10))
      if (search) q = q.ilike('name', `%${search}%`)
      q = q.order('rating', { ascending: false })
      const { data, error } = await q
      if (error) throw error
      return data
    },
  })

  return (
    <Layout title="🏟️ الملاعب">
      <input className="input" placeholder="🔍 ابحث عن ملعب…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div style={{ height: 10 }} />
      {useVillageFilter(villages, village, setVillage)}

      <div className="chips">
        {TYPE_FILTERS.map((t) => (
          <button key={t.key} className={`chip ${type === t.key ? 'active' : ''}`} onClick={() => setType(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="field">
        <label>أقصى سعر للساعة: {maxPrice ? sypText(parseInt(maxPrice, 10)) : 'بدون حد'}</label>
        <input type="range" min="0" max="5000" step="100" value={maxPrice || 5000} onChange={(e) => setMaxPrice(e.target.value === '5000' ? '' : e.target.value)} style={{ width: '100%' }} />
      </div>

      {venues.isLoading ? <Spinner /> : venues.data?.length === 0 ? (
        <Empty icon="🏟️" text="لا توجد ملاعب مطابقة" />
      ) : (
        venues.data?.map((v) => (
          <Link key={v.id} to={`/venues/${v.id}`} className="card tap">
            {v.images?.[0] && <img className="venue-img" src={v.images[0]} alt={v.name} />}
            <div className="row between mt8">
              <div className="card-title">{v.name}</div>
              {v.rating > 0 && <span className="badge neutral">⭐ {v.rating}</span>}
            </div>
            <div className="tiny">{VENUE_TYPES[v.venue_type]} • 📍 {v.village?.name}{v.address ? ` • ${v.address}` : ''}</div>
            <div className="row between mt8">
              <span className="price">{sypText(v.price_per_hour)} / ساعة</span>
              <span className="badge dark">التفاصيل والحجز</span>
            </div>
          </Link>
        ))
      )}
    </Layout>
  )
}
