import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Layout from '../../components/Layout'
import { Spinner, ErrorBox } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useVillages } from '../../hooks/useVillages'

const AMENITY_OPTIONS = ['إضاءة ليلية', 'مدرجات', 'غرف تبديل', 'استراحة', 'موقف سيارات', 'مقصف', 'شباك حماية', 'عشب صناعي']

export default function VenueForm() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: villages } = useVillages()
  const [err, setErr] = useState('')
  const [form, setForm] = useState({
    name: '', village_id: '', venue_type: 'f5', price_per_hour: '', deposit_percent: 20,
    open_time: '08:00', close_time: '23:00', address: '', description: '', phone: '', whatsapp: '',
    shamcash_number: '', shamcash_name: '', shamcash_qr_url: '', amenities: [],
  })
  const [images, setImages] = useState([])

  const existing = useQuery({
    queryKey: ['venue-edit', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('venues').select('*').eq('id', id).maybeSingle()
      if (error) throw error
      return data
    },
    onSuccess: (d) => {
      setForm({
        name: d.name || '', village_id: d.village_id || '', venue_type: d.venue_type || 'f5',
        price_per_hour: d.price_per_hour || '', deposit_percent: d.deposit_percent ?? 20,
        open_time: (d.open_time || '08:00').slice(0, 5), close_time: (d.close_time || '23:00').slice(0, 5),
        address: d.address || '', description: d.description || '', phone: d.phone || '', whatsapp: d.whatsapp || '',
        shamcash_number: d.shamcash_number || '', shamcash_name: d.shamcash_name || '', shamcash_qr_url: d.shamcash_qr_url || '',
        amenities: d.amenities || [],
      })
      setImages(d.images || [])
    },
  })

  const uploadImage = useMutation({
    mutationFn: async ({ file, target }) => {
      const path = `${user.id}/${Date.now()}_${file.name}`
      const bucket = target === 'qr' ? 'venue-images' : 'venue-images'
      const up = await supabase.storage.from(bucket).upload(path, file)
      if (up.error) throw up.error
      const url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
      if (target === 'qr') setForm((f) => ({ ...f, shamcash_qr_url: url }))
      else setImages((im) => [...im, url])
    },
    onError: (e) => setErr(e.message),
  })

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('أدخل اسم الملعب')
      if (!form.village_id) throw new Error('اختر القرية')
      const payload = {
        owner_id: user.id,
        name: form.name.trim(),
        village_id: form.village_id,
        venue_type: form.venue_type,
        price_per_hour: parseInt(form.price_per_hour, 10) || 0,
        deposit_percent: parseInt(form.deposit_percent, 10) || 0,
        open_time: form.open_time + ':00',
        close_time: form.close_time + ':00',
        address: form.address, description: form.description,
        phone: form.phone, whatsapp: form.whatsapp,
        shamcash_number: form.shamcash_number, shamcash_name: form.shamcash_name,
        shamcash_qr_url: form.shamcash_qr_url || null,
        amenities: form.amenities,
        images,
      }
      const { error } = id
        ? await supabase.from('venues').update(payload).eq('id', id)
        : await supabase.from('venues').insert(payload)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-venues'] })
      qc.invalidateQueries({ queryKey: ['venues'] })
      navigate('/dashboard')
    },
    onError: (e) => setErr(e.message.replace('Error: ', '')),
  })

  if (id && existing.isLoading) return <Layout title="تعديل الملعب" titleIcon="building"><Spinner /></Layout>

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const toggleAmenity = (a) => setForm((f) => ({
    ...f,
    amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a],
  }))

  return (
    <Layout title={id ? 'تعديل الملعب' : 'إضافة ملعب'} titleIcon="building">
      <ErrorBox>{err}</ErrorBox>
      <div className="card">
        <div className="field">
          <label>اسم الملعب *</label>
          <input className="input" value={form.name} onChange={set('name')} placeholder="مثال: ملعب النخبة" />
        </div>
        <div className="field">
          <label>القرية *</label>
          <select className="select" value={form.village_id} onChange={set('village_id')}>
            <option value="">— اختر —</option>
            {(villages || []).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>نوع الملعب</label>
          <select className="select" value={form.venue_type} onChange={set('venue_type')}>
            <option value="f5">5×5</option>
            <option value="f7">7×7</option>
            <option value="f11">11×11</option>
          </select>
        </div>
        <div className="field">
          <label>السعر / ساعة (بالوحدات)</label>
          <input className="input" type="number" min="0" value={form.price_per_hour} onChange={set('price_per_hour')} placeholder="600 = 60,000 ل.س" />
          <div className="hint">العربون ثابت تلقائياً: 100,000 ل.س لكل حجز</div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>من الساعة</label>
            <input className="input" type="time" value={form.open_time} onChange={set('open_time')} />
          </div>
          <div className="field">
            <label>إلى الساعة</label>
            <input className="input" type="time" value={form.close_time} onChange={set('close_time')} />
          </div>
        </div>
        <div className="field">
          <label>العنوان</label>
          <input className="input" value={form.address} onChange={set('address')} />
        </div>
        <div className="field">
          <label>الوصف</label>
          <textarea className="textarea" value={form.description} onChange={set('description')} />
        </div>
        <div className="grid-2">
          <div className="field">
            <label>الهاتف</label>
            <input className="input" dir="ltr" value={form.phone} onChange={set('phone')} />
          </div>
          <div className="field">
            <label>واتساب</label>
            <input className="input" dir="ltr" value={form.whatsapp} onChange={set('whatsapp')} />
          </div>
        </div>
        <div className="field mb0">
          <label>المرافق</label>
          <div className="row wrap" style={{ gap: 6 }}>
            {AMENITY_OPTIONS.map((a) => (
              <button key={a} type="button" className={`chip ${form.amenities.includes(a) ? 'active' : ''}`} onClick={() => toggleAmenity(a)}>{a}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">💳 شام كاش</div>
        <div className="field">
          <label>رقم الحساب</label>
          <input className="input" dir="ltr" value={form.shamcash_number} onChange={set('shamcash_number')} />
        </div>
        <div className="field">
          <label>اسم الحساب</label>
          <input className="input" value={form.shamcash_name} onChange={set('shamcash_name')} />
        </div>
        <div className="field mb0">
          <label>صورة QR</label>
          <input type="file" accept="image/*" className="input" onChange={(e) => e.target.files?.[0] && uploadImage.mutate({ file: e.target.files[0], target: 'qr' })} />
          {form.shamcash_qr_url && <img src={form.shamcash_qr_url} alt="QR" style={{ width: 110, borderRadius: 10, marginTop: 8 }} />}
        </div>
      </div>

      <div className="card">
        <div className="card-title">🖼️ صور الملعب</div>
        <input type="file" accept="image/*" multiple className="input" onChange={(e) => Array.from(e.target.files || []).forEach((f) => uploadImage.mutate({ file: f, target: 'image' }))} />
        {images.length > 0 && (
          <div className="row wrap mt8">
            {images.map((u, i) => (
              <div key={u} style={{ position: 'relative' }}>
                <img src={u} alt="" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 8 }} />
                <button
                  className="btn sm danger"
                  style={{ position: 'absolute', top: -6, insetInlineStart: -6, padding: '2px 7px' }}
                  onClick={() => setImages(images.filter((_, j) => j !== i))}
                >×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="btn block" onClick={() => save.mutate()} disabled={save.isPending}>
        {save.isPending ? 'جارٍ الحفظ…' : 'حفظ الملعب'}
      </button>
    </Layout>
  )
}
