import type { WidgetStatus } from './types'
import { cn } from '@/lib/utils'

interface WidgetWrapperProps {
  title: string
  logo?: React.ReactNode
  status: WidgetStatus
  error?: string | null
  children: React.ReactNode
  className?: string
}

export function WidgetWrapper({ title, logo, status, error, children, className }: WidgetWrapperProps) {
  return (
    <div className={cn('flex h-full flex-col bg-transparent p-8', className)}>
      <div className="mb-4 flex shrink-0 flex-col items-center gap-1.5 border-b border-[var(--color-border)] pb-4">
        {logo && <div className="text-3xl leading-none">{logo}</div>}
        <h3 className="text-xl font-semibold tracking-tight text-[var(--color-foreground)]">{title}</h3>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-y-auto">
        {status === 'loading' && <Spinner />}
        {status === 'error' && <ErrorState message={error ?? 'Something went wrong'} />}
        {status === 'idle' && <EmptyState />}
        {status === 'success' && children}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-muted-foreground)]" />
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <p className="text-center text-sm text-red-500">{message}</p>
  )
}

function EmptyState() {
  return (
    <p className="text-sm text-[var(--color-muted-foreground)]">No data yet</p>
  )
}
