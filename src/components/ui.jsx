export function Spinner() {
  return <div className="spinner" aria-label="جارٍ التحميل" />
}

export function Empty({ icon = '📭', text = 'لا توجد بيانات بعد' }) {
  return (
    <div className="empty">
      <div className="ic">{icon}</div>
      <div>{text}</div>
    </div>
  )
}

export function ErrorBox({ children }) {
  if (!children) return null
  return <div className="error-box">⚠️ {children}</div>
}

export function OkBox({ children }) {
  if (!children) return null
  return <div className="ok-box">✅ {children}</div>
}
