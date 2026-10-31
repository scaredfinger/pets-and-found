import { createServer } from 'node:http'

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

export function createWebsite(backendUrl: string) {
  return createServer(async (request, response) => {
    let url: URL
    try { url = new URL(request.url || '/', 'http://localhost') } catch {
      response.writeHead(400).end()
      return
    }
    if (request.method !== 'GET' || url.pathname !== '/') {
      response.writeHead(404).end()
      return
    }
    try {
      const api = new URL('/api/greeting', backendUrl)
      const name = url.searchParams.get('name')
      if (name !== null) api.searchParams.set('name', name)
      const result = await fetch(api)
      if (!result.ok) throw new Error('Backend unavailable')
      const { message } = await result.json() as { message: string }
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      response.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Cinderling scaffold</title></head><body><main><h1>${escapeHtml(message)}</h1><form><label>Name <input name="name"></label><button>Greet</button></form></main></body></html>`)
    } catch {
      response.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' }).end('Backend unavailable')
    }
  })
}
