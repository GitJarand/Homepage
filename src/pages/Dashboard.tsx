import { widgets } from '@/widgets/registry'
import { cn } from '@/lib/utils'

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-[var(--color-background)] p-8">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight text-[var(--color-foreground)]">
        Homepage
      </h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {widgets.map(({ id, colSpan, component: Widget }) => (
          <div
            key={id}
            className={cn(
              colSpan === 2 && 'sm:col-span-2',
              colSpan === 3 && 'sm:col-span-2 lg:col-span-3',
              colSpan === 4 && 'sm:col-span-2 lg:col-span-4',
            )}
          >
            <Widget />
          </div>
        ))}
      </div>
    </div>
  )
}
