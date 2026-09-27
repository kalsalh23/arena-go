import Layout from '../../components/Layout'
import Icon from '../../components/Icon'
import { useAuth } from '../../context/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

const BENEFITS = [
  { ic: 'users', t: 'الانضمام حتى 10 فرق', d: 'الخطة المجانية تتيح فريقين فقط — Premium يرفع الحد إلى 10 فرق.' },
  { ic: 'star', t: 'شارة Premium', d: 'تظهر بجانب اسمك في كل الفرق والبطولات.' },
  { ic: 'trophy', t: 'إحصائيات موسعة', d: 'ملف شخصي أكثر تفصيلاً مع سجل مباريات أوسع.' },
  { ic: 'gift', t: 'مزايا مستقبلية', d: 'أولوية الوصول للمزايا الجديدة أولاً.' },
]

export default function PremiumPage() {
  const { profile } = useAuth()

  const { data: sub } = useQuery({
    queryKey: ['premium-until', profile?.id],
    queryFn: async () => profile?.premium_until || null,
    enabled: !!profile,
  })

  return (
    <Layout title="Premium Player" titleIcon="star">
      <div className="profile-hero center">
        <div style={{ position: 'relative' }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, margin: '0 auto 10px', background: 'rgba(255,255,255,0.14)', border: '1.5px solid rgba(201,155,46,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)' }}>
            <Icon name="star" size={30} />
          </div>
          <h2 style={{ margin: 0 }}>خطة Premium Player</h2>
          <div style={{ fontSize: 12.5, opacity: 0.85 }}>مزايا موسّعة للاعب المميز — قابلة للتوسع من لوحة الإدارة</div>
          {profile?.is_premium && (
            <div style={{ marginTop: 12, display: 'inline-block' }} className="badge gold">
              مفعّلة لحسابك ✓ {sub ? `حتى ${new Date(sub).toLocaleDateString('ar-SY')}` : '(دائمة)'}
            </div>
          )}
        </div>
      </div>

      {BENEFITS.map((b) => (
        <div key={b.t} className="card" style={{ padding: 13 }}>
          <div className="row">
            <div className="tile-ic" style={{ margin: 0 }}><Icon name={b.ic} size={20} /></div>
            <div>
              <div className="card-title" style={{ fontSize: 14 }}>{b.t}</div>
              <div className="tiny">{b.d}</div>
            </div>
          </div>
        </div>
      ))}

      <div className="card">
        <div className="tiny">
          <Icon name="info" size={13} /> الاشتراك يُفعَّل حالياً عبر إدارة Arena Go. نظام الدفع الإلكتروني للاشتراكات سيُضاف لاحقاً.
        </div>
      </div>
    </Layout>
  )
}
