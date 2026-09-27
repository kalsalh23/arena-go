import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Layout from '../../components/Layout'
import Icon from '../../components/Icon'
import { Spinner, Empty, ErrorBox, OkBox } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { dateAr } from '../../lib/constants'

export default function TeamDetailPage() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState(null)
  const [copied, setCopied] = useState(false)

  const team = useQuery({
    queryKey: ['team', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('*, village:villages(name), captain:profiles!teams_captain_id_fkey(full_name, avatar_url)').eq('id', id).maybeSingle()
      if (error) throw error
      return data
    },
    onSuccess: (d) => setForm(d ? { name: d.name, description: d.description || '', village_id: d.village_id || '', logo_url: d.logo_url || '' } : null),
  })

  const members = useQuery({
    queryKey: ['team-members', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*, player:profiles(id, full_name, avatar_url, position, jersey_number, is_premium)')
        .eq('team_id', id)
        .order('joined_at')
      if (error) throw error
      return data
    },
  })

  const myRequest = useQuery({
    queryKey: ['my-join-request', id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('join_requests')
        .select('id, status')
        .eq('team_id', id)
        .eq('player_id', user.id)
        .in('status', ['pending'])
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  const myMemberships = useQuery({
    queryKey: ['my-memberships', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('team_members').select('team_id').eq('player_id', user.id)
      if (error) throw error
      return data.map((m) => m.team_id)
    },
  })

  const isCaptain = user && team.data && team.data.captain_id === user.id
  const isMember = user && myMemberships.data?.includes(id)

  const requests = useQuery({
    queryKey: ['team-requests', id],
    enabled: !!isCaptain,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('join_requests')
        .select('*, player:profiles(full_name, avatar_url, position)')
        .eq('team_id', id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const sendRequest = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('join_requests').insert({ team_id: id, player_id: user.id })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => { setErr(''); setOk('تم إرسال طلب الانضمام — بانتظار موافقة الكابتن.') },
    onError: (e) => { setOk(''); setErr(e.message.replace('Error: ', '')) },
  })

  const reviewRequest = useMutation({
    mutationFn: async ({ reqId, decision }) => {
      const fn = decision === 'approved' ? 'approve_join_request' : 'reject_join_request'
      const { error } = await supabase.rpc(fn, { p_request_id: reqId })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-members', id] })
      qc.invalidateQueries({ queryKey: ['team-requests', id] })
      setErr('')
    },
    onError: (e) => setErr(e.message),
  })

  const removeMember = useMutation({
    mutationFn: async (playerId) => {
      const { error } = await supabase.rpc('remove_team_member', { p_team_id: id, p_player_id: playerId })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-members', id] }),
    onError: (e) => setErr(e.message),
  })

  const leaveTeam = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('leave_team', { p_team_id: id })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['team-members', id] }); navigate('/teams') },
    onError: (e) => setErr(e.message),
  })

  const disband = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('disband_team', { p_team_id: id })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => navigate('/teams'),
    onError: (e) => setErr(e.message),
  })

  const saveTeam = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('teams').update({
        name: form.name, description: form.description,
        village_id: form.village_id || null, logo_url: form.logo_url || null,
      }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => { setEditMode(false); qc.invalidateQueries({ queryKey: ['team', id] }) },
    onError: (e) => setErr(e.message),
  })

  const uploadLogo = useMutation({
    mutationFn: async (file) => {
      const path = `${user.id}/${Date.now()}_${file.name}`
      const up = await supabase.storage.from('team-logos').upload(path, file)
      if (up.error) throw up.error
      setForm((f) => ({ ...f, logo_url: supabase.storage.from('team-logos').getPublicUrl(path).data.publicUrl }))
    },
    onError: (e) => setErr(e.message),
  })

  function copyInvite() {
    const url = `${location.origin}/join/${team.data.invite_code}`
    navigator.clipboard?.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  if (team.isLoading) return <Layout title="الفريق"><Spinner /></Layout>
  if (!team.data) return <Layout title="الفريق"><Empty icon="ball" text="الفريق غير موجود" /></Layout>
  const t = team.data

  return (
    <Layout title={t.name} titleIcon="ball">
      <ErrorBox>{err}</ErrorBox>
      <OkBox>{ok}</OkBox>

      <div className="card">
        <div className="row">
          <div className="logo-box round" style={{ width: 62, height: 62 }}>
            {t.logo_url ? <img src={t.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon name="shirt" size={28} />}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 17.5 }}>{t.name}</h2>
            <div className="tiny"><Icon name="pin" size={11} /> {t.village?.name || '—'}</div>
          </div>
          {isMember && <span className="badge success"><Icon name="check" size={11} /> فريقك</span>}
        </div>
        {t.description && <p className="muted mt8" style={{ fontSize: 13 }}>{t.description}</p>}
        <div className="kv"><span className="k"><Icon name="shield" size={15} /> الكابتن</span><span className="v">🅒 {t.captain?.full_name || '—'}</span></div>
        <div className="kv"><span className="k"><Icon name="users" size={15} /> عدد اللاعبين</span><span className="v">{members.data?.length ?? '…'}</span></div>
        {isCaptain && (
          <div className="card mt8" style={{ background: 'var(--brand-soft)', border: '1px dashed var(--brand-soft-2)', boxShadow: 'none', padding: 12 }}>
            <div className="row between">
              <div>
                <div className="tiny" style={{ fontWeight: 700, color: 'var(--brand-strong)' }}>كود الدعوة</div>
                <div dir="ltr" style={{ fontWeight: 900, fontSize: 16, color: 'var(--brand-deep)' }}>{t.invite_code}</div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn sm" onClick={copyInvite}><Icon name={copied ? 'check' : 'copy'} size={14} /> {copied ? 'تم النسخ' : 'نسخ الرابط'}</button>
              </div>
            </div>
            <div className="tiny mt8" dir="ltr" style={{ textAlign: 'left', direction: 'ltr' }}>/join/{t.invite_code}</div>
          </div>
        )}
      </div>

      {user && !isMember && !myRequest.data && (
        <button className="btn block lg" onClick={() => sendRequest.mutate()} disabled={sendRequest.isPending}>
          <Icon name="users" size={17} /> {sendRequest.isPending ? 'جارٍ الإرسال…' : 'أرسل طلب انضمام'}
        </button>
      )}
      {myRequest.data?.status === 'pending' && (
        <div className="card center"><span className="badge warn">طلبك قيد المراجعة ⏳</span></div>
      )}
      {user && isMember && !isCaptain && (
        <button className="btn danger block" onClick={() => leaveTeam.mutate()}><Icon name="logout" size={15} /> مغادرة الفريق</button>
      )}
      {isCaptain && (
        <div className="btn-row">
          <button className="btn outline" onClick={() => setEditMode(!editMode)}><Icon name="edit" size={15} /> تعديل الفريق</button>
          <button className="btn danger" onClick={() => { if (confirm('هل تريد حل الفريق؟')) disband.mutate() }}><Icon name="trash" size={15} /> حل الفريق</button>
        </div>
      )}

      {editMode && isCaptain && (
        <div className="card">
          <div className="field">
            <label>اسم الفريق</label>
            <input className="input" value={form?.name || ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="field">
            <label>الوصف</label>
            <textarea className="textarea" value={form?.description || ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="field">
            <label>شعار الفريق</label>
            <input type="file" accept="image/*" className="input" onChange={(e) => e.target.files?.[0] && uploadLogo.mutate(e.target.files[0])} />
            {form?.logo_url && <img src={form.logo_url} alt="" style={{ width: 60, borderRadius: 14, marginTop: 6 }} />}
          </div>
          <button className="btn block" onClick={() => saveTeam.mutate()} disabled={saveTeam.isPending}>حفظ التعديلات</button>
        </div>
      )}

      {isCaptain && requests.data?.length > 0 && (
        <div className="section">
          <div className="section-head"><h2><Icon name="users" size={17} /> طلبات الانضمام ({requests.data.length})</h2></div>
          <div className="card">
            {requests.data.map((r) => (
              <div key={r.id} className="list-item">
                <div className="avatar">{(r.player?.full_name || '؟').charAt(0)}</div>
                <div style={{ flex: 1 }}>
                  <b style={{ fontSize: 13.5 }}>{r.player?.full_name}</b>
                  {r.player?.position && <div className="tiny">{r.player.position}</div>}
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <button className="btn sm success" onClick={() => reviewRequest.mutate({ reqId: r.id, decision: 'approved' })}>قبول</button>
                  <button className="btn sm danger" onClick={() => reviewRequest.mutate({ reqId: r.id, decision: 'rejected' })}>رفض</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-head"><h2><Icon name="users" size={17} /> قائمة الفريق</h2></div>
        {members.isLoading ? <Spinner /> : (
          <div className="card">
            {members.data.map((m) => (
              <div key={m.id} className="list-item">
                <Link to={`/players/${m.player?.id}`} className="avatar">
                  {m.player?.avatar_url
                    ? <img src={m.player.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (m.player?.full_name || '؟').charAt(0)}
                </Link>
                <div style={{ flex: 1 }}>
                  <div className="row" style={{ gap: 6 }}>
                    <b style={{ fontSize: 13.5 }}>{m.player?.full_name || 'لاعب'}</b>
                    {m.role === 'captain' && <span className="badge dark">🅒 Captain</span>}
                    {m.player?.is_premium && <span className="badge gold">★ Premium</span>}
                  </div>
                  <div className="tiny">{m.player?.position || ''}{m.player?.jersey_number ? ` • رقم ${m.player.jersey_number}` : ''}</div>
                </div>
                {isCaptain && m.role !== 'captain' && (
                  <button className="btn sm danger" onClick={() => { if (confirm('إزالة هذا اللاعب؟')) removeMember.mutate(m.player_id) }}>إزالة</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="section">
        <div className="section-head"><h2><Icon name="trophy" size={17} /> بطولات الفريق</h2></div>
        <TeamTournaments teamId={id} />
      </div>
    </Layout>
  )
}

function TeamTournaments({ teamId }) {
  const tts = useQuery({
    queryKey: ['team-tournaments', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournament_teams')
        .select('id, status, tournament:tournaments(id, name, status, village:villages(name))')
        .eq('team_id', teamId)
        .order('joined_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
  if (tts.isLoading) return <Spinner />
  if (!tts.data?.length) return <Empty icon="trophy" text="لا تشارك هذه البطولات بعد" />
  return tts.data.map((tt) => (
    <Link key={tt.id} to={`/tournaments/${tt.tournament.id}`} className="card tap">
      <div className="row between">
        <div className="card-title">{tt.tournament.name}</div>
        <span className={`badge ${tt.status === 'approved' ? 'success' : tt.status === 'pending' ? 'warn' : 'danger'}`}>
          {tt.status === 'approved' ? 'مشارك' : tt.status === 'pending' ? 'قيد المراجعة' : tt.status === 'withdrawn' ? 'منسحب' : 'مرفوض'}
        </span>
      </div>
      <div className="tiny">📍 {tt.tournament.village?.name}</div>
    </Link>
  ))
}
