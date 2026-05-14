import { useState, useEffect, useRef, useMemo } from 'react'

interface NewsItem {
  title: string
  url: string
  description: string | null
  publishedAt: string | null
  imageUrl: string | null
  sourceLabel?: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

function loadHidden(source: string, defaultHidden: string[] = []): Set<string> {
  try {
    const stored = localStorage.getItem(`homepage:news-hidden:${source}`)
    if (stored !== null) return new Set(JSON.parse(stored) as string[])
    return new Set(defaultHidden)
  } catch { return new Set(defaultHidden) }
}

function saveHidden(source: string, hidden: Set<string>) {
  localStorage.setItem(`homepage:news-hidden:${source}`, JSON.stringify([...hidden]))
}

export function News({ source = 'vg', label, fetchLimit = 15, defaultHidden = [] }: { source?: string; label?: string; fetchLimit?: number; defaultHidden?: string[] }) {
  const [items, setItems] = useState<NewsItem[]>([])
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [hiddenSources, setHiddenSources] = useState<Set<string>>(() => loadHidden(source, defaultHidden))
  const [showFilter, setShowFilter] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setStatus('loading')
    fetch(`/api/news/feed?source=${encodeURIComponent(source)}&limit=${fetchLimit}`)
      .then(async r => {
        const json = await r.json() as { items?: NewsItem[]; error?: string }
        if (json.error) { setError(json.error); setStatus('error'); return }
        setItems(json.items ?? [])
        setStatus('success')
      })
      .catch((err: Error) => { setError(err.message); setStatus('error') })
  }, [source, fetchLimit, refreshKey])

  // Close dropdown on outside click
  useEffect(() => {
    if (!showFilter) return
    function handler(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilter(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showFilter])

  const availableSources = useMemo(
    () => [...new Set(items.map(i => i.sourceLabel).filter(Boolean) as string[])].sort(),
    [items]
  )

  const filteredItems = useMemo(
    () => items.filter(i => !i.sourceLabel || !hiddenSources.has(i.sourceLabel)),
    [items, hiddenSources]
  )

  function toggleSource(src: string) {
    setHiddenSources(prev => {
      const next = new Set(prev)
      if (next.has(src)) next.delete(src)
      else next.add(src)
      saveHidden(source, next)
      return next
    })
  }

  function toggleAll(enable: boolean) {
    const next = enable ? new Set<string>() : new Set(availableSources)
    saveHidden(source, next)
    setHiddenSources(next)
  }

  const enabledCount = availableSources.filter(s => !hiddenSources.has(s)).length

  return (
    <div className="relative flex h-full flex-col p-8">
      <div className="mb-4 flex shrink-0 items-center justify-between border-b border-[var(--color-border)] pb-4">
        <h3 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
          {label ?? source.toUpperCase()}
        </h3>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          disabled={status === 'loading'}
          className="ml-auto rounded p-1 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] disabled:opacity-40"
          title="Refresh"
        >
          <svg className={status === 'loading' ? 'animate-spin' : ''} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
          </svg>
        </button>
        {availableSources.length > 1 && (
          <div ref={filterRef} className="relative">
            <button
              onClick={() => setShowFilter(v => !v)}
              className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
            >
              Sources
              {hiddenSources.size > 0 && (
                <span className="rounded-full bg-[#007AFF] px-1.5 py-0.5 text-[9px] text-white">
                  {enabledCount}/{availableSources.length}
                </span>
              )}
              <span className="text-[9px] opacity-60">{showFilter ? '▲' : '▼'}</span>
            </button>

            {showFilter && (
              <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] py-1 shadow-lg">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">Sources</span>
                  <div className="flex gap-2">
                    <button onClick={() => toggleAll(true)} className="text-[10px] text-[#007AFF] hover:underline">All</button>
                    <button onClick={() => toggleAll(false)} className="text-[10px] text-[#007AFF] hover:underline">None</button>
                  </div>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {availableSources.map(src => (
                    <label key={src} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-[var(--color-muted)]">
                      <input
                        type="checkbox"
                        checked={!hiddenSources.has(src)}
                        onChange={() => toggleSource(src)}
                        className="accent-[#007AFF]"
                      />
                      <span className="text-[12px] text-[var(--color-foreground)]">{src}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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
          {filteredItems.map((item, i) => (
            <a
              key={i}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="flex gap-3 py-2.5 first:pt-0 transition-opacity hover:opacity-75"
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
                {(item.publishedAt || item.sourceLabel) && (
                  <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">
                    {item.publishedAt && timeAgo(item.publishedAt)}
                    {item.sourceLabel && (
                      <span className="opacity-50"> · {item.sourceLabel}</span>
                    )}
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
