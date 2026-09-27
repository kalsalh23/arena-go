// Phone normalization: accept local/extra formats, store canonical 9639XXXXXXXX
export function normalizePhone(raw) {
  if (!raw) return ''
  let d = String(raw).replace(/\D+/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('963')) return d
  if (d.startsWith('09') && d.length === 10) return '963' + d.slice(1)
  if (d.startsWith('9') && d.length === 9) return '963' + d
  return d
}

export function isValidPhone(p) {
  return /^9639\d{8}$/.test(p || '')
}

// Supabase auth uses a synthetic email derived from the phone; real phone lives in DB.
export function phoneToEmail(phone) {
  return `${phone}@phone.arenago.app`
}

export function displayPhone(p) {
  return p ? `+${p}` : ''
}
