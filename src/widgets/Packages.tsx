import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type PackageStatus = 'pending' | 'in_transit' | 'delivered' | 'exception' | 'unknown'

interface TrackedPackage {
  trackingNumber: string
  carrier: string
  status: PackageStatus
  statusDescription: string
  estimatedDelivery: string | null
  lastEvent: { timestamp: string; description: string; location: string | null } | null
}

interface SavedEntry {
  trackingNumber: string
  carrier: string  // 'auto' or explicit carrier name
  addedAt: string
}

interface CarrierInfo {
  name: string
  label: string
  color: string
}

type FetchState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: TrackedPackage }

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'homepage:packages'

function loadEntries(): SavedEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as SavedEntry[]
  } catch {
    return []
  }
}

function saveEntries(entries: SavedEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useCarriers(): CarrierInfo[] {
  const [carriers, setCarriers] = useState<CarrierInfo[]>([])
  useEffect(() => {
    fetch('/api/tracking/carriers')
      .then((r) => r.json())
      .then(setCarriers)
      .catch(() => {})
  }, [])
  return carriers
}

function usePackage(entry: SavedEntry): FetchState {
  const [state, setState] = useState<FetchState>({ status: 'loading' })

  useEffect(() => {
    setState({ status: 'loading' })
    const carrier = entry.carrier !== 'auto' ? `&carrier=${entry.carrier}` : ''
    fetch(`/api/tracking?q=${encodeURIComponent(entry.trackingNumber)}${carrier}`)
      .then(async (r) => {
        const json = await r.json() as TrackedPackage & { error?: string }
        if (json.error) setState({ status: 'error', message: json.error })
        else setState({ status: 'success', data: json })
      })
      .catch((err: Error) => setState({ status: 'error', message: err.message }))
  }, [entry.trackingNumber, entry.carrier])

  return state
}

// ─── Status UI ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PackageStatus, { label: string; color: string; icon: string }> = {
  pending:    { label: 'Pending',     color: 'text-[var(--color-muted-foreground)]', icon: '○' },
  in_transit: { label: 'In transit',  color: 'text-blue-500',                        icon: '→' },
  delivered:  { label: 'Delivered',   color: 'text-green-500',                       icon: '✓' },
  exception:  { label: 'Exception',   color: 'text-red-500',                         icon: '!' },
  unknown:    { label: 'Unknown',     color: 'text-[var(--color-muted-foreground)]', icon: '?' },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CarrierBadge({ carrier, carriers }: { carrier: string; carriers: CarrierInfo[] }) {
  const info = carriers.find((c) => c.name === carrier)
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white"
      style={{ backgroundColor: info?.color ?? '#888' }}
    >
      {info?.label ?? carrier}
    </span>
  )
}

function PackageRow({
  entry,
  carriers,
  onRemove,
}: {
  entry: SavedEntry
  carriers: CarrierInfo[]
  onRemove: () => void
}) {
  const state = usePackage(entry)
  const short = entry.trackingNumber.slice(-8)

  return (
    <li className="flex items-start justify-between gap-2 rounded border border-[var(--color-border)] p-2.5">
      <div className="min-w-0 flex-1">
        {state.status === 'loading' && (
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 animate-spin rounded-full border border-[var(--color-border)] border-t-[var(--color-muted-foreground)]" />
            <span className="text-xs text-[var(--color-muted-foreground)]">···{short}</span>
          </div>
        )}
        {state.status === 'error' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-500">···{short}</span>
            <span className="text-xs text-red-400">{state.message}</span>
          </div>
        )}
        {state.status === 'success' && (() => {
          const pkg = state.data
          const cfg = STATUS_CONFIG[pkg.status]
          return (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <CarrierBadge carrier={pkg.carrier} carriers={carriers} />
                <span className="text-xs text-[var(--color-muted-foreground)]">···{short}</span>
                <span className={cn('text-xs font-medium', cfg.color)}>
                  {cfg.icon} {pkg.statusDescription}
                </span>
              </div>
              {pkg.lastEvent && (
                <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                  {pkg.lastEvent.description}
                  {pkg.lastEvent.location && ` · ${pkg.lastEvent.location}`}
                </p>
              )}
              {pkg.estimatedDelivery && (
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  Est. {new Date(pkg.estimatedDelivery).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </p>
              )}
            </div>
          )
        })()}
      </div>
      <button
        onClick={onRemove}
        className="flex-shrink-0 text-xs text-[var(--color-muted-foreground)] hover:text-red-500"
        aria-label="Remove"
      >
        ✕
      </button>
    </li>
  )
}

function AddForm({ carriers, onAdd }: { carriers: CarrierInfo[]; onAdd: (entry: SavedEntry) => void }) {
  const [open, setOpen] = useState(false)
  const [number, setNumber] = useState('')
  const [carrier, setCarrier] = useState('auto')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const n = number.trim()
    if (!n) return
    onAdd({ trackingNumber: n, carrier, addedAt: new Date().toISOString() })
    setNumber('')
    setCarrier('auto')
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded border border-dashed border-[var(--color-border)] py-1.5 text-xs text-[var(--color-muted-foreground)] hover:border-[var(--color-foreground)] hover:text-[var(--color-foreground)]"
      >
        + Add tracking number
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <input
        autoFocus
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        placeholder="Tracking number"
        className="w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-xs text-[var(--color-foreground)] outline-none focus:border-[#007AFF]"
      />
      <div className="flex gap-2">
        <select
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
          className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-xs text-[var(--color-foreground)]"
        >
          <option value="auto">Auto-detect carrier</option>
          {carriers.map((c) => (
            <option key={c.name} value={c.name}>{c.label}</option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded bg-[#007AFF] px-3 py-1 text-xs text-white hover:opacity-90"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded px-2 py-1 text-xs text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Packages() {
  const [entries, setEntries] = useState<SavedEntry[]>(loadEntries)
  const carriers = useCarriers()

  const handleAdd = useCallback((entry: SavedEntry) => {
    setEntries((prev) => {
      const next = [...prev, entry]
      saveEntries(next)
      return next
    })
  }, [])

  const handleRemove = useCallback((trackingNumber: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.trackingNumber !== trackingNumber)
      saveEntries(next)
      return next
    })
  }, [])

  return (
    <div className="flex h-full flex-col bg-transparent p-8">
      <div className="mb-4 flex shrink-0 flex-col items-center gap-1.5 border-b border-[var(--color-border)] pb-4">
        <div className="text-3xl leading-none">📦</div>
        <h3 className="text-xl font-semibold tracking-tight text-[var(--color-foreground)]">Packages</h3>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {entries.length === 0 && (
          <p className="py-2 text-center text-xs text-[var(--color-muted-foreground)]">
            No packages tracked
          </p>
        )}
        <ul className="space-y-2">
          {entries.map((entry) => (
            <PackageRow
              key={entry.trackingNumber}
              entry={entry}
              carriers={carriers}
              onRemove={() => handleRemove(entry.trackingNumber)}
            />
          ))}
        </ul>
        <AddForm carriers={carriers} onAdd={handleAdd} />
      </div>
    </div>
  )
}
