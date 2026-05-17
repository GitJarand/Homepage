import { Hono } from 'hono'

const weather = new Hono()

const LAT = process.env.WEATHER_LAT ?? '59.9139'   // Oslo
const LON = process.env.WEATHER_LON ?? '10.7522'

// Map MET Norway symbol codes → emoji
function symbolToEmoji(code: string): string {
  if (code.includes('thunder'))                       return '⛈️'
  if (code.includes('heavysnow') || code.includes('snow')) return '❄️'
  if (code.includes('sleet'))                         return '🌨️'
  if (code.includes('heavyrain'))                     return '🌧️'
  if (code.includes('rain') || code.includes('drizzle')) return '🌦️'
  if (code.includes('fog'))                           return '🌫️'
  if (code.includes('cloudy'))                        return '☁️'
  if (code.includes('partlycloudy'))                  return '⛅'
  if (code.includes('fair'))                          return '🌤️'
  if (code.includes('clearsky'))                      return '☀️'
  return '🌡️'
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

    const data = await res.json() as {
      properties: {
        timeseries: Array<{
          time: string
          data: {
            instant: { details: { air_temperature: number } }
            next_1_hours?: { summary: { symbol_code: string } }
            next_6_hours?: { summary: { symbol_code: string } }
          }
        }>
      }
    }

    const current = data.properties.timeseries[0]
    const temp    = Math.round(current.data.instant.details.air_temperature)
    const code    = current.data.next_1_hours?.summary.symbol_code
                 ?? current.data.next_6_hours?.summary.symbol_code
                 ?? 'clearsky_day'

    return c.json({ temp, emoji: symbolToEmoji(code), code })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

export default weather
