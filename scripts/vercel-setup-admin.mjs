// Creates the SEPARATE admin-panel Vercel project (arena-go-admin) from the same
// GitHub repo, with VITE_ADMIN_ENTRY=admin so it boots into the admin panel only.
const TOKEN = process.env.VERCEL_TOKEN
if (!TOKEN) { console.error('set VERCEL_TOKEN'); process.exit(1) }
const H = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }

const SUPA_URL = 'https://bptovjzwozkbsmjdmqfd.supabase.co'
const SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwdG92anp3b3prYnNtamRtcWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0Njc0MjUsImV4cCI6MjEwNjA0MzQyNX0.8BFRiyhEC_Oo6kLkOedMYiP2tQxo5un3BK0GD-GPawE'

let r = await fetch('https://api.vercel.com/v9/projects', {
  method: 'POST',
  headers: H,
  body: JSON.stringify({
    name: 'arena-go-admin',
    framework: 'vite',
    gitRepository: { type: 'github', repo: 'kalsalh23/arena-go' },
  }),
})
const text = await r.text()
console.log('create admin project:', r.status, text.slice(0, 200))
let project
try { project = JSON.parse(text) } catch {}
if (!project?.id) {
  r = await fetch('https://api.vercel.com/v9/projects/arena-go-admin', { headers: H })
  project = await r.json()
  console.log('lookup:', r.status, project.id || JSON.stringify(project).slice(0, 200))
}
if (!project?.id) process.exit(1)

for (const [key, value] of [
  ['VITE_SUPABASE_URL', SUPA_URL],
  ['VITE_SUPABASE_ANON_KEY', SUPA_ANON],
  ['VITE_ADMIN_ENTRY', 'admin'],
]) {
  const er = await fetch(`https://api.vercel.com/v9/projects/${project.id}/env?upsert=true`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ key, value, type: 'encrypted', target: ['production', 'preview', 'development'] }),
  })
  console.log('env', key, ':', er.status)
}

const ar = await fetch(`https://api.vercel.com/v9/projects/${project.id}/domains`, { headers: H })
const aj = await ar.json()
console.log('ADMIN PROJECT_ID=' + project.id)
console.log('ADMIN DOMAINS:', JSON.stringify(aj.domains?.map((x) => x.name) || aj))
