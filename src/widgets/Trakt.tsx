import { useState, useEffect } from 'react'

interface MediaItem {
  type: 'movie' | 'show'
  title: string
  year: number | null
  tmdbId: number | null
  posterUrl: string | null
  traktSlug: string | null
  listedAt: string
}

const TYPE_ICON: Record<string, string> = {
  movie: '🎬',
  show:  '📺',
}

export function Trakt() {
  const [items, setItems]   = useState<MediaItem[]>([])
  const [status, setStatus] = useState<'loading' | 'error' | 'ok'>('loading')
  const [error, setError]   = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setStatus('loading')
    fetch('/api/trakt/list')
      .then(async r => {
        const json = await r.json() as { items?: MediaItem[]; error?: string }
        if (json.error) { setError(json.error); setStatus('error'); return }
        setItems(json.items ?? [])
        setStatus('ok')
      })
      .catch((err: Error) => { setError(err.message); setStatus('error') })
  }, [refreshKey])

  return (
    <div className="relative flex h-full flex-col px-4 pb-4 pt-3">
      {/* Header */}
      <div className="relative mb-3 flex shrink-0 flex-col items-center pb-3">
        <img
          src="https://www.google.com/s2/favicons?domain=trakt.tv&sz=64"
          alt=""
          className="h-8 w-8 object-contain"
        />
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          disabled={status === 'loading'}
          className="absolute left-0 top-0 rounded p-1 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] disabled:opacity-40"
          title="Refresh"
        >
          <svg className={status === 'loading' ? 'animate-spin' : ''} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
          </svg>
        </button>
      </div>

      {status === 'loading' && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-16 w-11 flex-shrink-0 animate-pulse rounded bg-[var(--color-border)]" />
              <div className="flex flex-1 flex-col gap-1.5 pt-1">
                <div className="h-2.5 w-full animate-pulse rounded bg-[var(--color-border)]" />
                <div className="h-2.5 w-2/3 animate-pulse rounded bg-[var(--color-border)]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {status === 'error' && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {status === 'ok' && items.length === 0 && (
        <p className="text-sm text-[var(--color-muted-foreground)]">No items in list.</p>
      )}

      {status === 'ok' && items.length > 0 && (
        <div className="flex flex-col divide-y divide-[var(--color-border)] overflow-y-auto">
          {items.map((item, i) => {
            const href = item.traktSlug
              ? `https://trakt.tv/${item.type === 'show' ? 'shows' : 'movies'}/${item.traktSlug}`
              : undefined
            return (
              <a
                key={i}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="flex gap-3 py-2.5 first:pt-0 transition-opacity hover:opacity-75"
              >
                {/* Poster or type-icon placeholder */}
                {item.posterUrl ? (
                  <img
                    src={item.posterUrl}
                    alt=""
                    className="h-16 w-11 flex-shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-11 flex-shrink-0 items-center justify-center rounded bg-[var(--color-border)] text-xl">
                    {TYPE_ICON[item.type] ?? '🎬'}
                  </div>
                )}

                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="line-clamp-2 text-[13px] font-medium leading-snug text-[var(--color-foreground)]">
                    {item.title}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">
                    {item.year ?? '—'}
                    <span className="opacity-50"> · {item.type === 'show' ? 'Series' : 'Movie'}</span>
                  </p>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
