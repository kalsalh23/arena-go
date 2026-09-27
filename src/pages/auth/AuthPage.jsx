import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ErrorBox } from '../../components/ui'

export default function AuthPage() {
  const { user, profile, loading, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ phone: '', password: '', passwordConfirm: '', fullName: '', role: 'player' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const from = location.state?.from || '/'

  if (!loading && user && profile) {
    navigate(from, { replace: true })
    return null
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') {
        await signIn({ phone: form.phone, password: form.password })
      } else {
        await signUp(form)
      }
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-shell">
      <main className="page" style={{ paddingTop: '10vh' }}>
        <div className="center" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 34, fontWeight: 800 }}>Arena Go</div>
          <div className="muted">منصة كرة القدم في القرى</div>
        </div>

        <div className="tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError('') }}>
            تسجيل الدخول
          </button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setError('') }}>
            إنشاء حساب
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <ErrorBox>{error}</ErrorBox>

          {mode === 'signup' && (
            <>
              <div className="field">
                <label>الاسم الكامل</label>
                <input className="input" value={form.fullName} onChange={set('fullName')} placeholder="مثال: أحمد محمد" />
              </div>
              <div className="field">
                <label>نوع الحساب</label>
                <div className="row" style={{ gap: 8 }}>
                  <button type="button" className={`chip ${form.role === 'player' ? 'active' : ''}`} onClick={() => setForm((f) => ({ ...f, role: 'player' }))}>
                    ⚽ لاعب
                  </button>
                  <button type="button" className={`chip ${form.role === 'venue_owner' ? 'active' : ''}`} onClick={() => setForm((f) => ({ ...f, role: 'venue_owner' }))}>
                    🏟️ صاحب ملعب
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="field">
            <label>رقم الهاتف</label>
            <input
              className="input"
              type="tel"
              inputMode="tel"
              dir="ltr"
              value={form.phone}
              onChange={set('phone')}
              placeholder="09xxxxxxxx"
            />
            <div className="hint">يُستخدم رقم الهاتف لتسجيل الدخول — لا حاجة إلى بريد إلكتروني</div>
          </div>

          <div className="field">
            <label>كلمة المرور</label>
            <input className="input" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" />
          </div>

          {mode === 'signup' && (
            <div className="field">
              <label>تأكيد كلمة المرور</label>
              <input className="input" type="password" value={form.passwordConfirm} onChange={set('passwordConfirm')} placeholder="••••••••" />
            </div>
          )}

          <button className="btn block" disabled={busy}>
            {busy ? 'جارٍ المعالجة…' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}
          </button>
        </form>

        <p className="tiny center mt16">
          كلمات المرور مشفّرة ولا تُخزن كنص صريح — لا يظهر رقم هاتفك لأي مستخدم آخر.
        </p>
      </main>
    </div>
  )
}
