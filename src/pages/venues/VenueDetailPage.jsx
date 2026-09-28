import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Layout from '../../components/Layout'
import Icon from '../../components/Icon'
import { Spinner, Empty, ErrorBox } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { sypText, VENUE_TYPES, timeAr } from '../../lib/constants'

const DEPOSIT_UNITS = 1000 // عربون ثابت: 100,000 ل.س

export default function VenueDetailPage() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const qc = useQueryClient()
  const [photo, setPhoto] = useState(0)
  const [myRating, setMyRating] = useState(5)
  const [myComment, setMyComment] = useState('')
  const [err, setErr] = useState('')

  const venue = useQuery({
    queryKey: ['venue', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('venues').select('*, village:villages(name)').eq('id', id).maybeSingle()
      if (error) throw error
      return data
    },
  })

  const reviews = useQuery({
    queryKey: ['venue-reviews', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('venue_reviews')
        .select('*, user:profiles(full_name, avatar_url)')
        .eq('venue_id', id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data
    },
  })

  const addReview = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('venue_reviews').upsert({
        venue_id: id, user_id: user.id, rating: myRating, comment: myComment,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setMyComment('')
      qc.invalidateQueries({ queryKey: ['venue-reviews', id] })
      qc.invalidateQueries({ queryKey: ['venue', id] })
    },
    onError: (e) => setErr(e.message),
  })

  if (venue.isLoading) return <Layout title="الملعب"><Spinner /></Layout>
  if (!venue.data) return <Layout title="الملعب"><Empty icon="building" text="الملعب غير موجود" /></Layout>

  const v = venue.data
  const images = v.images?.length ? v.images : null
  const isOwner = profile?.id === v.owner_id

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
                  flex: 0, width: 58, height: 44, borderRadius: 9, overflow: 'hidden',
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
          {v.rating > 0 && <span className="badge success"><Icon name="star" size={12} /> {v.rating} ({v.ratings_count})</span>}
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

      {/* التقييمات */}
      <div className="section">
        <div className="section-head"><h2><Icon name="star" size={17} /> التقييمات</h2></div>
        {user && (
          <div className="card">
            <div className="chips" style={{ marginBottom: 8 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} className={`chip ${myRating === n ? 'active' : ''}`} onClick={() => setMyRating(n)}><Icon name="star" size={12} /> {n}</button>
              ))}
            </div>
            <textarea className="textarea" style={{ minHeight: 58 }} placeholder="شاركنا رأيك بالملعب…" value={myComment} onChange={(e) => setMyComment(e.target.value)} />
            <ErrorBox>{err}</ErrorBox>
            <button className="btn sm mt8" onClick={() => addReview.mutate()} disabled={addReview.isPending}>
              <Icon name="send" size={14} /> {addReview.isPending ? 'جارٍ الإرسال…' : 'إرسال التقييم'}
            </button>
          </div>
        )}
        {reviews.isLoading ? <Spinner /> : reviews.data?.length === 0 ? <Empty icon="star" text="لا توجد تقييمات بعد" /> : (
          <div className="card">
            {reviews.data.map((r) => (
              <div key={r.id} className="list-item">
                <div className="avatar">{(r.user?.full_name || '؟').charAt(0)}</div>
                <div style={{ flex: 1 }}>
                  <div className="row between">
                    <b style={{ fontSize: 13.5 }}>{r.user?.full_name || 'لاعب'}</b>
                    <span className="badge success"><Icon name="star" size={11} /> {r.rating}</span>
                  </div>
                  {r.comment && <div className="tiny" style={{ color: 'var(--text-2)' }}>{r.comment}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
