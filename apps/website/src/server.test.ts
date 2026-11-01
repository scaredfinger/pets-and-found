import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { createServer } from 'node:http'
import { createWebsite } from './server.ts'

test('escapes backend text before rendering HTML', async (t) => {
  const backend = createServer((req, res) => res.end(JSON.stringify({ message: '<script>alert(1)</script>' }))).listen(0)
  t.after(() => backend.close())
  await new Promise(resolve => backend.once('listening', resolve))
  const backendAddress = backend.address()
  if (!backendAddress || typeof backendAddress === 'string') throw new Error('Missing backend address')
  const website = createWebsite('http://localhost:' + backendAddress.port).listen(0)
  t.after(() => website.close())
  await new Promise(resolve => website.once('listening', resolve))
  const address = website.address()
  if (!address || typeof address === 'string') throw new Error('Missing website address')
  const html = await (await fetch('http://localhost:' + address.port)).text()
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'))
})

test('rejects malformed report submissions without calling the backend', async (t) => {
  const backend = createServer((req, res) => res.writeHead(500).end()).listen(0)
  t.after(() => backend.close())
  await new Promise(resolve => backend.once('listening', resolve))
  const backendAddress = backend.address()
  if (!backendAddress || typeof backendAddress === 'string') throw new Error('Missing backend address')
  const website = createWebsite('http://localhost:' + backendAddress.port).listen(0)
  t.after(() => website.close())
  await new Promise(resolve => website.once('listening', resolve))
  const address = website.address()
  if (!address || typeof address === 'string') throw new Error('Missing website address')
  const response = await fetch('http://localhost:' + address.port + '/reports', { method: 'POST', body: 'type=lost' })
  assert.equal(response.status, 400)
  assert.match(await response.text(), /Check your report/)
})
