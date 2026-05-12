import { Hono } from 'hono'
import ical from 'node-ical'

const calendar = new Hono()

calendar.get('/personal', async (c) => {
  const url = process.env.ICAL_PERSONAL_URL

  if (!url) {
    return c.json({ error: 'ICAL_PERSONAL_URL is not set' }, 503)
  }

  try {
    const events = await ical.async.fromURL(url)

    const now = new Date()
    const upcoming = Object.values(events)
      .filter((e) => e.type === 'VEVENT' && e.start >= now)
      .sort((a, b) => {
        const aEvent = a as ical.VEvent
        const bEvent = b as ical.VEvent
        return new Date(aEvent.start).getTime() - new Date(bEvent.start).getTime()
      })
      .slice(0, 10)
      .map((e) => {
        const event = e as ical.VEvent
        return {
          id: event.uid,
          title: event.summary,
          start: event.start,
          end: event.end,
          location: event.location ?? null,
        }
      })

    return c.json(upcoming)
  } catch {
    return c.json({ error: 'Failed to fetch calendar' }, 502)
  }
})

export default calendar
