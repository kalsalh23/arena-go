import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// Unread count — RLS scopes rows to the signed-in user automatically.
// Polls as a fallback so the bell stays fresh even if realtime hiccups.
export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications-unread'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false)
      if (error) throw error
      return count ?? 0
    },
    refetchInterval: 25_000,
  })
}

// Realtime inserts for the signed-in user + browser notification via SW.
export function useNotificationsRealtime(userId, onNew) {
  const qc = useQueryClient()
  useEffect(() => {
    if (!userId) return
    const invalidate = () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notifications-unread'] })
    }
    const channel = supabase
      .channel('notifications-' + userId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          invalidate()
          const n = payload.new
          if (onNew) onNew(n)
          showBrowserNotification(n)
        }
      )
      .subscribe()

    // Keep everything fresh when the user returns to the app or connection resumes
    const onVisible = () => { if (document.visibilityState === 'visible') { invalidate(); supabase.realtime?.connPromise?.catch(() => {}) } }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', invalidate)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', invalidate)
      supabase.removeChannel(channel)
    }
  }, [userId, onNew, qc])
}

export async function showBrowserNotification(n) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    const reg = await navigator.serviceWorker?.getRegistration()
    const options = { body: n.body || '', icon: '/icons/icon-192.png', dir: 'rtl', data: n.data || {} }
    if (reg) reg.showNotification(n.title, options)
    else new Notification(n.title, options)
  } catch (_) {}
}

export async function enableBrowserNotifications() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.requestPermission()
}
