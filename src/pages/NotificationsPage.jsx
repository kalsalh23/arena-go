import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Layout from '../components/Layout'
import { Spinner, Empty } from '../components/ui'
import { supabase } from '../lib/supabase'
import { dateTimeAr } from '../lib/constants'

export default function NotificationsPage() {
  const qc = useQueryClient()

  const notifications = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data
    },
  })

  const markRead = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notifications-unread'] })
    },
  })

  const markAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('is_read', false)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notifications-unread'] })
    },
  })

  return (
    <Layout title="🔔 الإشعارات" headerRight={
      notifications.data?.some((n) => !n.is_read) && (
        <button className="btn sm outline" onClick={() => markAll.mutate()}>تعليم الكل كمقروء</button>
      )
    }>
      {notifications.isLoading ? <Spinner /> : notifications.data?.length === 0 ? <Empty icon="🔔" text="لا إشعارات بعد" /> : (
        <div className="card">
          {notifications.data.map((n) => (
            <div key={n.id} className={`notif ${n.is_read ? '' : 'unread'}`} onClick={() => !n.is_read && markRead.mutate(n.id)} style={{ cursor: n.is_read ? 'default' : 'pointer' }}>
              <div style={{ flex: 1 }}>
                <div className="t">{n.title}</div>
                {n.body && <div className="b">{n.body}</div>}
                <div className="tiny">{dateTimeAr(n.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
