import { widgets } from '@/widgets/registry'

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-[var(--color-background)] p-8">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight text-[var(--color-foreground)]">
        Homepage
      </h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {widgets.map(({ id, component: Widget }) => (
          <Widget key={id} />
        ))}
      </div>
    </div>
  )
}
