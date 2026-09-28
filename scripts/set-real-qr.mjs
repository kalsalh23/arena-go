// Attach the real Sham Cash QR (حكومات مدينة الخالد) to the demo venues.
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
if (!TOKEN) { console.error('set SUPABASE_ACCESS_TOKEN'); process.exit(1) }
const r = await fetch('https://api.supabase.com/v1/projects/bptovjzwozkbsmjdmqfd/database/query', {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `update public.venues
            set shamcash_qr_url = '/shamcash/khaled-city.jpg',
                shamcash_name = 'حكومات مدينة الخالد',
                shamcash_number = '0b4b947393d6210a44fa022ab37107c9'
            where owner_id in (select user_id from public.user_phones where phone = '963900000021')
            returning id, name, shamcash_name;`,
  }),
})
console.log(r.status, await r.text())
