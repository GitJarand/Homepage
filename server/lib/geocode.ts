/**
 * Reverse-geocodes lat/lon to a city name using Nominatim.
 * Results are cached for 24 hours (keyed by coords rounded to 2dp).
 */

const cache = new Map<string, { name: string; ts: number }>()
const TTL   = 24 * 60 * 60 * 1000

export async function reverseGeocode(lat: string, lon: string, fallback = 'Unknown'): Promise<string> {
  const key    = `${parseFloat(lat).toFixed(2)},${parseFloat(lon).toFixed(2)}`
  const cached = cache.get(key)
  if (cached && Date.now() - cached.ts < TTL) return cached.name

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      {
        headers: { 'User-Agent': 'HomepageDashboard/1.0 github.com/GitJarand/Homepage' },
        signal: AbortSignal.timeout(5000),
      },
    )
    if (!res.ok) return fallback
    const geo = await res.json() as { address?: { city?: string; town?: string; village?: string; suburb?: string } }
    const name = geo.address?.city ?? geo.address?.town ?? geo.address?.village ?? geo.address?.suburb ?? fallback
    cache.set(key, { name, ts: Date.now() })
    return name
  } catch {
    return fallback
  }
}
