import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import type pg from 'pg'
import { createBackend } from './server.ts'
import { parseCreateReport, publicReport } from './reports.ts'

test('validates report inputs and never exposes private report fields', () => {
  const valid = { type: 'lost', species: 'dog', description: 'Small brown dog', traits: ['brown', 'small'], location: 'Palma, Mallorca', eventAt: '2026-01-01T10:30', latitude: 39.5696, longitude: 2.6502, contactEmail: 'person@example.test' }
  assert.equal(parseCreateReport(valid)?.contactEmail, 'person@example.test')
  assert.equal(parseCreateReport(valid)?.eventAt.toISOString(), '2026-01-01T09:30:00.000Z')
  assert.equal(parseCreateReport({ ...valid, traits: [] }), undefined)
  assert.equal(parseCreateReport({ ...valid, eventAt: '2026-02-30T10:30' }), undefined)
  assert.equal(parseCreateReport({ ...valid, latitude: 40.3 }), undefined)
  assert.equal(parseCreateReport({ ...valid, contactEmail: 'not-an-email' }), undefined)
  assert.equal(parseCreateReport({ ...valid, longitude: 2 }), undefined)
  assert.equal(parseCreateReport({ ...valid, eventAt: '2026-10-25T02:30' }), undefined)
  assert.equal(parseCreateReport({ ...valid, eventAt: '2026-01-01T10:30+23:59' }), undefined)
  assert.equal(parseCreateReport({ ...valid, eventAt: '2026-01-01T10:30+14:00' }), undefined)
  assert.equal(parseCreateReport({ ...valid, eventAt: '2026-03-29T02:30+01:00' }), undefined)
  assert.equal(parseCreateReport({ ...valid, eventAt: '2026-10-25T02:30+02:00' })?.eventAt.toISOString(), '2026-10-25T00:30:00.000Z')
  assert.equal(parseCreateReport({ ...valid, eventAt: '2026-10-25T02:30+01:00' })?.eventAt.toISOString(), '2026-10-25T01:30:00.000Z')
  assert.deepEqual(publicReport({ id: 1, report_type: 'lost', species: 'dog', description: 'Small brown dog', traits: ['brown', 'small'], location: 'Palma, Mallorca', event_at: new Date('2026-01-01T10:30:00Z'), status: 'open', created_at: new Date('2026-01-01T00:00:00Z'), resolved_at: null }), {
    id: 1, type: 'lost', species: 'dog', description: 'Small brown dog', traits: ['brown', 'small'], location: 'Palma, Mallorca', eventAt: '2026-01-01T10:30:00.000Z', status: 'open', createdAt: '2026-01-01T00:00:00.000Z', resolvedAt: null
  })
})

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
  assert.equal((await fetch(`${base}/api/reports`)).status, 503)
  assert.equal((await fetch(`${base}/missing`)).status, 404)
})

test('creates, lists, retrieves, and resolves redacted reports', async (t) => {
  const open = { id: 7, report_type: 'found' as const, species: 'cat' as const, description: 'Black cat near the park', traits: ['black fur'], location: 'Palma, Mallorca', event_at: new Date('2026-01-01T10:30:00Z'), status: 'open' as const, created_at: new Date('2026-01-01T00:00:00Z'), resolved_at: null }
  const resolved = { ...open, status: 'resolved' as const, resolved_at: new Date('2026-01-02T00:00:00Z') }
  const pool = {
    query: async (sql: string) => {
      if (sql.includes('UPDATE animal_reports')) return { rows: [resolved] }
      return { rows: [open] }
    }
  } as unknown as pg.Pool
  const server = createBackend(pool).listen(0)
  t.after(() => server.close())
  await new Promise(resolve => server.once('listening', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing server address')
  const base = 'http://localhost:' + address.port
  const creation = await fetch(`${base}/api/reports`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'found', species: 'cat', description: 'Black cat near the park', traits: ['black fur'], location: 'Palma, Mallorca', eventAt: '2026-01-01T10:30', latitude: 39.5696, longitude: 2.6502, contactEmail: 'private@example.test' }) })
  assert.equal(creation.status, 201)
  const created = await creation.json() as Record<string, unknown>
  assert.equal(created.contactEmail, undefined)
  assert.equal(created.latitude, undefined)
  assert.equal((await fetch(`${base}/api/reports?type=found&species=cat`)).status, 200)
  assert.equal((await fetch(`${base}/api/reports/7`)).status, 200)
  assert.deepEqual(await (await fetch(`${base}/api/reports/7/resolve`, { method: 'POST' })).json(), {
    id: 7, type: 'found', species: 'cat', description: 'Black cat near the park', traits: ['black fur'], location: 'Palma, Mallorca', eventAt: '2026-01-01T10:30:00.000Z', status: 'resolved', createdAt: '2026-01-01T00:00:00.000Z', resolvedAt: '2026-01-02T00:00:00.000Z'
  })
  assert.equal((await fetch(`${base}/api/reports?type=other`)).status, 400)
  assert.equal((await fetch(`${base}/api/reports`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 400)
})
