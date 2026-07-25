/**
 * Writes the Supabase connection strings into .env.local and
 * vercel-production.env without the password passing through a chat transcript
 * or your shell history.
 *
 *   node scripts/set-db-url.mjs
 *
 * It prompts for the password with echo disabled, percent-encodes it (Supabase
 * passwords frequently contain characters that are not URL-safe), and fills in
 * both the pooled and direct connection strings.
 */
import fs from 'node:fs'
import readline from 'node:readline'

const PROJECT_REF = 'knussakamrfspaeqwayo'
const FILES = ['.env.local', 'vercel-production.env']

function ask(question, { silent = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    if (silent) {
      // Suppress echo so the password is never rendered to the terminal.
      rl.output.write(question)
      const onData = (char) => {
        if (['\n', '\r', ''].includes(char.toString())) return
        readline.moveCursor(rl.output, -1, 0)
        readline.clearLine(rl.output, 1)
      }
      process.stdin.on('data', onData)
      rl.question('', (answer) => {
        process.stdin.removeListener('data', onData)
        rl.output.write('\n')
        rl.close()
        resolve(answer)
      })
      return
    }
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

function setVar(contents, key, value) {
  const line = `${key}=${value}`
  return new RegExp(`^${key}=.*$`, 'm').test(contents)
    ? contents.replace(new RegExp(`^${key}=.*$`, 'm'), line)
    : `${contents.replace(/\s*$/, '\n')}${line}\n`
}

const password = (await ask('Supabase database password: ', { silent: true })).trim()
if (!password) {
  console.error('\nNo password entered. Nothing was changed.')
  process.exit(1)
}

console.log(
  '\nPooler host — copy it from Supabase → Project Settings → Database → Connection pooling.',
)
console.log('It looks like: aws-0-ap-southeast-1.pooler.supabase.com')
const poolerHost = (await ask('Pooler host: ')).trim()
if (!/^[a-z0-9.-]+\.pooler\.supabase\.com$/i.test(poolerHost)) {
  console.error('That does not look like a pooler host. Nothing was changed.')
  process.exit(1)
}

// Percent-encode: Supabase generates passwords containing @ : / ? # & and more,
// every one of which changes how a connection URI parses.
const encoded = encodeURIComponent(password)

const pooled = `postgresql://postgres.${PROJECT_REF}:${encoded}@${poolerHost}:6543/postgres`
const direct = `postgresql://postgres:${encoded}@db.${PROJECT_REF}.supabase.co:5432/postgres`

for (const file of FILES) {
  if (!fs.existsSync(file)) continue
  let contents = fs.readFileSync(file, 'utf8')
  contents = setVar(contents, 'DATABASE_URL', pooled)
  contents = setVar(contents, 'DIRECT_URL', direct)
  fs.writeFileSync(file, contents)
  console.log(`updated ${file}`)
}

console.log('\nDone. The password was not printed and is not in your shell history.')
console.log('Next:  npm run db:migrate')
