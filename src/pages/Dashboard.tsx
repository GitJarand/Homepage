import { useState, useRef, useCallback, useEffect, useMemo, useLayoutEffect } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { widgets, type OrderedWidget } from '@/widgets/registry'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/useTheme'

function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
    </svg>
  )
}

function SaveIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/>
      <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/>
      <path d="M7 3v4a1 1 0 0 0 1 1h7"/>
    </svg>
  )
}

function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}

function UnlockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
    </svg>
  )
}

function WidgetsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
    </svg>
  )
}

// ─── Persistence ─────────────────────────────────────────────────────────────

const ORDER_KEY    = 'homepage:widget-order'
const SIZES_KEY    = 'homepage:widget-sizes'
const COLS_KEY     = 'homepage:col-widths'
const LAYOUT2_KEY  = 'homepage:layout2'
const DISABLED_KEY = 'homepage:disabled-widgets'

function loadDisabled(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(DISABLED_KEY) ?? '[]') as string[]) }
  catch { return new Set() }
}
function saveDisabled(s: Set<string>) {
  localStorage.setItem(DISABLED_KEY, JSON.stringify([...s]))
}

const NUM_COLS = 6
const NUM_ROWS = 4
const GAP = 16 // gap-4

type ColSpan = 1 | 2 | 3 | 4 | 5 | 6
type RowSpan = 1 | 2 | 3 | 4
interface WidgetSize { colSpan: ColSpan; rowSpan: RowSpan }

// ─── Layout presets ───────────────────────────────────────────────────────────

type Block = readonly [col: number, row: number, colSpan: number, rowSpan: number]

interface LayoutPreset {
  id: string
  colWidths: number[]
  sizes: Record<string, WidgetSize>
  order?: string[]
  blocks: Block[]
}

// Main layout: 6 smalls top, NRK+VG(1×3) left, YouTube(2×2) center, Reddit+Tech(1×3) right
const MAIN_LAYOUT: LayoutPreset = {
  id: 'main',
  colWidths: Array(NUM_COLS).fill(1),
  sizes: { youtube: { colSpan: 2 as ColSpan, rowSpan: 2 as RowSpan } },
  order: [
    'personal-calendar', 'shopping', 'notes', 'electricity', 'packages', 'clock',
    'news-nrk', 'news-vg', 'youtube', 'rss-feed-1', 'rss-feed-2',
    'trakt', 'football',
  ],
  blocks: [
    [0,0,1,1],[1,0,1,1],[2,0,1,1],[3,0,1,1],[4,0,1,1],[5,0,1,1],
    [0,1,1,3],[1,1,1,3],
    [2,1,2,2],
    [4,1,1,3],[5,1,1,3],
    [2,3,1,1],[3,3,1,1],
  ],
}

function loadSizes(): Record<string, WidgetSize> {
  try { return JSON.parse(localStorage.getItem(SIZES_KEY) ?? '{}') } catch { return {} }
}
function saveSizes(sizes: Record<string, WidgetSize>) {
  localStorage.setItem(SIZES_KEY, JSON.stringify(sizes))
}

function loadOrder(defaults: OrderedWidget[]): OrderedWidget[] {
  try {
    const saved = JSON.parse(localStorage.getItem(ORDER_KEY) ?? '[]') as string[]
    if (!saved.length) return defaults
    const existing = saved
      .map((id) => defaults.find((w) => w.id === id))
      .filter((w): w is OrderedWidget => w !== undefined)
    const added = defaults.filter((w) => !saved.includes(w.id))
    return [...existing, ...added]
  } catch {
    return defaults
  }
}
function saveOrder(ws: OrderedWidget[]) {
  localStorage.setItem(ORDER_KEY, JSON.stringify(ws.map((w) => w.id)))
}

interface SavedLayout2 { order: string[]; sizes: Record<string, WidgetSize>; colWidths: number[]; blocks: Block[] }

function loadLayout2(): SavedLayout2 | null {
  try { return JSON.parse(localStorage.getItem(LAYOUT2_KEY) ?? 'null') } catch { return null }
}
function saveLayout2(l: SavedLayout2) {
  localStorage.setItem(LAYOUT2_KEY, JSON.stringify(l))
}

function loadColWidths(): number[] {
  try {
    const saved = JSON.parse(localStorage.getItem(COLS_KEY) ?? 'null') as number[] | null
    if (Array.isArray(saved) && saved.length === NUM_COLS) return saved
  } catch {}
  return Array(NUM_COLS).fill(1)
}
function saveColWidths(widths: number[]) {
  localStorage.setItem(COLS_KEY, JSON.stringify(widths))
}

// ─── Layout preview icon ─────────────────────────────────────────────────────

function computeLayoutBlocks(ordered: OrderedWidget[], sizes: Record<string, WidgetSize>): Block[] {
  const occupied: boolean[][] = []
  const blocks: Block[] = []

  function isFree(c: number, r: number, cs: number, rs: number) {
    for (let dr = 0; dr < rs; dr++)
      for (let dc = 0; dc < cs; dc++)
        if (occupied[r + dr]?.[c + dc]) return false
    return c + cs <= NUM_COLS
  }

  function fill(c: number, r: number, cs: number, rs: number) {
    for (let dr = 0; dr < rs; dr++) {
      if (!occupied[r + dr]) occupied[r + dr] = []
      for (let dc = 0; dc < cs; dc++) occupied[r + dr][c + dc] = true
    }
  }

  for (const w of ordered) {
    const s = sizes[w.id]
    const cs = (s?.colSpan ?? w.colSpan ?? 1) as number
    const rs = (s?.rowSpan ?? w.rowSpan ?? 1) as number
    outer: for (let r = 0; ; r++) {
      for (let c = 0; c <= NUM_COLS - cs; c++) {
        if (isFree(c, r, cs, rs)) { fill(c, r, cs, rs); blocks.push([c, r, cs, rs]); break outer }
      }
    }
  }
  return blocks
}

function clampSizesToGrid(
  ordered: OrderedWidget[],
  sizes: Record<string, WidgetSize>
): Record<string, WidgetSize> {
  const blocks = computeLayoutBlocks(ordered, sizes)
  let next = sizes
  ordered.forEach((w, i) => {
    const block = blocks[i]
    if (!block) return
    const [, startRow, cs, rs] = block
    if (startRow + rs > NUM_ROWS) {
      const clampedRowSpan = Math.max(1, NUM_ROWS - startRow) as RowSpan
      next = { ...next, [w.id]: { colSpan: cs as ColSpan, rowSpan: clampedRowSpan } }
    }
  })
  return next
}

function LayoutPreviewIcon({ blocks }: { blocks: readonly Block[] }) {
  const maxRow = blocks.reduce((m, [, r, , rs]) => Math.max(m, r + rs), 0)
  const h = maxRow * 6 - 1
  return (
    <svg width="35" height={h} viewBox={`0 0 35 ${h}`} fill="currentColor">
      {blocks.map(([col, row, cs, rs], i) => (
        <rect key={i} x={col * 6} y={row * 6} width={cs * 6 - 1} height={rs * 6 - 1} rx="1.5" />
      ))}
    </svg>
  )
}

// ─── Column resize handle ────────────────────────────────────────────────────

function ColResizeHandle({
  index,
  leftPx,
  colWidths,
  gridWidth,
  onChange,
}: {
  index: number
  leftPx: number
  colWidths: number[]
  gridWidth: number
  onChange: (widths: number[]) => void
}) {
  const startRef = useRef<{ x: number; widths: number[] } | null>(null)

  function onPointerDown(e: React.PointerEvent) {
    e.stopPropagation()
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    startRef.current = { x: e.clientX, widths: [...colWidths] }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!startRef.current) return
    const { x, widths } = startRef.current
    const dx = e.clientX - x
    const totalFr = widths.reduce((s, w) => s + w, 0)
    const availW = gridWidth - GAP * (NUM_COLS - 1)
    const dFr = (dx / availW) * totalFr
    const next = [...widths]
    next[index] = Math.max(0.15, widths[index] + dFr)
    next[index + 1] = Math.max(0.15, widths[index + 1] - dFr)
    onChange(next)
  }

  function onPointerUp() {
    if (startRef.current) saveColWidths(colWidths)
    startRef.current = null
  }

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="group/col absolute top-0 bottom-0 z-20 flex cursor-col-resize items-center justify-center"
      style={{ left: leftPx - 8, width: 16, touchAction: 'none' }}
    >
      <div className="h-12 w-px rounded-full bg-[var(--color-border)] opacity-0 transition-opacity group-hover/col:opacity-100" />
    </div>
  )
}

// ─── Card resize handle ───────────────────────────────────────────────────────

function CardResizeHandle({ onResize }: { onResize: (dCol: number, dRow: number) => void }) {
  const startRef = useRef<{
    x: number; y: number; unitW: number; unitH: number
    lastDCol: number; lastDRow: number
  } | null>(null)

  function onPointerDown(e: React.PointerEvent) {
    e.stopPropagation()
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)

    const card = (e.currentTarget as HTMLElement).closest('[data-card]') as HTMLElement | null
    const grid = card?.parentElement
    if (!card || !grid) return

    const gridStyle = getComputedStyle(grid)
    const gap = parseFloat(gridStyle.columnGap || '0')
    const cols = gridStyle.gridTemplateColumns.split(' ').length
    const gw = grid.getBoundingClientRect().width
    const unitW = (gw + gap) / cols

    const rowsStr = gridStyle.gridTemplateRows
    const rowH = rowsStr === 'none' ? card.getBoundingClientRect().height
      : parseFloat(rowsStr.split(' ')[0])
    const unitH = rowH + gap

    startRef.current = { x: e.clientX, y: e.clientY, unitW, unitH, lastDCol: 0, lastDRow: 0 }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!startRef.current) return
    const { x, y, unitW, unitH, lastDCol, lastDRow } = startRef.current
    const dCol = Math.round((e.clientX - x) / unitW)
    const dRow = Math.round((e.clientY - y) / unitH)
    if (dCol !== lastDCol || dRow !== lastDRow) {
      onResize(dCol - lastDCol, dRow - lastDRow)
      startRef.current.lastDCol = dCol
      startRef.current.lastDRow = dRow
    }
  }

  function onPointerUp() { startRef.current = null }

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="absolute bottom-1.5 right-1.5 z-10 hidden h-4 w-4 cursor-se-resize items-center justify-center rounded opacity-0 transition-opacity group-hover:flex group-hover:opacity-100"
      style={{ touchAction: 'none' }}
      title="Drag to resize"
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2 9 L9 2 M5 9 L9 5 M8 9 L9 8" stroke="var(--color-muted-foreground)" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </div>
  )
}

// ─── Sortable card ────────────────────────────────────────────────────────────

function SortableCard({
  widget,
  block,
  onResize,
  onDisable,
}: {
  widget: OrderedWidget
  block: Block
  onResize: (dCol: number, dRow: number) => void
  onDisable: () => void
}) {
  const [col, row, cs, rs] = block
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
  })

  const Widget = widget.component

  return (
    <div
      data-card
      ref={setNodeRef}
      style={{
        gridColumn: `${col + 1} / span ${cs}`,
        gridRow: `${row + 1} / span ${rs}`,
        transform: CSS.Transform.toString(transform),
        transition,
        backgroundColor: 'var(--card-bg)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--card-shadow)',
        border: '1px solid var(--card-border)',
        position: 'relative',
        overflow: 'hidden',
      }}
      className={cn(
        isDragging ? 'opacity-40' : 'opacity-100',
        'group transition-opacity outline-none',
      )}
      {...attributes}
      {...listeners}
    >
      <Widget />
      <CardResizeHandle onResize={onResize} />
      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); onDisable() }}
        className="absolute top-0.5 right-0.5 z-10 hidden h-3.5 w-3.5 items-center justify-center rounded-full text-[var(--color-muted-foreground)] opacity-0 transition-opacity hover:text-[var(--color-foreground)] group-hover:flex group-hover:opacity-60"
        title="Hide widget"
      >
        <svg width="7" height="7" viewBox="0 0 7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M1 1l5 5M6 1l-5 5"/>
        </svg>
      </button>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { resolvedTheme, toggle } = useTheme()
  const [ordered, setOrdered] = useState<OrderedWidget[]>(() => loadOrder(widgets))
  const [sizes, setSizes] = useState<Record<string, WidgetSize>>(loadSizes)
  const [colWidths, setColWidths] = useState<number[]>(loadColWidths)
  const [scrollLocked, setScrollLocked] = useState(true)
  const [layout2, setLayout2] = useState<SavedLayout2 | null>(loadLayout2)
  const [disabled, setDisabled] = useState<Set<string>>(loadDisabled)
  const [widgetMenuOpen, setWidgetMenuOpen] = useState(false)
  const widgetMenuRef = useRef<HTMLDivElement>(null)

  const orderedVisible = useMemo(() => ordered.filter(w => !disabled.has(w.id)), [ordered, disabled])

  function toggleWidget(id: string) {
    setDisabled(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      saveDisabled(next)
      return next
    })
  }

  // Close widget menu on outside click
  useLayoutEffect(() => {
    if (!widgetMenuOpen) return
    function handler(e: MouseEvent) {
      if (widgetMenuRef.current && !widgetMenuRef.current.contains(e.target as Node))
        setWidgetMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [widgetMenuOpen])
  const gridRef = useRef<HTMLDivElement>(null)
  const [gridWidth, setGridWidth] = useState(0)

  // Explicit grid placement — our algorithm IS the layout, clamp is always accurate
  const blocks = useMemo(() => computeLayoutBlocks(orderedVisible, sizes), [orderedVisible, sizes])

  useEffect(() => {
    if (!gridRef.current) return
    const ro = new ResizeObserver(entries => setGridWidth(entries[0].contentRect.width))
    ro.observe(gridRef.current)
    return () => ro.disconnect()
  }, [])

  // Pixel position of each column divider (center of gap between col i and i+1)
  const handlePositions = (() => {
    if (gridWidth === 0) return []
    const totalFr = colWidths.reduce((s, w) => s + w, 0)
    const availW = gridWidth - GAP * (NUM_COLS - 1)
    const positions: number[] = []
    let x = 0
    for (let i = 0; i < NUM_COLS - 1; i++) {
      x += (colWidths[i] / totalFr) * availW + GAP
      positions.push(x - GAP / 2)
    }
    return positions
  })()

  const handleColWidthChange = useCallback((widths: number[]) => {
    setColWidths(widths)
    saveColWidths(widths)
  }, [])

  function applyPreset(preset: LayoutPreset) {
    const newOrder = preset.order
      ? preset.order.map(id => widgets.find(w => w.id === id)).filter(Boolean) as OrderedWidget[]
      : widgets
    setColWidths(preset.colWidths)
    setOrdered(newOrder)
    setSizes(preset.sizes)
    saveColWidths(preset.colWidths)
    saveOrder(newOrder)
    saveSizes(preset.sizes)
  }

  const handleResize = useCallback((id: string, dCol: number, dRow: number) => {
    const widget  = widgets.find(w => w.id === id)
    const cur     = sizes[id] ?? { colSpan: widget?.colSpan ?? 1, rowSpan: widget?.rowSpan ?? 1 }
    const colSpan = Math.max(1, Math.min(NUM_COLS, cur.colSpan + dCol)) as ColSpan
    const rowSpan = Math.max(1, Math.min(NUM_ROWS, cur.rowSpan + dRow)) as RowSpan
    if (colSpan === cur.colSpan && rowSpan === cur.rowSpan) return
    const tentative = { ...sizes, [id]: { colSpan, rowSpan } }
    const clamped   = clampSizesToGrid(ordered, tentative)
    setSizes(clamped)
    saveSizes(clamped)
  }, [ordered, sizes])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from     = ordered.findIndex((w) => w.id === active.id)
    const to       = ordered.findIndex((w) => w.id === over.id)
    const newOrder = arrayMove(ordered, from, to)
    const clamped  = clampSizesToGrid(newOrder, sizes)
    setOrdered(newOrder)
    saveOrder(newOrder)
    if (clamped !== sizes) {
      setSizes(clamped)
      saveSizes(clamped)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Nav bar */}
      <header className="sticky top-0 z-10 backdrop-blur-xl pointer-events-none" style={{ backgroundColor: 'var(--header-surface)', borderBottom: '1px solid var(--header-surface-border)', color: 'var(--header-text)' }}>
        <div className="relative flex items-center justify-center px-8 py-[15px] pointer-events-auto" style={{ color: 'var(--header-text)' }}>
          {/* Left side */}
          <div className="absolute left-8 flex items-center gap-2" ref={widgetMenuRef}>
            <button
              onClick={() => {
                setColWidths(loadColWidths())
                setOrdered(loadOrder(widgets))
                setSizes(loadSizes())
              }}
              className="rounded p-0.5 opacity-[0.25] hover:opacity-60 transition-opacity"
              style={{ color: 'var(--header-text)' }}
              title="Current layout"
            >
              <LayoutPreviewIcon blocks={blocks} />
            </button>
            <button
              onClick={() => {
                const snapshot: SavedLayout2 = {
                  order:     ordered.map(w => w.id),
                  sizes:     { ...sizes },
                  colWidths: [...colWidths],
                  blocks:    [...blocks],
                }
                saveLayout2(snapshot)
                setLayout2(snapshot)
              }}
              className="rounded-full p-1.5 opacity-50 hover:opacity-100 transition-opacity"
              style={{ color: 'var(--header-text)' }}
              title="Save current layout as default 2"
            >
              <SaveIcon />
            </button>
            <button
              onClick={() => setScrollLocked(l => !l)}
              className="rounded-full p-1.5 opacity-50 hover:opacity-100 transition-opacity"
              style={{ color: 'var(--header-text)' }}
              title={scrollLocked ? 'Unlock scroll' : 'Lock scroll'}
            >
              {scrollLocked ? <LockIcon /> : <UnlockIcon />}
            </button>
            <div className="relative">
              <button
                onClick={() => setWidgetMenuOpen(o => !o)}
                className="rounded-full p-1.5 opacity-50 hover:opacity-100 transition-opacity"
                style={{ color: 'var(--header-text)' }}
                title="Show/hide widgets"
              >
                <WidgetsIcon />
              </button>
              {widgetMenuOpen && (
                <div className="absolute left-0 top-full mt-2 z-50 min-w-[180px] rounded-xl border border-[var(--card-border)] py-1.5 shadow-lg"
                  style={{ backgroundColor: 'var(--popover-bg)', backdropFilter: 'blur(16px)' }}
                >
                  {ordered.map(w => (
                    <button
                      key={w.id}
                      onClick={() => toggleWidget(w.id)}
                      className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px] hover:bg-[var(--color-muted)] transition-colors"
                    >
                      <span className={cn(
                        'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors',
                        disabled.has(w.id)
                          ? 'border-[var(--color-border)] bg-transparent'
                          : 'border-[var(--color-foreground)] bg-[var(--color-foreground)]'
                      )}>
                        {!disabled.has(w.id) && (
                          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="var(--card-bg)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1.5 4.5l2 2 4-4"/>
                          </svg>
                        )}
                      </span>
                      <span className={cn('text-[var(--color-foreground)]', disabled.has(w.id) && 'opacity-40')}>
                        {w.title}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <span
            className="text-[28px] font-semibold tracking-tight leading-none"
            style={{ color: 'var(--header-text)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {(() => {
              const h = new Date().getHours()
              const period = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'
              return `Good ${period}, Jarand`
            })()}
          </span>
          <div className="absolute right-8 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {layout2 && (
                <button
                  onClick={() => {
                    const l = layout2
                    const newOrder = l.order.map(id => widgets.find(w => w.id === id)).filter(Boolean) as OrderedWidget[]
                    setOrdered(newOrder)
                    setSizes(l.sizes)
                    setColWidths(l.colWidths)
                    saveOrder(newOrder)
                    saveSizes(l.sizes)
                    saveColWidths(l.colWidths)
                  }}
                  onContextMenu={e => { e.preventDefault(); setLayout2(null); localStorage.removeItem(LAYOUT2_KEY) }}
                  className="rounded p-0.5 opacity-[0.15] hover:opacity-40 transition-opacity"
                  style={{ color: 'var(--header-text)' }}
                  title="Saved layout — right-click to delete"
                >
                  <LayoutPreviewIcon blocks={layout2.blocks} />
                </button>
              )}
              <button
                onClick={() => applyPreset(MAIN_LAYOUT)}
                className="rounded p-0.5 opacity-50 hover:opacity-100 transition-opacity"
                style={{ color: 'var(--header-text)' }}
                title="Default layout"
              >
                <LayoutPreviewIcon blocks={MAIN_LAYOUT.blocks} />
              </button>
            </div>
            <button
              onClick={toggle}
              className="rounded-full p-1.5 opacity-50 hover:opacity-100 transition-opacity"
              style={{ color: 'var(--header-text)' }}
              aria-label="Toggle dark mode"
            >
              {resolvedTheme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>
      </header>

      {/* Grid */}
      <main className="px-4 pt-6">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedVisible.map((w) => w.id)} strategy={rectSortingStrategy}>
            <div style={{ position: 'relative' }}>
              {/* Column resize handles */}
              {handlePositions.map((leftPx, i) => (
                <ColResizeHandle
                  key={i}
                  index={i}
                  leftPx={leftPx}
                  colWidths={colWidths}
                  gridWidth={gridWidth}
                  onChange={handleColWidthChange}
                />
              ))}
              {/* Card grid — explicit placement, no auto-flow */}
              <div
                ref={gridRef}
                className={cn('grid gap-4', scrollLocked && 'overflow-hidden')}
                style={{
                  gridTemplateColumns: colWidths.map(w => `${w}fr`).join(' '),
                  gridTemplateRows: 'repeat(4, 280px)',
                  ...(scrollLocked && { maxHeight: `calc(4 * 280px + 3 * ${GAP}px)` }),
                }}
              >
                {orderedVisible.map((widget, i) => (
                  <SortableCard
                    key={widget.id}
                    widget={widget}
                    block={blocks[i] ?? [0, 0, 1, 1]}
                    onResize={(dCol, dRow) => handleResize(widget.id, dCol, dRow)}
                    onDisable={() => toggleWidget(widget.id)}
                  />
                ))}
              </div>
            </div>
          </SortableContext>
        </DndContext>
      </main>
    </div>
  )
}
