import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Layout from '../../components/Layout'
import { Spinner, Empty, ErrorBox } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { sypText, VENUE_TYPES, timeAr } from '../../lib/constants'
import { useState } from 'react'

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
        venue_id: id,
        user_id: user.id,
        rating: myRating,
        comment: myComment,
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
  if (!venue.data) return <Layout title="الملعب"><Empty icon="🏟️" text="الملعب غير موجود" /></Layout>

  const v = venue.data
  const isOwner = profile?.id === v.owner_id

  return (
    <Layout title={v.name}>
      {v.images?.length > 0 && (
        <img className="venue-img" style={{ height: 190, marginBottom: 12 }} src={v.images[0]} alt={v.name} />
      )}

      <div className="card">
        <div className="row between">
          <h2 style={{ margin: 0 }}>{v.name}</h2>
          {v.rating > 0 && <span className="badge neutral">⭐ {v.rating} ({v.ratings_count})</span>}
        </div>
        <div className="tiny">{VENUE_TYPES[v.venue_type]} • 📍 {v.village?.name}{v.address ? ` — ${v.address}` : ''}</div>
        {v.description && <p className="muted" style={{ marginTop: 10 }}>{v.description}</p>}

        <div className="kv"><span className="k">السعر / ساعة</span><span className="v price">{sypText(v.price_per_hour)}</span></div>
        <div className="kv"><span className="k">العربون المطلوب</span><span className="v">{v.deposit_percent}% = {sypText(Math.round(v.price_per_hour * v.deposit_percent / 100))}</span></div>
        <div className="kv"><span className="k">أوقات العمل</span><span className="v">{timeAr(v.open_time)} — {timeAr(v.close_time)}</span></div>
        {v.phone && <div className="kv"><span className="k">📞 هاتف</span><span className="v" dir="ltr">{v.phone}</span></div>}
        {v.whatsapp && (
          <div className="kv">
            <span className="k">واتساب</span>
            <a className="v" href={`https://wa.me/${v.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ color: 'var(--info)' }}>تواصل 💬</a>
          </div>
        )}
        {v.amenities?.length > 0 && (
          <div className="mt8">
            <div className="tiny" style={{ marginBottom: 4 }}>المرافق:</div>
            <div className="chips" style={{ marginBottom: 0 }}>
              {v.amenities.map((a) => <span key={a} className="chip" style={{ cursor: 'default' }}>{a}</span>)}
            </div>
          </div>
        )}
      </div>

      {v.shamcash_active && v.shamcash_number && (
        <div className="card">
          <div className="card-title">💳 الدفع عبر شام كاش</div>
          <div className="kv"><span className="k">رقم الحساب</span><span className="v" dir="ltr">{v.shamcash_number}</span></div>
          {v.shamcash_name && <div className="kv"><span className="k">اسم الحساب</span><span className="v">{v.shamcash_name}</span></div>}
          {v.shamcash_qr_url && <img src={v.shamcash_qr_url} alt="QR شام كاش" style={{ width: 140, borderRadius: 10, marginTop: 8 }} />}
        </div>
      )}

      {!isOwner && (
        <Link to={`/venues/${id}/book`} className="btn block">📅 احجز هذا الملعب</Link>
      )}
      {isOwner && (
        <Link to="/dashboard" className="btn secondary block">🛠️ إدارة ملعبك من لوحة التحكم</Link>
      )}

      <div className="section">
        <div className="section-head"><h2>⭐ التقييمات</h2></div>
        {user && (
          <div className="card">
            <div className="row" style={{ marginBottom: 8 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} className={`chip ${myRating === n ? 'active' : ''}`} onClick={() => setMyRating(n)}>{n} ⭐</button>
              ))}
            </div>
            <textarea className="textarea" style={{ minHeight: 60 }} placeholder="رأيك بالملعب…" value={myComment} onChange={(e) => setMyComment(e.target.value)} />
            <ErrorBox>{err}</ErrorBox>
            <button className="btn sm mt8" onClick={() => addReview.mutate()} disabled={addReview.isPending}>
              {addReview.isPending ? 'جارٍ الإرسال…' : 'إرسال التقييم'}
            </button>
          </div>
        )}
        {reviews.isLoading ? <Spinner /> : reviews.data?.length === 0 ? <Empty icon="⭐" text="لا توجد تقييمات بعد" /> : (
          <div className="card">
            {reviews.data.map((r) => (
              <div key={r.id} className="list-item">
                <div className="avatar">{(r.user?.full_name || '؟').charAt(0)}</div>
                <div style={{ flex: 1 }}>
                  <div className="row between">
                    <b style={{ fontSize: 13.5 }}>{r.user?.full_name || 'لاعب'}</b>
                    <span className="tiny">{'⭐'.repeat(r.rating)}</span>
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
