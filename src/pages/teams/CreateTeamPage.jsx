import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Layout from '../../components/Layout'
import { Spinner, ErrorBox } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useVillages } from '../../hooks/useVillages'

export default function CreateTeamPage() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: villages } = useVillages()
  const [err, setErr] = useState('')
  const [form, setForm] = useState({ name: '', description: '', village_id: profile?.village_id || '', logo_url: '' })

  // one active team per player is enforced by a DB trigger too
  const myTeams = useQuery({
    queryKey: ['my-active-team', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('id, name').eq('captain_id', user.id).eq('is_active', true)
      if (error) throw error
      return data
    },
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

  const create = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('أدخل اسم الفريق')
      const { data, error } = await supabase
        .from('teams')
        .insert({ name: form.name.trim(), description: form.description, village_id: form.village_id || null, logo_url: form.logo_url || null, captain_id: user.id })
        .select('id')
        .single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['teams'] })
      qc.invalidateQueries({ queryKey: ['my-active-team'] })
      refreshProfile()
      navigate(`/teams/${d.id}`)
    },
    onError: (e) => setErr(e.message.replace('Error: ', '')),
  })

  if (myTeams.isLoading) return <Layout title="إنشاء فريق"><Spinner /></Layout>
  if (myTeams.data?.length > 0) {
    return (
      <Layout title="إنشاء فريق">
        <div className="card center">
          <div style={{ fontSize: 38 }}>⚽</div>
          <h2>لديك فريق نشط بالفعل</h2>
          <p className="muted">يمكن لكل لاعب إنشاء فريق واحد نشط فقط. فريقك: <b>{myTeams.data[0].name}</b></p>
          <Link to={`/teams/${myTeams.data[0].id}`} className="btn">الذهاب إلى فريقك</Link>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="إنشاء فريق">
      <ErrorBox>{err}</ErrorBox>
      <div className="card">
        <div className="field">
          <label>اسم الفريق *</label>
          <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="مثال: فريق الأبطال" />
        </div>
        <div className="field">
          <label>القرية</label>
          <select className="select" value={form.village_id} onChange={(e) => setForm((f) => ({ ...f, village_id: e.target.value }))}>
            <option value="">— اختر القرية —</option>
            {(villages || []).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>الوصف</label>
          <textarea className="textarea" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="نبذة عن الفريق…" />
        </div>
        <div className="field mb0">
          <label>شعار الفريق</label>
          <input type="file" accept="image/*" className="input" onChange={(e) => e.target.files?.[0] && uploadLogo.mutate(e.target.files[0])} />
          {form.logo_url && <img src={form.logo_url} alt="" style={{ width: 64, borderRadius: 12, marginTop: 8 }} />}
        </div>
      </div>
      <p className="hint">سيتم توليد كود دعوة فريد تلقائياً (مثل ARENA-X7K29) وستصبح كابتن الفريق.</p>
      <button className="btn block" onClick={() => create.mutate()} disabled={create.isPending}>
        {create.isPending ? 'جارٍ الإنشاء…' : 'إنشاء الفريق'}
      </button>
    </Layout>
  )
}
