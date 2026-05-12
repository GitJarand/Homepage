import type { CarrierAdapter, TrackedPackage, PackageStatus } from './types'

interface Track17Event {
  a: string   // description
  c?: string  // location
  d: string   // datetime
}

interface Track17Accepted {
  number: string
  track?: {
    z0?: { z: string }   // current status text
    w1?: Track17Event    // latest event
  }
}

interface Track17Response {
  code: number
  data?: {
    accepted?: Track17Accepted[]
    rejected?: Array<{ number: string; error: { code: number; message: string } }>
  }
}

function mapStatus(s: string): PackageStatus {
  const l = s.toLowerCase()
  if (l.includes('delivered')) return 'delivered'
  if (l.includes('transit') || l.includes('departed') || l.includes('arrived') || l.includes('shipping')) return 'in_transit'
  if (l.includes('pickup') || l.includes('pending') || l.includes('info received') || l.includes('registered')) return 'pending'
  if (l.includes('exception') || l.includes('undelivered') || l.includes('return') || l.includes('failed')) return 'exception'
  return 'unknown'
}

export const SeventeenTrackAdapter: CarrierAdapter = {
  name: '17track',
  label: '17TRACK',
  color: '#F0532A',

  // 17TRACK is the fallback — never auto-matches, always used explicitly or as fallback
  canHandle: () => false,

  async track(trackingNumber: string): Promise<TrackedPackage> {
    const key = process.env.SEVENTEENTRACK_API_KEY
    if (!key) throw new Error('SEVENTEENTRACK_API_KEY is not configured')

    const headers = { '17token': key, 'Content-Type': 'application/json' }
    const body = JSON.stringify([{ number: trackingNumber }])

    // Register the number (idempotent — no extra credit if already registered)
    await fetch('https://api.17track.net/track/v2/register', { method: 'POST', headers, body })

    const res = await fetch('https://api.17track.net/track/v2/gettrackinfo', { method: 'POST', headers, body })
    if (!res.ok) throw new Error(`17TRACK API returned ${res.status}`)

    const data = await res.json() as Track17Response
    const accepted = data.data?.accepted?.[0]

    if (!accepted) {
      const reason = data.data?.rejected?.[0]?.error?.message ?? 'Tracking number not found'
      throw new Error(reason)
    }

    const statusText = accepted.track?.z0?.z ?? 'Unknown'
    const latest = accepted.track?.w1 ?? null

    return {
      trackingNumber,
      carrier: '17track',
      status: mapStatus(statusText),
      statusDescription: statusText,
      estimatedDelivery: null,
      lastEvent: latest ? { timestamp: latest.d, description: latest.a, location: latest.c ?? null } : null,
    }
  },
}
