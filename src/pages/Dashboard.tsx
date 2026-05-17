import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
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

function MoonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
    </svg>
  )
}

// ─── Persistence ─────────────────────────────────────────────────────────────

const ORDER_KEY = 'homepage:widget-order'
const SIZES_KEY = 'homepage:widget-sizes'
const COLS_KEY  = 'homepage:col-widths'

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
    'personal-calendar', 'shopping', 'notes', 'visual', 'packages', 'clock',
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
}: {
  widget: OrderedWidget
  block: Block
  onResize: (dCol: number, dRow: number) => void
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
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { resolvedTheme, toggle } = useTheme()
  const [ordered, setOrdered] = useState<OrderedWidget[]>(() => loadOrder(widgets))
  const [sizes, setSizes] = useState<Record<string, WidgetSize>>(loadSizes)
  const [colWidths, setColWidths] = useState<number[]>(loadColWidths)
  const gridRef = useRef<HTMLDivElement>(null)
  const [gridWidth, setGridWidth] = useState(0)

  // Explicit grid placement — our algorithm IS the layout, clamp is always accurate
  const blocks = useMemo(() => computeLayoutBlocks(ordered, sizes), [ordered, sizes])

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
      <header className="sticky top-0 z-10 backdrop-blur-xl" style={{ backgroundColor: 'var(--header-bg)' }}>
        <div className="relative flex items-center justify-center px-8 py-[15px]">
          {/* Current layout icon — left side */}
          <div className="absolute left-8 flex items-center">
            <button
              onClick={() => {
                setColWidths(loadColWidths())
                setOrdered(loadOrder(widgets))
                setSizes(loadSizes())
              }}
              className="rounded p-0.5 text-[var(--color-foreground)] opacity-[0.15] hover:opacity-40 transition-opacity"
              title="Current layout"
            >
              <LayoutPreviewIcon blocks={blocks} />
            </button>
          </div>
          <span
            className="text-[28px] font-semibold tracking-tight text-[var(--color-foreground)] leading-none"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {(() => {
              const h = new Date().getHours()
              const period = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'
              return `Good ${period}, Jarand`
            })()}
          </span>
          <div className="absolute right-8 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => applyPreset(MAIN_LAYOUT)}
                className="rounded p-0.5 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
                title="Main layout"
              >
                <LayoutPreviewIcon blocks={MAIN_LAYOUT.blocks} />
              </button>
            </div>
            <button
              onClick={toggle}
              className="rounded-full p-1.5 text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] transition-colors"
              aria-label="Toggle dark mode"
            >
              {resolvedTheme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>
      </header>

      {/* Grid */}
      <main className="px-4 pt-10">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ordered.map((w) => w.id)} strategy={rectSortingStrategy}>
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
                className="grid gap-4 overflow-hidden"
                style={{
                  gridTemplateColumns: colWidths.map(w => `${w}fr`).join(' '),
                  gridTemplateRows: 'repeat(4, 280px)',
                  maxHeight: `calc(4 * 280px + 3 * ${GAP}px)`,
                }}
              >
                {ordered.map((widget, i) => (
                  <SortableCard
                    key={widget.id}
                    widget={widget}
                    block={blocks[i] ?? [0, 0, 1, 1]}
                    onResize={(dCol, dRow) => handleResize(widget.id, dCol, dRow)}
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
