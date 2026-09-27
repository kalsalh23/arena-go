// Creates/updates the Vercel project with env vars.
const TOKEN = process.env.VERCEL_TOKEN
if (!TOKEN) { console.error('set VERCEL_TOKEN'); process.exit(1) }
const H = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }

// 1. try to create the project (git-connected if integration available)
let r = await fetch('https://api.vercel.com/v9/projects', {
  method: 'POST',
  headers: H,
  body: JSON.stringify({
    name: 'arena-go',
    framework: 'vite',
    gitRepository: { type: 'github', repo: 'kalsalh23/arena-go' },
  }),
})
const text = await r.text()
console.log('create project:', r.status, text.slice(0, 300))
let project
try { project = JSON.parse(text) } catch {}
if (!project?.id) {
  // maybe it already exists
  r = await fetch('https://api.vercel.com/v9/projects/arena-go', { headers: H })
  project = await r.json()
  console.log('lookup project:', r.status, project.id ? project.id : JSON.stringify(project).slice(0, 200))
}
if (!project?.id) process.exit(1)

// 2. env vars
const SUPA_URL = 'https://bptovjzwozkbsmjdmqfd.supabase.co'
const SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwdG92anp3b3prYnNtamRtcWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0Njc0MjUsImV4cCI6MjEwNjA0MzQyNX0.8BFRiyhEC_Oo6kLkOedMYiP2tQxo5un3BK0GD-GPawE'
for (const [key, value] of [
  ['VITE_SUPABASE_URL', SUPA_URL],
  ['VITE_SUPABASE_ANON_KEY', SUPA_ANON],
]) {
  const er = await fetch(`https://api.vercel.com/v9/projects/${project.id}/env?upsert=true`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ key, value, type: 'encrypted', target: ['production', 'preview', 'development'] }),
  })
  console.log('env', key, ':', er.status, (await er.text()).slice(0, 120))
}
console.log('PROJECT_ID=' + project.id)
