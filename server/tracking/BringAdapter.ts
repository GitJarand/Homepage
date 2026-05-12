import type { CarrierAdapter, TrackedPackage, TrackingEvent, PackageStatus } from './types'

interface BringEvent {
  description: string
  status: string
  dateIso: string
  city?: string
  country?: string
}

interface BringPackage {
  statusDescription?: string
  dateOfEstimatedDelivery?: string
  eventSet?: BringEvent[]
}

interface BringResponse {
  consignmentSet?: Array<{
    packageSet?: BringPackage[]
  }>
}

function mapStatus(status: string): PackageStatus {
  const s = status?.toUpperCase() ?? ''
  if (s.includes('DELIVERED')) return 'delivered'
  if (s.includes('IN_TRANSIT') || s.includes('TRANSPORT') || s.includes('ARRIVED')) return 'in_transit'
  if (s.includes('NOTIFICATION') || s.includes('PRE_NOTIFIED') || s.includes('REGISTERED')) return 'pending'
  if (s.includes('RETURN') || s.includes('PROBLEM') || s.includes('DAMAGED')) return 'exception'
  return 'unknown'
}

export const BringAdapter: CarrierAdapter = {
  name: 'bring',
  label: 'Bring',
  color: '#D22B2B',

  canHandle(trackingNumber: string): boolean {
    const n = trackingNumber.replace(/\s/g, '')
    return /^\d{17,20}$/.test(n) || /^[A-Z]{2}\d{9}[A-Z]{2}$/.test(n)
  },

  async track(trackingNumber: string): Promise<TrackedPackage> {
    const uid = process.env.BRING_API_UID
    const key = process.env.BRING_API_KEY
    if (!uid || !key) throw new Error('Bring API credentials not configured')

    const res = await fetch(
      `https://api.bring.com/tracking/api/v2/tracking.json?q=${encodeURIComponent(trackingNumber)}`,
      {
        headers: {
          'X-MyBring-API-Uid': uid,
          'X-MyBring-API-Key': key,
          'Accept': 'application/json',
        },
      }
    )

    if (!res.ok) throw new Error(`Bring API returned ${res.status}`)

    const data = await res.json() as BringResponse
    const pkg = data.consignmentSet?.[0]?.packageSet?.[0]
    if (!pkg) throw new Error('Package not found')

    const events: TrackingEvent[] = (pkg.eventSet ?? []).map((e) => ({
      timestamp: e.dateIso,
      description: e.description,
      location: e.city ? `${e.city}, ${e.country ?? ''}`.trim() : null,
    }))

    return {
      trackingNumber,
      carrier: 'bring',
      status: mapStatus(pkg.eventSet?.[0]?.status ?? ''),
      statusDescription: pkg.statusDescription ?? 'Unknown',
      estimatedDelivery: pkg.dateOfEstimatedDelivery ?? null,
      lastEvent: events[0] ?? null,
    }
  },
}
