import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Layout from '../../components/Layout'
import Icon from '../../components/Icon'
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
    <Layout title="الملاعب" titleIcon="building">
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <input className="input" style={{ paddingInlineStart: 42 }} placeholder="ابحث عن ملعب…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Icon name="search" size={18} style={{ position: 'absolute', top: 13, insetInlineStart: 14, color: 'var(--text-3)' }} />
      </div>

      {useVillageFilter(villages, village, setVillage)}

      <div className="chips">
        {TYPE_FILTERS.map((t) => (
          <button key={t.key} className={`chip ${type === t.key ? 'active' : ''}`} onClick={() => setType(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: '12px 15px' }}>
        <div className="row between">
          <label style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text-2)', margin: 0 }}>
            <Icon name="money" size={15} /> أقصى سعر للساعة: {maxPrice ? sypText(parseInt(maxPrice, 10)) : 'بدون حد'}
          </label>
        </div>
        <input type="range" min="0" max="5000" step="100" value={maxPrice || 5000} onChange={(e) => setMaxPrice(e.target.value === '5000' ? '' : e.target.value)} style={{ width: '100%', accentColor: 'var(--brand)' }} />
      </div>

      {venues.isLoading ? <Spinner /> : venues.data?.length === 0 ? (
        <Empty icon="building" text="لا توجد ملاعب مطابقة" />
      ) : (
        venues.data?.map((v) => (
          <Link key={v.id} to={`/venues/${v.id}`} className="card tap" style={{ padding: 12 }}>
            <div className="venue-row">
              {v.images?.[0]
                ? <img className="thumb" src={v.images[0]} alt={v.name} />
                : <div className="thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)' }}><Icon name="image" size={26} /></div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row between">
                  <div className="card-title" style={{ fontSize: 14.5 }}>{v.name}</div>
                  {v.rating > 0 && <span className="badge success"><Icon name="star" size={11} /> {v.rating}</span>}
                </div>
                <div className="tiny" style={{ margin: '3px 0 6px' }}>
                  {VENUE_TYPES[v.venue_type]} • <Icon name="pin" size={11} /> {v.village?.name}
                </div>
                <div className="row between">
                  <span className="price" style={{ fontSize: 14 }}>{sypText(v.price_per_hour)}<span className="tiny" style={{ fontWeight: 600 }}> / ساعة</span></span>
                  <span className="badge dark">احجز</span>
                </div>
              </div>
            </div>
          </Link>
        ))
      )}
    </Layout>
  )
}
