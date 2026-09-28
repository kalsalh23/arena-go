import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Layout from '../../components/Layout'
import Icon from '../../components/Icon'
import { Spinner, Empty, ErrorBox, OkBox } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { sypText, TOURNAMENT_TYPE_LABELS, BOOKING_STATUS_LABELS, dateAr, timeAr } from '../../lib/constants'
import { statusBadge } from '../tournaments/TournamentsPage'

const TABS = [
  { key: 'overview', label: 'نظرة عامة', ic: 'sliders' },
  { key: 'tournaments', label: 'البطولات', ic: 'trophy' },
  { key: 'users', label: 'المستخدمون', ic: 'users' },
  { key: 'venues', label: 'الملاعب', ic: 'building' },
  { key: 'villages', label: 'القرى', ic: 'pin' },
]

function genPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('') + '!7'
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview')
  const { profile, signOut } = useAuth()
  return (
    <Layout
      title="لوحة إدارة النظام"
      titleIcon="shield"
      hideNav
      headerRight={
        <button className="btn sm danger" onClick={signOut}>
          <Icon name="logout" size={14} /> خروج
        </button>
      }
    >
      <div className="card" style={{ padding: '10px 15px', marginBottom: 12 }}>
        <div className="row between">
          <span className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icon name="shield" size={14} /> {profile?.full_name || 'مدير النظام'} — صلاحية كاملة
          </span>
        </div>
      </div>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? 'active' : ''} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>
      {tab === 'overview' && <OverviewTab onGo={setTab} />}
      {tab === 'tournaments' && <TournamentsTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'venues' && <VenuesTab />}
      {tab === 'villages' && <VillagesTab />}
    </Layout>
  )
}

/* ---------------- نظرة عامة ---------------- */
function OverviewTab({ onGo }) {
  const count = (table, filter) =>
    useQuery({
      queryKey: ['admin-count', table, String(filter)],
      queryFn: async () => {
        let q = supabase.from(table).select('id', { count: 'exact', head: true })
        if (filter) q = filter(q)
        const { count: c, error: e } = await q
        if (e) throw e
        return c
      },
    })

  const users = count('profiles')
  const venues = count('venues')
  const teams = count('teams', (q) => q.eq('is_active', true))
  const bookings = count('bookings', (q) => q.in('booking_status', ['pending_review', 'confirmed']))
  const pendingT = count('tournaments', (q) => q.eq('status', 'pending_admin_approval'))
  const openT = count('tournaments', (q) => q.eq('status', 'registration_open'))
  const ongoingT = count('tournaments', (q) => q.in('status', ['full', 'draw_pending', 'draw_completed', 'ongoing']))
  const doneT = count('tournaments', (q) => q.eq('status', 'completed'))

  const Stat = ({ n, l, ic, onClick }) => (
    <button className="stat-card" style={{ cursor: onClick ? 'pointer' : 'default', border: 'none' }} onClick={onClick}>
      <div className="num" style={{ fontSize: 20 }}>{n}</div>
      <div className="lbl">{l}</div>
    </button>
  )

  return (
    <>
      {(pendingT.data ?? 0) > 0 && (
        <div className="card" style={{ background: 'var(--warn-soft)', border: 'none', padding: 13 }}>
          <div className="row between">
            <b style={{ color: 'var(--warn)' }}><Icon name="info" size={15} /> {pendingT.data} طلب بطولة بانتظار موافقتك</b>
            <button className="btn sm" onClick={() => onGo('tournaments')}>مراجعة</button>
          </div>
        </div>
      )}

      <div className="section" style={{ marginTop: 8 }}>
        <div className="section-head"><h2><Icon name="users" size={16} /> المجتمع</h2></div>
        <div className="grid-2">
          <Stat n={users.data ?? '…'} l="مستخدم مسجل" ic="users" />
          <Stat n={teams.data ?? '…'} l="فريق نشط" ic="ball" />
        </div>
      </div>

      <div className="section">
        <div className="section-head"><h2><Icon name="building" size={16} /> الملاعب والحجوزات</h2></div>
        <div className="grid-2">
          <Stat n={venues.data ?? '…'} l="ملعب" ic="building" onClick={() => onGo('venues')} />
          <Stat n={bookings.data ?? '…'} l="حجز نشط" ic="calendar" />
        </div>
      </div>

      <div className="section">
        <div className="section-head"><h2><Icon name="trophy" size={16} /> البطولات</h2></div>
        <div className="grid-4">
          <Stat n={pendingT.data ?? 0} l="بانتظار الموافقة" onClick={() => onGo('tournaments')} />
          <Stat n={openT.data ?? 0} l="مفتوحة للتسجيل" />
          <Stat n={ongoingT.data ?? 0} l="جارية" />
          <Stat n={doneT.data ?? 0} l="منتهية" />
        </div>
      </div>
    </>
  )
}

/* ---------------- البطولات ---------------- */
function TournamentsTab() {
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [rejectId, setRejectId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const pending = useQuery({
    queryKey: ['admin-tournaments', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*, venue:venues(name), village:villages(name), owner:profiles!tournaments_owner_id_fkey(full_name)')
        .eq('status', 'pending_admin_approval')
        .order('created_at')
      if (error) throw error
      return data
    },
  })

  const all = useQuery({
    queryKey: ['admin-tournaments', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*, venue:venues(name), village:villages(name), owner:profiles!tournaments_owner_id_fkey(full_name)')
        .order('created_at', { ascending: false })
        .limit(60)
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
      pending.refetch(); all.refetch()
    },
    onError: (e) => { setOk(''); setErr(e.message) },
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
      <OkBox>{ok}</OkBox>
      {(pending.error || all.error) && (
        <ErrorBox>تعذر تحميل البطولات: {(pending.error || all.error).message}</ErrorBox>
      )}

      <div className="section" style={{ marginTop: 0 }}>
        <div className="section-head"><h2><Icon name="clock" size={16} /> بانتظار الموافقة ({pending.data?.length ?? 0})</h2></div>
        {pending.isLoading ? <Spinner /> : (pending.data ?? []).length === 0 ? <Empty icon="checkC" text="لا طلبات جديدة" /> : (
          (pending.data ?? []).map((t) => (
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
      </div>

      <div className="section">
        <div className="section-head"><h2><Icon name="trophy" size={16} /> كل البطولات</h2></div>
        {all.isLoading ? <Spinner /> : (all.data ?? []).map((t) => (
          <div key={t.id} className="card" style={{ padding: 13 }}>
            <div className="row between">
              <div className="card-title" style={{ fontSize: 14.5 }}>{t.name}</div>
              {statusBadge(t.status)}
            </div>
            <div className="tiny">🏟️ {t.venue?.name} • 📍 {t.village?.name} • 👤 {t.owner?.full_name}</div>
            {t.status === 'rejected' && t.rejection_reason && <div className="tiny" style={{ color: 'var(--danger)' }}>سبب الرفض: {t.rejection_reason}</div>}
            {['registration_open', 'full', 'draw_completed', 'ongoing'].includes(t.status) && (
              <div className="btn-row">
                <button className="btn sm danger" onClick={() => { if (confirm('إيقاف/إلغاء البطولة؟ سيتم إشعار المنظم والفرق.')) setStatus.mutate({ tid: t.id, status: 'cancelled' }) }}>
                  <Icon name="x" size={13} /> إيقاف البطولة
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

/* ---------------- المستخدمون + أصحاب الملاعب ---------------- */
function UsersTab() {
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '' })
  const [created, setCreated] = useState(null)
  const [search, setSearch] = useState('')

  const profiles = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(200)
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
      // RPC may return the jsonb object directly or wrapped in an array
      const d = Array.isArray(data) ? data[0] : data
      if (!d?.phone) throw new Error('لم يُعد الإنشاء رقم الهاتف — أعد المحاولة')
      return { ...d, password }
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
    ? `أهلاً ${created.full_name} 👋\nتم إنشاء حسابك كصاحب ملعب في منصة Arena Go ⚽\n\n🔗 رابط لوحة التحكم:\n${dashboardUrl}\n\n📱 رقم حسابك للدخول (رقم هاتفك): +${created.phone}\n🔑 كلمة السر: ${created.password}\n\nبعد الدخول يمكنك إضافة ملاعبك وإدارة الحجوزات والبطولات بالكامل.`
    : ''

  const filtered = (profiles.data || []).filter((p) =>
    !search || (p.full_name || '').includes(search) || p.role.includes(search)
  )

  return (
    <>
      <ErrorBox>{err}</ErrorBox>
      <OkBox>{ok}</OkBox>

      <button className="btn block" style={{ marginBottom: 12 }} onClick={() => { setShowAdd(!showAdd); setCreated(null) }}>
        <Icon name="plus" size={16} /> إضافة صاحب ملعب جديد
      </button>

      {created && (
        <div className="card" style={{ background: 'var(--brand-soft)', border: '1.5px dashed var(--brand)', boxShadow: 'none' }}>
          <div className="card-title"><Icon name="checkC" size={17} /> تم إنشاء الحساب — أرسل بيانات الدخول واتساب</div>
          <div className="kv"><span className="k"><Icon name="user" size={14} /> الاسم</span><span className="v">{created.full_name}</span></div>
          <div className="kv"><span className="k"><Icon name="phone" size={14} /> رقم حسابه للدخول</span><span className="v" dir="ltr">+{created.phone}</span></div>
          <div className="kv"><span className="k"><Icon name="shield" size={14} /> كلمة السر</span><span className="v" dir="ltr">{created.password}</span></div>
          <div className="kv"><span className="k"><Icon name="pin" size={14} /> رابط لوحته</span><span className="v" dir="ltr" style={{ fontSize: 11.5, wordBreak: 'break-all' }}>{dashboardUrl}</span></div>
          <div className="btn-row">
            <a
              className="btn"
              style={{ background: '#25D366', boxShadow: 'none', color: '#fff' }}
              href={`https://wa.me/${created.phone}?text=${encodeURIComponent(waText)}`}
              target="_blank" rel="noreferrer"
            >
              <Icon name="whatsapp" size={17} /> إرسال عبر واتساب
            </a>
            <button className="btn outline" onClick={() => { navigator.clipboard?.writeText(waText); setOk('تم نسخ الرسالة') }}>
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
            ستولد المنصة كلمة السر تلقائياً وتمنحك بطاقة فيها رابط لوحته وحسابه وكلمة السر لإرسالها له عبر واتساب — وسيصبح قادراً على إدارة ملاعبه وحجوزاته وبطولاته بالكامل.
          </div>
          <button className="btn block" onClick={() => createOwner.mutate()} disabled={createOwner.isPending || !form.name || !form.phone}>
            <Icon name="user" size={16} /> {createOwner.isPending ? 'جارٍ الإنشاء…' : 'إنشاء الحساب'}
          </button>
        </div>
      )}

      <div style={{ position: 'relative', marginBottom: 10 }}>
        <input className="input" style={{ paddingInlineStart: 40 }} placeholder="ابحث بالاسم أو الصلاحية…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Icon name="search" size={16} style={{ position: 'absolute', top: 13, insetInlineStart: 13, color: 'var(--text-3)' }} />
      </div>

      {profiles.isLoading ? <Spinner /> : filtered.length === 0 ? <Empty icon="users" text="لا نتائج" /> : (
        filtered.map((p) => (
          <div key={p.id} className="card" style={{ padding: 13 }}>
            <div className="row between">
              <div className="row">
                <div className="avatar" style={{ width: 38, height: 38, fontSize: 14 }}>
                  {p.avatar_url ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (p.full_name || '؟').charAt(0)}
                </div>
                <div>
                  <b style={{ fontSize: 13.5 }}>{p.full_name || 'بدون اسم'}</b>
                  <div className="tiny">{p.role === 'admin' ? '🛡️ مدير' : p.role === 'venue_owner' ? '🏟️ صاحب ملعب' : '⚽ لاعب'} • انضم {dateAr(p.created_at?.slice(0, 10))}</div>
                </div>
              </div>
              <div className="row">
                {p.is_premium && <span className="badge gold">★ Premium</span>}
                <span className={`badge ${p.role === 'admin' ? 'dark' : 'neutral'}`}>{p.role}</span>
              </div>
            </div>
            {p.role !== 'admin' && (
              <div className="btn-row">
                <button className="btn sm outline" onClick={() => setUser.mutate({ uid: p.id, patch: { is_premium: !p.is_premium } })}>
                  <Icon name="star" size={12} /> {p.is_premium ? 'إلغاء Premium' : 'تفعيل Premium'}
                </button>
                <button className="btn sm secondary" onClick={() => setUser.mutate({ uid: p.id, patch: { role: p.role === 'venue_owner' ? 'player' : 'venue_owner' } })}>
                  {p.role === 'venue_owner' ? 'تحويله لاعباً' : 'ترقيته صاحب ملعب'}
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </>
  )
}

/* ---------------- الملاعب ---------------- */
function VenuesTab() {
  const [err, setErr] = useState('')
  const [search, setSearch] = useState('')

  const venues = useQuery({
    queryKey: ['admin-venues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('venues')
        .select('*, village:villages(name), owner:profiles(full_name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }) => {
      const { error } = await supabase.from('venues').update({ is_active: !is_active }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => venues.refetch(),
    onError: (e) => setErr(e.message),
  })

  const filtered = (venues.data || []).filter((v) => !search || (v.name || '').includes(search) || (v.owner?.full_name || '').includes(search))

  return (
    <>
      <ErrorBox>{err}</ErrorBox>
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <input className="input" style={{ paddingInlineStart: 40 }} placeholder="ابحث عن ملعب أو صاحبه…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Icon name="search" size={16} style={{ position: 'absolute', top: 13, insetInlineStart: 13, color: 'var(--text-3)' }} />
      </div>
      {venues.isLoading ? <Spinner /> : filtered.length === 0 ? <Empty icon="building" text="لا ملاعب بعد" /> : (
        filtered.map((v) => (
          <div key={v.id} className="card" style={{ padding: 13 }}>
            <div className="row between">
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ fontSize: 14 }}>{v.name}</b>
                <div className="tiny"><Icon name="pin" size={11} /> {v.village?.name} • 👤 {v.owner?.full_name || '—'}</div>
                <div className="tiny">💵 {sypText(v.price_per_hour)}/ساعة • ⭐ {v.rating || '—'}</div>
              </div>
              <button
                className={`btn sm ${v.is_active ? 'danger' : 'success'}`}
                onClick={() => { if (confirm(v.is_active ? 'إيقاف هذا الملعب عن العمل؟' : 'إعادة تفعيل الملعب؟')) toggle.mutate({ id: v.id, is_active: v.is_active }) }}
              >
                {v.is_active ? 'إيقاف' : 'تفعيل'}
              </button>
            </div>
          </div>
        ))
      )}
    </>
  )
}

/* ---------------- القرى ---------------- */
function VillagesTab() {
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [name, setName] = useState('')

  const villages = useQuery({
    queryKey: ['admin-villages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('villages').select('*').order('name')
      if (error) throw error
      return data
    },
  })

  const add = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('أدخل اسم القرية')
      const { error } = await supabase.from('villages').insert({ name: name.trim(), is_active: true })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => { setName(''); setOk('أُضيفت القرية'); villages.refetch() },
    onError: (e) => setErr(e.message),
  })

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }) => {
      const { error } = await supabase.from('villages').update({ is_active: !is_active }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => villages.refetch(),
    onError: (e) => setErr(e.message),
  })

  return (
    <>
      <ErrorBox>{err}</ErrorBox>
      <OkBox>{ok}</OkBox>
      <div className="card">
        <div className="field mb0">
          <label><Icon name="plus" size={14} /> إضافة قرية جديدة</label>
          <div className="row">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم القرية أو البلدة" />
            <button className="btn" onClick={() => add.mutate()} disabled={add.isPending}>إضافة</button>
          </div>
          <div className="hint">القرى غير النشطة تختفي من قوائم الاختيار لدى المستخدمين.</div>
        </div>
      </div>
      {villages.isLoading ? <Spinner /> : (
        <div className="card">
          {villages.data.map((v) => (
            <div key={v.id} className="list-item">
              <div className="n-ic" style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--brand-soft)', color: 'var(--brand-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="pin" size={16} />
              </div>
              <b style={{ flex: 1, fontSize: 14 }}>{v.name}</b>
              <span className={`badge ${v.is_active ? 'success' : 'danger'}`}>{v.is_active ? 'نشطة' : 'موقوفة'}</span>
              <button className="btn sm outline" onClick={() => toggle.mutate({ id: v.id, is_active: v.is_active })}>
                {v.is_active ? 'إيقاف' : 'تفعيل'}
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
