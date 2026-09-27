// Applies supabase/migrations/*.sql to the project via the Supabase Management API.
// Usage: node scripts/apply-migrations.mjs [file1.sql file2.sql ...]   (default: all in order)
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const PROJECT_REF = 'bptovjzwozkbsmjdmqfd'
const TOKEN = process.argv[2] && process.argv[2].startsWith('sbp_') ? process.argv[2] : process.env.SUPABASE_ACCESS_TOKEN

if (!TOKEN) {
  console.error('Missing Supabase access token (arg or SUPABASE_ACCESS_TOKEN)')
  process.exit(1)
}

const args = process.argv.slice(3)
const dir = join(process.cwd(), 'supabase', 'migrations')
const files = args.length
  ? args
  : readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()

for (const file of files) {
  const sql = readFileSync(join(dir, file), 'utf8')
  process.stdout.write(`Applying ${file} ... `)
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  const body = await res.text()
  if (!res.ok) {
    console.log('FAILED')
    console.error(`Status ${res.status}: ${body}`)
    process.exit(1)
  }
  console.log('OK')
}
console.log('All migrations applied.')
