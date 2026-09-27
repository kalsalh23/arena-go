import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { PROMOS } from '../lib/promos'
import { sypText } from '../lib/constants'
import Icon from './Icon'

// Hero card: rotating slides for ads/offers + open tournaments from the DB.
export default function HeroCarousel() {
  const tournaments = useQuery({
    queryKey: ['hero-tournaments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, name, logo_url, registration_fee, max_teams, village:villages(name), teams:tournament_teams(count)')
        .in('status', ['registration_open', 'full'])
        .order('created_at', { ascending: false })
        .limit(3)
      if (error) throw error
      return data
    },
  })

  const slides = [
    ...PROMOS.map((p) => ({ ...p })),
    ...(tournaments.data || []).map((t) => ({
      kicker: '🏆 بطولة',
      title: t.name,
      sub: `📍 ${t.village?.name || ''} • ${t.teams?.[0]?.count ?? 0}/${t.max_teams} فريق`,
      chip: t.registration_fee > 0 ? sypText(t.registration_fee) : 'مجانية',
      cta: 'سجّل فريقك',
      link: `/tournaments/${t.id}`,
      image: t.logo_url,
    })),
  ]

  const [idx, setIdx] = useState(0)
  useEffect(() => {
    if (slides.length <= 1) return
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 5000)
    return () => clearInterval(t)
  }, [slides.length])

  if (slides.length === 0) return null

  return (
    <div className="hero">
      <div className="hero-track" style={{ transform: `translateX(${idx * 100}%)` }}>
        {slides.map((s, i) => (
          <div className="hero-slide" key={i}>
            {s.image ? (
              <img src={s.image} alt={s.title} loading={i === 0 ? 'eager' : 'lazy'} />
            ) : (
              <div className="hero-bg" />
            )}
            <div className="hero-shade">
              <div className="hero-kicker">
                <span className="badge hero-chip">{s.kicker}</span>
                {s.chip && <span className="badge img-chip gold" style={{ position: 'static' }}>{s.chip}</span>}
              </div>
              <div className="hero-title">{s.title}</div>
              {s.sub && <div className="hero-sub">{s.sub}</div>}
            </div>
            <Link to={s.link} className="btn sm hero-cta">
              {s.cta} <Icon name="chevL" size={14} />
            </Link>
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="dots">
          {slides.map((_, i) => <i key={i} className={i === idx ? 'on' : ''} />)}
        </div>
      )}
    </div>
  )
}
