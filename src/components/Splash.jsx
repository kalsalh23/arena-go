import { useEffect, useState } from 'react'
import Icon from './Icon'

// Welcome splash: 3 seconds on site entry — logo + stars scene + one-line tagline.
export default function Splash() {
  const [leaving, setLeaving] = useState(false)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 2600)
    const t2 = setTimeout(() => setGone(true), 3150)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  if (gone) return null

  return (
    <div
      className="splash"
      style={{
        opacity: leaving ? 0 : 1,
        position: 'fixed', inset: 0, zIndex: 999,
        transition: 'opacity 0.55s ease',
        backgroundImage: 'url(/demo/splash-stars.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center 22%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 14,
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(6,20,14,0.38), rgba(8,32,20,0.82) 68%, rgba(6,20,14,0.95))' }} />
      <div style={{ position: 'relative', textAlign: 'center', padding: '0 30px' }}>
        <div style={{
          width: 86, height: 86, borderRadius: 26, margin: '0 auto 14px',
          background: 'linear-gradient(145deg, #12864a, #0b6337)',
          border: '2px solid rgba(255,255,255,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', boxShadow: '0 14px 40px rgba(0,0,0,0.5)',
        }}>
          <Icon name="ball" size={44} strokeWidth={1.6} />
        </div>
        <div style={{ fontSize: 34, fontWeight: 900, color: '#fff', textShadow: '0 3px 18px rgba(0,0,0,0.6)', letterSpacing: 0.5 }}>
          Arena Go
        </div>
        <div style={{ marginTop: 10, fontSize: 14.5, fontWeight: 700, color: 'rgba(255,255,255,0.95)', textShadow: '0 2px 12px rgba(0,0,0,0.6)', lineHeight: 1.8 }}>
          منصة كرة القدم في القرى<br />
          <span style={{ opacity: 0.85, fontSize: 12.5, fontWeight: 600 }}>ملاعب، فرق، وبطولات — على بعد لمسة</span>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 46, display: 'flex', gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <i key={i} style={{
            width: 8, height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.85)',
            animation: `splashDot 1s ${i * 0.18}s infinite alternate`,
          }} />
        ))}
      </div>
      <style>{`@keyframes splashDot { from { opacity: 0.3; transform: scale(0.8);} to { opacity: 1; transform: scale(1.15);} }`}</style>
    </div>
  )
}
