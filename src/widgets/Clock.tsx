import { useState, useEffect, useRef } from 'react'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

interface Forecast { day: string; emoji: string; max: number; min: number }
interface Weather  { temp: number; emoji: string; location: string; forecast: Forecast[] }

export function Clock() {
  const [now, setNow]       = useState(() => new Date())
  const wrapRef             = useRef<HTMLDivElement>(null)
  const [fs, setFs]         = useState(40)
  const [weather, setWeather] = useState<Weather | null>(null)

  // Tick every second
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Responsive clock font size
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const calc = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      const byWidth  = Math.floor(w / (8 * 0.62))
      const byHeight = Math.floor(h * 0.30)   // clock takes ~30% of height now
      setFs(Math.min(byWidth, byHeight))
    }
    calc()
    const ro = new ResizeObserver(calc)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Weather — fetch on mount, refresh every 10 min
  useEffect(() => {
    function load() {
      fetch('/api/weather/current')
        .then(r => r.json())
        .then((d: Partial<Weather>) => {
          if (d.temp !== undefined) setWeather(d as Weather)
        })
        .catch(() => {})
    }
    load()
    const id = setInterval(load, 10 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  const hh = pad(now.getHours())
  const mm = pad(now.getMinutes())
  const ss = pad(now.getSeconds())

  const weekday = now.toLocaleDateString('en-GB', { weekday: 'long' })
  const day     = now.getDate()
  const month   = now.toLocaleDateString('en-GB', { month: 'long' })
  const year    = now.getFullYear()

  // All sizes derived from fs so they scale together
  const datefs        = Math.max(9,  Math.round(fs * 0.22))
  const locationfs    = Math.max(9,  Math.round(fs * 0.20))
  const iconfs        = Math.max(20, Math.round(fs * 0.70))   // big current-weather icon
  const tempfs        = Math.max(10, Math.round(fs * 0.28))
  const forecastDayfs = Math.max(8,  Math.round(fs * 0.17))
  const forecastIconfs= Math.max(14, Math.round(fs * 0.38))
  const forecastTempfs= Math.max(8,  Math.round(fs * 0.18))

  return (
    <div ref={wrapRef} className="flex h-full flex-col px-3 pt-2 pb-2.5">

      {/* ── Top row: location (left) + current weather (right) ── */}
      <div className="flex items-start justify-between">
        {/* Location */}
        <div className="flex items-center gap-1 text-black/40">
          <svg width={locationfs} height={locationfs} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 6-8 13-8 13s-8-7-8-13a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span className="font-medium text-black/40" style={{ fontSize: locationfs }}>
            {weather?.location ?? '…'}
          </span>
        </div>

        {/* Current weather: large emoji + temp */}
        {weather && (
          <div className="flex flex-col items-end leading-none">
            <span style={{ fontSize: iconfs, lineHeight: 1 }}>{weather.emoji}</span>
            <span className="font-bold text-black/80 tabular-nums" style={{ fontSize: tempfs }}>
              {weather.temp}°C
            </span>
          </div>
        )}
      </div>

      {/* ── Clock ── */}
      <div className="flex flex-1 flex-col items-center justify-center gap-0.5">
        <span
          className="whitespace-nowrap tabular-nums font-bold leading-none text-black"
          style={{ fontSize: fs }}
        >
          {hh}:{mm}:{ss}
        </span>
        <span
          className="whitespace-nowrap font-medium text-black/50"
          style={{ fontSize: datefs }}
        >
          {weekday}, {day} {month} {year}
        </span>
      </div>

      {/* ── 3-day forecast ── */}
      {weather && weather.forecast.length > 0 && (
        <div className="flex justify-around border-t border-black/10 pt-2">
          {weather.forecast.map(f => (
            <div key={f.day} className="flex flex-col items-center gap-0.5">
              <span className="font-medium uppercase tracking-wide text-black/35" style={{ fontSize: forecastDayfs }}>
                {f.day}
              </span>
              <span style={{ fontSize: forecastIconfs, lineHeight: 1.1 }}>{f.emoji}</span>
              <span className="font-bold text-black/70 tabular-nums" style={{ fontSize: forecastTempfs }}>
                {f.max}°
              </span>
              <span className="text-black/35 tabular-nums" style={{ fontSize: forecastTempfs - 1 }}>
                {f.min}°
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
