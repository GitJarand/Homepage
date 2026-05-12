import { Hono } from 'hono'
import IcalExpander from 'ical-expander'

const calendar = new Hono()

interface CalendarSource {
  url: string
  name: string
}

interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  location: string | null
  calendar: string
}

function getCalendarSources(): CalendarSource[] {
  const sources: CalendarSource[] = []
  let i = 1
  while (process.env[`ICAL_CALENDAR_${i}_URL`]) {
    sources.push({
      url: process.env[`ICAL_CALENDAR_${i}_URL`]!,
      name: process.env[`ICAL_CALENDAR_${i}_NAME`] ?? `Calendar ${i}`,
    })
    i++
  }
  return sources
}

async function fetchCalendar(source: CalendarSource, start: Date, end: Date): Promise<CalendarEvent[]> {
  const res = await fetch(source.url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const ics = await res.text()

  const expander = new IcalExpander({ ics, maxIterations: 500 })
  const { events, occurrences } = expander.between(start, end)

  const mapped: CalendarEvent[] = [
    ...events.map((e) => ({
      id: e.uid,
      title: e.summary ?? '(No title)',
      start: e.startDate.toJSDate().toISOString(),
      end: e.endDate.toJSDate().toISOString(),
      location: e.location ?? null,
      calendar: source.name,
    })),
    ...occurrences.map((o) => ({
      id: `${o.item.uid}-${o.startDate.toUnixTime()}`,
      title: o.item.summary ?? '(No title)',
      start: o.startDate.toJSDate().toISOString(),
      end: o.endDate.toJSDate().toISOString(),
      location: o.item.location ?? null,
      calendar: source.name,
    })),
  ]

  return mapped.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
}

calendar.get('/personal', async (c) => {
  const sources = getCalendarSources()
  if (sources.length === 0) {
    return c.json({ error: 'No calendars configured. Add ICAL_CALENDAR_1_URL to .env' }, 503)
  }

  const startParam = c.req.query('start')
  const endParam = c.req.query('end')
  const start = startParam ? new Date(startParam) : (() => { const d = new Date(); d.setHours(0,0,0,0); return d })()
  const end = endParam ? new Date(endParam) : (() => { const d = new Date(); d.setHours(23,59,59,999); return d })()

  const results = await Promise.allSettled(sources.map((s) => fetchCalendar(s, start, end)))

  const events: CalendarEvent[] = []
  const errors: string[] = []

  results.forEach((r, i) => {
    if (r.status === 'fulfilled') events.push(...r.value)
    else errors.push(`"${sources[i].name}": ${r.reason}`)
  })

  events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

  return c.json({ events, errors })
})

export default calendar
