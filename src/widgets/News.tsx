import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { RefreshButton } from '../components/RefreshButton'
import { timeAgo } from '../lib/time'
import { useWorkMode, WORK_LOGO } from '../lib/workMode'

const PAGE = 12

interface NewsItem {
  title: string
  url: string
  description: string | null
  publishedAt: string | null
  imageUrl: string | null
  sourceLabel?: string
}

const ListIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <line x1="9" y1="6" x2="20" y2="6"/>
    <line x1="9" y1="12" x2="20" y2="12"/>
    <line x1="9" y1="18" x2="20" y2="18"/>
    <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"/>
    <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"/>
    <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none"/>
  </svg>
)

const LOGOS: Record<string, { type: 'img'; url: string } | { type: 'text'; value: string } | { type: 'img+emoji'; url: string; emoji: string } | { type: 'icon' }> = {
  vg:               { type: 'img',  url: 'https://www.google.com/s2/favicons?domain=vg.no&sz=64' },
  nrk:              { type: 'img',  url: 'https://www.google.com/s2/favicons?domain=nrk.no&sz=64' },
  'reddit-fpl-lfc': { type: 'img+emoji', url: 'https://www.google.com/s2/favicons?domain=reddit.com&sz=64', emoji: '⚽' },
  'tech-gaming':    { type: 'text',      value: '💻🎮' },
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

export function News({ source = 'vg', label: _label, fetchLimit = 15, defaultHidden = [], allSources }: { source?: string; label?: string; fetchLimit?: number; defaultHidden?: string[]; allSources?: string[] }) {
  const [items, setItems] = useState<NewsItem[]>([])
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [hiddenSources, setHiddenSources] = useState<Set<string>>(() => loadHidden(source, defaultHidden))
  const [showFilter, setShowFilter] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [visibleCount, setVisibleCount] = useState(PAGE)
  const [sort, setSort] = useState<'hot' | 'new'>('hot')
  const filterRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // When allSources is provided, derive which sub-feeds to request from the server.
  // Returns null when all are shown (no filtering needed) or when allSources isn't set.
  const enabledSubreddits = useMemo(() => {
    if (!allSources) return null
    const enabled = allSources.filter(s => !hiddenSources.has(s))
    if (enabled.length === 0 || enabled.length === allSources.length) return null
    return enabled.map(s => s.replace(/^r\//, '')).join(',')
  }, [allSources, hiddenSources])

  useEffect(() => {
    setStatus('loading')
    const qs = new URLSearchParams({ source, limit: String(fetchLimit) })
    if (enabledSubreddits) qs.set('subreddits', enabledSubreddits)
    if (allSources && sort !== 'hot') qs.set('sort', sort)
    fetch(`/api/news/feed?${qs}`)
      .then(async r => {
        const json = await r.json() as { items?: NewsItem[]; error?: string }
        if (json.error) { setError(json.error); setStatus('error'); return }
        setItems(json.items ?? [])
        setStatus('success')
      })
      .catch((err: Error) => { setError(err.message); setStatus('error') })
  }, [source, fetchLimit, refreshKey, enabledSubreddits, sort])

  // Reset visible count only when switching to a completely different source widget
  useEffect(() => { setVisibleCount(PAGE) }, [source])

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
    () => allSources
      ? [...allSources].sort()
      : [...new Set(items.map(i => i.sourceLabel).filter(Boolean) as string[])].sort(),
    [allSources, items]
  )

  const filteredItems = useMemo(
    () => items.filter(i => !i.sourceLabel || !hiddenSources.has(i.sourceLabel)),
    [items, hiddenSources]
  )

  const visibleItems = filteredItems.slice(0, visibleCount)
  const hasMore = visibleCount < filteredItems.length

  // IntersectionObserver to load more on scroll
  const loadMore = useCallback(() => setVisibleCount(n => n + PAGE), [])
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore() },
      { threshold: 0.1 }
    )
    obs.observe(sentinelRef.current)
    return () => obs.disconnect()
  }, [hasMore, visibleCount, loadMore])

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

  const logo = LOGOS[source]
  const workMode = useWorkMode()

  return (
    <div className="relative flex h-full flex-col px-4 pb-4 pt-3">
      <div className="relative mb-3 flex shrink-0 flex-col items-center pb-3">
        {workMode
          ? <img src={WORK_LOGO} alt="" className="h-8 object-contain" />
          : logo && (
            logo.type === 'img'
              ? <img src={logo.url} alt="" className="h-8 w-8 object-contain" />
              : logo.type === 'img+emoji'
                ? <div className="flex items-center gap-1"><img src={logo.url} alt="" className="h-8 w-8 object-contain" /><span className="text-xl leading-none">{logo.emoji}</span></div>
                : logo.type === 'icon'
                  ? <span className="text-[var(--color-muted-foreground)]"><ListIcon /></span>
                  : <span className="text-3xl leading-none">{logo.value}</span>
          )}
        <RefreshButton
          onClick={() => setRefreshKey(k => k + 1)}
          loading={status === 'loading'}
          className="absolute left-0 top-0"
        />
        {(allSources || availableSources.length > 1) && (
          <div ref={filterRef} className="absolute right-0 top-0 flex items-center gap-0.5">
            {allSources && (
              <>
                <button
                  onClick={() => setSort('hot')}
                  title="Hot"
                  className={`rounded p-1 transition-colors ${sort === 'hot' ? 'text-orange-400' : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z"/>
                  </svg>
                </button>
                <button
                  onClick={() => setSort('new')}
                  title="New"
                  className={`rounded p-1 transition-colors ${sort === 'new' ? 'text-blue-400' : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </button>
              </>
            )}
            {availableSources.length > 1 && (
            <button
              onClick={() => setShowFilter(v => !v)}
              className="flex items-center gap-1 rounded px-1.5 py-1 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6"/><circle cx="8" cy="6" r="2" fill="currentColor" stroke="none"/>
                <line x1="4" y1="12" x2="20" y2="12"/><circle cx="16" cy="12" r="2" fill="currentColor" stroke="none"/>
                <line x1="4" y1="18" x2="20" y2="18"/><circle cx="8" cy="18" r="2" fill="currentColor" stroke="none"/>
              </svg>
            </button>
            )}
            {showFilter && (
              <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-[var(--color-border)] py-1 shadow-xl" style={{ backgroundColor: 'var(--popover-bg)', backdropFilter: 'blur(16px)' }}>
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
          {visibleItems.map((item, i) => (
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
          {hasMore && <div ref={sentinelRef} className="h-4 shrink-0" />}
        </div>
      )}
    </div>
  )
}
