import { createDatabase } from './index.ts'
import { migrate } from './migrations.ts'

const pool = createDatabase()
try {
  await migrate(pool)
  console.log('Database migrations applied')
} finally {
  await pool.end()
}
