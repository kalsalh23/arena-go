import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Layout from '../../components/Layout'
import Icon from '../../components/Icon'
import { Spinner, Empty, ErrorBox } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { dateAr, timeAr, sypText, BOOKING_STATUS_LABELS } from '../../lib/constants'

const POSITIONS = ['حراسة', 'دفاع', 'وسط', 'هجوم']

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth()
  const qc = useQueryClient()
  const [edit, setEdit] = useState(false)
  const [err, setErr] = useState('')
  const [form, setForm] = useState(null)

  const { data: villages } = useQuery({
    queryKey: ['villages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('villages').select('*').eq('is_active', true).order('name')
      if (error) throw error
      return data
    },
  })

  const memberships = useQuery({
    queryKey: ['my-memberships-full', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*, team:teams(id, name, is_active)')
        .eq('player_id', user.id)
      if (error) throw error
      return data
    },
  })

  const bookings = useQuery({
    queryKey: ['my-bookings', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, venue:venues(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data
    },
  })

  const stats = useQuery({
    queryKey: ['my-player-stats', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournament_player_stats')
        .select('goals, assists, matches_played, yellow_cards, red_cards')
        .eq('player_id', user.id)
      if (error) throw error
      return data.reduce((a, s) => ({
        goals: a.goals + s.goals, assists: a.assists + s.assists,
        matches: a.matches + s.matches_played, yellow: a.yellow + s.yellow_cards, red: a.red + s.red_cards,
      }), { goals: 0, assists: 0, matches: 0, yellow: 0, red: 0 })
    },
  })

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('profiles').update({
        full_name: form.fullName,
        village_id: form.villageId || null,
        position: form.position || null,
        jersey_number: form.jerseyNumber ? parseInt(form.jerseyNumber, 10) : null,
        bio: form.bio || '',
      }).eq('id', user.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      await refreshProfile()
      setEdit(false)
      qc.invalidateQueries()
    },
    onError: (e) => setErr(e.message),
  })

  const uploadAvatar = useMutation({
    mutationFn: async (file) => {
      const path = `${user.id}/${Date.now()}_${file.name}`
      const up = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (up.error) throw up.error
      const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
      const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
      if (error) throw error
    },
    onSuccess: () => refreshProfile(),
    onError: (e) => setErr(e.message),
  })

  if (!profile) return <Layout title="حسابي" titleIcon="user"><Spinner /></Layout>

  const f = form || {
    fullName: profile.full_name || '', villageId: profile.village_id || '',
    position: profile.position || '', jerseyNumber: profile.jersey_number || '', bio: profile.bio || '',
  }

  return (
    <Layout title="حسابي" titleIcon="user">
      <ErrorBox>{err}</ErrorBox>

      <div className="profile-hero">
        <div className="row" style={{ position: 'relative' }}>
          <div className="avatar lg" style={{ background: 'rgba(255,255,255,0.14)', color: '#fff' }}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (profile.full_name || '؟').charAt(0)}
          </div>
          <div style={{ flex: 1 }}>
            <div className="row" style={{ gap: 6 }}>
              <b style={{ fontSize: 17 }}>{profile.full_name || 'لاعب'}</b>
              {profile.is_premium && <span className="badge gold">★ Premium</span>}
            </div>
            <div style={{ fontSize: 12.5, opacity: 0.85 }}>
              {(villages || []).find((v) => v.id === profile.village_id)?.name || '—'}
              {profile.position ? ` • ${profile.position}` : ''}
              {profile.jersey_number ? ` • رقم ${profile.jersey_number}` : ''}
            </div>
            <div style={{ fontSize: 11.5, opacity: 0.7 }}>
              {profile.role === 'venue_owner' ? '🏟️ صاحب ملعب' : profile.role === 'admin' ? '🛡️ مدير' : '⚽ لاعب'}
            </div>
          </div>
        </div>
        <div className="btn-row" style={{ marginTop: 12, position: 'relative' }}>
          <button className="btn sm secondary" onClick={() => setEdit(!edit)}><Icon name="edit" size={13} /> تعديل الملف</button>
          <label className="btn sm secondary" style={{ cursor: 'pointer' }}>
            <Icon name="camera" size={13} /> صورة
            <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadAvatar.mutate(e.target.files[0])} />
          </label>
          {!profile.is_premium && <Link to="/premium" className="btn sm"><Icon name="star" size={13} /> ترقية Premium</Link>}
        </div>
      </div>

      {edit && (
        <div className="card">
          <div className="field"><label>الاسم الكامل</label>
            <input className="input" value={f.fullName} onChange={(e) => setForm({ ...f, fullName: e.target.value })} /></div>
          <div className="field"><label>القرية</label>
            <select className="select" value={f.villageId} onChange={(e) => setForm({ ...f, villageId: e.target.value })}>
              <option value="">— اختر —</option>
              {(villages || []).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select></div>
          <div className="grid-2">
            <div className="field"><label>المركز</label>
              <select className="select" value={f.position} onChange={(e) => setForm({ ...f, position: e.target.value })}>
                <option value="">—</option>
                {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select></div>
            <div className="field"><label>رقم القميص</label>
              <input className="input" type="number" min="1" max="99" value={f.jerseyNumber} onChange={(e) => setForm({ ...f, jerseyNumber: e.target.value })} /></div>
          </div>
          <div className="field mb0"><label>نبذة</label>
            <textarea className="textarea" value={f.bio} onChange={(e) => setForm({ ...f, bio: e.target.value })} /></div>
          <button className="btn block mt8" onClick={() => save.mutate()} disabled={save.isPending}>حفظ</button>
        </div>
      )}

      <div className="section" style={{ marginTop: 16 }}>
        <div className="section-head"><h2><Icon name="trophy" size={16} /> إحصائياتي</h2></div>
        <div className="grid-4">
          <div className="stat-card"><div className="num">{stats.data?.goals ?? 0}</div><div className="lbl">أهداف</div></div>
          <div className="stat-card"><div className="num">{stats.data?.assists ?? 0}</div><div className="lbl">صناعة</div></div>
          <div className="stat-card"><div className="num">{stats.data?.matches ?? 0}</div><div className="lbl">مباريات</div></div>
          <div className="stat-card"><div className="num">{(stats.data?.yellow ?? 0) + (stats.data?.red ?? 0)}</div><div className="lbl">بطاقات</div></div>
        </div>
      </div>

      <div className="section">
        <div className="section-head"><h2><Icon name="shirt" size={16} /> فرقي</h2></div>
        {memberships.isLoading ? <Spinner /> : memberships.data?.length === 0 ? <Empty icon="ball" text="لا تنتمي إلى فريق بعد" /> : (
          memberships.data.map((m) => (
            <Link key={m.id} to={`/teams/${m.team.id}`} className="card tap" style={{ padding: 12 }}>
              <div className="row between">
                <b style={{ fontSize: 14 }}>{m.team.name}</b>
                {m.role === 'captain'
                  ? <span className="badge dark">🅒 Captain</span>
                  : <span className={`badge ${m.team.is_active ? 'neutral' : 'danger'}`}>{m.team.is_active ? 'عضو' : 'فريق موقوف'}</span>}
              </div>
            </Link>
          ))
        )}
      </div>

      <div className="section">
        <div className="section-head"><h2><Icon name="calendar" size={16} /> حجوزاتي</h2></div>
        {bookings.isLoading ? <Spinner /> : bookings.data?.length === 0 ? <Empty icon="calendar" text="لا حجوزات بعد" /> : (
          bookings.data.map((b) => (
            <div key={b.id} className="card" style={{ padding: 13 }}>
              <div className="row between">
                <div className="card-title" style={{ fontSize: 14 }}>{b.venue?.name}</div>
                <span className={`badge ${b.booking_status === 'confirmed' ? 'success' : b.booking_status === 'pending_review' ? 'warn' : 'danger'}`}>
                  {BOOKING_STATUS_LABELS[b.booking_status]}
                </span>
              </div>
              <div className="tiny">📅 {dateAr(b.booking_date)} • ⏰ {timeAr(b.start_time)} • 💵 {sypText(b.full_price)}</div>
            </div>
          ))
        )}
      </div>

      <div className="section">
        <Link to="/about" className="card tap" style={{ padding: 13 }}>
          <div className="row between">
            <span className="card-title"><Icon name="info" size={16} /> من نحن / تفاصيل عنا</span>
            <Icon name="chevL" size={16} style={{ color: 'var(--text-3)' }} />
          </div>
        </Link>
      </div>

      <button className="btn danger block mt16" onClick={async () => { await supabase.auth.signOut(); location.reload() }}>
        <Icon name="logout" size={16} /> تسجيل الخروج
      </button>
    </Layout>
  )
}
