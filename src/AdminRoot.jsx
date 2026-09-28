import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import AdminDashboard from './pages/admin/AdminDashboard'
import { Spinner, ErrorBox } from './components/ui'
import Icon from './components/Icon'

// Dedicated admin-panel entry (deployed separately via VITE_ADMIN_ENTRY=admin).
// Lives outside the main app: its own URL, own login, no player features.
function AdminLogin() {
  const { signIn } = useAuth()
  const [form, setForm] = useState({ id: '', password: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      await signIn({ phone: form.id, password: form.password })
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-shell">
      <main className="page" style={{ paddingTop: 56 }}>
        <div className="auth-hero">
          <div className="ball-wrap"><Icon name="shield" size={28} /></div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>Arena Go — الإدارة</div>
          <div style={{ fontSize: 12.5, opacity: 0.85 }}>لوحة إدارة النظام — دخول المدير فقط</div>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <form onSubmit={submit}>
            <ErrorBox>{err}</ErrorBox>
            <div className="field">
              <label>البريد الإلكتروني أو رقم الهاتف</label>
              <input className="input" dir="ltr" value={form.id} onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))} placeholder="admin@example.com" />
            </div>
            <div className="field">
              <label>كلمة المرور</label>
              <input className="input" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
            </div>
            <button className="btn block lg" disabled={busy || !form.id || !form.password}>
              <Icon name="shield" size={17} /> {busy ? 'جارٍ الدخول…' : 'دخول الإدارة'}
            </button>
          </form>
        </div>
        <p className="tiny center mt16">هذا الرابط مستقل عن تطبيق اللاعبين — لصلاحيات إدارة النظام فقط.</p>
      </main>
    </div>
  )
}

function Gate() {
  const { user, profile, loading, signOut } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <AdminLogin />
  if (profile?.role !== 'admin') {
    return (
      <div className="app-shell">
        <main className="page" style={{ paddingTop: 80 }}>
          <div className="card center">
            <div className="empty-ic" style={{ margin: '0 auto 12px' }}><Icon name="shield" size={30} /></div>
            <h2>صلاحية غير كافية</h2>
            <p className="muted">هذا الرابط مخصص لإدارة نظام Arena Go فقط.</p>
            <button className="btn danger" onClick={signOut}><Icon name="logout" size={15} /> تسجيل الخروج</button>
          </div>
        </main>
      </div>
    )
  }
  return <AdminDashboard />
}

export default function AdminRoot() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
