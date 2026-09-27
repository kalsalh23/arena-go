const TOKEN = process.env.GH_TOKEN
if (!TOKEN) { console.error('set GH_TOKEN'); process.exit(1) }
let r = await fetch('https://api.github.com/repos/kalsalh23/arena-go', {
  headers: { Authorization: 'Bearer ' + TOKEN, Accept: 'application/vnd.github+json' },
})
console.log('repo exists check:', r.status)
if (r.status === 404) {
  r = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'arena-go', description: 'Arena Go — football platform for villages: venues, teams, tournaments', private: false, auto_init: false }),
  })
  console.log('create repo:', r.status, (await r.text()).slice(0, 300))
}
