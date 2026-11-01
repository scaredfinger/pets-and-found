import pg from 'pg'
import { migrationFiles } from './migrations.ts'

export { migrate } from './migrations.ts'

export function databaseUrl(): string {
  return process.env.DATABASE_URL || 'postgresql://scaffold:scaffold@localhost:55432/scaffold'
}

export function createDatabase(connectionString = databaseUrl()): pg.Pool {
  const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 3000 })
  pool.on('error', error => console.error('Idle database connection failed:', error.message))
  return pool
}

export async function checkDatabase(pool: pg.Pool): Promise<void> {
  const expected = await migrationFiles()
  const applied = await pool.query<{ name: string, checksum: string }>('SELECT name, checksum FROM schema_migrations')
  const checksums = new Map(applied.rows.map(row => [row.name, row.checksum]))
  for (const migration of expected) {
    if (checksums.get(migration.name) !== migration.checksum) throw new Error(`Database migration missing or changed: ${migration.name}`)
  }
  await pool.query('SELECT 1 FROM greetings LIMIT 1')
  await pool.query('SELECT 1 FROM greeting_templates LIMIT 1')
  await pool.query('SELECT 1 FROM animal_reports LIMIT 1')
}
