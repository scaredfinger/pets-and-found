import { createServer } from 'node:http'
import { checkDatabase } from '@scaffold/db'
import { greeting } from '@scaffold/greeting'
import type pg from 'pg'

export function createBackend(pool: pg.Pool) {
  return createServer(async (request, response) => {
    let url: URL
    try { url = new URL(request.url || '/', 'http://localhost') } catch {
      response.writeHead(400).end()
      return
    }
    if (request.method === 'GET' && url.pathname === '/ready') {
      try {
        await checkDatabase(pool)
        response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ ready: true }))
      } catch {
        response.writeHead(503, { 'content-type': 'application/json' }).end(JSON.stringify({ ready: false }))
      }
      return
    }
    if (request.method !== 'GET' || url.pathname !== '/api/greeting') {
      response.writeHead(404).end()
      return
    }
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify({ message: greeting(url.searchParams.get('name') ?? undefined) }))
  })
}
