import Layout from '../../components/Layout'
import Icon from '../../components/Icon'
import { DEVELOPER } from '../../lib/developer'

const waLink = (phone, text) => `https://wa.me/${phone.replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`

export default function AboutPage() {
  const d = DEVELOPER
  return (
    <Layout title="من نحن">
      <div className="profile-hero center">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
          <div className="ball-wrap" style={{ width: 54, height: 54, borderRadius: 17, background: 'rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="ball" size={28} />
          </div>
        </div>
        <h2 style={{ margin: '0 0 4px' }}>Arena Go</h2>
        <div style={{ fontSize: 13, opacity: 0.85 }}>منصة كرة القدم في القرى والبلدات</div>
      </div>

      <div className="card">
        <div className="card-title"><Icon name="info" size={17} /> من نحن</div>
        <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>
          {`Arena Go منصة متخصصة حصرياً في كرة القدم، تجمع في مكان واحد:
⚽ الفرق واللاعبين في قريتك
🏟️ حجز الملاعب بسهولة مع الدفع عبر شام كاش
🏆 البطولات من التنظيم حتى التتويج: طلبات المشاركة، القرعة العشوائية الآمنة، الترتيب والهدافين
📅 المباريات والنتائج لحظة بلحظة مع الإشعارات

هدفنا أن نحوّل كرة القدم القروية إلى تجربة منظمة واحترافية — من طيبة الإمام وصوران إلى كل قرية وبلدة.`}
        </p>
      </div>

      <div className="card">
        <div className="card-title"><Icon name="shield" size={17} /> تفاصيل عنا</div>
        <div className="kv"><span className="k"><Icon name="flag" size={16} /> نطاق العمل</span><span className="v">ريف حماة وجميع القرى</span></div>
        <div className="kv"><span className="k"><Icon name="ball" size={16} /> التخصص</span><span className="v">كرة القدم فقط</span></div>
        <div className="kv"><span className="k"><Icon name="users" size={16} /> المجتمع</span><span className="v">لاعبون، فرق، أصحاب ملاعب</span></div>
        <div className="kv"><span className="k"><Icon name="card" size={16} /> الدفع</span><span className="v">شام كاش</span></div>
      </div>

      <div className="section">
        <div className="section-head"><h2><Icon name="user" size={17} /> مطوّر المنصة</h2></div>
        <div className="dev-card">
          <div className="dev-avatar"><Icon name="user" size={30} /></div>
          <div style={{ fontWeight: 900, fontSize: 17 }}>{d.name}</div>
          <div style={{ fontSize: 12.5, opacity: 0.8, marginTop: 2 }}>{d.title}</div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>{d.note}</div>
          <div className="socials">
            {d.whatsapp && (
              <a href={waLink(d.whatsapp, 'مرحباً، أتواصل معكم بخصوص منصة Arena Go')} target="_blank" rel="noreferrer" aria-label="واتساب">
                <Icon name="whatsapp" size={20} />
              </a>
            )}
            {d.phone && (
              <a href={`tel:+${d.phone}`} aria-label="هاتف">
                <Icon name="phone" size={19} />
              </a>
            )}
            {d.telegram && (
              <a href={`https://t.me/${d.telegram}`} target="_blank" rel="noreferrer" aria-label="تيليغرام">
                <Icon name="telegram" size={20} />
              </a>
            )}
            {d.instagram && (
              <a href={`https://instagram.com/${d.instagram}`} target="_blank" rel="noreferrer" aria-label="إنستغرام">
                <Icon name="instagram" size={19} />
              </a>
            )}
            {d.website && (
              <a href={d.website} target="_blank" rel="noreferrer" aria-label="الموقع">
                <Icon name="globe" size={19} />
              </a>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
