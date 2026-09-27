import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Layout from '../../components/Layout'
import { Spinner, Empty, ErrorBox, OkBox } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { sypText, dateAr, timeAr, BOOKING_STATUS_LABELS, TOURNAMENT_STATUS_LABELS } from '../../lib/constants'
import { statusBadge } from '../tournaments/TournamentsPage'

export default function OwnerDashboard() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('venues')
  const [err, setErr] = useState('')

  const venues = useQuery({
    queryKey: ['my-venues', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.from('venues').select('*, village:villages(name)').eq('owner_id', profile.id).order('created_at')
      if (error) throw error
      return data
    },
  })

  const myTournaments = useQuery({
    queryKey: ['my-tournaments', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*, venue:venues(name), village:villages(name)')
        .eq('owner_id', profile.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  return (
    <Layout title="ðŸ› ï¸ Ù„ÙˆØ­Ø© ØµØ§Ø­Ø¨ Ø§Ù„Ù…Ù„Ø¹Ø¨">
      <ErrorBox>{err}</ErrorBox>

      <div className="btn-row" style={{ marginBottom: 14 }}>
        <Link to="/dashboard/venues/new" className="btn sm">ï¼‹ Ø¥Ø¶Ø§ÙØ© Ù…Ù„Ø¹Ø¨</Link>
        <Link to="/dashboard/tournaments/new" className="btn sm">ï¼‹ Ø¥Ù†Ø´Ø§Ø¡ Ø¨Ø·ÙˆÙ„Ø©</Link>
      </div>

      <div className="tabs">
        <button className={tab === 'venues' ? 'active' : ''} onClick={() => setTab('venues')}>Ù…Ù„Ø§Ø¹Ø¨ÙŠ</button>
        <button className={tab === 'bookings' ? 'active' : ''} onClick={() => setTab('bookings')}>Ø§Ù„Ø­Ø¬ÙˆØ²Ø§Øª</button>
        <button className={tab === 'tournaments' ? 'active' : ''} onClick={() => setTab('tournaments')}>Ø§Ù„Ø¨Ø·ÙˆÙ„Ø§Øª</button>
      </div>

      {tab === 'venues' && (
        venues.isLoading ? <Spinner /> : venues.data?.length === 0 ? <Empty icon="ðŸŸï¸" text="Ù„Ù… ØªØ¶Ù Ù…Ù„Ø§Ø¹Ø¨ Ø¨Ø¹Ø¯" /> : (
          venues.data.map((v) => (
            <div key={v.id} className="card">
              <div className="row between">
                <div className="card-title">{v.name}</div>
                <span className={`badge ${v.is_active ? 'success' : 'danger'}`}>{v.is_active ? 'Ù†Ø´Ø·' : 'Ù…ÙˆÙ‚ÙˆÙ'}</span>
              </div>
              <div className="tiny">ðŸ“ {v.village?.name} â€¢ {sypText(v.price_per_hour)}/Ø³Ø§Ø¹Ø©</div>
              <div className="btn-row">
                <Link to={`/dashboard/venues/${v.id}/edit`} className="btn sm outline">ØªØ¹Ø¯ÙŠÙ„</Link>
                <Link to={`/venues/${v.id}`} className="btn sm secondary">Ø¹Ø±Ø¶</Link>
              </div>
            </div>
          ))
        )
      )}

      {tab === 'bookings' && <OwnerBookings venues={venues.data || []} />}

      {tab === 'tournaments' && (
        myTournaments.isLoading ? <Spinner /> : myTournaments.data?.length === 0 ? <Empty icon="ðŸ†" text="Ù„Ù… ØªÙ†Ø´Ø¦ Ø¨Ø·ÙˆÙ„Ø§Øª Ø¨Ø¹Ø¯" /> : (
          myTournaments.data.map((t) => (
            <div key={t.id} className="card">
              <div className="row between">
                <div className="card-title">{t.name}</div>
                {statusBadge(t.status)}
              </div>
              <div className="tiny">ðŸŸï¸ {t.venue?.name} â€¢ ðŸ“ {t.village?.name}</div>
              {t.status === 'rejected' && t.rejection_reason && <div className="tiny" style={{ color: 'var(--danger)' }}>Ø³Ø¨Ø¨ Ø§Ù„Ø±ÙØ¶: {t.rejection_reason}</div>}
              <div className="btn-row">
                <Link to={`/dashboard/tournaments/${t.id}`} className="btn sm">Ø¥Ø¯Ø§Ø±Ø©</Link>
              </div>
            </div>
          ))
        )
      )}
    </Layout>
  )
}

function OwnerBookings({ venues }) {
  const qc = useQueryClient()
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  const bookings = useQuery({
    queryKey: ['owner-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, venue:venues(id, name), user:profiles(full_name)')
        .in('booking_status', ['pending_review', 'confirmed'])
        .order('created_at', { ascending: false })
        .limit(60)
      if (error) throw error
      return data
    },
  })

  const signed = useQuery({
    queryKey: ['receipt-urls', bookings.data?.map((b) => b.payment_receipt_url).join('|')],
    enabled: !!bookings.data?.some((b) => b.payment_receipt_url),
    queryFn: async () => {
      const map = {}
      for (const b of bookings.data) {
        if (b.payment_receipt_url) {
          const { data } = await supabase.storage.from('receipts').createSignedUrl(b.payment_receipt_url, 600)
          if (data) map[b.id] = data.signedUrl
        }
      }
      return map
    },
  })

  const review = useMutation({
    mutationFn: async ({ id, decision, note }) => {
      const { error } = await supabase.rpc('review_booking', { p_booking_id: id, p_decision: decision, p_note: note || null })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => { setErr(''); setOk('ØªÙ…Øª Ø§Ù„Ù…Ø¹Ø§Ù„Ø¬Ø©'); qc.invalidateQueries({ queryKey: ['owner-bookings'] }) },
    onError: (e) => { setOk(''); setErr(e.message) },
  })

  if (bookings.isLoading) return <Spinner />
  if (!bookings.data?.length) return <Empty icon="ðŸ“…" text="Ù„Ø§ ØªÙˆØ¬Ø¯ Ø­Ø¬ÙˆØ²Ø§Øª Ù†Ø´Ø·Ø©" />

  return (
    <>
      <ErrorBox>{err}</ErrorBox>
      <OkBox>{ok}</OkBox>
      {bookings.data.map((b) => (
        <div key={b.id} className="card">
          <div className="row between">
            <div className="card-title">{b.venue?.name}</div>
            <span className={`badge ${b.booking_status === 'confirmed' ? 'success' : 'warn'}`}>
              {BOOKING_STATUS_LABELS[b.booking_status]}
            </span>
          </div>
          <div className="tiny">ðŸ‘¤ {b.user?.full_name || 'Ù„Ø§Ø¹Ø¨'} â€¢ ðŸ“… {dateAr(b.booking_date)} â€¢ â° {timeAr(b.start_time)}</div>
          <div className="kv"><span className="k">Ø§Ù„Ø¹Ø±Ø¨ÙˆÙ†</span><span className="v">{sypText(b.deposit_amount)}</span></div>
          <div className="kv"><span className="k">Ø§Ù„Ø³Ø¹Ø± Ø§Ù„ÙƒØ§Ù…Ù„</span><span className="v">{sypText(b.full_price)}</span></div>
          {b.notes && <div className="tiny">ðŸ“ {b.notes}</div>}

          {b.payment_receipt_url && (
            <div className="mt8">
              <a href={signed.data?.[b.id] || '#'} target="_blank" rel="noreferrer" className="btn sm secondary">ðŸ§¾ Ø¹Ø±Ø¶ Ø¥Ø´Ø¹Ø§Ø± Ø§Ù„ØªØ­ÙˆÙŠÙ„</a>
            </div>
          )}

          {b.booking_status === 'pending_review' && (
            <div className="btn-row">
              <button className="btn sm success" onClick={() => review.mutate({ id: b.id, decision: 'approved' })}>Ù‚Ø¨ÙˆÙ„ Ø§Ù„Ø­Ø¬Ø²</button>
              <button className="btn sm danger" onClick={() => review.mutate({ id: b.id, decision: 'rejected', note: 'Ø¥Ø´Ø¹Ø§Ø± Ø§Ù„ØªØ­ÙˆÙŠÙ„ ØºÙŠØ± ØµØ­ÙŠØ­' })}>Ø±ÙØ¶</button>
            </div>
          )}
        </div>
      ))}
    </>
  )
}
