import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import type pg from 'pg'

const directory = fileURLToPath(new URL('../migrations/', import.meta.url))

export async function migrationFiles(): Promise<{ name: string, sql: string, checksum: string }[]> {
  const names = (await readdir(directory)).filter(name => /^\d+.*\.sql$/.test(name)).sort()
  if (!names.length) throw new Error('No database migrations found')
  return Promise.all(names.map(async name => {
    const sql = await readFile(new URL(`../migrations/${name}`, import.meta.url), 'utf8')
    return { name, sql, checksum: createHash('sha256').update(sql).digest('hex') }
  }))
}

export async function migrate(pool: pg.Pool): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query("SELECT pg_advisory_xact_lock(hashtext('scaffold-migrations'))")
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL)')
    for (const { name, sql, checksum } of await migrationFiles()) {
      const existing = await client.query<{ checksum: string }>('SELECT checksum FROM schema_migrations WHERE name = $1', [name])
      if (existing.rows.length) {
        if (existing.rows[0].checksum !== checksum) throw new Error(`Applied migration changed: ${name}`)
        continue
      }
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [name, checksum])
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
