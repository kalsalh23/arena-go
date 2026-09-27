import Icon from './Icon'

export function Spinner() {
  return <div className="spinner" aria-label="جارٍ التحميل" />
}

export function Empty({ icon = 'info', text = 'لا توجد بيانات بعد' }) {
  return (
    <div className="empty">
      <div className="empty-ic"><Icon name={icon} size={30} /></div>
      <div style={{ fontWeight: 700 }}>{text}</div>
    </div>
  )
}

export function ErrorBox({ children }) {
  if (!children) return null
  return <div className="error-box"><Icon name="info" size={16} style={{ marginTop: 2 }} /> <span>{children}</span></div>
}

export function OkBox({ children }) {
  if (!children) return null
  return <div className="ok-box">✅ {children}</div>
}
