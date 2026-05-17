import { Hono } from 'hono'

const weather = new Hono()

const DEFAULT_LAT      = process.env.WEATHER_LAT      ?? '59.9139'
const DEFAULT_LON      = process.env.WEATHER_LON      ?? '10.7522'
const DEFAULT_LOCATION = process.env.WEATHER_LOCATION ?? 'Oslo'

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
  const lat = c.req.query('lat') ?? DEFAULT_LAT
  const lon = c.req.query('lon') ?? DEFAULT_LON
  const clientProvided = !!c.req.query('lat')

  try {
    // Fetch weather + optional reverse geocode in parallel
    const [weatherRes, geoRes] = await Promise.all([
      fetch(
        `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`,
        {
          headers: {
            'User-Agent': 'HomepageDashboard/1.0 github.com/GitJarand/Homepage',
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(8000),
        }
      ),
      clientProvided
        ? fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
            {
              headers: { 'User-Agent': 'HomepageDashboard/1.0 github.com/GitJarand/Homepage' },
              signal: AbortSignal.timeout(5000),
            }
          )
        : Promise.resolve(null),
    ])

    if (!weatherRes.ok) return c.json({ error: `MET API ${weatherRes.status}` }, 500)

    const data       = await weatherRes.json() as { properties: { timeseries: TimeseriesEntry[] } }
    const timeseries = data.properties.timeseries

    // Location name via reverse geocode, or env default
    let location = DEFAULT_LOCATION
    if (geoRes?.ok) {
      const geo = await geoRes.json() as { address?: { city?: string; town?: string; village?: string; suburb?: string } }
      location = geo.address?.city ?? geo.address?.town ?? geo.address?.village ?? geo.address?.suburb ?? DEFAULT_LOCATION
    }

    // Current conditions
    const current = timeseries[0]
    const temp    = Math.round(current.data.instant.details.air_temperature)
    const code    = current.data.next_1_hours?.summary.symbol_code
                 ?? current.data.next_6_hours?.summary.symbol_code
                 ?? 'clearsky_day'

    // 3-day forecast
    const nowDate = new Date()
    const forecast: { day: string; emoji: string; max: number; min: number }[] = []

    for (let d = 1; d <= 3; d++) {
      const target       = new Date(nowDate)
      target.setDate(nowDate.getDate() + d)
      const targetDateStr = target.toISOString().slice(0, 10)

      const dayEntries = timeseries.filter(e => e.time.startsWith(targetDateStr))
      if (dayEntries.length === 0) continue

      const temps = dayEntries.map(e => e.data.instant.details.air_temperature)
      const max   = Math.round(Math.max(...temps))
      const min   = Math.round(Math.min(...temps))

      const noon   = dayEntries.find(e => e.time.includes('T12:')) ?? dayEntries[Math.floor(dayEntries.length / 2)]
      const symbol = noon.data.next_6_hours?.summary.symbol_code
                  ?? noon.data.next_1_hours?.summary.symbol_code
                  ?? 'clearsky_day'

      forecast.push({ day: target.toLocaleDateString('en-GB', { weekday: 'short' }), emoji: symbolToEmoji(symbol), max, min })
    }

    return c.json({ temp, emoji: symbolToEmoji(code), code, location, forecast })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

export default weather
