export type CarrierName = 'bring' | 'postnord' | string

export type PackageStatus = 'pending' | 'in_transit' | 'delivered' | 'exception' | 'unknown'

export interface TrackingEvent {
  timestamp: string
  description: string
  location: string | null
}

export interface TrackedPackage {
  trackingNumber: string
  carrier: CarrierName
  status: PackageStatus
  statusDescription: string
  estimatedDelivery: string | null
  lastEvent: TrackingEvent | null
}

export interface CarrierAdapter {
  name: CarrierName
  label: string
  color: string
  canHandle(trackingNumber: string): boolean
  track(trackingNumber: string): Promise<TrackedPackage>
}
