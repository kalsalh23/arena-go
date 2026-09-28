import { useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Layout from '../../components/Layout'
import Icon from '../../components/Icon'
import { Spinner, ErrorBox, OkBox } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { sypText } from '../../lib/constants'

const SLOT_MINUTES = 90 // مدة الحجز الثابتة: ساعة ونصف
const GAP_MINUTES = 10  // فاصل إلزامي بين حجز وآخر

const toMin = (t) => {
  const [h, m] = String(t).split(':').map(Number)
  return h * 60 + m
}
const fmt = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

export default function BookingPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [step, setStep] = useState(1)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
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

  // أوقات البداية المتاحة خلال اليوم: كل فتحة 90 دقيقة، وبينها 10 دقائق فاصل
  const slots = useMemo(() => {
    if (!venue.data) return []
    const open = toMin(venue.data.open_time)
    const close = toMin(venue.data.close_time)
    const out = []
    for (let t = open; t + SLOT_MINUTES <= close; t += SLOT_MINUTES + GAP_MINUTES) out.push(t)
    return out
  }, [venue.data])

  const isTaken = (t) => {
    const s = t
    const e = t + SLOT_MINUTES
    return (taken.data || []).some((b) => {
      const bs = toMin(b.start_time)
      const be = toMin(b.end_time)
      // الفاصل 10 دقائق يجب أن يفصل بين أي حجزين
      return s < be + GAP_MINUTES && bs + GAP_MINUTES < e
    })
  }

  // السعر على أساس ساعة ونصف
  const fullPrice = venue.data ? Math.round(venue.data.price_per_hour * 1.5) : 0
  const deposit = venue.data ? Math.floor((fullPrice * venue.data.deposit_percent) / 100) : 0

  const createBooking = useMutation({
    mutationFn: async () => {
      if (!start) throw new Error('اختر وقت البداية')
      const { data, error } = await supabase.rpc('create_booking', {
        p_venue_id: id,
        p_date: date,
        p_start: start + ':00',
        p_hours: 1.5,
      })
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: (bid) => {
      setBookingId(bid); setStep(2); setErr('')
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
      // Private bucket: store the object path; the venue owner views it via a signed URL.
      const { error } = await supabase.rpc('set_payment_receipt', { p_booking_id: bookingId, p_url: path })
      if (error) throw error
    },
    onError: (e) => setErr(e.message),
    onSuccess: () => { setErr(''); setOk('تم إرسال إشعار الدفع — الحجز بانتظار مراجعة صاحب الملعب.'); setStep(3) },
  })

  if (venue.isLoading) return <Layout title="الحجز" titleIcon="calendar"><Spinner /></Layout>
  const v = venue.data

  return (
    <Layout title="حجز ملعب" titleIcon="calendar">
      {/* Stepper */}
      <div className="card" style={{ padding: '11px 15px', display: 'flex', alignItems: 'center', gap: 6 }}>
        {['الوقت', 'الدفع', 'المراجعة'].map((s, i) => (
          <div key={s} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              width: 26, height: 26, borderRadius: 9, margin: '0 auto 3px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: step > i ? 'var(--brand)' : 'var(--surface-2)',
              color: step > i ? '#fff' : 'var(--text-3)',
              fontWeight: 800, fontSize: 12, border: step === i + 1 ? '2px solid var(--brand)' : '1.5px solid var(--border)',
            }}>
              {step > i + 1 ? '✓' : i + 1}
            </div>
            <div className="tiny" style={{ fontWeight: 700, color: step >= i + 1 ? 'var(--brand-strong)' : 'var(--text-3)' }}>{s}</div>
          </div>
        ))}
      </div>

      {step === 1 && (
        <>
          <div className="card">
            <div className="field">
              <label><Icon name="calendar" size={14} /> التاريخ</label>
              <input type="date" className="input" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => { setDate(e.target.value); setStart('') }} />
            </div>
            <div className="field mb0">
              <label><Icon name="clock" size={14} /> أوقات اليوم المتاحة — كل حجز ساعة ونصف</label>
              <div className="hint" style={{ marginTop: -6, marginBottom: 8 }}>يوجد فاصل 10 دقائق إلزامي بين الحجوزات</div>
              {taken.isLoading ? <Spinner /> : (
                <div className="chips" style={{ marginBottom: 0 }}>
                  {slots.map((t) => {
                    const label = fmt(t)
                    const takenSlot = isTaken(t)
                    return (
                      <button
                        key={t}
                        disabled={takenSlot}
                        className={`chip ${start === label ? 'active' : ''}`}
                        style={takenSlot ? { opacity: 0.35, textDecoration: 'line-through' } : undefined}
                        onClick={() => setStart(label)}
                      >
                        {label} – {fmt(t + SLOT_MINUTES)}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="kv"><span className="k"><Icon name="clock" size={15} /> مدة الحجز</span><span className="v">ساعة ونصف (ثابتة)</span></div>
            <div className="kv"><span className="k"><Icon name="money" size={15} /> السعر الكامل</span><span className="v">{sypText(fullPrice)}</span></div>
            <div className="kv"><span className="k"><Icon name="card" size={15} /> العربون (يُدفع الآن)</span><span className="v price">{sypText(deposit)}</span></div>
            <div className="kv"><span className="k"><Icon name="money" size={15} /> المتبقي على الملعب</span><span className="v">{sypText(fullPrice - deposit)}</span></div>
          </div>

          <ErrorBox>{err}</ErrorBox>
          <button className="btn block lg" disabled={!start || createBooking.isPending} onClick={() => createBooking.mutate()}>
            {createBooking.isPending ? 'جارٍ إنشاء الحجز…' : 'متابعة إلى الدفع'}
          </button>
        </>
      )}

      {step === 2 && (
        <>
          {/* المبلغ المطلوب — بطاقة بسيطة وواضحة */}
          <div className="amount-card">
            <div className="am-ic"><Icon name="money" size={22} /></div>
            <div style={{ flex: 1 }}>
              <div className="am-lbl">المبلغ المطلوب (عربون)</div>
              <div className="am-val">{sypText(deposit)}</div>
            </div>
            <div className="am-note">المتبقي<br />{sypText(fullPrice - deposit)}</div>
          </div>

          <div className="card mt8">
            <div className="card-title"><Icon name="card" size={17} /> حوّل عبر شام كاش</div>
            <div className="kv"><span className="k"><Icon name="phone" size={15} /> رقم الحساب</span><span className="v" dir="ltr">{v?.shamcash_number || 'غير متوفر'}</span></div>
            {v?.shamcash_name && <div className="kv"><span className="k"><Icon name="user" size={15} /> اسم الحساب</span><span className="v">{v.shamcash_name}</span></div>}
            {v?.shamcash_qr_url && (
              <div className="qr-box mt8"><img src={v.shamcash_qr_url} alt="QR شام كاش" /></div>
            )}
          </div>

          {/* رفع إشعار التحويل — مربع كبير */}
          <label className={`upload-box ${receiptFile ? 'has-file' : ''}`}>
            <input type="file" accept="image/*" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} />
            {receiptFile ? (
              <>
                <img className="preview" src={URL.createObjectURL(receiptFile)} alt="معاينة الإشعار" />
                <div className="up-t">{receiptFile.name}</div>
                <div className="up-s">اضغط لتبديل الصورة</div>
              </>
            ) : (
              <>
                <div className="up-ic"><Icon name="camera" size={24} /></div>
                <div className="up-t">ارفع صورة إشعار التحويل</div>
                <div className="up-s">اضغط هنا لاختيار الصورة من هاتفك</div>
              </>
            )}
          </label>
          <div className="hint center" style={{ marginTop: 6 }}>لن يُؤكد الحجز إلا بعد مراجعة صاحب الملعب للإشعار.</div>

          <ErrorBox>{err}</ErrorBox>
          <div className="btn-row">
            <button className="btn block" disabled={!receiptFile || uploadReceipt.isPending} onClick={() => uploadReceipt.mutate()}>
              <Icon name="send" size={16} /> {uploadReceipt.isPending ? 'جارٍ الرفع…' : 'إرسال الحجز للمراجعة'}
            </button>
            <button className="btn outline" onClick={() => setStep(1)}>رجوع</button>
          </div>
        </>
      )}

      {step === 3 && (
        <div className="card center" style={{ padding: 34 }}>
          <div style={{ width: 74, height: 74, borderRadius: 24, background: 'var(--brand-soft)', color: 'var(--brand-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Icon name="checkC" size={38} />
          </div>
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
