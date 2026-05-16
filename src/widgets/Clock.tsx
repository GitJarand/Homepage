import { useState, useEffect, useRef } from 'react'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function Clock() {
  const [now, setNow] = useState(() => new Date())
  const wrapRef = useRef<HTMLDivElement>(null)
  const [fs, setFs] = useState(48)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const calc = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      // "HH:MM:SS" = 8 chars. Plus Jakarta Sans Bold digits are ~0.60em wide each.
      // Height: time takes ~60% of the card, date below takes ~15%.
      const byWidth  = Math.floor(w / (8 * 0.60))
      const byHeight = Math.floor(h * 0.55)
      setFs(Math.min(byWidth, byHeight))
    }
    calc()
    const ro = new ResizeObserver(calc)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const hh = pad(now.getHours())
  const mm = pad(now.getMinutes())
  const ss = pad(now.getSeconds())

  const weekday = now.toLocaleDateString('en-GB', { weekday: 'long' })
  const day     = now.getDate()
  const month   = now.toLocaleDateString('en-GB', { month: 'long' })
  const year    = now.getFullYear()

  const datefs = Math.max(10, Math.round(fs * 0.20))

  return (
    <div ref={wrapRef} className="flex h-full flex-col items-center justify-center gap-1 px-2">
      <span
        className="whitespace-nowrap tabular-nums font-bold leading-none text-black"
        style={{ fontSize: fs }}
      >
        {hh}:{mm}:{ss}
      </span>
      <span
        className="whitespace-nowrap font-medium text-black/55"
        style={{ fontSize: datefs }}
      >
        {weekday}, {day} {month} {year}
      </span>
    </div>
  )
}
