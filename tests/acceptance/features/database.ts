import { strict as assert } from 'node:assert'
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { Given, Then, After } from '@cucumber/cucumber'
import { checkDatabase, createDatabase, databaseUrl, migrate } from '@scaffold/db'
import { createBackend } from 'backend'
import type pg from 'pg'

type SchemaWorld = { admin?: pg.Pool, pool?: pg.Pool, schema?: string, url?: string }
const root = fileURLToPath(new URL('../../../', import.meta.url))

Given('an isolated database schema', async function (this: SchemaWorld) {
  this.schema = 'test_' + randomBytes(12).toString('hex')
  this.admin = createDatabase()
  await this.admin.query(`CREATE SCHEMA "${this.schema}"`)
  const url = new URL(databaseUrl())
  url.searchParams.set('options', '-c search_path=' + this.schema)
  this.url = url.toString()
  this.pool = createDatabase(this.url)
})

Then('the backend rejects incomplete or damaged migration state', async function (this: SchemaWorld) {
  if (!this.pool || !this.url) throw new Error('Missing isolated database')
  const pool = this.pool
  await assert.rejects(checkDatabase(pool))
  const startup = () => spawnSync(process.execPath, ['--import', 'tsx', 'apps/backend/src/main.ts'], {
    cwd: root, env: { ...process.env, DATABASE_URL: this.url }, encoding: 'utf8', timeout: 10000
  })
  assert.notEqual(startup().status, 0)
  await migrate(pool)
  await checkDatabase(pool)
  const server = createBackend(pool).listen(0)
  try {
    await new Promise<void>(resolve => server.once('listening', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Missing backend address')
    const url = 'http://localhost:' + address.port + '/ready'
    assert.equal((await fetch(url)).status, 200)
    const original = await pool.query<{ checksum: string }>("SELECT checksum FROM schema_migrations WHERE name = '001-create-greetings.sql'")
    await pool.query("UPDATE schema_migrations SET checksum = 'invalid' WHERE name = '001-create-greetings.sql'")
    assert.equal((await fetch(url)).status, 503)
    await pool.query("UPDATE schema_migrations SET checksum = $1 WHERE name = '001-create-greetings.sql'", [original.rows[0].checksum])
    await pool.query("DELETE FROM schema_migrations WHERE name = '003-create-greeting-templates.sql'")
    assert.equal((await fetch(url)).status, 503)
    assert.notEqual(startup().status, 0)
    await pool.query('DROP TABLE greeting_templates')
    await migrate(pool)
    assert.equal((await fetch(url)).status, 200)
    await pool.query('DROP TABLE greeting_templates')
    assert.equal((await fetch(url)).status, 503)
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
})

After(async function (this: SchemaWorld) {
  if (this.pool) await this.pool.end()
  if (this.admin && this.schema) {
    await this.admin.query(`DROP SCHEMA IF EXISTS "${this.schema}" CASCADE`)
    await this.admin.end()
  }
})
