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
      if (!form.name.trim()) throw new Error('Ø£Ø¯Ø®Ù„ Ø§Ø³Ù… Ø§Ù„Ø¨Ø·ÙˆÙ„Ø©')
      if (!form.venue_id) throw new Error('Ø§Ø®ØªØ± Ø§Ù„Ù…Ù„Ø¹Ø¨')
      if (!form.village_id) throw new Error('Ø§Ø®ØªØ± Ø§Ù„Ù‚Ø±ÙŠØ©')
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
    <Layout title="Ø¥Ù†Ø´Ø§Ø¡ Ø¨Ø·ÙˆÙ„Ø©">
      <ErrorBox>{err}</ErrorBox>
      <div className="card">
        <div className="field">
          <label>Ø§Ø³Ù… Ø§Ù„Ø¨Ø·ÙˆÙ„Ø© *</label>
          <input className="input" value={form.name} onChange={set('name')} placeholder="Ù…Ø«Ø§Ù„: Ø¨Ø·ÙˆÙ„Ø© Arena Cup" />
        </div>
        <div className="field">
          <label>Ø§Ù„Ù…Ù„Ø¹Ø¨ *</label>
          <select className="select" value={form.venue_id} onChange={(e) => {
            const v = e.target.value
            setForm((f) => ({ ...f, venue_id: v, village_id: myVenues.data?.find((x) => x.id === v)?.village_id || f.village_id }))
          }}>
            <option value="">â€” Ø§Ø®ØªØ± Ù…Ù† Ù…Ù„Ø§Ø¹Ø¨Ùƒ â€”</option>
            {(myVenues.data || []).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          {myVenues.data?.length === 0 && <div className="hint">Ø£Ø¶Ù Ù…Ù„Ø¹Ø¨Ø§Ù‹ Ø£ÙˆÙ„Ø§Ù‹ Ù…Ù† Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ….</div>}
        </div>
        <div className="field">
          <label>Ø§Ù„Ù‚Ø±ÙŠØ© *</label>
          <select className="select" value={form.village_id} onChange={set('village_id')}>
            <option value="">â€” Ø§Ø®ØªØ± â€”</option>
            {(villages || []).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>ÙˆØµÙ Ø§Ù„Ø¨Ø·ÙˆÙ„Ø©</label>
          <textarea className="textarea" value={form.description} onChange={set('description')} />
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Ø¹Ø¯Ø¯ Ø§Ù„ÙØ±Ù‚</label>
            <input className="input" type="number" min="2" max="32" value={form.max_teams} onChange={set('max_teams')} />
          </div>
          <div className="field">
            <label>Ù„Ø§Ø¹Ø¨ÙˆÙ† Ù„ÙƒÙ„ ÙØ±ÙŠÙ‚</label>
            <input className="input" type="number" min="3" max="25" value={form.players_per_team} onChange={set('players_per_team')} />
          </div>
        </div>
        <div className="field">
          <label>Ø±Ø³ÙˆÙ… Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ (Ø¨Ø§Ù„ÙˆØ­Ø¯Ø§Øª â€” 1000 = 100,000 Ù„.Ø³)</label>
          <input className="input" type="number" min="0" value={form.registration_fee} onChange={set('registration_fee')} placeholder="0 = Ù…Ø¬Ø§Ù†ÙŠØ©" />
          {form.registration_fee && <div className="hint">Ø³ØªØ¸Ù‡Ø± Ù„Ù„Ø§Ø¹Ø¨ÙŠÙ†: {sypText(parseInt(form.registration_fee, 10) || 0)}</div>}
        </div>
        <div className="grid-3">
          <div className="field">
            <label>ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¨Ø¯Ø§ÙŠØ©</label>
            <input className="input" type="date" value={form.start_date} onChange={set('start_date')} />
          </div>
          <div className="field">
            <label>Ø§Ù„Ù†Ù‡Ø§ÙŠØ© Ø§Ù„Ù…ØªÙˆÙ‚Ø¹Ø©</label>
            <input className="input" type="date" value={form.end_date} onChange={set('end_date')} />
          </div>
          <div className="field">
            <label>Ø¢Ø®Ø± Ù…ÙˆØ¹Ø¯ ØªØ³Ø¬ÙŠÙ„</label>
            <input className="input" type="date" value={form.registration_deadline} onChange={set('registration_deadline')} />
          </div>
        </div>
        <div className="field">
          <label>Ù†Ø¸Ø§Ù… Ø§Ù„Ø¨Ø·ÙˆÙ„Ø©</label>
          <select className="select" value={form.tournament_type} onChange={set('tournament_type')}>
            <option value="groups">Ù…Ø¬Ù…ÙˆØ¹Ø§Øª</option>
            <option value="knockout">Ø®Ø±ÙˆØ¬ Ù…ØºÙ„Ù‚</option>
            <option value="groups_knockout">Ù…Ø¬Ù…ÙˆØ¹Ø§Øª + Ø®Ø±ÙˆØ¬ Ù…ØºÙ„Ù‚</option>
          </select>
        </div>
        {form.tournament_type !== 'knockout' && (
          <div className="field">
            <label>Ø¹Ø¯Ø¯ Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹Ø§Øª</label>
            <input className="input" type="number" min="1" max="8" value={form.group_count} onChange={set('group_count')} />
          </div>
        )}
        <div className="grid-3">
          <div className="field">
            <label>Ù†Ù‚Ø§Ø· Ø§Ù„ÙÙˆØ²</label>
            <input className="input" type="number" min="0" value={form.points_win} onChange={set('points_win')} />
          </div>
          <div className="field">
            <label>Ù†Ù‚Ø§Ø· Ø§Ù„ØªØ¹Ø§Ø¯Ù„</label>
            <input className="input" type="number" min="0" value={form.points_draw} onChange={set('points_draw')} />
          </div>
          <div className="field">
            <label>Ù†Ù‚Ø§Ø· Ø§Ù„Ø®Ø³Ø§Ø±Ø©</label>
            <input className="input" type="number" min="0" value={form.points_loss} onChange={set('points_loss')} />
          </div>
        </div>
        <div className="field">
          <label>Ø§Ù„Ø¬ÙˆØ§Ø¦Ø² (Ø¥Ù† ÙˆØ¬Ø¯Øª)</label>
          <input className="input" value={form.prize_description} onChange={set('prize_description')} placeholder="Ù…Ø«Ø§Ù„: Ø§Ù„ÙØ§Ø¦Ø² 1,000,000 Ù„.Ø³" />
        </div>
        <div className="field mb0">
          <label>Ø´Ø±ÙˆØ· Ø§Ù„Ù…Ø´Ø§Ø±ÙƒØ©</label>
          <textarea className="textarea" value={form.conditions} onChange={set('conditions')} placeholder={'- 8 ÙØ±Ù‚ ÙÙ‚Ø·\n- ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ø§Ù„ÙØ±ÙŠÙ‚ Ù…Ø³Ø¬Ù„Ø§Ù‹ ÙÙŠ Arena Go\n- ...'} />
        </div>
      </div>

      <div className="card">
        <div className="tiny">â„¹ï¸ Ø¨Ø¹Ø¯ Ø§Ù„Ø¥Ø±Ø³Ø§Ù„ ØªØªØ­ÙˆÙ„ Ø§Ù„Ø¨Ø·ÙˆÙ„Ø© Ø¥Ù„Ù‰ Ø­Ø§Ù„Ø© <b>Â«Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ù…ÙˆØ§ÙÙ‚Ø© Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©Â»</b>ØŒ ÙˆÙ„Ù† ØªØ¸Ù‡Ø± Ù„Ù„Ø§Ø¹Ø¨ÙŠÙ† Ø¥Ù„Ø§ Ø¨Ø¹Ø¯ Ù…ÙˆØ§ÙÙ‚Ø© Ù…Ø¯ÙŠØ± Arena Go.</div>
      </div>

      <button className="btn block" onClick={() => create.mutate()} disabled={create.isPending}>
        {create.isPending ? 'Ø¬Ø§Ø±Ù Ø§Ù„Ø¥Ø±Ø³Ø§Ù„â€¦' : 'Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø¨Ø·ÙˆÙ„Ø© Ù„Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©'}
      </button>
    </Layout>
  )
}
