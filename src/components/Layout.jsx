import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useUnreadCount } from '../hooks/notifications'
import Icon from './Icon'

const NAV = [
  { to: '/', label: 'الرئيسية', ic: 'home' },
  { to: '/venues', label: 'الملاعب', ic: 'building' },
  { to: '/teams', label: 'الفرق', ic: 'ball' },
  { to: '/tournaments', label: 'البطولات', ic: 'trophy' },
  { to: '/matches', label: 'مبارياتي', ic: 'calendar' },
]

export default function Layout({ title, titleIcon, children, headerRight }) {
  const { user, profile } = useAuth()
  const location = useLocation()
  const { data: unread } = useUnreadCount()

  return (
    <div className="app-shell">
      <header className="app-header">
        {location.pathname === '/' ? (
          <div className="brand-logo">
            <span className="ball-wrap"><Icon name="ball" size={19} /></span>
            Arena Go
          </div>
        ) : (
          <div className="title">
            {titleIcon && <Icon name={titleIcon} size={19} />}
            {title || 'Arena Go'}
          </div>
        )}
        <div style={{ flex: 1 }} />
        {headerRight}
        {user && (
          <>
            <NavLink to="/notifications" className="icon-btn" aria-label="الإشعارات">
              <Icon name="bell" size={18} />
              {unread > 0 && <span className="dot">{unread > 9 ? '9+' : unread}</span>}
            </NavLink>
            <NavLink to="/profile" className="avatar" style={{ width: 35, height: 35, fontSize: 14 }}>
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
              <Icon name={n.ic} size={21} />
              {n.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
