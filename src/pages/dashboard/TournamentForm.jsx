import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Layout from '../../components/Layout'
import { ErrorBox } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useVillages } from '../../hooks/useVillages'
import { sypText } from '../../lib/constants'

export default function TournamentForm() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: villages } = useVillages()
  const [err, setErr] = useState('')
  const [form, setForm] = useState({
    name: '', venue_id: '', village_id: '', description: '', conditions: '',
    start_date: '', end_date: '', registration_deadline: '',
    max_teams: 8, registration_fee: '', tournament_type: 'groups', players_per_team: 11,
    group_count: 2, points_win: 3, points_draw: 1, points_loss: 0, prize_description: '',
  })

  const myVenues = useQuery({
    queryKey: ['my-venues', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('venues').select('id, name, village_id').eq('owner_id', user.id).eq('is_active', true)
      if (error) throw error
      return data
    },
  })

  const create = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('أدخل اسم البطولة')
      if (!form.venue_id) throw new Error('اختر الملعب')
      if (!form.village_id) throw new Error('اختر القرية')
      const payload = {
        owner_id: user.id,
        name: form.name.trim(),
        venue_id: form.venue_id,
        village_id: form.village_id,
        description: form.description,
        conditions: form.conditions,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        registration_deadline: form.registration_deadline || null,
        max_teams: parseInt(form.max_teams, 10) || 8,
        registration_fee: parseInt(form.registration_fee, 10) || 0,
        tournament_type: form.tournament_type,
        players_per_team: parseInt(form.players_per_team, 10) || 11,
        group_count: parseInt(form.group_count, 10) || 2,
        points_win: parseInt(form.points_win, 10) || 3,
        points_draw: parseInt(form.points_draw, 10) || 1,
        points_loss: parseInt(form.points_loss, 10) || 0,
        prize_description: form.prize_description,
        status: 'pending_admin_approval',
      }
      const { error } = await supabase.from('tournaments').insert(payload)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-tournaments'] })
      navigate('/dashboard')
    },
    onError: (e) => setErr(e.message.replace('Error: ', '')),
  })

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <Layout title="إنشاء بطولة">
      <ErrorBox>{err}</ErrorBox>
      <div className="card">
        <div className="field">
          <label>اسم البطولة *</label>
          <input className="input" value={form.name} onChange={set('name')} placeholder="مثال: بطولة Arena Cup" />
        </div>
        <div className="field">
          <label>الملعب *</label>
          <select className="select" value={form.venue_id} onChange={(e) => {
            const v = e.target.value
            setForm((f) => ({ ...f, venue_id: v, village_id: myVenues.data?.find((x) => x.id === v)?.village_id || f.village_id }))
          }}>
            <option value="">— اختر من ملاعبك —</option>
            {(myVenues.data || []).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          {myVenues.data?.length === 0 && <div className="hint">أضف ملعباً أولاً من لوحة التحكم.</div>}
        </div>
        <div className="field">
          <label>القرية *</label>
          <select className="select" value={form.village_id} onChange={set('village_id')}>
            <option value="">— اختر —</option>
            {(villages || []).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>وصف البطولة</label>
          <textarea className="textarea" value={form.description} onChange={set('description')} />
        </div>
        <div className="grid-2">
          <div className="field">
            <label>عدد الفرق</label>
            <input className="input" type="number" min="2" max="32" value={form.max_teams} onChange={set('max_teams')} />
          </div>
          <div className="field">
            <label>لاعبون لكل فريق</label>
            <input className="input" type="number" min="3" max="25" value={form.players_per_team} onChange={set('players_per_team')} />
          </div>
        </div>
        <div className="field">
          <label>رسوم الاشتراك (بالوحدات — 1000 = 100,000 ل.س)</label>
          <input className="input" type="number" min="0" value={form.registration_fee} onChange={set('registration_fee')} placeholder="0 = مجانية" />
          {form.registration_fee && <div className="hint">ستظهر للاعبين: {sypText(parseInt(form.registration_fee, 10) || 0)}</div>}
        </div>
        <div className="grid-3">
          <div className="field">
            <label>تاريخ البداية</label>
            <input className="input" type="date" value={form.start_date} onChange={set('start_date')} />
          </div>
          <div className="field">
            <label>النهاية المتوقعة</label>
            <input className="input" type="date" value={form.end_date} onChange={set('end_date')} />
          </div>
          <div className="field">
            <label>آخر موعد تسجيل</label>
            <input className="input" type="date" value={form.registration_deadline} onChange={set('registration_deadline')} />
          </div>
        </div>
        <div className="field">
          <label>نظام البطولة</label>
          <select className="select" value={form.tournament_type} onChange={set('tournament_type')}>
            <option value="groups">مجموعات</option>
            <option value="knockout">خروج مغلق</option>
            <option value="groups_knockout">مجموعات + خروج مغلق</option>
          </select>
        </div>
        {form.tournament_type !== 'knockout' && (
          <div className="field">
            <label>عدد المجموعات</label>
            <input className="input" type="number" min="1" max="8" value={form.group_count} onChange={set('group_count')} />
          </div>
        )}
        <div className="grid-3">
          <div className="field">
            <label>نقاط الفوز</label>
            <input className="input" type="number" min="0" value={form.points_win} onChange={set('points_win')} />
          </div>
          <div className="field">
            <label>نقاط التعادل</label>
            <input className="input" type="number" min="0" value={form.points_draw} onChange={set('points_draw')} />
          </div>
          <div className="field">
            <label>نقاط الخسارة</label>
            <input className="input" type="number" min="0" value={form.points_loss} onChange={set('points_loss')} />
          </div>
        </div>
        <div className="field">
          <label>الجوائز (إن وجدت)</label>
          <input className="input" value={form.prize_description} onChange={set('prize_description')} placeholder="مثال: الفائز 1,000,000 ل.س" />
        </div>
        <div className="field mb0">
          <label>شروط المشاركة</label>
          <textarea className="textarea" value={form.conditions} onChange={set('conditions')} placeholder={'- 8 فرق فقط\n- يجب أن يكون الفريق مسجلاً في Arena Go\n- ...'} />
        </div>
      </div>

      <div className="card">
        <div className="tiny">ℹ️ بعد الإرسال تتحول البطولة إلى حالة <b>«بانتظار موافقة الإدارة»</b>، ولن تظهر للاعبين إلا بعد موافقة مدير Arena Go.</div>
      </div>

      <button className="btn block" onClick={() => create.mutate()} disabled={create.isPending}>
        {create.isPending ? 'جارٍ الإرسال…' : 'إرسال البطولة للمراجعة'}
      </button>
    </Layout>
  )
}
