import { useState, useRef, useCallback } from 'react'
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

type ColSpan = 1 | 2 | 3 | 4
type RowSpan = 1 | 2 | 3
interface WidgetSize { colSpan: ColSpan; rowSpan: RowSpan }

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

function saveOrder(widgets: OrderedWidget[]) {
  localStorage.setItem(ORDER_KEY, JSON.stringify(widgets.map((w) => w.id)))
}

// ─── Resize handle ────────────────────────────────────────────────────────────

function ResizeHandle({ onResize }: { onResize: (dCol: number, dRow: number) => void }) {
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
    const gridWidth = grid.getBoundingClientRect().width
    const unitW = (gridWidth + gap) / cols

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

  function onPointerUp() {
    startRef.current = null
  }

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
  bgColor,
  colSpan,
  rowSpan,
  onResize,
}: {
  widget: OrderedWidget
  bgColor: string | undefined
  colSpan: ColSpan
  rowSpan: RowSpan
  onResize: (dCol: number, dRow: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
  })

  const Widget = widget.component

  return (
    <div
      data-card
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        backgroundColor: bgColor ?? 'var(--card-bg)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--card-shadow)',
        border: '1px solid var(--card-border)',
        position: 'relative',
      }}
      className={cn(
        colSpan === 2 && 'sm:col-span-2',
        colSpan === 3 && 'sm:col-span-2 lg:col-span-3',
        colSpan === 4 && 'sm:col-span-2 lg:col-span-4',
        rowSpan === 2 && 'sm:row-span-2',
        rowSpan === 3 && 'sm:row-span-3',
        isDragging ? 'opacity-40' : 'opacity-100',
        'group transition-opacity outline-none',
      )}
      {...attributes}
      {...listeners}
    >
      <Widget />
      <ResizeHandle onResize={onResize} />
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { resolvedTheme, toggle } = useTheme()
  const [ordered, setOrdered] = useState<OrderedWidget[]>(() => loadOrder(widgets))
  const [sizes, setSizes] = useState<Record<string, WidgetSize>>(loadSizes)

  const handleResize = useCallback((id: string, dCol: number, dRow: number) => {
    setSizes(prev => {
      const widget = widgets.find(w => w.id === id)
      const cur = prev[id] ?? { colSpan: widget?.colSpan ?? 1, rowSpan: widget?.rowSpan ?? 1 }
      const colSpan = Math.max(1, Math.min(4, cur.colSpan + dCol)) as ColSpan
      const rowSpan = Math.max(1, Math.min(3, cur.rowSpan + dRow)) as RowSpan
      if (colSpan === cur.colSpan && rowSpan === cur.rowSpan) return prev
      const next = { ...prev, [id]: { colSpan, rowSpan } }
      saveSizes(next)
      return next
    })
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setOrdered((prev) => {
      const from = prev.findIndex((w) => w.id === active.id)
      const to = prev.findIndex((w) => w.id === over.id)
      const next = arrayMove(prev, from, to)
      saveOrder(next)
      return next
    })
  }

  return (
    <div className="min-h-screen">
      {/* Nav bar */}
      <header className="sticky top-0 z-10 backdrop-blur-xl" style={{ backgroundColor: 'var(--card-bg)' }}>
        <div className="relative flex items-center justify-center px-8 py-5">
          <span className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">This is today</span>
          <button
            onClick={toggle}
            className="absolute right-8 rounded-full p-1.5 text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] transition-colors"
            aria-label="Toggle dark mode"
          >
            {resolvedTheme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      {/* Grid */}
      <main className="px-4 pt-10">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ordered.map((w) => w.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {ordered.map((widget) => {
                const size = sizes[widget.id]
                const colSpan = (size?.colSpan ?? widget.colSpan ?? 1) as ColSpan
                const rowSpan = (size?.rowSpan ?? widget.rowSpan ?? 1) as RowSpan
                return (
                  <SortableCard
                    key={widget.id}
                    widget={widget}
                    bgColor={resolvedTheme === 'dark' ? (widget.colorDark ?? widget.color) : widget.color}
                    colSpan={colSpan}
                    rowSpan={rowSpan}
                    onResize={(dCol, dRow) => handleResize(widget.id, dCol, dRow)}
                  />
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
      </main>
    </div>
  )
}
