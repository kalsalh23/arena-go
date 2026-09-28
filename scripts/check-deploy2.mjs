// Poll a specific Vercel project's latest deployment until READY/ERROR
const TOKEN = process.env.VERCEL_TOKEN
const PROJECT_ID = process.argv[2] || 'prj_xU1xp7IXwQUDRlmtDu9qwl40Mz5a'
const H = { Authorization: `Bearer ${TOKEN}` }

const deadline = Date.now() + 300_000
while (Date.now() < deadline) {
  const r = await fetch(`https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&limit=1`, { headers: H })
  const j = await r.json()
  const d = j.deployments?.[0]
  if (!d) {
    console.log('no deployment yet…')
  } else {
    console.log(`deployment ${d.uid} state=${d.readyState} url=${d.url}`)
    if (['READY', 'ERROR', 'CANCELED'].includes(d.readyState)) {
      if (d.readyState !== 'READY') {
        const er = await fetch(`https://api.vercel.com/v13/deployments/${d.uid}`, { headers: H })
        console.log('error details:', JSON.stringify(await er.json()).slice(0, 800))
      }
      process.exit(d.readyState === 'READY' ? 0 : 1)
    }
  }
  await new Promise((res) => setTimeout(res, 8000))
}
console.log('timeout waiting for deployment')
process.exit(2)
