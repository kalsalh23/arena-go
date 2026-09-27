import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import Layout from '../../components/Layout'
import Icon from '../../components/Icon'
import { Spinner, ErrorBox, OkBox } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function JoinByCodePage() {
  const { code: codeParam } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [code, setCode] = useState(codeParam && codeParam !== 'ARENA' ? codeParam : '')
  const [team, setTeam] = useState(null)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (codeParam && codeParam !== 'ARENA') lookup(codeParam)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeParam])

  async function lookup(c) {
    if (!c.trim()) return
    setLoading(true)
    setErr('')
    setTeam(null)
    const { data, error } = await supabase.rpc('get_team_by_code', { p_code: c.trim() })
    setLoading(false)
    if (error) return setErr(error.message)
    if (!data || data.length === 0) return setErr('كود الدعوة غير صحيح أو الفريق غير نشط')
    setTeam(data[0])
  }

  const sendRequest = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('join_requests').insert({ team_id: team.team_id, player_id: user.id })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => { setErr(''); setOk('تم إرسال طلب الانضمام — بانتظار موافقة الكابتن.') },
    onError: (e) => { setOk(''); setErr(e.message.replace('Error: ', '')) },
  })

  return (
    <Layout title="الانضمام إلى فريق" titleIcon="users">
      <div className="card">
        <div className="field">
          <label>كود الدعوة</label>
          <input
            className="input"
            dir="ltr"
            style={{ textAlign: 'center', fontSize: 17, fontWeight: 800, letterSpacing: 1.5 }}
            placeholder="ARENA-X7K29"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
        </div>
        <button className="btn block" onClick={() => lookup(code)} disabled={loading || !code.trim()}>
          <Icon name="search" size={16} /> {loading ? 'جارٍ البحث…' : 'بحث عن الفريق'}
        </button>
      </div>

      <ErrorBox>{err}</ErrorBox>
      <OkBox>{ok}</OkBox>

      {loading && <Spinner />}

      {team && (
        <div className="card">
          <div className="row">
            <div className="logo-box round"><Icon name="shirt" size={22} /></div>
            <div style={{ flex: 1 }}>
              <div className="card-title">{team.name}</div>
              <div className="tiny">📍 {team.village_name || '—'} • 👥 {team.members_count} لاعب</div>
            </div>
          </div>
          {team.description && <p className="muted mt8" style={{ fontSize: 13 }}>{team.description}</p>}
          <div className="kv"><span className="k"><Icon name="shield" size={15} /> الكابتن</span><span className="v">🅒 {team.captain_name}</span></div>
          {!user ? (
            <Link to="/auth" state={{ from: `/join/${code}` }} className="btn block mt8">سجّل الدخول لإرسال طلب الانضمام</Link>
          ) : (
            <button className="btn block mt8" onClick={() => sendRequest.mutate()} disabled={sendRequest.isPending}>
              <Icon name="users" size={16} /> {sendRequest.isPending ? 'جارٍ الإرسال…' : 'إرسال طلب الانضمام'}
            </button>
          )}
        </div>
      )}

      {team && ok && (
        <button className="btn outline block" onClick={() => navigate(`/teams/${team.team_id}`)}>عرض صفحة الفريق</button>
      )}
    </Layout>
  )
}
