// Creates the system-admin account with a real email (kosaialsalh1@gmail.com).
// The signup trigger requires a phone, so we seed a reserved placeholder phone,
// then promote the profile to role='admin'. Safe to re-run (idempotent).
const SUPABASE_URL = 'https://bptovjzwozkbsmjdmqfd.supabase.co'
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
if (!TOKEN) { console.error('set SUPABASE_ACCESS_TOKEN'); process.exit(1) }

const EMAIL = 'kosaialsalh1@gmail.com'
const PASSWORD = 'Oday2001#'
const PHONE = '963900000002' // reserved placeholder for the super-admin profile

async function db(sql) {
  const r = await fetch('https://api.supabase.com/v1/projects/bptovjzwozkbsmjdmqfd/database/query', {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  const t = await r.text()
  if (r.status !== 200 && r.status !== 201) throw new Error('db: ' + t.slice(0, 300))
  return t ? JSON.parse(t) : []
}

// 1. already exists?
const existing = await db(`select id from auth.users where email = '${EMAIL}'`)
let uid
if (existing.length > 0) {
  uid = existing[0].id
  console.log('user exists:', uid)
} else {
  const inserted = await db(`
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new, is_sso_user
  ) values (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    '${EMAIL}', crypt('${PASSWORD.replace(/'/g, "''")}', gen_salt('bf', 10)), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('phone', '${PHONE}', 'full_name', 'مدير النظام', 'role', 'player'),
    now(), now(), '', '', '', '', false
  ) returning id`)
  uid = inserted[0].id
  await db(`
  insert into auth.identities (id, user_id, provider_id, identity_data, last_sign_in_at, created_at, updated_at, provider)
  values (gen_random_uuid(), '${uid}', '${uid}',
    jsonb_build_object('sub', '${uid}', 'email', '${EMAIL}', 'email_verified', true),
    now(), now(), now(), 'email')`)
  console.log('user created:', uid)
}

// 2. promote to admin
const res = await db(`update public.profiles set role='admin', full_name='مدير النظام' where id='${uid}' returning id, role`)
console.log('profile:', JSON.stringify(res))
console.log('DONE — login via email on the auth page (choose تسجيل بالبريد) or phone field with the email.')
