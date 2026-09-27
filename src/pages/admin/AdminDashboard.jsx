import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Layout from '../../components/Layout'
import { Spinner, Empty, ErrorBox, OkBox } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { sypText, TOURNAMENT_TYPE_LABELS } from '../../lib/constants'
import { statusBadge } from '../tournaments/TournamentsPage'

export default function AdminDashboard() {
  const [tab, setTab] = useState('pending')
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

  const profiles = useQuery({
    queryKey: ['admin-profiles'],
    enabled: tab === 'users',
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100)
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

  const setUser = useMutation({
    mutationFn: async ({ uid, patch }) => {
      const { error } = await supabase.from('profiles').update(patch).eq('id', uid)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => profiles.refetch(),
    onError: (e) => setErr(e.message),
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
    <Layout title="🛡️ لوحة الإدارة">
      <ErrorBox>{err}</ErrorBox>
      <OkBox>{ok}</OkBox>

      <div className="tabs">
        <button className={tab === 'pending' ? 'active' : ''} onClick={() => setTab('pending')}>
          طلبات البطولات {pending.data?.length ? `(${pending.data.length})` : ''}
        </button>
        <button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>كل البطولات</button>
        <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>المستخدمون</button>
      </div>

      {tab === 'pending' && (
        pending.isLoading ? <Spinner /> : pending.data?.length === 0 ? <Empty icon="🛡️" text="لا توجد طلبات بانتظار المراجعة" /> : (
          pending.data.map((t) => (
            <div key={t.id} className="card">
              <div className="card-title">{t.name}</div>
              <div className="tiny">🏟️ {t.venue?.name} • 📍 {t.village?.name} • 👤 {t.owner?.full_name}</div>
              <div className="kv"><span className="k">النظام</span><span className="v">{TOURNAMENT_TYPE_LABELS[t.tournament_type]}</span></div>
              <div className="kv"><span className="k">الفرق</span><span className="v">{t.max_teams}</span></div>
              <div className="kv"><span className="k">الرسوم</span><span className="v">{sypText(t.registration_fee)}</span></div>
              <div className="kv"><span className="k">لاعبون/فريق</span><span className="v">{t.players_per_team}</span></div>
              {t.prize_description && <div className="kv"><span className="k">الجوائز</span><span className="v">{t.prize_description}</span></div>}
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
                  <button className="btn sm success" onClick={() => review.mutate({ tid: t.id, decision: 'approved' })} disabled={review.isPending}>✅ موافقة</button>
                  <button className="btn sm danger" onClick={() => setRejectId(t.id)}>❌ رفض</button>
                </div>
              )}
            </div>
          ))
        )
      )}

      {tab === 'all' && (
        all.isLoading ? <Spinner /> : (
          all.data.map((t) => (
            <div key={t.id} className="card">
              <div className="row between">
                <div className="card-title">{t.name}</div>
                {statusBadge(t.status)}
              </div>
              <div className="tiny">🏟️ {t.venue?.name} • 📍 {t.village?.name}</div>
              <div className="btn-row">
                {['registration_open', 'full', 'draw_completed', 'ongoing'].includes(t.status) && (
                  <button className="btn sm danger" onClick={() => { if (confirm('إيقاف/إلغاء البطولة؟')) setStatus.mutate({ tid: t.id, status: 'cancelled' }) }}>إيقاف البطولة</button>
                )}
              </div>
            </div>
          ))
        )
      )}

      {tab === 'users' && (
        profiles.isLoading ? <Spinner /> : (
          profiles.data.map((p) => (
            <div key={p.id} className="card">
              <div className="row between">
                <div>
                  <b>{p.full_name || 'بدون اسم'}</b>
                  <div className="tiny">{p.role === 'admin' ? '🛡️ مدير' : p.role === 'venue_owner' ? '🏟️ صاحب ملعب' : '⚽ لاعب'}</div>
                </div>
                <div className="row">
                  {p.is_premium && <span className="badge warn">★ Premium</span>}
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
        )
      )}
    </Layout>
  )
}
