// Poll the latest Vercel deployment until READY/ERROR
const TOKEN = process.env.VERCEL_TOKEN
const PROJECT_ID = 'prj_xU1xp7IXwQUDRlmtDu9qwl40Mz5a'
const H = { Authorization: `Bearer ${TOKEN}` }

const deadline = Date.now() + 240_000
while (Date.now() < deadline) {
  const r = await fetch(`https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&limit=1`, { headers: H })
  const j = await r.json()
  const d = j.deployments?.[0]
  if (!d) {
    console.log('no deployment yet…')
  } else {
    console.log(`deployment ${d.uid} state=${d.readyState} url=${d.url}`)
    if (['READY', 'ERROR', 'CANCELED'].includes(d.readyState)) {
      if (d.readyState === 'READY') {
        console.log('PROD URL: https://arena-go.vercel.app (or alias assigned below)')
        const ar = await fetch(`https://api.vercel.com/v9/projects/${PROJECT_ID}/domains`, { headers: H })
        const aj = await ar.json()
        console.log('domains:', JSON.stringify(aj.domains?.map((x) => x.name) || aj))
      } else {
        // fetch failure reason
        const er = await fetch(`https://api.vercel.com/v13/deployments/${d.uid}`, { headers: H })
        const ej = await er.json()
        console.log('deployment error:', JSON.stringify(ej).slice(0, 800))
      }
      process.exit(d.readyState === 'READY' ? 0 : 1)
    }
  }
  await new Promise((res) => setTimeout(res, 8000))
}
console.log('timeout waiting for deployment')
process.exit(2)
