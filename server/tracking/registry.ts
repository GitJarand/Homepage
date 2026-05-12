import type { CarrierAdapter } from './types'
import { BringAdapter } from './BringAdapter'
import { SeventeenTrackAdapter } from './SeventeenTrackAdapter'

// Add new direct carrier adapters here — order matters for auto-detection
const directAdapters: CarrierAdapter[] = [
  BringAdapter,
]

export const adapters: CarrierAdapter[] = [
  ...directAdapters,
  SeventeenTrackAdapter,
]

export function getAdapter(trackingNumber: string, carrier?: string): CarrierAdapter | null {
  // Explicit carrier requested
  if (carrier) return adapters.find((a) => a.name === carrier) ?? null

  // Try direct adapters first
  const direct = directAdapters.find((a) => a.canHandle(trackingNumber))
  if (direct) return direct

  // Fall back to 17TRACK for anything else (PostNord, DHL, etc.)
  if (process.env.SEVENTEENTRACK_API_KEY) return SeventeenTrackAdapter

  return null
}

export function listCarriers() {
  return adapters.map((a) => ({ name: a.name, label: a.label, color: a.color }))
}
