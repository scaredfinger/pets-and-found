import { strict as assert } from 'node:assert'
import { spawn, type ChildProcess } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { createServer, connect, type Socket } from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { Then } from '@cucumber/cucumber'
import { createDatabase, databaseUrl, migrate } from '@scaffold/db'

const root = fileURLToPath(new URL('../../../', import.meta.url))

Then('the backend recovers from a terminated idle connection and a temporary database outage', { timeout: 60000 }, async function () {
  const suffix = randomBytes(12).toString('hex')
  const schema = 'test_' + suffix
  const application = 'scaffold_idle_' + suffix
  const source = new URL(databaseUrl())
  const admin = createDatabase()
  const sockets = new Set<Socket>()
  let blocked = false
  let child: ChildProcess | undefined
  let spawnError: Error | undefined
  let output = ''
  let created = false
  const proxy = createServer(client => {
    if (blocked) { client.destroy(); return }
    const upstream = connect(Number(source.port || 5432), source.hostname)
    sockets.add(client)
    sockets.add(upstream)
    client.on('error', () => upstream.destroy())
    upstream.on('error', () => client.destroy())
    client.on('close', () => { sockets.delete(client); upstream.destroy() })
    upstream.on('close', () => { sockets.delete(upstream); client.destroy() })
    client.pipe(upstream).pipe(client)
  })
  const ensureAlive = () => {
    if (spawnError) throw new Error('Backend spawn failed', { cause: spawnError })
    if (!child) throw new Error('Backend not started')
    if (child.signalCode !== null) throw new Error(`Backend terminated by signal ${child.signalCode}: ${output}`)
    if (child.exitCode !== null) throw new Error(`Backend exited with status ${child.exitCode}: ${output}`)
  }
  const waitUntil = async (predicate: () => Promise<boolean>, description: string) => {
    for (let attempt = 0; attempt < 100; attempt++) {
      ensureAlive()
      if (await predicate()) return
      await delay(100)
    }
    throw new Error(`Timed out waiting for ${description}: ${output}`)
  }
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`)
    created = true
    const isolated = new URL(source)
    isolated.searchParams.set('options', '-c search_path=' + schema)
    const migrationPool = createDatabase(isolated.toString())
    try { await migrate(migrationPool) } finally { await migrationPool.end() }
    await new Promise<void>((resolve, reject) => {
      proxy.once('error', reject)
      proxy.listen(0, '127.0.0.1', resolve)
    })
    const address = proxy.address()
    if (!address || typeof address === 'string') throw new Error('Missing proxy address')
    isolated.hostname = '127.0.0.1'
    isolated.port = String(address.port)
    isolated.searchParams.set('application_name', application)
    child = spawn(process.execPath, ['--import', 'tsx', 'apps/backend/src/main.ts'], {
      cwd: root,
      env: { ...process.env, DATABASE_URL: isolated.toString(), BACKEND_PORT: '0' },
      stdio: ['ignore', 'pipe', 'pipe']
    })
    child.on('error', error => { spawnError = error })
    child.stdout?.on('data', chunk => { output += String(chunk) })
    child.stderr?.on('data', chunk => { output += String(chunk) })
    await waitUntil(async () => /Backend listening on port \d+/.test(output), 'backend startup')
    const port = output.match(/Backend listening on port (\d+)/)?.[1]
    assert.ok(port, 'Backend startup did not report a port')
    const ready = 'http://127.0.0.1:' + port + '/ready'
    assert.equal((await fetch(ready)).status, 200)
    const result = await admin.query<{ pid: number }>("SELECT pid FROM pg_stat_activity WHERE application_name = $1 AND datname = current_database() AND state = 'idle'", [application])
    assert.equal(result.rows.length, 1, 'Expected exactly one uniquely identified idle backend connection')
    const terminated = await admin.query<{ terminated: boolean }>('SELECT pg_terminate_backend($1) AS terminated', [result.rows[0].pid])
    assert.equal(terminated.rows[0].terminated, true)
    await waitUntil(async () => output.includes('Idle database connection failed:'), 'idle pool error handling')
    await waitUntil(async () => (await fetch(ready)).status === 200, 'replacement database connection')
    blocked = true
    for (const socket of sockets) socket.destroy()
    await waitUntil(async () => (await fetch(ready)).status === 503, 'database outage readiness failure')
    ensureAlive()
    blocked = false
    await waitUntil(async () => (await fetch(ready)).status === 200, 'database recovery')
    ensureAlive()
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) {
      await new Promise<void>(resolve => {
        const timer = setTimeout(() => { child?.kill('SIGKILL'); resolve() }, 5000)
        child?.once('exit', () => { clearTimeout(timer); resolve() })
        child?.kill('SIGTERM')
      })
    }
    for (const socket of sockets) socket.destroy()
    if (proxy.listening) await new Promise<void>((resolve, reject) => proxy.close(error => error ? reject(error) : resolve()))
    try { if (created) await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`) } finally { await admin.end() }
  }
})
