// Verify deployed static assets return 200
const base = 'https://arena-go-one.vercel.app'
for (const p of ['/demo/splash-stars.jpg', '/demo/real/v1-1.jpg', '/demo/real/v2-2.jpg', '/demo/real/v3-1.jpg']) {
  const r = await fetch(base + p, { method: 'HEAD' })
  console.log(r.status, p)
}
