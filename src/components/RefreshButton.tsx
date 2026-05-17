interface RefreshButtonProps {
  onClick: () => void
  loading: boolean
  className?: string
}

export function RefreshButton({ onClick, loading, className = '' }: RefreshButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      title="Refresh"
      className={`rounded p-1 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] disabled:opacity-40 ${className}`}
    >
      <svg
        className={loading ? 'animate-spin' : ''}
        width="14" height="14" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
        <path d="M21 3v5h-5"/>
      </svg>
    </button>
  )
}
