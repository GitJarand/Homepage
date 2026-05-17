import { useState, useEffect, useRef } from 'react'
import { getCoords } from '../lib/geolocation'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

interface Forecast { day: string; emoji: string; max: number; min: number }
interface Weather  { temp: number; emoji: string; location: string; forecast: Forecast[] }

async function fetchWeather(): Promise<Weather | null> {
  try {
    const coords = await getCoords()
    const qs = coords ? `?lat=${coords.latitude.toFixed(4)}&lon=${coords.longitude.toFixed(4)}` : ''
    const res = await fetch(`/api/weather/current${qs}`)
    const d   = await res.json() as Partial<Weather>
    if (d.temp !== undefined) return d as Weather
  } catch {}
  return null
}

export function Clock() {
  const [now, setNow]         = useState(() => new Date())
  const wrapRef               = useRef<HTMLDivElement>(null)
  const [fs, setFs]           = useState(40)
  const [weather, setWeather] = useState<Weather | null>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const calc = () => {
      const byWidth  = Math.floor(el.clientWidth / (8 * 0.62))
      const byHeight = Math.floor(el.clientHeight * 0.30)
      setFs(Math.min(byWidth, byHeight))
    }
    calc()
    const ro = new ResizeObserver(calc)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    fetchWeather().then(w => { if (w) setWeather(w) })
    const id = setInterval(() => fetchWeather().then(w => { if (w) setWeather(w) }), 10 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  const hh = pad(now.getHours())
  const mm = pad(now.getMinutes())
  const ss = pad(now.getSeconds())

  const weekday = now.toLocaleDateString('en-GB', { weekday: 'long' })
  const day     = now.getDate()
  const month   = now.toLocaleDateString('en-GB', { month: 'long' })
  const year    = now.getFullYear()

  const datefs        = Math.max(9,  Math.round(fs * 0.22))
  const locationfs    = Math.max(9,  Math.round(fs * 0.20))
  const iconfs        = Math.max(14, Math.round(fs * 0.45))
  const tempfs        = Math.max(9,  Math.round(fs * 0.20))
  const forecastDayfs = Math.max(7,  Math.round(fs * 0.14))
  const forecastIconfs= Math.max(11, Math.round(fs * 0.26))
  const forecastTempfs= Math.max(7,  Math.round(fs * 0.14))

  return (
    <div ref={wrapRef} className="flex h-full flex-col px-3 pt-2 pb-2.5">

      {/* ── Top row: location (left) + current weather (right) ── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-1 text-black/40 dark:text-white/40">
          <svg width={locationfs} height={locationfs} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 6-8 13-8 13s-8-7-8-13a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span className="font-medium" style={{ fontSize: locationfs }}>
            {weather?.location ?? '…'}
          </span>
        </div>

        {weather && (
          <div className="flex flex-col items-end leading-none">
            <span style={{ fontSize: iconfs, lineHeight: 1 }}>{weather.emoji}</span>
            <span className="font-bold text-black/80 dark:text-white/80 tabular-nums" style={{ fontSize: tempfs }}>
              {weather.temp}°C
            </span>
          </div>
        )}
      </div>

      {/* ── Clock ── */}
      <div className="flex flex-1 flex-col items-center justify-center gap-0.5">
        <span
          className="whitespace-nowrap tabular-nums font-bold leading-none text-black dark:text-white"
          style={{ fontSize: fs }}
        >
          {hh}:{mm}:{ss}
        </span>
        <span
          className="whitespace-nowrap font-medium text-black/50 dark:text-white/50"
          style={{ fontSize: datefs }}
        >
          {weekday}, {day} {month} {year}
        </span>
      </div>

      {/* ── 3-day forecast: emoji + temps on one line ── */}
      {weather && weather.forecast.length > 0 && (
        <div className="flex justify-around pt-1">
          {weather.forecast.map(f => (
            <div key={f.day} className="flex flex-col items-center gap-0.5">
              <span className="font-medium uppercase tracking-wide text-black/35 dark:text-white/35" style={{ fontSize: forecastDayfs }}>
                {f.day}
              </span>
              <div className="flex items-center gap-0.5">
                <span style={{ fontSize: forecastIconfs, lineHeight: 1 }}>{f.emoji}</span>
                <div className="flex flex-col leading-none">
                  <span className="font-bold text-black/70 dark:text-white/70 tabular-nums" style={{ fontSize: forecastTempfs }}>{f.max}°</span>
                  <span className="text-black/35 dark:text-white/35 tabular-nums" style={{ fontSize: forecastTempfs - 1 }}>{f.min}°</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
