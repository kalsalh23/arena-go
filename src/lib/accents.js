// Simple per-venue accent: each venue gets a stable color so its cards
// are visually distinct across lists (derived from the venue id).
const ACCENTS = [
  { name: 'أخضر', main: '#12864a', soft: '#e7f4ec' },
  { name: 'أزرق', main: '#1d6fb8', soft: '#e6f0fa' },
  { name: 'برتقالي', main: '#c07818', soft: '#fdf3df' },
  { name: 'أحمر', main: '#c2415c', soft: '#fdeaee' },
  { name: 'بنفسجي', main: '#7146c9', soft: '#efe9fc' },
]

export function accentFor(id) {
  if (!id) return ACCENTS[0]
  let h = 0
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) | 0
  return ACCENTS[Math.abs(h) % ACCENTS.length]
}
