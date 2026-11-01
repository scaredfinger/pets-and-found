import { strict as assert } from 'node:assert'
import { Then, When } from '@cucumber/cucumber'

type ReportWorld = { backendUrl: string, websiteUrl: string, reportId?: number }

When('an anonymous visitor creates a found cat report in Mallorca', async function (this: ReportWorld) {
  const response = await fetch(this.backendUrl + '/api/reports', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'found',
      species: 'cat',
      description: 'Black cat wearing a red collar',
      traits: ['black fur', 'red collar'],
      location: 'Palma, Mallorca',
      eventAt: '2026-01-15T14:30',
      latitude: 39.5696,
      longitude: 2.6502,
      contactEmail: 'private@example.test'
    })
  })
  assert.equal(response.status, 201)
  const report = await response.json() as { id: number }
  this.reportId = report.id
})

Then('the report is persisted and discoverable through public reports', async function (this: ReportWorld) {
  if (!this.reportId) throw new Error('Missing report identifier')
  const api = await fetch(this.backendUrl + '/api/reports/' + this.reportId)
  assert.equal(api.status, 200)
  const report = await api.json() as Record<string, unknown>
  assert.deepEqual(report.traits, ['black fur', 'red collar'])
  assert.equal(report.location, 'Palma, Mallorca')
  assert.equal(report.eventAt, '2026-01-15T13:30:00.000Z')
  assert.equal(report.latitude, undefined)
  assert.equal(report.longitude, undefined)
  assert.equal(report.contactEmail, undefined)
  const list = await fetch(this.websiteUrl + '/reports?type=found&species=cat')
  assert.equal(list.status, 200)
  assert.match(await list.text(), new RegExp(`/reports/${this.reportId}`))
  const detail = await fetch(this.websiteUrl + '/reports/' + this.reportId)
  assert.equal(detail.status, 200)
  const body = await detail.text()
  assert.match(body, /Traits: black fur, red collar/)
  assert.match(body, /Location: Palma, Mallorca/)
  assert.doesNotMatch(body, /private@example\.test|39\.5696|2\.6502/)
})
