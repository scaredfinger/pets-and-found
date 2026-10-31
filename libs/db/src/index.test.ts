import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { databaseUrl } from './index.ts'

test('uses the configured database URL', () => {
  const before = process.env.DATABASE_URL
  process.env.DATABASE_URL = 'postgresql://example/test'
  try { assert.equal(databaseUrl(), 'postgresql://example/test') } finally {
    if (before === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = before
  }
})
