import { chromium } from '@playwright/test'
import { createDatabase, checkDatabase } from '../libs/db/src/index.ts'

const pool = createDatabase()
try {
  await checkDatabase(pool)
  console.log('Database authentication and migration readiness verified')
} finally {
  await pool.end()
}
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  await page.setContent('<title>Runtime preflight</title>')
  if (await page.title() !== 'Runtime preflight') throw new Error('Browser preflight failed')
  console.log('Chromium launch verified')
} finally {
  await browser.close()
}
