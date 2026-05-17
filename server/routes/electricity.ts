import { Hono } from 'hono'
import { reverseGeocode } from '../lib/geocode'

const electricity = new Hono()

const ZONE        = process.env.ELECTRICITY_ZONE ?? 'NO2'
const DEFAULT_LAT = process.env.WEATHER_LAT      ?? '58.9611'
const DEFAULT_LON = process.env.WEATHER_LON      ?? '5.6168'
const BASE = 'https://www.hvakosterstrommen.no/api/v1/prices'

interface RawPrice {
  NOK_per_kWh: number
  time_start:  string
}

export interface HourPrice {
  hour:  number   // 0–23
  price: number   // øre/kWh
}

// Cache: zone+date → prices
const cache = new Map<string, { prices: HourPrice[]; ts: number }>()
const TTL = 60 * 60 * 1000 // 1 hour

async function fetchPrices(date: Date): Promise<HourPrice[]> {
  const year  = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day   = String(date.getDate()).padStart(2, '0')
  const key   = `${ZONE}-${year}-${month}-${day}`

  const cached = cache.get(key)
  if (cached && Date.now() - cached.ts < TTL) return cached.prices

  const url = `${BASE}/${year}/${month}-${day}_${ZONE}.json`
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`Electricity API failed: ${res.status}`)

  const raw = await res.json() as RawPrice[]
  const prices: HourPrice[] = raw.map(r => ({
    hour:  new Date(r.time_start).getHours(),
    price: Math.round(r.NOK_per_kWh * 100 * 100) / 100, // øre/kWh, 2dp
  }))

  cache.set(key, { prices, ts: Date.now() })
  return prices
}

// GET /api/electricity
electricity.get('/', async (c) => {
  try {
    const lat = c.req.query('lat') ?? DEFAULT_LAT
    const lon = c.req.query('lon') ?? DEFAULT_LON

    const now      = new Date()
    const [today, location] = await Promise.all([
      fetchPrices(now),
      reverseGeocode(lat, lon),
    ])

    // Try tomorrow — available after ~13:00 CET
    let tomorrow: HourPrice[] = []
    try {
      const tmr = new Date(now)
      tmr.setDate(tmr.getDate() + 1)
      tomorrow = await fetchPrices(tmr)
    } catch { /* not yet published */ }

    return c.json({ today, tomorrow, zone: ZONE, location, currentHour: now.getHours() })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

export default electricity
