import { useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Layout from '../../components/Layout'
import { Spinner, Empty, ErrorBox, OkBox } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { sypText, timeAr, dateAr, BOOKING_STATUS_LABELS } from '../../lib/constants'

export default function BookingPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [step, setStep] = useState(1) // 1 date/time, 2 payment, 3 done
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [hours, setHours] = useState(1)
  const [start, setStart] = useState('')
  const [receiptFile, setReceiptFile] = useState(null)
  const [bookingId, setBookingId] = useState(null)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  const venue = useQuery({
    queryKey: ['venue', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('venues').select('*').eq('id', id).maybeSingle()
      if (error) throw error
      return data
    },
  })

  // Already-taken slots for that date
  const taken = useQuery({
    queryKey: ['bookings-public', id, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('start_time, end_time, booking_status')
        .eq('venue_id', id)
        .eq('booking_date', date)
        .in('booking_status', ['pending_review', 'confirmed'])
      if (error) throw error
      return data
    },
  })

  const slots = useMemo(() => {
    if (!venue.data) return []
    const toMin = (t) => {
      const [h, m] = String(t).split(':').map(Number)
      return h * 60 + m
    }
    const open = toMin(venue.data.open_time)
    const close = toMin(venue.data.close_time)
    const out = []
    for (let t = open; t + 60 <= close; t += 60) out.push(t)
    return out
  }, [venue.data])

  const isTaken = (t) => {
    const toMin = (s) => {
      const [h, m] = String(s).split(':').map(Number)
      return h * 60 + m
    }
    return (taken.data || []).some((b) => {
      const s = toMin(b.start_time)
      const e = toMin(b.end_time)
      const end = t + hours * 60
      return t < e && s < end
    })
  }

  const fullPrice = venue.data ? venue.data.price_per_hour * hours : 0
  const deposit = venue.data ? Math.floor((fullPrice * venue.data.deposit_percent) / 100) : 0

  const createBooking = useMutation({
    mutationFn: async () => {
      if (!start) throw new Error('اختر وقت البداية')
      const { data, error } = await supabase.rpc('create_booking', {
        p_venue_id: id,
        p_date: date,
        p_start: start + ':00',
        p_hours: hours,
      })
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: (bid) => {
      setBookingId(bid)
      setStep(2)
      setErr('')
      qc.invalidateQueries({ queryKey: ['bookings-public', id, date] })
    },
    onError: (e) => setErr(e.message.replace(/^.*?\(PG::.*?\)\s*/, '').replace(/Error:\s*/, '')),
  })

  const uploadReceipt = useMutation({
    mutationFn: async () => {
      if (!receiptFile) throw new Error('اختر صورة إشعار التحويل أولاً')
      const { data: userData } = await supabase.auth.getUser()
      const path = `${userData.user.id}/${bookingId}/${Date.now()}_${receiptFile.name}`
      const up = await supabase.storage.from('receipts').upload(path, receiptFile, { upsert: false })
      if (up.error) throw up.error
      // Private bucket: we store the object path; the venue owner views it via a signed URL.
      const { error } = await supabase.rpc('set_payment_receipt', {
        p_booking_id: bookingId,
        p_url: path,
      })
      if (error) throw error
      return path
    },
    onError: (e) => setErr(e.message),
    onSuccess: () => {
      setErr('')
      setOk('تم إرسال إشعار الدفع — الحجز بانتظار مراجعة صاحب الملعب.')
      setStep(3)
    },
  })

  if (venue.isLoading) return <Layout title="الحجز"><Spinner /></Layout>
  const v = venue.data

  return (
    <Layout title={`حجز: ${v?.name || ''}`}>
      {step === 1 && (
        <>
          <div className="card">
            <div className="field">
              <label>التاريخ</label>
              <input type="date" className="input" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => { setDate(e.target.value); setStart('') }} />
            </div>
            <div className="field">
              <label>عدد الساعات</label>
              <div className="chips" style={{ marginBottom: 0 }}>
                {[1, 2, 3].map((h) => (
                  <button key={h} className={`chip ${hours === h ? 'active' : ''}`} onClick={() => { setHours(h); setStart('') }}>{h} ساعة</button>
                ))}
              </div>
            </div>
            <div className="field mb0">
              <label>وقت البداية</label>
              <div className="chips" style={{ marginBottom: 0 }}>
                {slots.map((t) => {
                  const label = `${String(Math.floor(t / 60)).padStart(2, '0')}:00`
                  const takenSlot = isTaken(t)
                  return (
                    <button
                      key={t}
                      disabled={takenSlot}
                      className={`chip ${start === label ? 'active' : ''}`}
                      style={takenSlot ? { opacity: 0.35, textDecoration: 'line-through' } : undefined}
                      onClick={() => setStart(label)}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="kv"><span className="k">السعر الكامل</span><span className="v">{sypText(fullPrice)}</span></div>
            <div className="kv"><span className="k">العربون (يُدفع الآن)</span><span className="v">{sypText(deposit)}</span></div>
            <div className="kv"><span className="k">المتبقي على الملعب</span><span className="v">{sypText(fullPrice - deposit)}</span></div>
          </div>

          <ErrorBox>{err}</ErrorBox>
          <button className="btn block" disabled={!start || createBooking.isPending} onClick={() => createBooking.mutate()}>
            {createBooking.isPending ? 'جارٍ إنشاء الحجز…' : 'متابعة إلى الدفع'}
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <div className="amount-due center">
            المبلغ المطلوب: {sypText(deposit)} (عربون)
          </div>
          <div style={{ height: 10 }} />
          <div className="card">
            <div className="card-title">💳 حوّل عبر شام كاش</div>
            <div className="kv"><span className="k">رقم الحساب</span><span className="v" dir="ltr">{v?.shamcash_number || 'غير متوفر'}</span></div>
            {v?.shamcash_name && <div className="kv"><span className="k">اسم الحساب</span><span className="v">{v.shamcash_name}</span></div>}
            {v?.shamcash_qr_url && <img src={v.shamcash_qr_url} alt="QR شام كاش" style={{ width: 160, borderRadius: 10, margin: '10px auto', display: 'block' }} />}
            <hr className="hr" />
            <div className="field mb0">
              <label>📸 ارفع صورة إشعار التحويل</label>
              <input type="file" accept="image/*" className="input" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} />
              <div className="hint">لن يُؤكد الحجز إلا بعد مراجعة صاحب الملعب للإشعار.</div>
            </div>
          </div>
          <ErrorBox>{err}</ErrorBox>
          <div className="btn-row">
            <button className="btn block" disabled={!receiptFile || uploadReceipt.isPending} onClick={() => uploadReceipt.mutate()}>
              {uploadReceipt.isPending ? 'جارٍ الرفع…' : 'إرسال الحجز للمراجعة'}
            </button>
            <button className="btn outline" onClick={() => setStep(1)}>رجوع</button>
          </div>
        </>
      )}

      {step === 3 && (
        <div className="card center" style={{ padding: 30 }}>
          <div style={{ fontSize: 44 }}>🕓</div>
          <h2>تم إرسال طلب الحجز</h2>
          <p className="muted">سيصلك إشعار فور مراجعة صاحب الملعب لإشعار التحويل وقبول الحجز أو رفضه.</p>
          <OkBox>{ok}</OkBox>
          <div className="btn-row" style={{ justifyContent: 'center' }}>
            <button className="btn" onClick={() => navigate('/profile')}>حجوزاتي</button>
            <Link to={`/venues/${id}`} className="btn outline">صفحة الملعب</Link>
          </div>
        </div>
      )}
    </Layout>
  )
}

export function BookingsList({ ownerIdView = null }) {
  const qc = useQueryClient()
  const [err, setErr] = useState('')

  const bookings = useQuery({
    queryKey: ['bookings', ownerIdView],
    queryFn: async () => {
      let q = supabase
        .from('bookings')
        .select('*, venue:venues(id, name, owner_id), user:profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(50)
      const { data, error } = await q
      if (error) throw error
      return data
    },
  })

  const act = useMutation({
    mutationFn: async ({ fn, args }) => {
      const { error } = await supabase.rpc(fn, args)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      setErr('')
      qc.invalidateQueries({ queryKey: ['bookings'] })
    },
    onError: (e) => setErr(e.message),
  })

  if (bookings.isLoading) return <Spinner />
  if (!bookings.data?.length) return <Empty icon="📅" text="لا توجد حجوزات" />
  return (
    <>
      <ErrorBox>{err}</ErrorBox>
      {bookings.data.map((b) => (
        <div key={b.id} className="card">
          <div className="row between">
            <div className="card-title">{b.venue?.name}</div>
            <span className={`badge ${b.booking_status === 'confirmed' ? 'success' : b.booking_status === 'pending_review' ? 'warn' : 'danger'}`}>
              {BOOKING_STATUS_LABELS[b.booking_status]}
            </span>
          </div>
          <div className="tiny">📅 {dateAr(b.booking_date)} • ⏰ {timeAr(b.start_time)} — {timeAr(b.end_time)}</div>
          {ownerIdView && b.user?.full_name && <div className="tiny">👤 {b.user.full_name}</div>}
          <div className="kv"><span className="k">السعر الكامل</span><span className="v">{sypText(b.full_price)}</span></div>
          <div className="kv"><span className="k">العربون</span><span className="v">{sypText(b.deposit_amount)}</span></div>
          <div className="kv"><span className="k">المتبقي</span><span className="v">{sypText(b.remaining_amount)}</span></div>
        </div>
      ))}
    </>
  )
}
