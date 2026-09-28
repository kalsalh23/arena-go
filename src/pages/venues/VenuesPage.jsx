import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Layout from '../../components/Layout'
import Icon from '../../components/Icon'
import { Spinner, Empty } from '../../components/ui'
import { useVillages, VillageSelect, ListSelect } from '../../hooks/useVillages'
import { supabase } from '../../lib/supabase'
import { sypText, VENUE_TYPES } from '../../lib/constants'

const TYPE_OPTIONS = [
  { key: 'f5', label: '5×5' },
  { key: 'f7', label: '7×7' },
  { key: 'f11', label: '11×11' },
]

export default function VenuesPage() {
  const { data: villages } = useVillages()
  const [village, setVillage] = useState('')
  const [type, setType] = useState('')
  const [search, setSearch] = useState('')

  const venues = useQuery({
    queryKey: ['venues', { village, type, search }],
    queryFn: async () => {
      let q = supabase.from('venues').select('*, village:villages(name)').eq('is_active', true)
      if (village) q = q.eq('village_id', village)
      if (type) q = q.eq('venue_type', type)
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

      <div className="filter-row">
        <VillageSelect villages={villages} value={village} onChange={setVillage} />
        <ListSelect label="النوع" value={type} onChange={setType} options={TYPE_OPTIONS} />
      </div>

      {venues.isLoading ? <Spinner /> : venues.data?.length === 0 ? (
        <Empty icon="building" text="لا توجد ملاعب مطابقة" />
      ) : (
        venues.data?.map((v) => (
          <Link key={v.id} to={`/venues/${v.id}`} className="card tap" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ position: 'relative' }}>
              {v.images?.[0] ? (
                <img src={v.images[0]} alt={v.name} style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }} />
              ) : (
                <div className="hero-bg" style={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><Icon name="image" size={34} /></div>
              )}
              <div className="img-chip" style={{ top: 10, insetInlineStart: 10 }}>{VENUE_TYPES[v.venue_type]}</div>
            </div>
            <div style={{ padding: '11px 14px 13px' }}>
              <div className="row between" style={{ gap: 8 }}>
                <b style={{ fontSize: 15.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</b>
                {v.rating > 0 && <span className="badge success" style={{ flexShrink: 0 }}><Icon name="star" size={11} /> {v.rating}</span>}
              </div>
              <div className="tiny" style={{ margin: '3px 0 8px' }}>
                <Icon name="pin" size={11} /> {v.village?.name}
              </div>
              <div className="row between">
                <span className="price" style={{ fontSize: 14.5 }}>{sypText(v.price_per_hour)}<span className="tiny" style={{ fontWeight: 600 }}> / ساعة</span></span>
                <span className="btn sm" style={{ pointerEvents: 'none' }}><Icon name="calendar" size={13} /> احجز</span>
              </div>
            </div>
          </Link>
        ))
      )}
    </Layout>
  )
}

