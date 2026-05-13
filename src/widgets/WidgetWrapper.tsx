import type { WidgetStatus } from './types'
import { cn } from '@/lib/utils'

interface WidgetWrapperProps {
  title: string
  status: WidgetStatus
  error?: string | null
  children: React.ReactNode
  className?: string
}

export function WidgetWrapper({ title, status, error, children, className }: WidgetWrapperProps) {
  return (
    <div
      className={cn(
        'flex flex-col bg-transparent p-8 min-h-72',
        className
      )}
    >
      <h3 className="mb-4 text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
        {title}
      </h3>

      <div className="flex flex-1 items-center justify-center">
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
