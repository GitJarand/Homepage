import { Hono } from 'hono'
import ical from 'node-ical'

const calendar = new Hono()

interface CalendarSource {
  url: string
  name: string
}

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
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

async function fetchCalendar(source: CalendarSource): Promise<CalendarEvent[]> {
  const events = await ical.async.fromURL(source.url)
  const now = new Date()

  return Object.values(events)
    .filter((e): e is ical.VEvent => e.type === 'VEVENT' && new Date(e.start) >= now)
    .map((e) => ({
      id: `${source.name}-${e.uid}`,
      title: e.summary ?? '(No title)',
      start: new Date(e.start),
      end: new Date(e.end),
      location: e.location ?? null,
      calendar: source.name,
    }))
}

calendar.get('/personal', async (c) => {
  const sources = getCalendarSources()

  if (sources.length === 0) {
    return c.json({ error: 'No calendars configured. Add ICAL_CALENDAR_1_URL to .env' }, 503)
  }

  try {
    const results = await Promise.allSettled(sources.map(fetchCalendar))

    const events: CalendarEvent[] = []
    const errors: string[] = []

    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        events.push(...result.value)
      } else {
        errors.push(`Failed to fetch "${sources[i].name}": ${result.reason}`)
      }
    })

    events.sort((a, b) => a.start.getTime() - b.start.getTime())

    return c.json({ events: events.slice(0, 20), errors })
  } catch {
    return c.json({ error: 'Unexpected error fetching calendars' }, 502)
  }
})

export default calendar
