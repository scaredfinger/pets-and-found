import { checkDatabase, createDatabase } from '@scaffold/db'
import { createBackend } from './server.ts'

const pool = createDatabase()
try {
  await checkDatabase(pool)
} catch (error) {
  await pool.end()
  throw new Error('Database unavailable or not migrated', { cause: error })
}
const port = Number(process.env.BACKEND_PORT || 3001)
const server = createBackend(pool).listen(port, () => {
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing server address')
  console.log(`Backend listening on port ${address.port}`)
})
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => server.close(() => void pool.end()))
