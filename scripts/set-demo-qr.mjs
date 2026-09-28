// One-off: attach the demo QR to the demo venues.
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
if (!TOKEN) { console.error('set SUPABASE_ACCESS_TOKEN'); process.exit(1) }
const r = await fetch('https://api.supabase.com/v1/projects/bptovjzwozkbsmjdmqfd/database/query', {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `update public.venues set shamcash_qr_url = '/demo/qr-shamcash.svg'
            where owner_id in (select user_id from public.user_phones where phone = '963900000021')
            returning id, name, shamcash_qr_url;`,
  }),
})
console.log(r.status, await r.text())
