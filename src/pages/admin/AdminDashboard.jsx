import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Layout from '../../components/Layout'
import Icon from '../../components/Icon'
import { Spinner, Empty, ErrorBox, OkBox } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { sypText, TOURNAMENT_TYPE_LABELS } from '../../lib/constants'
import { statusBadge } from '../tournaments/TournamentsPage'

function genPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('') + '!7'
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('pending')
  return (
    <Layout title="لوحة الإدارة" titleIcon="shield">
      <div className="tabs">
        <button className={tab === 'pending' ? 'active' : ''} onClick={() => setTab('pending')}>طلبات البطولات</button>
        <button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>كل البطولات</button>
        <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>المستخدمون</button>
      </div>
      {tab === 'pending' && <PendingTab />}
      {tab === 'all' && <AllTab />}
      {tab === 'users' && <UsersTab />}
    </Layout>
  )
}

function PendingTab() {
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [rejectId, setRejectId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const pending = useQuery({
    queryKey: ['admin-tournaments', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*, venue:venues(name), village:villages(name), owner:profiles(full_name)')
        .eq('status', 'pending_admin_approval')
        .order('created_at')
      if (error) throw error
      return data
    },
  })

  const review = useMutation({
    mutationFn: async ({ tid, decision, reason }) => {
      const { error } = await supabase.rpc('admin_review_tournament', { p_tournament_id: tid, p_decision: decision, p_reason: reason || null })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      setErr(''); setOk('تمت معالجة البطولة وإشعار صاحب الملعب')
      setRejectId(null); setRejectReason('')
      pending.refetch()
    },
    onError: (e) => { setOk(''); setErr(e.message) },
  })

  return (
    <>
      <ErrorBox>{err}</ErrorBox>
      <OkBox>{ok}</OkBox>
      {pending.isLoading ? <Spinner /> : pending.data?.length === 0 ? <Empty icon="shield" text="لا توجد طلبات بانتظار المراجعة" /> : (
        pending.data.map((t) => (
          <div key={t.id} className="card">
            <div className="card-title"><Icon name="trophy" size={16} /> {t.name}</div>
            <div className="tiny">🏟️ {t.venue?.name} • 📍 {t.village?.name} • 👤 {t.owner?.full_name}</div>
            <div className="kv"><span className="k"><Icon name="flag" size={14} /> النظام</span><span className="v">{TOURNAMENT_TYPE_LABELS[t.tournament_type]}</span></div>
            <div className="kv"><span className="k"><Icon name="users" size={14} /> الفرق</span><span className="v">{t.max_teams}</span></div>
            <div className="kv"><span className="k"><Icon name="money" size={14} /> الرسوم</span><span className="v">{sypText(t.registration_fee)}</span></div>
            <div className="kv"><span className="k"><Icon name="users" size={14} /> لاعبون/فريق</span><span className="v">{t.players_per_team}</span></div>
            {t.prize_description && <div className="kv"><span className="k"><Icon name="gift" size={14} /> الجوائز</span><span className="v">{t.prize_description}</span></div>}
            {t.conditions && <p className="tiny" style={{ whiteSpace: 'pre-wrap' }}>الشروط: {t.conditions}</p>}

            {rejectId === t.id ? (
              <div className="mt8">
                <textarea className="textarea" style={{ minHeight: 60 }} placeholder="سبب الرفض…" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                <div className="btn-row">
                  <button className="btn sm danger" onClick={() => review.mutate({ tid: t.id, decision: 'rejected', reason: rejectReason })} disabled={review.isPending}>تأكيد الرفض</button>
                  <button className="btn sm outline" onClick={() => setRejectId(null)}>إلغاء</button>
                </div>
              </div>
            ) : (
              <div className="btn-row">
                <button className="btn sm success" onClick={() => review.mutate({ tid: t.id, decision: 'approved' })} disabled={review.isPending}><Icon name="check" size={13} /> موافقة</button>
                <button className="btn sm danger" onClick={() => setRejectId(t.id)}><Icon name="x" size={13} /> رفض</button>
              </div>
            )}
          </div>
        ))
      )}
    </>
  )
}

function AllTab() {
  const [err, setErr] = useState('')
  const all = useQuery({
    queryKey: ['admin-tournaments', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*, venue:venues(name), village:villages(name), owner:profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data
    },
  })

  const setStatus = useMutation({
    mutationFn: async ({ tid, status }) => {
      const { error } = await supabase.from('tournaments').update({ status }).eq('id', tid)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => all.refetch(),
    onError: (e) => setErr(e.message),
  })

  return (
    <>
      <ErrorBox>{err}</ErrorBox>
      {all.isLoading ? <Spinner /> : (
        all.data.map((t) => (
          <div key={t.id} className="card" style={{ padding: 13 }}>
            <div className="row between">
              <div className="card-title" style={{ fontSize: 14.5 }}>{t.name}</div>
              {statusBadge(t.status)}
            </div>
            <div className="tiny">🏟️ {t.venue?.name} • 📍 {t.village?.name}</div>
            {['registration_open', 'full', 'draw_completed', 'ongoing'].includes(t.status) && (
              <div className="btn-row">
                <button className="btn sm danger" onClick={() => { if (confirm('إيقاف/إلغاء البطولة؟')) setStatus.mutate({ tid: t.id, status: 'cancelled' }) }}>
                  <Icon name="x" size={13} /> إيقاف البطولة
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </>
  )
}

function UsersTab() {
  const [err, setErr] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '' })
  const [created, setCreated] = useState(null)

  const profiles = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100)
      if (error) throw error
      return data
    },
  })

  const setUser = useMutation({
    mutationFn: async ({ uid, patch }) => {
      const { error } = await supabase.from('profiles').update(patch).eq('id', uid)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => profiles.refetch(),
    onError: (e) => setErr(e.message),
  })

  const createOwner = useMutation({
    mutationFn: async () => {
      const password = genPassword()
      const { data, error } = await supabase.rpc('admin_create_venue_owner', {
        p_phone: form.phone.replace(/\D/g, ''),
        p_full_name: form.name,
        p_password: password,
      })
      if (error) throw new Error(error.message)
      return { ...data[0], password }
    },
    onSuccess: (d) => {
      setCreated(d)
      setShowAdd(false)
      setForm({ name: '', phone: '' })
      profiles.refetch()
    },
    onError: (e) => setErr(e.message),
  })

  const dashboardUrl = typeof location !== 'undefined' ? `${location.origin}/dashboard` : '/dashboard'
  const waText = created
    ? `أهلاً ${created.full_name} 👋\nتم إنشاء حسابك كصاحب ملعب في منصة Arena Go ⚽\n\n🔗 رابط لوحة التحكم:\n${dashboardUrl}\n\n📱 رقم الهاتف: +${created.phone}\n🔑 كلمة المرور: ${created.password}\n\nبعد الدخول يمكنك إضافة ملاعبك وإدارة الحجوزات والبطولات.`
    : ''

  return (
    <>
      <ErrorBox>{err}</ErrorBox>

      <button className="btn block" style={{ marginBottom: 12 }} onClick={() => { setShowAdd(!showAdd); setCreated(null) }}>
        <Icon name="plus" size={16} /> إضافة صاحب ملعب جديد
      </button>

      {created && (
        <div className="card" style={{ background: 'var(--brand-soft)', border: '1px dashed var(--brand-soft-2)' }}>
          <div className="card-title"><Icon name="checkC" size={16} /> تم إنشاء الحساب — أرسل البيانات واتساب</div>
          <div className="kv"><span className="k">الاسم</span><span className="v">{created.full_name}</span></div>
          <div className="kv"><span className="k">الهاتف</span><span className="v" dir="ltr">+{created.phone}</span></div>
          <div className="kv"><span className="k">كلمة المرور</span><span className="v" dir="ltr">{created.password}</span></div>
          <div className="btn-row">
            <a
              className="btn"
              style={{ background: '#25D366', boxShadow: 'none', color: '#fff' }}
              href={`https://wa.me/${created.phone}?text=${encodeURIComponent(waText)}`}
              target="_blank" rel="noreferrer"
            >
              <Icon name="whatsapp" size={17} /> إرسال عبر واتساب
            </a>
            <button className="btn outline" onClick={() => navigator.clipboard?.writeText(waText)}>
              <Icon name="copy" size={15} /> نسخ الرسالة
            </button>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="card">
          <div className="field">
            <label>اسم صاحب الملعب</label>
            <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="مثال: أبو خالد" />
          </div>
          <div className="field">
            <label>رقم الواتساب (بصيغة 9639XXXXXXXX)</label>
            <input className="input" dir="ltr" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="9639XXXXXXXX" />
          </div>
          <div className="hint" style={{ marginTop: -8, marginBottom: 10 }}>
            ستولد المنصة كلمة مرور عشوائية، وترسل لك البطاقة أعلاه لإرسالها له عبر واتساب مباشرة.
          </div>
          <button className="btn block" onClick={() => createOwner.mutate()} disabled={createOwner.isPending || !form.name || !form.phone}>
            <Icon name="user" size={16} /> {createOwner.isPending ? 'جارٍ الإنشاء…' : 'إنشاء الحساب'}
          </button>
        </div>
      )}

      {profiles.isLoading ? <Spinner /> : (
        profiles.data.map((p) => (
          <div key={p.id} className="card" style={{ padding: 13 }}>
            <div className="row between">
              <div>
                <b style={{ fontSize: 14 }}>{p.full_name || 'بدون اسم'}</b>
                <div className="tiny">{p.role === 'admin' ? '🛡️ مدير' : p.role === 'venue_owner' ? '🏟️ صاحب ملعب' : '⚽ لاعب'}</div>
              </div>
              <div className="row">
                {p.is_premium && <span className="badge gold">★ Premium</span>}
                <span className={`badge ${p.role === 'admin' ? 'dark' : 'neutral'}`}>{p.role}</span>
              </div>
            </div>
            <div className="btn-row">
              <button className="btn sm outline" onClick={() => setUser.mutate({ uid: p.id, patch: { is_premium: !p.is_premium } })}>
                {p.is_premium ? 'إلغاء Premium' : 'تفعيل Premium'}
              </button>
              {p.role !== 'admin' && (
                <>
                  <button className="btn sm secondary" onClick={() => setUser.mutate({ uid: p.id, patch: { role: 'venue_owner' } })}>جعله صاحب ملعب</button>
                  <button className="btn sm secondary" onClick={() => setUser.mutate({ uid: p.id, patch: { role: 'player' } })}>جعله لاعباً</button>
                </>
              )}
            </div>
          </div>
        ))
      )}
    </>
  )
}
