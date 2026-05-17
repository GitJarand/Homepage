import { Hono } from 'hono'

const weather = new Hono()

const LAT      = process.env.WEATHER_LAT      ?? '59.9139'
const LON      = process.env.WEATHER_LON      ?? '10.7522'
const LOCATION = process.env.WEATHER_LOCATION ?? 'Oslo'

function symbolToEmoji(code: string): string {
  if (code.includes('thunder'))                            return '⛈️'
  if (code.includes('heavysnow') || code.includes('blizzard')) return '❄️'
  if (code.includes('snow'))                               return '🌨️'
  if (code.includes('sleet'))                              return '🌧️'
  if (code.includes('heavyrain'))                          return '🌧️'
  if (code.includes('rain') || code.includes('drizzle'))   return '🌦️'
  if (code.includes('fog'))                                return '🌫️'
  if (code.includes('cloudy'))                             return '☁️'
  if (code.includes('partlycloudy'))                       return '⛅'
  if (code.includes('fair'))                               return '🌤️'
  if (code.includes('clearsky'))                           return '☀️'
  return '🌡️'
}

interface TimeseriesEntry {
  time: string
  data: {
    instant: { details: { air_temperature: number } }
    next_1_hours?: { summary: { symbol_code: string } }
    next_6_hours?: { summary: { symbol_code: string }; details: { air_temperature_max: number; air_temperature_min: number } }
    next_12_hours?: { summary: { symbol_code: string } }
  }
}

weather.get('/current', async (c) => {
  try {
    const res = await fetch(
      `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${LAT}&lon=${LON}`,
      {
        headers: {
          'User-Agent': 'HomepageDashboard/1.0 github.com/GitJarand/Homepage',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(8000),
      }
    )

    if (!res.ok) return c.json({ error: `MET API ${res.status}` }, 500)

    const data = await res.json() as { properties: { timeseries: TimeseriesEntry[] } }
    const timeseries = data.properties.timeseries

    // ── Current conditions ──────────────────────────────────────────────────
    const current = timeseries[0]
    const temp    = Math.round(current.data.instant.details.air_temperature)
    const code    = current.data.next_1_hours?.summary.symbol_code
                 ?? current.data.next_6_hours?.summary.symbol_code
                 ?? 'clearsky_day'

    // ── 3-day forecast ──────────────────────────────────────────────────────
    const nowDate = new Date()
    const forecast: { day: string; emoji: string; max: number; min: number }[] = []

    for (let d = 1; d <= 3; d++) {
      const target = new Date(nowDate)
      target.setDate(nowDate.getDate() + d)
      const targetDateStr = target.toISOString().slice(0, 10) // "YYYY-MM-DD"

      const dayEntries = timeseries.filter(e => e.time.startsWith(targetDateStr))
      if (dayEntries.length === 0) continue

      const temps = dayEntries.map(e => e.data.instant.details.air_temperature)
      const max   = Math.round(Math.max(...temps))
      const min   = Math.round(Math.min(...temps))

      // Prefer noon entry for representative symbol
      const noon   = dayEntries.find(e => e.time.includes('T12:')) ?? dayEntries[Math.floor(dayEntries.length / 2)]
      const symbol = noon.data.next_6_hours?.summary.symbol_code
                  ?? noon.data.next_1_hours?.summary.symbol_code
                  ?? 'clearsky_day'

      forecast.push({
        day:   target.toLocaleDateString('en-GB', { weekday: 'short' }),
        emoji: symbolToEmoji(symbol),
        max,
        min,
      })
    }

    return c.json({ temp, emoji: symbolToEmoji(code), code, location: LOCATION, forecast })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

export default weather
