import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'

const inDevcontainer = existsSync('/.dockerenv')
const databaseUrl = process.env.DATABASE_URL || (inDevcontainer ? 'postgresql://scaffold:scaffold@host.docker.internal:55432/scaffold' : undefined)
const environment = { ...process.env, ...(databaseUrl ? { DATABASE_URL: databaseUrl } : {}) }

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options })
    child.once('error', reject)
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} exited ${code}`)))
  })
}

await run('pnpm', ['db:up'], { env: { ...environment, ...(inDevcontainer ? { DB_BIND_ADDRESS: '0.0.0.0' } : {}) } })
await run('pnpm', ['db:migrate'], { env: environment })

const processes = [
  spawn('pnpm', ['dev:backend'], { stdio: 'inherit', env: environment }),
  spawn('pnpm', ['dev:website'], { stdio: 'inherit', env: environment })
]

let stopping = false
function stop(code, afterSignal = false) {
  if (stopping) return
  stopping = true
  const terminate = () => {
    for (const child of processes) {
      if (child.exitCode === null) child.kill('SIGTERM')
    }
  }
  if (afterSignal) setTimeout(terminate, 1000).unref()
  else terminate()
  process.exitCode = code
}

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop(0, true))
for (const child of processes) {
  child.once('error', () => stop(1))
  child.once('exit', code => stop(code ?? 1))
}
