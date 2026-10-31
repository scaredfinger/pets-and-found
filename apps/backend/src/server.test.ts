import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import type pg from 'pg'
import { createBackend } from './server.ts'

test('serves greetings and reports database failure', async (t) => {
  const pool = { query: async () => { throw new Error('unavailable') } } as unknown as pg.Pool
  const server = createBackend(pool).listen(0)
  t.after(() => server.close())
  await new Promise(resolve => server.once('listening', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing server address')
  const base = 'http://localhost:' + address.port
  assert.deepEqual(await (await fetch(`${base}/api/greeting?name=Ada`)).json(), { message: 'Hello, Ada!' })
  assert.equal((await fetch(`${base}/ready`)).status, 503)
  assert.equal((await fetch(`${base}/missing`)).status, 404)
})
