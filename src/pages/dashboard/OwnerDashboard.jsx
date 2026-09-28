import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Layout from '../../components/Layout'
import { Spinner, Empty, ErrorBox, OkBox } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { sypText, dateAr, timeAr, BOOKING_STATUS_LABELS, TOURNAMENT_STATUS_LABELS } from '../../lib/constants'
import { statusBadge } from '../tournaments/TournamentsPage'

export default function OwnerDashboard() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('venues')
  const [err, setErr] = useState('')

  const venues = useQuery({
    queryKey: ['my-venues', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.from('venues').select('*, village:villages(name)').eq('owner_id', profile.id).order('created_at')
      if (error) throw error
      return data
    },
  })

  const myTournaments = useQuery({
    queryKey: ['my-tournaments', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*, venue:venues(name), village:villages(name)')
        .eq('owner_id', profile.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  return (
    <Layout title="لوحة صاحب الملعب" titleIcon="sliders">
      <ErrorBox>{err}</ErrorBox>

      <div className="btn-row" style={{ marginBottom: 14 }}>
        <Link to="/dashboard/venues/new" className="btn sm">＋ إضافة ملعب</Link>
        <Link to="/dashboard/tournaments/new" className="btn sm">＋ إنشاء بطولة</Link>
      </div>

      <div className="tabs">
        <button className={tab === 'venues' ? 'active' : ''} onClick={() => setTab('venues')}>ملاعبي</button>
        <button className={tab === 'bookings' ? 'active' : ''} onClick={() => setTab('bookings')}>الحجوزات</button>
        <button className={tab === 'tournaments' ? 'active' : ''} onClick={() => setTab('tournaments')}>البطولات</button>
      </div>

      {tab === 'venues' && (
        venues.isLoading ? <Spinner /> : venues.data?.length === 0 ? <Empty icon="🏟️" text="لم تضف ملاعب بعد" /> : (
          venues.data.map((v) => (
            <div key={v.id} className="card">
              <div className="row between">
                <div className="card-title">{v.name}</div>
                <span className={`badge ${v.is_active ? 'success' : 'danger'}`}>{v.is_active ? 'نشط' : 'موقوف'}</span>
              </div>
              <div className="tiny">📍 {v.village?.name} • {sypText(v.price_per_hour)}/ساعة</div>
              <div className="btn-row">
                <Link to={`/dashboard/venues/${v.id}/edit`} className="btn sm outline">تعديل</Link>
                <Link to={`/venues/${v.id}`} className="btn sm secondary">عرض</Link>
              </div>
            </div>
          ))
        )
      )}

      {tab === 'bookings' && <OwnerBookings venues={venues.data || []} />}

      {tab === 'tournaments' && (
        myTournaments.isLoading ? <Spinner /> : myTournaments.data?.length === 0 ? <Empty icon="🏆" text="لم تنشئ بطولات بعد" /> : (
          myTournaments.data.map((t) => (
            <div key={t.id} className="card">
              <div className="row between">
                <div className="card-title">{t.name}</div>
                {statusBadge(t.status)}
              </div>
              <div className="tiny">🏟️ {t.venue?.name} • 📍 {t.village?.name}</div>
              {t.status === 'rejected' && t.rejection_reason && <div className="tiny" style={{ color: 'var(--danger)' }}>سبب الرفض: {t.rejection_reason}</div>}
              <div className="btn-row">
                <Link to={`/dashboard/tournaments/${t.id}`} className="btn sm">إدارة</Link>
              </div>
            </div>
          ))
        )
      )}
    </Layout>
  )
}

function OwnerBookings({ venues }) {
  const qc = useQueryClient()
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  const bookings = useQuery({
    queryKey: ['owner-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, venue:venues(id, name), user:profiles(full_name)')
        .in('booking_status', ['pending_review', 'confirmed'])
        .order('created_at', { ascending: false })
        .limit(60)
      if (error) throw error
      return data
    },
  })

  const signed = useQuery({
    queryKey: ['receipt-urls', bookings.data?.map((b) => b.payment_receipt_url).join('|')],
    enabled: !!bookings.data?.some((b) => b.payment_receipt_url),
    queryFn: async () => {
      const map = {}
      for (const b of bookings.data) {
        if (b.payment_receipt_url) {
          const { data } = await supabase.storage.from('receipts').createSignedUrl(b.payment_receipt_url, 600)
          if (data) map[b.id] = data.signedUrl
        }
      }
      return map
    },
  })

  const review = useMutation({
    mutationFn: async ({ id, decision, note }) => {
      const { error } = await supabase.rpc('review_booking', { p_booking_id: id, p_decision: decision, p_note: note || null })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => { setErr(''); setOk('تمت المعالجة'); qc.invalidateQueries({ queryKey: ['owner-bookings'] }) },
    onError: (e) => { setOk(''); setErr(e.message) },
  })

  if (bookings.isLoading) return <Spinner />
  if (!bookings.data?.length) return <Empty icon="📅" text="لا توجد حجوزات نشطة" />

  return (
    <>
      <ErrorBox>{err}</ErrorBox>
      <OkBox>{ok}</OkBox>
      {bookings.data.map((b) => (
        <div key={b.id} className="card">
          <div className="row between">
            <div className="card-title">{b.venue?.name}</div>
            <span className={`badge ${b.booking_status === 'confirmed' ? 'success' : 'warn'}`}>
              {BOOKING_STATUS_LABELS[b.booking_status]}
            </span>
          </div>
          <div className="tiny">👤 {b.user?.full_name || 'لاعب'} • 📅 {dateAr(b.booking_date)} • ⏰ {timeAr(b.start_time)}</div>
          <div className="kv"><span className="k">العربون</span><span className="v">{sypText(b.deposit_amount)}</span></div>
          <div className="kv"><span className="k">السعر الكامل</span><span className="v">{sypText(b.full_price)}</span></div>
          {b.notes && <div className="tiny">📝 {b.notes}</div>}

          {b.payment_receipt_url && (
            <div className="mt8">
              <a href={signed.data?.[b.id] || '#'} target="_blank" rel="noreferrer" className="btn sm secondary">🧾 عرض إشعار التحويل</a>
            </div>
          )}

          {b.booking_status === 'pending_review' && (
            <div className="btn-row">
              <button className="btn sm success" onClick={() => review.mutate({ id: b.id, decision: 'approved' })}>قبول الحجز</button>
              <button className="btn sm danger" onClick={() => review.mutate({ id: b.id, decision: 'rejected', note: 'إشعار التحويل غير صحيح' })}>رفض</button>
            </div>
          )}
        </div>
      ))}
    </>
  )
}
