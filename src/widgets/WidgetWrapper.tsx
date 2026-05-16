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
    <div className={cn('flex h-full flex-col bg-transparent px-4 pb-4 pt-3', className)}>
      <div className="mb-3 flex shrink-0 flex-col items-center pb-3">
        {logo && <div className="text-3xl leading-none">{logo}</div>}
      </div>

      <div className="flex flex-1 items-center justify-center overflow-y-auto">
        {status === 'loading' && <Spinner />}
        {status === 'error' && <ErrorState message={error ?? 'Something went wrong'} />}
        {status === 'idle' && <EmptyState title={title} />}
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

function EmptyState({ title }: { title?: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-2xl leading-none">🚧</span>
      {title && <p className="text-xs text-[var(--color-muted-foreground)]">{title}</p>}
    </div>
  )
}
