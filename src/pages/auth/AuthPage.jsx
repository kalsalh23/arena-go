import { useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ErrorBox } from '../../components/ui'
import Icon from '../../components/Icon'

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
      <main className="page" style={{ paddingTop: 24 }}>
        <div className="auth-hero">
          <div className="ball-wrap"><Icon name="ball" size={30} /></div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>Arena Go</div>
          <div style={{ fontSize: 13, opacity: 0.85 }}>منصة كرة القدم في القرى</div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <h2 style={{ textAlign: 'center', fontSize: 17 }}>
            {mode === 'login' ? 'مرحباً بعودتك 👋' : 'إنشاء حساب جديد'}
          </h2>
          <p className="tiny center" style={{ marginBottom: 14 }}>
            {mode === 'login' ? 'سجّل الدخول برقم هاتفك وكلمة المرور' : 'دقائق وتصبح جزءاً من مجتمع Arena Go'}
          </p>

          <form onSubmit={onSubmit}>
            <ErrorBox>{error}</ErrorBox>

            {mode === 'signup' && (
              <div className="field">
                <label>الاسم الكامل</label>
                <input className="input" value={form.fullName} onChange={set('fullName')} placeholder="مثال: أحمد محمد" />
              </div>
            )}

            <div className="field">
              <label>رقم الهاتف</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type="text"
                  inputMode="tel"
                  dir="ltr"
                  style={{ paddingInlineStart: 40 }}
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder={mode === 'login' ? '09xxxxxxxx / email' : '09xxxxxxxx'}
                />
                <Icon name="phone" size={17} style={{ position: 'absolute', top: 13, insetInlineStart: 13, color: 'var(--text-3)' }} />
              </div>
              <div className="hint">رقم الهاتف أو البريد الإلكتروني (لإدارة المنصة)</div>
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

            <button className="btn block lg" disabled={busy}>
              {busy ? 'جارٍ المعالجة…' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}
            </button>
          </form>

          <p className="center" style={{ margin: '14px 0 0', fontSize: 13, color: 'var(--text-2)' }}>
            {mode === 'login' ? 'ليس لديك حساب؟ ' : 'لديك حساب بالفعل؟ '}
            <button
              className="chip"
              style={{ padding: '4px 12px' }}
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
            >
              {mode === 'login' ? 'إنشاء حساب' : 'تسجيل الدخول'}
            </button>
          </p>
        </div>

        <p className="tiny center mt16">
          كلمات المرور مشفّرة ولا تُخزن كنص صريح — لا يظهر رقم هاتفك لأي مستخدم آخر.
        </p>
        <p className="center mt8">
          <Link to="/about" className="chip"><Icon name="info" size={14} /> من نحن</Link>
        </p>
      </main>
    </div>
  )
}
