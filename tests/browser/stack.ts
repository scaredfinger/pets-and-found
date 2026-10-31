import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { createServer } from 'node:net'

const backendPort = process.env.E2E_BACKEND_PORT || '4318'
const websitePort = process.env.E2E_WEBSITE_PORT || '4317'
const backendUrl = 'http://127.0.0.1:' + backendPort
const websiteUrl = 'http://127.0.0.1:' + websitePort
const children: ChildProcess[] = []
let stopping = false

function stop(): void {
  if (stopping) return
  stopping = true
  for (const child of children) child.kill('SIGTERM')
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => {
  stop()
  process.exitCode = signal === 'SIGINT' ? 130 : 143
})

async function waitFor(url: string, child: ChildProcess): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error(`Service exited before readiness: ${url}`)
    try {
      if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return
    } catch {}
    await delay(200)
  }
  throw new Error(`Service did not become ready: ${url}`)
}

function start(file: string, env: Record<string, string>): ChildProcess {
  const child = spawn(process.execPath, ['--import', 'tsx', file], {
    env: { ...process.env, ...env },
    stdio: 'inherit'
  })
  children.push(child)
  child.on('error', error => { console.error(error); stop(); process.exitCode = 1 })
  child.on('exit', code => {
    if (!stopping) { console.error(`Service exited unexpectedly: ${file} (${code})`); stop(); process.exitCode = 1 }
  })
  return child
}

try {
  await new Promise<void>((resolve, reject) => {
    const probe = createServer()
    probe.once('error', reject)
    probe.listen(Number(backendPort), '127.0.0.1', () => probe.close(error => error ? reject(error) : resolve()))
  })
  const migration = spawnSync('pnpm', ['db:migrate'], { stdio: 'inherit', env: process.env })
  if (migration.status !== 0) throw new Error('Database migration failed')
  const backend = start('apps/backend/src/main.ts', { BACKEND_PORT: backendPort })
  await waitFor(backendUrl + '/ready', backend)
  const website = start('apps/website/src/main.ts', { WEBSITE_PORT: websitePort, BACKEND_URL: backendUrl })
  await waitFor(websiteUrl, website)
  console.log('Browser test stack ready')
} catch (error) {
  console.error(error)
  stop()
  process.exitCode = 1
}
