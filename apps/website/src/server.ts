import { createServer } from 'node:http'

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

type Report = { id: number, type: string, species: string, description: string, traits: string[], location: string, eventAt: string, status: string, createdAt: string, resolvedAt: string | null }

function page(title: string, content: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)} | Pets and Found</title></head><body><main><nav><a href="/reports">Reports</a> <a href="/reports/new">Report an animal</a></nav>${content}</main></body></html>`
}

function select(name: string, label: string, values: string[], selected: string | null): string {
  return `<label>${label} <select name="${name}"><option value="">Any</option>${values.map(value => `<option value="${value}"${selected === value ? ' selected' : ''}>${value}</option>`).join('')}</select></label>`
}

async function form(request: import('node:http').IncomingMessage): Promise<Record<string, string>> {
  let body = ''
  for await (const chunk of request) {
    body += chunk
    if (body.length > 20_000) throw new Error('Request body too large')
  }
  return Object.fromEntries(new URLSearchParams(body))
}

export function createWebsite(backendUrl: string) {
  return createServer(async (request, response) => {
    let url: URL
    try { url = new URL(request.url || '/', 'http://localhost') } catch {
      response.writeHead(400).end()
      return
    }
    if (request.method === 'GET' && url.pathname === '/reports') {
      try {
        const api = new URL('/api/reports', backendUrl)
        for (const name of ['type', 'species']) {
          const value = url.searchParams.get(name)
          if (value) api.searchParams.set(name, value)
        }
        const result = await fetch(api)
        if (!result.ok) throw new Error('Backend unavailable')
        const reports = await result.json() as Report[]
        const filters = `<form method="get">${select('type', 'Type', ['lost', 'found', 'sighted'], url.searchParams.get('type'))} ${select('species', 'Species', ['dog', 'cat', 'bird'], url.searchParams.get('species'))} <button>Filter</button></form>`
        const list = reports.length ? `<ul>${reports.map(report => `<li><a href="/reports/${report.id}">${escapeHtml(report.type)} ${escapeHtml(report.species)}</a>: ${escapeHtml(report.description)} in ${escapeHtml(report.location)} (${escapeHtml(report.status)})</li>`).join('')}</ul>` : '<p>No reports match these filters.</p>'
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(page('Animal reports', `<h1>Animal reports</h1>${filters}${list}`))
      } catch { response.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' }).end('Backend unavailable') }
      return
    }
    if (request.method === 'GET' && url.pathname === '/reports/new') {
      const reportForm = `<h1>Report an animal</h1><form method="post" action="/reports"><label>Type <select name="type"><option value="lost">lost</option><option value="found">found</option><option value="sighted">sighted</option></select></label><label>Species <select name="species"><option value="dog">dog</option><option value="cat">cat</option><option value="bird">bird</option></select></label><label>Traits <input name="traits" required maxlength="809" aria-describedby="traits-help"><span id="traits-help">Separate traits with commas, for example brown, blue collar.</span></label><label>Location in Mallorca <input name="location" required minlength="3" maxlength="200" placeholder="Palma, Mallorca"></label><label>Event date and time <input name="eventAt" type="datetime-local" required></label><label>Description <textarea name="description" required maxlength="1000"></textarea></label><label>Latitude <input name="latitude" type="number" step="any" min="-90" max="90" required></label><label>Longitude <input name="longitude" type="number" step="any" min="-180" max="180" required></label><label>Your name <input name="contactName" maxlength="120"></label><label>Email <input name="contactEmail" type="email" maxlength="254"></label><label>Phone <input name="contactPhone" maxlength="40"></label><button>Publish report</button></form>`
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(page('Report an animal', reportForm))
      return
    }
    if (request.method === 'POST' && url.pathname === '/reports') {
      try {
        const fields = await form(request)
        if (!fields.traits) { response.writeHead(400, { 'content-type': 'text/html; charset=utf-8' }).end(page('Invalid report', '<h1>Check your report</h1><p role="alert">Add at least one trait, a Mallorca location, a valid event date and time, and valid coordinates.</p><p><a href="/reports/new">Return to the report form</a></p>')); return }
        const result = await fetch(new URL('/api/reports', backendUrl), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...fields, traits: fields.traits.split(',').map(trait => trait.trim()).filter(Boolean), latitude: Number(fields.latitude), longitude: Number(fields.longitude) }) })
        if (result.status >= 500) throw new Error('Backend unavailable')
        if (!result.ok) { response.writeHead(400, { 'content-type': 'text/html; charset=utf-8' }).end(page('Invalid report', '<h1>Check your report</h1><p role="alert">Add at least one trait, a Mallorca location, a valid event date and time, and valid coordinates.</p><p><a href="/reports/new">Return to the report form</a></p>')); return }
        const report = await result.json() as Report
        response.writeHead(303, { location: `/reports/${report.id}` }).end()
      } catch { response.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' }).end('Backend unavailable') }
      return
    }
    const resolve = url.pathname.match(/^\/reports\/(\d+)\/resolve$/)
    if (request.method === 'POST' && resolve) {
      try {
        const result = await fetch(new URL(`/api/reports/${resolve[1]}/resolve`, backendUrl), { method: 'POST' })
        if (result.status === 404) { response.writeHead(404).end('Report not found'); return }
        if (!result.ok) throw new Error('Backend unavailable')
        response.writeHead(303, { location: `/reports/${resolve[1]}` }).end()
      } catch { response.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' }).end('Backend unavailable') }
      return
    }
    const detail = url.pathname.match(/^\/reports\/(\d+)$/)
    if (request.method === 'GET' && detail) {
      try {
        const result = await fetch(new URL(`/api/reports/${detail[1]}`, backendUrl))
        if (result.status === 404) { response.writeHead(404).end('Report not found'); return }
        if (!result.ok) throw new Error('Backend unavailable')
        const report = await result.json() as Report
        const resolution = report.status === 'open' ? `<form method="post" action="/reports/${report.id}/resolve"><button>Resolve report</button></form>` : ''
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(page(`${report.type} ${report.species}`, `<h1>${escapeHtml(report.type)} ${escapeHtml(report.species)}</h1><p>${escapeHtml(report.description)}</p><p>Traits: ${report.traits.map(escapeHtml).join(', ')}</p><p>Location: ${escapeHtml(report.location)}</p><p>When: ${escapeHtml(new Date(report.eventAt).toLocaleString('en-US', { timeZone: 'Europe/Madrid' }))}</p><p>Status: ${escapeHtml(report.status)}</p>${resolution}<p>Reported: ${escapeHtml(new Date(report.createdAt).toLocaleDateString('en-US'))}</p>`))
      } catch { response.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' }).end('Backend unavailable') }
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
      response.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Pets and Found</title></head><body><main><h1>${escapeHtml(message)}</h1><form><label>Name <input name="name"></label><button>Greet</button></form></main></body></html>`)
    } catch {
      response.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' }).end('Backend unavailable')
    }
  })
}
