import Layout from '../../components/Layout'
import { useAuth } from '../../context/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

const BENEFITS = [
  { ic: '👥', t: 'الانضمام حتى 10 فرق', d: 'الخطة المجانية تتيح فريقين فقط — Premium يرفع الحد إلى 10 فرق.' },
  { ic: '★', t: 'شارة Premium', d: 'تظهر بجانب اسمك في كل الفرق والبطولات.' },
  { ic: '📊', t: 'إحصائيات موسعة', d: 'ملف شخصي أكثر تفصيلاً مع سجل مباريات أوسع.' },
  { ic: '🎁', t: 'مزايا مستقبلية', d: 'أولوية الوصول للمزايا الجديدة أولاً.' },
]

export default function PremiumPage() {
  const { profile } = useAuth()

  const { data: sub } = useQuery({
    queryKey: ['premium-until', profile?.id],
    queryFn: async () => profile?.premium_until || null,
    enabled: !!profile,
  })

  return (
    <Layout title="★ Premium Player">
      <div className="card center" style={{ padding: 26 }}>
        <div style={{ fontSize: 44 }}>★</div>
        <h2>خطة Premium Player</h2>
        <p className="muted">مزايا موسّعة للاعب المميز — قابلة للتوسع من لوحة الإدارة.</p>
        {profile?.is_premium && (
          <div className="ok-box center">
            مفعّلة لحسابك ✓ {sub ? `حتى ${new Date(sub).toLocaleDateString('ar-SY')}` : '(دائمة)'}
          </div>
        )}
      </div>

      {BENEFITS.map((b) => (
        <div key={b.t} className="card">
          <div className="row">
            <div style={{ fontSize: 24 }}>{b.ic}</div>
            <div>
              <div className="card-title">{b.t}</div>
              <div className="tiny">{b.d}</div>
            </div>
          </div>
        </div>
      ))}

      <div className="card">
        <div className="tiny">
          ℹ️ الاشتراك يُفعَّل حالياً عبر إدارة Arena Go. نظام الدفع الإلكتروني للاشتراكات سيُضاف لاحقاً.
        </div>
      </div>
    </Layout>
  )
}
