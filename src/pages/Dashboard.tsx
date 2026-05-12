import { widgets } from '@/widgets/registry'
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

export default function Dashboard() {
  const { resolvedTheme, toggle } = useTheme()

  return (
    <div className="min-h-screen bg-[var(--color-background)] p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-foreground)]">
          Homepage
        </h1>
        <button
          onClick={toggle}
          className="rounded-full p-2 text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
          aria-label="Toggle dark mode"
        >
          {resolvedTheme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
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
