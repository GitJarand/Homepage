import { useState, useEffect } from 'react'
import { RefreshButton } from '../components/RefreshButton'

interface MediaItem {
  type: 'movie' | 'show'
  title: string
  year: number | null
  traktSlug: string | null
  imdbId: string | null
  imdbRating: string | null
  listedAt: string
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
        <RefreshButton
          onClick={() => setRefreshKey(k => k + 1)}
          loading={status === 'loading'}
          className="absolute left-0 top-0"
        />
      </div>

      {status === 'loading' && (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div className="h-3 w-full animate-pulse rounded bg-[var(--color-border)]" />
              <div className="h-2.5 w-1/3 animate-pulse rounded bg-[var(--color-border)]" />
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
            const href = item.imdbId
              ? `https://www.imdb.com/title/${item.imdbId}/`
              : item.traktSlug
                ? `https://trakt.tv/${item.type === 'show' ? 'shows' : 'movies'}/${item.traktSlug}`
                : undefined
            return (
              <a
                key={i}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-2 py-2 first:pt-0 transition-opacity hover:opacity-75"
              >
                <p className="line-clamp-1 text-[13px] font-medium text-[var(--color-foreground)]">
                  {item.title}
                </p>
                <div className="flex shrink-0 items-center gap-1.5 text-[11px] text-[var(--color-muted-foreground)]">
                  {item.imdbRating && (
                    <span className="flex items-center gap-0.5 font-medium" style={{ color: '#f5c518' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      {item.imdbRating}
                    </span>
                  )}
                  <span>
                    {item.year ?? '—'}
                    <span className="ml-1 opacity-50">{item.type === 'show' ? '📺' : '🎬'}</span>
                  </span>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
