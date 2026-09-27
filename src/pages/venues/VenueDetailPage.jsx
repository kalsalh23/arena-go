import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Layout from '../../components/Layout'
import Icon from '../../components/Icon'
import { Spinner, Empty, ErrorBox } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { sypText, VENUE_TYPES, timeAr } from '../../lib/constants'

export default function VenueDetailPage() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const qc = useQueryClient()
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
  const isOwner = profile?.id === v.owner_id

  return (
    <Layout title={v.name} titleIcon="building">
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ position: 'relative' }}>
          {v.images?.[0] ? (
            <img src={v.images[0]} alt={v.name} style={{ width: '100%', height: 210, objectFit: 'cover', display: 'block' }} />
          ) : (
            <div className="hero-bg" style={{ height: 120 }} />
          )}
          <div className="img-chip" style={{ top: 12 }}>{VENUE_TYPES[v.venue_type]}</div>
          {v.rating > 0 && (
            <div className="img-chip gold" style={{ top: 12, insetInlineStart: 'auto', insetInlineEnd: 12 }}>
              <Icon name="star" size={11} /> {v.rating} ({v.ratings_count})
            </div>
          )}
        </div>
        <div style={{ padding: 15 }}>
          <h2 style={{ fontSize: 18 }}>{v.name}</h2>
          <div className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
            <Icon name="pin" size={13} /> {v.village?.name}{v.address ? ` — ${v.address}` : ''}
          </div>
          {v.description && <p className="muted" style={{ fontSize: 13 }}>{v.description}</p>}

          <div className="grid-2" style={{ marginTop: 12 }}>
            <div className="stat-card">
              <div className="num" style={{ fontSize: 15 }}>{sypText(v.price_per_hour)}</div>
              <div className="lbl">السعر / ساعة</div>
            </div>
            <div className="stat-card">
              <div className="num" style={{ fontSize: 15 }}>{sypText(Math.round(v.price_per_hour * v.deposit_percent / 100))}</div>
              <div className="lbl">العربون ({v.deposit_percent}%)</div>
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <div className="kv"><span className="k"><Icon name="clock" size={15} /> أوقات العمل</span><span className="v">{timeAr(v.open_time)} — {timeAr(v.close_time)}</span></div>
            {v.phone && <div className="kv"><span className="k"><Icon name="phone" size={15} /> هاتف</span><span className="v" dir="ltr">{v.phone}</span></div>}
            {v.whatsapp && (
              <div className="kv">
                <span className="k"><Icon name="whatsapp" size={15} /> واتساب</span>
                <a className="btn sm secondary" href={`https://wa.me/${v.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">تواصل</a>
              </div>
            )}
          </div>

          {v.amenities?.length > 0 && (
            <div className="chips" style={{ marginTop: 10, marginBottom: 0 }}>
              {v.amenities.map((a) => <span key={a} className="chip" style={{ cursor: 'default' }}>{a}</span>)}
            </div>
          )}
        </div>
      </div>

      {v.shamcash_active && v.shamcash_number && (
        <div className="card">
          <div className="card-title"><Icon name="card" size={17} /> الدفع عبر شام كاش</div>
          <div className="kv"><span className="k"><Icon name="phone" size={15} /> رقم الحساب</span><span className="v" dir="ltr">{v.shamcash_number}</span></div>
          {v.shamcash_name && <div className="kv"><span className="k"><Icon name="user" size={15} /> اسم الحساب</span><span className="v">{v.shamcash_name}</span></div>}
          {v.shamcash_qr_url && (
            <div className="qr-box mt8"><img src={v.shamcash_qr_url} alt="QR شام كاش" /></div>
          )}
        </div>
      )}

      {!isOwner && (
        <Link to={`/venues/${id}/book`} className="btn block lg"><Icon name="calendar" size={18} /> احجز هذا الملعب</Link>
      )}
      {isOwner && <Link to="/dashboard" className="btn secondary block"><Icon name="sliders" size={17} /> إدارة ملعبك من لوحة التحكم</Link>}

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
