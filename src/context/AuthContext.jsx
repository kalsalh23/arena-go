import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { normalizePhone, isValidPhone, phoneToEmail } from '../lib/phone'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (uid) => {
    if (!uid) return setProfile(null)
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
    if (!error) setProfile(data)
    return data
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      loadProfile(data.session?.user?.id).finally(() => setLoading(false))
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      loadProfile(s?.user?.id)
    })
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  const signUp = useCallback(async ({ phone: rawPhone, password, passwordConfirm, fullName, role }) => {
    const phone = normalizePhone(rawPhone)
    if (!isValidPhone(phone)) throw new Error('صيغة رقم الهاتف غير صحيحة (مثال: 09xxxxxxxx)')
    if (!password || password.length < 6) throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
    if (password !== passwordConfirm) throw new Error('كلمتا المرور غير متطابقتين')
    if (!fullName || fullName.trim().length < 2) throw new Error('أدخل اسمك الكامل')

    const { data: available } = await supabase.rpc('check_phone_available', { p_phone: phone })
    if (available === false) throw new Error('رقم الهاتف مسجل مسبقاً')

    const { data, error } = await supabase.auth.signUp({
      email: phoneToEmail(phone),
      password,
      options: { data: { phone, full_name: fullName.trim(), role: role === 'venue_owner' ? 'venue_owner' : 'player' } },
    })
    if (error) throw new Error(translateAuthError(error.message))
    await loadProfile(data.user?.id)
    return data
  }, [loadProfile])

  const signIn = useCallback(async ({ phone: rawPhone, password }) => {
    const phone = normalizePhone(rawPhone)
    if (!isValidPhone(phone)) throw new Error('صيغة رقم الهاتف غير صحيحة (مثال: 09xxxxxxxx)')
    if (!password) throw new Error('أدخل كلمة المرور')
    const { data, error } = await supabase.auth.signInWithPassword({
      email: phoneToEmail(phone),
      password,
    })
    if (error) throw new Error(translateAuthError(error.message))
    await loadProfile(data.user?.id)
    return data
  }, [loadProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setSession(null)
  }, [])

  const refreshProfile = useCallback(() => loadProfile(session?.user?.id), [loadProfile, session])

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, signUp, signIn, signOut, refreshProfile, isAdmin: profile?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

function translateAuthError(msg) {
  if (!msg) return 'حدث خطأ غير متوقع'
  const m = msg.toLowerCase()
  if (m.includes('invalid login credentials')) return 'رقم الهاتف أو كلمة المرور غير صحيحة'
  if (m.includes('رقم الهاتف مسجل')) return 'رقم الهاتف مسجل مسبقاً'
  if (m.includes('rate limit')) return 'محاولات كثيرة، انتظر قليلاً ثم أعد المحاولة'
  if (m.includes('phone')) return msg
  return msg
}
