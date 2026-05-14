import { useState } from 'react'
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

// ─── Order persistence ────────────────────────────────────────────────────────

const ORDER_KEY = 'homepage:widget-order'

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

// ─── Sortable card ────────────────────────────────────────────────────────────

function SortableCard({ widget, bgColor }: { widget: OrderedWidget; bgColor: string | undefined }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
  })

  const Widget = widget.component

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        backgroundColor: bgColor ?? 'var(--card-bg)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--card-shadow)',
        border: '1px solid var(--card-border)',
      }}
      className={cn(
        widget.colSpan === 2 && 'sm:col-span-2',
        widget.colSpan === 3 && 'sm:col-span-2 lg:col-span-3',
        widget.colSpan === 4 && 'sm:col-span-2 lg:col-span-4',
        widget.rowSpan === 2 && 'sm:row-span-2',
        isDragging ? 'opacity-40' : 'opacity-100',
        'transition-opacity outline-none',
      )}
      {...attributes}
      {...listeners}
    >
      <Widget />
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { resolvedTheme, toggle } = useTheme()
  const [ordered, setOrdered] = useState<OrderedWidget[]>(() => loadOrder(widgets))

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
              {ordered.map((widget) => (
                <SortableCard
                  key={widget.id}
                  widget={widget}
                  bgColor={resolvedTheme === 'dark' ? (widget.colorDark ?? widget.color) : widget.color}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </main>
    </div>
  )
}
