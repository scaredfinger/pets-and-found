import { createServer } from 'node:http'
import { checkDatabase } from '@scaffold/db'
import { greeting } from '@scaffold/greeting'
import type pg from 'pg'
import { parseCreateReport, publicReport, reportTypes, species, type ReportType, type Species } from './reports.ts'

type ReportRow = {
  id: number
  report_type: ReportType
  species: Species
  description: string
  traits: string[]
  location: string
  event_at: Date
  status: 'open' | 'resolved'
  created_at: Date
  resolved_at: Date | null
}

async function requestJson(request: import('node:http').IncomingMessage): Promise<unknown> {
  let body = ''
  for await (const chunk of request) {
    body += chunk
    if (body.length > 20_000) throw new Error('Request body too large')
  }
  return JSON.parse(body)
}

function json(response: import('node:http').ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }).end(JSON.stringify(value))
}

async function handleBackendRequest(request: import('node:http').IncomingMessage, response: import('node:http').ServerResponse, pool: pg.Pool): Promise<void> {
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
    if (url.pathname === '/api/reports') {
      if (request.method === 'GET') {
        const type = url.searchParams.get('type')
        const kind = url.searchParams.get('species')
        if ((type !== null && !reportTypes.includes(type as ReportType)) || (kind !== null && !species.includes(kind as Species))) {
          json(response, 400, { error: 'Invalid report filter' })
          return
        }
        const result = await pool.query<ReportRow>(`SELECT id, report_type, species, description, traits, location, event_at, status, created_at, resolved_at
          FROM animal_reports WHERE ($1::text IS NULL OR report_type = $1) AND ($2::text IS NULL OR species = $2)
          ORDER BY created_at DESC LIMIT 100`, [type, kind])
        json(response, 200, result.rows.map(publicReport))
        return
      }
      if (request.method === 'POST') {
        let report
        try {
          report = parseCreateReport(await requestJson(request))
        } catch { json(response, 400, { error: 'Invalid animal report' }); return }
        if (!report) { json(response, 400, { error: 'Invalid animal report' }); return }
        const result = await pool.query<ReportRow>(`INSERT INTO animal_reports
          (report_type, species, description, traits, location, event_at, latitude, longitude, contact_name, contact_email, contact_phone)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id, report_type, species, description, traits, location, event_at, status, created_at, resolved_at`,
        [report.type, report.species, report.description, report.traits, report.location, report.eventAt, report.latitude, report.longitude, report.contactName, report.contactEmail, report.contactPhone])
        json(response, 201, publicReport(result.rows[0]))
        return
      }
    }
    const reportMatch = url.pathname.match(/^\/api\/reports\/(\d+)(\/resolve)?$/)
    if (reportMatch) {
      const id = Number(reportMatch[1])
      if (request.method === 'GET' && !reportMatch[2]) {
        const result = await pool.query<ReportRow>('SELECT id, report_type, species, description, traits, location, event_at, status, created_at, resolved_at FROM animal_reports WHERE id = $1', [id])
        if (!result.rows[0]) { json(response, 404, { error: 'Report not found' }); return }
        json(response, 200, publicReport(result.rows[0]))
        return
      }
      if (request.method === 'POST' && reportMatch[2]) {
        const result = await pool.query<ReportRow>(`UPDATE animal_reports SET status = 'resolved', resolved_at = COALESCE(resolved_at, now())
          WHERE id = $1 RETURNING id, report_type, species, description, traits, location, event_at, status, created_at, resolved_at`, [id])
        if (!result.rows[0]) { json(response, 404, { error: 'Report not found' }); return }
        json(response, 200, publicReport(result.rows[0]))
        return
      }
    }
    if (request.method !== 'GET' || url.pathname !== '/api/greeting') {
      response.writeHead(404).end()
      return
    }
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify({ message: greeting(url.searchParams.get('name') ?? undefined) }))
}

export function createBackend(pool: pg.Pool) {
  return createServer((request, response) => {
    void handleBackendRequest(request, response, pool).catch(() => {
      if (!response.headersSent) json(response, 503, { error: 'Service unavailable' })
      else response.destroy()
    })
  })
}
