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

function SortableCard({ widget }: { widget: OrderedWidget }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
  })

  const Widget = widget.component

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        widget.colSpan === 2 && 'sm:col-span-2',
        widget.colSpan === 3 && 'sm:col-span-2 lg:col-span-3',
        widget.colSpan === 4 && 'sm:col-span-2 lg:col-span-4',
        isDragging ? 'opacity-40' : 'opacity-100',
        'transition-opacity',
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
    <div className="min-h-screen bg-[var(--color-background)] p-8">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight text-[var(--color-foreground)]">
        Homepage
      </h1>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ordered.map((w) => w.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ordered.map((widget) => (
              <SortableCard key={widget.id} widget={widget} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
