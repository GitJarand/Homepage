import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
}

export function Card({ title, children, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm',
        className
      )}
      {...props}
    >
      {title && (
        <h3 className="mb-3 text-sm font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}
