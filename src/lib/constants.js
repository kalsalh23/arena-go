// Money convention: 1 stored unit = 100 SYP  (600 => 60,000 ل.س)
// Integers only — never floating point.
export function syp(units) {
  const v = Math.round(Number(units || 0) * 100)
  return v.toLocaleString('en-US')
}

export function sypText(units) {
  return `${syp(units)} ل.س`
}

export const VENUE_TYPES = {
  f5: 'ملعب 5×5',
  f7: 'ملعب 7×7',
  f11: 'ملعب 11×11',
}

export const TOURNAMENT_TYPE_LABELS = {
  groups: 'مجموعات',
  knockout: 'خروج مغلق',
  groups_knockout: 'مجموعات + خروج مغلق',
}

export const TOURNAMENT_STATUS_LABELS = {
  draft: 'مسودة',
  pending_admin_approval: 'بانتظار موافقة الإدارة',
  rejected: 'مرفوضة',
  approved: 'مقبولة',
  registration_open: 'التسجيل مفتوح',
  full: 'اكتمل العدد',
  draw_pending: 'بانتظار القرعة',
  draw_completed: 'اكتملت القرعة',
  ongoing: 'جارية',
  completed: 'منتهية',
  cancelled: 'ملغاة',
}

export const BOOKING_STATUS_LABELS = {
  pending_review: 'بانتظار المراجعة',
  confirmed: 'مؤكد',
  rejected: 'مرفوض',
  cancelled: 'ملغى',
  completed: 'منتهي',
}

export const PAYMENT_STATUS_LABELS = {
  unpaid: 'غير مدفوع',
  deposit_paid: 'عربون مدفوع',
  paid: 'مدفوع بالكامل',
  refunded: 'مسترد',
}

export const ROUND_NAMES = {
  1: 'الدور الأول',
  2: 'الدور الثاني',
}

export function roundName(round, maxRound) {
  if (maxRound && round === maxRound) return 'النهائي'
  if (maxRound && round === maxRound - 1) return 'نصف النهائي'
  if (maxRound && round === maxRound - 2) return 'ربع النهائي'
  return `الدور ${round}`
}

export function timeAr(t) {
  if (!t) return '—'
  const [h, m] = String(t).split(':')
  const hour = parseInt(h, 10)
  const period = hour < 12 ? 'صباحاً' : 'مساءً'
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${h12}:${m} ${period}`
}

export function dateAr(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('ar-SY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

export function dateTimeAr(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('ar-SY', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
