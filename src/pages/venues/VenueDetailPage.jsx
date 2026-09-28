import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Layout from '../../components/Layout'
import Icon from '../../components/Icon'
import { Spinner, Empty } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { sypText, VENUE_TYPES, timeAr } from '../../lib/constants'
import { accentFor } from '../../lib/accents'

const DEPOSIT_UNITS = 1000 // عربون ثابت: 100,000 ل.س

export default function VenueDetailPage() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const [photo, setPhoto] = useState(0)

  const venue = useQuery({
    queryKey: ['venue', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('venues').select('*, village:villages(name)').eq('id', id).maybeSingle()
      if (error) throw error
      return data
    },
  })

  if (venue.isLoading) return <Layout title="الملعب"><Spinner /></Layout>
  if (!venue.data) return <Layout title="الملعب"><Empty icon="building" text="الملعب غير موجود" /></Layout>

  const v = venue.data
  const images = v.images?.length ? v.images : null
  const isOwner = profile?.id === v.owner_id
  const acc = accentFor(v.id)

  return (
    <Layout title={v.name} titleIcon="building">
      {/* معرض الصور */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ position: 'relative' }}>
          {images ? (
            <img src={images[photo]} alt={v.name} style={{ width: '100%', height: 230, objectFit: 'cover', display: 'block' }} />
          ) : (
            <div className="hero-bg" style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Icon name="image" size={40} />
            </div>
          )}
          <div className="img-chip" style={{ top: 12 }}>{VENUE_TYPES[v.venue_type]}</div>
          {images?.length > 1 && (
            <div className="img-chip" style={{ top: 12, insetInlineStart: 'auto', insetInlineEnd: 12 }}>
              {photo + 1} / {images.length}
            </div>
          )}
        </div>
        {images?.length > 1 && (
          <div className="chips" style={{ padding: 10, marginBottom: 0, justifyContent: 'center' }}>
            {images.map((u, i) => (
              <button
                key={u}
                onClick={() => setPhoto(i)}
                style={{
                  flex: '0 0 auto', width: 58, height: 44, borderRadius: 9, overflow: 'hidden',
                  border: photo === i ? '2.5px solid var(--brand)' : '2px solid var(--border)',
                  padding: 0, cursor: 'pointer', background: 'var(--surface-2)',
                }}
              >
                <img src={u} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* الاسم والمعلومات المهمة */}
      <div className="card">
        <div className="row between wrap">
          <h2 style={{ fontSize: 18.5, margin: 0 }}>{v.name}</h2>
        </div>
        <div className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
          <Icon name="pin" size={13} /> {v.village?.name}{v.address ? ` — ${v.address}` : ''}
        </div>

        <div className="grid-2" style={{ marginTop: 13 }}>
          <div className="stat-card">
            <div className="num" style={{ fontSize: 15 }}>{sypText(v.price_per_hour)}</div>
            <div className="lbl">سعر الساعة</div>
          </div>
          <div className="stat-card">
            <div className="num" style={{ fontSize: 15 }}>{sypText(Math.min(DEPOSIT_UNITS, v.price_per_hour * 1.5))}</div>
            <div className="lbl">العربون (ثابت)</div>
          </div>
        </div>
      </div>

      {/* التفاصيل */}
      <div className="card">
        <div className="card-title"><Icon name="info" size={17} /> التفاصيل</div>
        {v.description && <p className="muted" style={{ fontSize: 13.5 }}>{v.description}</p>}
        <div className="kv"><span className="k"><Icon name="clock" size={15} /> أوقات العمل</span><span className="v">{timeAr(v.open_time)} — {timeAr(v.close_time)}</span></div>
        <div className="kv"><span className="k"><Icon name="calendar" size={15} /> مدة الحجز</span><span className="v">ساعة ونصف (فاصل 10 دقائق)</span></div>
        <div className="kv"><span className="k"><Icon name="card" size={15} /> طريقة الدفع</span><span className="v">عربون عبر شام كاش</span></div>
        {v.phone && <div className="kv"><span className="k"><Icon name="phone" size={15} /> للتواصل</span><span className="v" dir="ltr">{v.phone}</span></div>}
        {v.whatsapp && (
          <div className="kv">
            <span className="k"><Icon name="whatsapp" size={15} /> واتساب</span>
            <a className="btn sm secondary" href={`https://wa.me/${v.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">محادثة</a>
          </div>
        )}
        {v.amenities?.length > 0 && (
          <div className="chips" style={{ marginTop: 10, marginBottom: 0 }}>
            {v.amenities.map((a) => <span key={a} className="chip" style={{ cursor: 'default' }}>{a}</span>)}
          </div>
        )}
      </div>

      {!isOwner && (
        <Link to={`/venues/${id}/book`} className="btn block lg"><Icon name="calendar" size={18} /> احجز الآن</Link>
      )}
      {isOwner && <Link to="/dashboard" className="btn secondary block"><Icon name="sliders" size={17} /> إدارة ملعبك من لوحة التحكم</Link>}
    </Layout>
  )
}
