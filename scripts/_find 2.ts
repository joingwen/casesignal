import postgres from 'postgres'

const REF = 'knussakamrfspaeqwayo'
const PW = encodeURIComponent('Vishal!@#123')
const REGIONS = [
  'ap-southeast-1', 'ap-southeast-2', 'ap-south-1', 'ap-northeast-1',
  'us-east-1', 'us-east-2', 'us-west-1', 'eu-central-1', 'eu-west-1', 'eu-west-2',
]

async function tryUrl(url: string) {
  const sql = postgres(url, { max: 1, connect_timeout: 8, idle_timeout: 2, prepare: false, onnotice: () => {} })
  try {
    const r = await sql`select current_database() as db`
    await sql.end({ timeout: 2 })
    return { ok: true as const, db: String(r[0]!.db) }
  } catch (e) {
    await sql.end({ timeout: 1 }).catch(() => {})
    return { ok: false as const, err: (e as Error).message.split('\n')[0].slice(0, 70) }
  }
}

async function main() {
  const direct = `postgresql://postgres:${PW}@db.${REF}.supabase.co:5432/postgres`
  const d = await tryUrl(direct)
  console.log(`direct (IPv6)            : ${d.ok ? 'CONNECTED ✓ ' + d.db : 'failed — ' + d.err}`)

  for (const region of REGIONS) {
    const host = `aws-0-${region}.pooler.supabase.com`
    const r = await tryUrl(`postgresql://postgres.${REF}:${PW}@${host}:6543/postgres`)
    if (r.ok) { console.log(`POOLER ${region.padEnd(16)} : CONNECTED ✓  db=${r.db}`); return }
    console.log(`pooler ${region.padEnd(16)} : ${r.err}`)
  }
}
main()
