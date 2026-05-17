import { useState, useEffect, useRef } from 'react'
import { RefreshButton } from '../components/RefreshButton'

interface HourPrice { hour: number; price: number }
interface ApiResponse {
  today: HourPrice[]
  tomorrow: HourPrice[]
  zone: string
  currentHour: number
  error?: string
}

function priceColor(price: number, min: number, max: number): string {
  const t = max > min ? (price - min) / (max - min) : 0
  if (t < 0.33) return '#34c759'
  if (t < 0.66) return '#ff9500'
  return '#ff3b30'
}

function PriceGraph({ prices, currentHour }: { prices: HourPrice[]; currentHour: number }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [svgSize, setSvgSize] = useState({ w: 400, h: 100 })

  useEffect(() => {
    if (!svgRef.current) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) setSvgSize({ w: width, h: height })
    })
    ro.observe(svgRef.current)
    return () => ro.disconnect()
  }, [])

  if (!prices.length) return null

  const W = 400
  const H = 100
  const PAD = { top: 8, right: 4, bottom: 18, left: 28 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  // Counter-scale so text renders at natural pixel size despite preserveAspectRatio="none"
  const tx = W / svgSize.w
  const ty = H / svgSize.h

  const min   = Math.min(...prices.map(p => p.price))
  const max   = Math.max(...prices.map(p => p.price))
  const range = max - min || 1

  const x = (hour: number) => PAD.left + (hour / 23) * chartW
  const y = (price: number) => PAD.top + chartH - ((price - min) / range) * chartH

  const points = prices.map(p => ({ px: x(p.hour), py: y(p.price), ...p }))

  // Build smooth path using cubic bezier
  const linePath = points.reduce((d, pt, i) => {
    if (i === 0) return `M ${pt.px},${pt.py}`
    const prev = points[i - 1]
    const cpx = (prev.px + pt.px) / 2
    return `${d} C ${cpx},${prev.py} ${cpx},${pt.py} ${pt.px},${pt.py}`
  }, '')

  const areaPath = `${linePath} L ${points[points.length - 1].px},${PAD.top + chartH} L ${points[0].px},${PAD.top + chartH} Z`

  // Current hour marker
  const curr = points.find(p => p.hour === currentHour)

  // Y-axis labels
  const yLabels = [min, (min + max) / 2, max]

  // X-axis hour labels — every 6h
  const xLabels = [0, 6, 12, 18, 23]

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full flex-1 overflow-visible"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="elec-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff9500" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ff9500" stopOpacity="0.02" />
        </linearGradient>
        <clipPath id="elec-clip">
          <rect x={PAD.left} y={PAD.top} width={chartW} height={chartH} />
        </clipPath>
      </defs>

      {/* Horizontal grid lines */}
      {yLabels.map((val, i) => (
        <g key={i}>
          <line
            x1={PAD.left} y1={y(val)}
            x2={PAD.left + chartW} y2={y(val)}
            stroke="currentColor" strokeOpacity="0.07" strokeWidth="1"
            className="text-[var(--color-foreground)]"
          />
          <text
            transform={`translate(${PAD.left - 4},${y(val)}) scale(${tx},${ty})`}
            textAnchor="end" dominantBaseline="middle"
            fontSize="9" fill="currentColor" fillOpacity="0.55"
            className="text-[var(--color-foreground)]"
          >
            {Math.round(val)}
          </text>
        </g>
      ))}

      {/* Area fill */}
      <path d={areaPath} fill="url(#elec-area)" clipPath="url(#elec-clip)" />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke="#ff9500"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        clipPath="url(#elec-clip)"
      />

      {/* Current hour vertical line */}
      {curr && (
        <line
          x1={curr.px} y1={PAD.top}
          x2={curr.px} y2={PAD.top + chartH}
          stroke={priceColor(curr.price, min, max)}
          strokeWidth="1.5"
          strokeDasharray="3 2"
          opacity="0.7"
        />
      )}

      {/* Current hour dot */}
      {curr && (
        <>
          <circle cx={curr.px} cy={curr.py} r="4" fill={priceColor(curr.price, min, max)} />
          <circle cx={curr.px} cy={curr.py} r="2.5" fill="var(--card-bg)" />
        </>
      )}

      {/* X-axis labels */}
      {xLabels.map(h => {
        const pt = points.find(p => p.hour === h)
        if (!pt) return null
        return (
          <text
            key={h}
            transform={`translate(${pt.px},${H - 3}) scale(${tx},${ty})`}
            textAnchor="middle"
            fontSize="9" fill="currentColor" fillOpacity="0.55"
            className="text-[var(--color-foreground)]"
          >
            {String(h).padStart(2, '0')}
          </text>
        )
      })}
    </svg>
  )
}

export function Electricity() {
  const [data, setData]     = useState<ApiResponse | null>(null)
  const [status, setStatus] = useState<'loading' | 'error' | 'ok'>('loading')
  const [showTomorrow, setShowTomorrow] = useState(false)
  const [refreshKey, setRefreshKey]     = useState(0)

  useEffect(() => {
    setStatus('loading')
    fetch('/api/electricity')
      .then(r => r.json() as Promise<ApiResponse>)
      .then(d => { if (d.error) { setStatus('error'); return }; setData(d); setStatus('ok') })
      .catch(() => setStatus('error'))
  }, [refreshKey])

  const prices      = showTomorrow ? (data?.tomorrow ?? []) : (data?.today ?? [])
  const currentHour = data?.currentHour ?? new Date().getHours()
  const min         = prices.length ? Math.min(...prices.map(p => p.price)) : 0
  const max         = prices.length ? Math.max(...prices.map(p => p.price)) : 0
  const current     = data?.today.find(p => p.hour === currentHour)
  const hasTomorrow = (data?.tomorrow?.length ?? 0) > 0

  return (
    <div className="relative flex h-full flex-col px-4 pb-3 pt-3">
      {/* Header */}
      <div className="relative mb-3 flex shrink-0 items-center justify-center pb-3">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#ffd60a" className="shrink-0">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>

        <RefreshButton
          onClick={() => setRefreshKey(k => k + 1)}
          loading={status === 'loading'}
          className="absolute left-0"
        />

        {hasTomorrow && (
          <div className="absolute right-0 flex gap-1">
            {(['Today', 'Tomorrow'] as const).map((label, i) => (
              <button
                key={label}
                onClick={() => setShowTomorrow(i === 1)}
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  showTomorrow === (i === 1)
                    ? 'bg-[var(--color-foreground)] text-[var(--card-bg)]'
                    : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Current price */}
      {status === 'ok' && current && !showTomorrow && (
        <div className="mb-1 flex items-baseline justify-center gap-1">
          <span className="text-[36px] font-semibold tabular-nums leading-none text-[var(--color-foreground)]">
            {current.price.toFixed(1)}
          </span>
          <span className="text-[12px] text-[var(--color-muted-foreground)]">øre/kWh</span>
        </div>
      )}

      {/* Error */}
      {status === 'error' && <p className="text-sm text-red-400">Failed to load prices.</p>}

      {/* Graph */}
      {status === 'ok' && prices.length > 0 && (
        <div className="flex min-h-0 flex-1 flex-col">
          <PriceGraph prices={prices} currentHour={showTomorrow ? -1 : currentHour} />
        </div>
      )}

      {/* Min / max */}
      {status === 'ok' && prices.length > 0 && (
        <div className="mt-1 flex justify-between text-[10px] text-[var(--color-muted-foreground)]">
          <span style={{ color: '#34c759' }}>↓ {min.toFixed(1)} øre</span>
          <span className="opacity-40">{data?.zone}</span>
          <span style={{ color: '#ff3b30' }}>↑ {max.toFixed(1)} øre</span>
        </div>
      )}
    </div>
  )
}
