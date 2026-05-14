import { useState, useEffect } from 'react'

interface NewsItem {
  title: string
  url: string
  description: string | null
  publishedAt: string | null
  imageUrl: string | null
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export function News({ source = 'vg', label }: { source?: string; label?: string }) {
  const [items, setItems] = useState<NewsItem[]>([])
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/news/feed?source=${encodeURIComponent(source)}&limit=15`)
      .then(async r => {
        const json = await r.json() as { items?: NewsItem[]; error?: string }
        if (json.error) { setError(json.error); setStatus('error'); return }
        setItems(json.items ?? [])
        setStatus('success')
      })
      .catch((err: Error) => { setError(err.message); setStatus('error') })
  }, [source])

  return (
    <div className="flex h-full flex-col p-8">
      <h3 className="mb-4 border-b border-[var(--color-border)] pb-4 text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
        {label ?? source.toUpperCase()}
      </h3>

      {status === 'loading' && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-14 w-20 flex-shrink-0 animate-pulse rounded bg-[var(--color-border)]" />
              <div className="flex flex-1 flex-col gap-1.5 pt-1">
                <div className="h-2.5 w-full animate-pulse rounded bg-[var(--color-border)]" />
                <div className="h-2.5 w-3/4 animate-pulse rounded bg-[var(--color-border)]" />
                <div className="h-2 w-10 animate-pulse rounded bg-[var(--color-border)]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {status === 'error' && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {status === 'success' && (
        <div className="flex flex-col divide-y divide-[var(--color-border)] overflow-y-auto">
          {items.map((item, i) => (
            <a
              key={i}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="flex gap-3 py-2.5 first:pt-0 hover:opacity-75 transition-opacity"
            >
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt=""
                  className="h-14 w-20 flex-shrink-0 rounded object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[13px] font-medium leading-snug text-[var(--color-foreground)]">
                  {item.title}
                </p>
                {item.publishedAt && (
                  <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">
                    {timeAgo(item.publishedAt)}
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
