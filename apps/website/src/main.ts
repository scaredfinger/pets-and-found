import { createWebsite } from './server.ts'

const port = Number(process.env.WEBSITE_PORT || 3000)
const backend = process.env.BACKEND_URL || 'http://localhost:3001'
const server = createWebsite(backend).listen(port, () => {
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing server address')
  console.log(`Website listening on port ${address.port}`)
})
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => server.close())
