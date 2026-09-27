import { useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { useNotificationsRealtime, enableBrowserNotifications } from '../hooks/notifications'

// Wires realtime notifications to the session and refreshes caches on auth changes.
export function AuthRealtimeBridge({ children }) {
  const { user, session } = useAuth()
  const qc = useQueryClient()
  const onNew = useCallback(() => {}, [])
  useNotificationsRealtime(user?.id, onNew)

  useEffect(() => {
    if (session?.user && 'Notification' in window && Notification.permission === 'default') {
      enableBrowserNotifications()
    }
    qc.invalidateQueries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  return children
}
