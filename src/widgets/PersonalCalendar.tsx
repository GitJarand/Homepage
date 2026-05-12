import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { WidgetDataState } from './types'

// ─── Types ────────────────────────────────────────────────────────────────────

type CalendarView = 'day' | 'week' | 'month'

interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  location: string | null
  calendar: string
}

// ─── Calendar colors ──────────────────────────────────────────────────────────

const PALETTE = ['#007AFF', '#FF3B30', '#34C759', '#FF9500', '#AF52DE', '#FF2D55']
const assignedColors: Record<string, string> = {}
let nextColor = 0

function calendarColor(name: string): string {
  if (!assignedColors[name]) {
    assignedColors[name] = PALETTE[nextColor++ % PALETTE.length]
  }
  return assignedColors[name]
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}
function addMonths(d: Date, n: number): Date {
  const r = new Date(d); r.setMonth(r.getMonth() + n); return r
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}
function weekStart(d: Date): Date {
  const r = new Date(d)
  const day = r.getDay()
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1))
  r.setHours(0, 0, 0, 0)
  return r
}
function monthStart(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1) }
function monthEnd(d: Date): Date { return new Date(d.getFullYear(), d.getMonth() + 1, 0) }

function getRange(date: Date, view: CalendarView): { start: Date; end: Date } {
  if (view === 'day') {
    const s = new Date(date); s.setHours(0, 0, 0, 0)
    const e = new Date(date); e.setHours(23, 59, 59, 999)
    return { start: s, end: e }
  }
  if (view === 'week') {
    const s = weekStart(date)
    const e = addDays(s, 6); e.setHours(23, 59, 59, 999)
    return { start: s, end: e }
  }
  const s = monthStart(date); s.setHours(0, 0, 0, 0)
  const e = monthEnd(date); e.setHours(23, 59, 59, 999)
  return { start: s, end: e }
}

function navigate(date: Date, view: CalendarView, dir: 1 | -1): Date {
  if (view === 'day') return addDays(date, dir)
  if (view === 'week') return addDays(date, dir * 7)
  return addMonths(date, dir)
}

// ─── Format helpers ───────────────────────────────────────────────────────────

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function headerTitle(date: Date, view: CalendarView): string {
  if (view === 'day') {
    if (isSameDay(date, new Date())) return 'Today'
    return `${DAY_SHORT[date.getDay()]} ${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`
  }
  if (view === 'week') {
    const s = weekStart(date)
    const e = addDays(s, 6)
    return s.getMonth() === e.getMonth()
      ? `${s.getDate()}–${e.getDate()} ${MONTH_SHORT[s.getMonth()]}`
      : `${s.getDate()} ${MONTH_SHORT[s.getMonth()]} – ${e.getDate()} ${MONTH_SHORT[e.getMonth()]}`
  }
  return `${MONTH_SHORT[date.getMonth()]} ${date.getFullYear()}`
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function isAllDay(start: string, end: string): boolean {
  const s = new Date(start); const e = new Date(end)
  return s.getHours() === 0 && s.getMinutes() === 0 && e.getTime() - s.getTime() >= 86_400_000
}

// ─── Data hook ────────────────────────────────────────────────────────────────

function useCalendarData(date: Date, view: CalendarView): WidgetDataState<CalendarEvent[]> {
  const [state, setState] = useState<WidgetDataState<CalendarEvent[]>>({
    data: null, status: 'loading', error: null,
  })

  useEffect(() => {
    const { start, end } = getRange(date, view)
    setState((s) => ({ ...s, status: 'loading' }))

    fetch(`/api/calendar/personal?start=${start.toISOString()}&end=${end.toISOString()}`)
      .then(async (r) => {
        const text = await r.text()
        if (!r.ok || !text) throw new Error(`Server returned ${r.status}: ${text || '(empty response)'}`)
        return JSON.parse(text) as { events?: CalendarEvent[]; error?: string }
      })
      .then((json) => {
        if (json.error) setState({ data: null, status: 'error', error: json.error })
        else setState({ data: json.events ?? [], status: 'success', error: null })
      })
      .catch((err: Error) => setState({ data: null, status: 'error', error: err.message }))
  }, [date.toDateString(), view])

  return state
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Dot({ color }: { color: string }) {
  return <span className="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: color }} />
}

// ─── Day view ─────────────────────────────────────────────────────────────────

function DayView({ events }: { events: CalendarEvent[] }) {
  if (events.length === 0) {
    return <p className="py-6 text-center text-xs text-[var(--color-muted-foreground)]">No events</p>
  }
  return (
    <ul className="max-h-52 space-y-2 overflow-y-auto pr-1">
      {events.map((e) => (
        <li key={e.id} className="flex items-start gap-2">
          <span
            className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full"
            style={{ backgroundColor: calendarColor(e.calendar) }}
          />
          <div className="min-w-0">
            <p className="truncate text-sm leading-tight text-[var(--color-foreground)]">{e.title}</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {isAllDay(e.start, e.end) ? 'All day' : `${fmtTime(e.start)} – ${fmtTime(e.end)}`}
              {e.location && ` · ${e.location}`}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

// ─── Week view ────────────────────────────────────────────────────────────────

function WeekView({ date, events, onDayClick }: {
  date: Date
  events: CalendarEvent[]
  onDayClick: (d: Date) => void
}) {
  const monday = weekStart(date)
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const today = new Date()

  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((day, i) => {
        const dayEvents = events.filter((e) => isSameDay(new Date(e.start), day))
        const isToday = isSameDay(day, today)
        const isSelected = isSameDay(day, date)
        return (
          <button
            key={i}
            onClick={() => onDayClick(day)}
            className="flex flex-col items-center gap-1 rounded p-1 hover:bg-[var(--color-muted)]"
          >
            <span className="text-[10px] text-[var(--color-muted-foreground)]">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
            </span>
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs',
                isToday && 'bg-[#007AFF] font-semibold text-white',
                !isToday && isSelected && 'bg-[var(--color-muted)] font-medium',
                !isToday && !isSelected && 'text-[var(--color-foreground)]',
              )}
            >
              {day.getDate()}
            </span>
            <div className="flex min-h-[8px] flex-wrap justify-center gap-0.5">
              {dayEvents.slice(0, 3).map((e) => (
                <Dot key={e.id} color={calendarColor(e.calendar)} />
              ))}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─── Month view ───────────────────────────────────────────────────────────────

function MonthView({ date, events, onDayClick }: {
  date: Date
  events: CalendarEvent[]
  onDayClick: (d: Date) => void
}) {
  const first = monthStart(date)
  const last = monthEnd(date)
  const today = new Date()
  const startPad = (first.getDay() + 6) % 7
  const totalDays = last.getDate()
  const cells = Math.ceil((startPad + totalDays) / 7) * 7

  return (
    <div>
      <div className="mb-1 grid grid-cols-7">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <p key={i} className="text-center text-[10px] text-[var(--color-muted-foreground)]">{d}</p>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: cells }, (_, i) => {
          const offset = i - startPad
          if (offset < 0 || offset >= totalDays) return <div key={i} />
          const day = new Date(date.getFullYear(), date.getMonth(), offset + 1)
          const dayEvents = events.filter((e) => isSameDay(new Date(e.start), day))
          const isToday = isSameDay(day, today)
          return (
            <button
              key={i}
              onClick={() => onDayClick(day)}
              className="flex flex-col items-center gap-0.5 rounded p-0.5 hover:bg-[var(--color-muted)]"
            >
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full text-[10px]',
                  isToday ? 'bg-[#007AFF] font-semibold text-white' : 'text-[var(--color-foreground)]',
                )}
              >
                {day.getDate()}
              </span>
              <div className="flex min-h-[6px] gap-0.5">
                {dayEvents.slice(0, 2).map((e) => (
                  <Dot key={e.id} color={calendarColor(e.calendar)} />
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PersonalCalendar() {
  const [view, setView] = useState<CalendarView>('day')
  const [date, setDate] = useState(() => new Date())
  const { data, status, error } = useCalendarData(date, view)

  const handleDayClick = useCallback((d: Date) => { setDate(d); setView('day') }, [])
  const handlePrev = useCallback(() => setDate((d) => navigate(d, view, -1)), [view])
  const handleNext = useCallback(() => setDate((d) => navigate(d, view, 1)), [view])

  return (
    <div className="flex h-full flex-col rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
          >
            ‹
          </button>
          <span className="w-36 text-center text-sm font-medium text-[var(--color-foreground)]">
            {headerTitle(date, view)}
          </span>
          <button
            onClick={handleNext}
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
          >
            ›
          </button>
        </div>
        <div className="flex gap-1">
          {(['day', 'week', 'month'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'rounded px-2 py-0.5 text-xs capitalize',
                view === v
                  ? 'bg-[#007AFF] text-white'
                  : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]',
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="min-h-32 flex-1">
        {status === 'loading' && (
          <div className="flex h-32 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-muted-foreground)]" />
          </div>
        )}
        {status === 'error' && (
          <p className="py-4 text-center text-xs text-red-500">{error}</p>
        )}
        {status === 'success' && data && (
          <>
            {view === 'day' && <DayView events={data} />}
            {view === 'week' && <WeekView date={date} events={data} onDayClick={handleDayClick} />}
            {view === 'month' && <MonthView date={date} events={data} onDayClick={handleDayClick} />}
          </>
        )}
      </div>
    </div>
  )
}
