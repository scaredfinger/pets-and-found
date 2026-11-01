export const reportTypes = ['lost', 'found', 'sighted'] as const
export const species = ['dog', 'cat', 'bird'] as const

export type ReportType = typeof reportTypes[number]
export type Species = typeof species[number]

export type PublicReport = {
  id: number
  type: ReportType
  species: Species
  description: string
  traits: string[]
  location: string
  eventAt: string
  status: 'open' | 'resolved'
  createdAt: string
  resolvedAt: string | null
}

export type CreateReport = {
  type: ReportType
  species: Species
  description: string
  traits: string[]
  location: string
  eventAt: Date
  latitude: number
  longitude: number
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
}

function mallorcaDate(eventAt: string, match: RegExpMatchArray): Date | undefined {
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6] || 0)
  const milliseconds = Number((match[7] || '').padEnd(3, '0'))
  if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate() || hour > 23 || minute > 59 || second > 59) return undefined
  const local = Date.UTC(year, month - 1, day, hour, minute, second, milliseconds)
  const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
  if (match[8]) {
    if (match[9] && (Number(match[10]) > 14 || Number(match[11]) > 59 || (Number(match[10]) === 14 && Number(match[11]) !== 0))) return undefined
    const date = new Date(eventAt)
    if (Number.isNaN(date.getTime())) return undefined
    const actual = Object.fromEntries(formatter.formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, part.value]))
    const actualLocal = Date.UTC(Number(actual.year), Number(actual.month) - 1, Number(actual.day), Number(actual.hour), Number(actual.minute), Number(actual.second), milliseconds)
    const offset = match[9] ? (match[9] === '+' ? 1 : -1) * (Number(match[10]) * 60 + Number(match[11])) : 0
    if (actualLocal !== local || (actualLocal - date.getTime()) / 60_000 !== offset) return undefined
    return date
  }
  const candidates = [0, 60, 120].map(offset => new Date(local - offset * 60_000)).filter(date => {
    const actual = Object.fromEntries(formatter.formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, part.value]))
    return Number(actual.year) === year && Number(actual.month) === month && Number(actual.day) === day && Number(actual.hour) === hour && Number(actual.minute) === minute && Number(actual.second) === second
  })
  return candidates.length === 1 ? candidates[0] : undefined
}

function optionalText(value: unknown, maximum: number): string | null | undefined {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || value.trim().length > maximum) return undefined
  return value.trim()
}

export function parseCreateReport(value: unknown): CreateReport | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const input = value as Record<string, unknown>
  const type = input.type
  const kind = input.species
  const description = input.description
  const traits = input.traits
  const location = input.location
  const eventAt = input.eventAt
  const latitude = input.latitude
  const longitude = input.longitude
  const contactName = optionalText(input.contactName, 120)
  const contactEmail = optionalText(input.contactEmail, 254)
  const contactPhone = optionalText(input.contactPhone, 40)
  if (!reportTypes.includes(type as ReportType) || !species.includes(kind as Species)) return undefined
  if (typeof description !== 'string' || !description.trim() || description.trim().length > 1000) return undefined
  if (!Array.isArray(traits) || !traits.length || traits.length > 10 || traits.some(trait => typeof trait !== 'string' || !trait.trim() || trait.trim().length > 80)) return undefined
  if (typeof location !== 'string' || location.trim().length < 3 || location.trim().length > 200) return undefined
  const eventMatch = typeof eventAt === 'string' && eventAt.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|([+-])(\d{2}):(\d{2}))?$/)
  if (!eventMatch) return undefined
  const eventDate = mallorcaDate(eventAt, eventMatch)
  if (!eventDate) return undefined
  if (typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < 39.1 || latitude > 40.15) return undefined
  if (typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < 2.15 || longitude > 3.55) return undefined
  if (contactName === undefined || contactEmail === undefined || contactPhone === undefined) return undefined
  if (contactEmail !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return undefined
  return { type: type as ReportType, species: kind as Species, description: description.trim(), traits: traits.map(trait => trait.trim()), location: location.trim(), eventAt: eventDate, latitude, longitude, contactName, contactEmail, contactPhone }
}

export function publicReport(row: {
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
}): PublicReport {
  return {
    id: row.id,
    type: row.report_type,
    species: row.species,
    description: row.description,
    traits: row.traits,
    location: row.location,
    eventAt: row.event_at.toISOString(),
    status: row.status,
    createdAt: row.created_at.toISOString(),
    resolvedAt: row.resolved_at?.toISOString() ?? null
  }
}
