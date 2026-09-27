import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useUnreadCount } from '../hooks/notifications'

const NAV = [
  { to: '/', label: 'الرئيسية', ic: '🏠' },
  { to: '/venues', label: 'الملاعب', ic: '🏟️' },
  { to: '/teams', label: 'الفرق', ic: '⚽' },
  { to: '/tournaments', label: 'البطولات', ic: '🏆' },
  { to: '/matches', label: 'مبارياتي', ic: '📅' },
]

export default function Layout({ title, children, headerRight }) {
  const { user, profile } = useAuth()
  const location = useLocation()
  const { data: unread } = useUnreadCount()

  return (
    <div className="app-shell">
      <header className="app-header">
        {location.pathname === '/' ? (
          <div className="logo">Arena Go</div>
        ) : (
          <div className="title">{title || 'Arena Go'}</div>
        )}
        <div style={{ flex: 1 }} />
        {headerRight}
        {user && (
          <>
            <NavLink to="/notifications" className="icon-btn" aria-label="الإشعارات">
              🔔
              {unread > 0 && <span className="dot">{unread > 9 ? '9+' : unread}</span>}
            </NavLink>
            <NavLink to="/profile" className="avatar" style={{ width: 34, height: 34, fontSize: 13 }}>
              {(profile?.full_name || '؟').trim().charAt(0)}
            </NavLink>
          </>
        )}
      </header>

      <main className="page">{children}</main>

      <nav className="bottom-nav">
        <div className="inner">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="ic">{n.ic}</span>
              {n.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
