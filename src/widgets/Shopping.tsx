import { useState, useEffect } from 'react'
import { RefreshButton } from '../components/RefreshButton'

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

const BLUR_KEY = 'homepage:blur-shopping'

interface BringList { id: string; name: string }
interface BringItem { id: string; name: string; spec: string }
interface ItemsResponse { purchase: BringItem[]; recently: BringItem[]; error?: string }
interface ListsResponse { lists: BringList[]; error?: string }

export function Shopping() {
  const [lists, setLists]         = useState<BringList[]>([])
  const [activeList, setActiveList] = useState<BringList | null>(null)
  const [items, setItems]         = useState<BringItem[]>([])
  const [status, setStatus]       = useState<'loading' | 'error' | 'ok'>('loading')
  const [error, setError]         = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [blurred, setBlurred] = useState(() => localStorage.getItem(BLUR_KEY) === '1')

  function toggleBlur() {
    setBlurred(b => {
      localStorage.setItem(BLUR_KEY, b ? '0' : '1')
      return !b
    })
  }

  // Load lists once on mount
  useEffect(() => {
    fetch('/api/shopping/lists')
      .then(r => r.json() as Promise<ListsResponse>)
      .then(d => {
        if (d.error) { setError(d.error); setStatus('error'); return }
        setLists(d.lists)
        if (d.lists.length > 0) setActiveList(d.lists[0])
      })
      .catch((e: Error) => { setError(e.message); setStatus('error') })
  }, [])

  // Load items when active list or refreshKey changes
  useEffect(() => {
    if (!activeList) return
    setStatus('loading')
    fetch(`/api/shopping/items?listId=${activeList.id}`)
      .then(r => r.json() as Promise<ItemsResponse>)
      .then(d => {
        if (d.error) { setError(d.error); setStatus('error'); return }
        setItems(d.purchase)
        setStatus('ok')
      })
      .catch((e: Error) => { setError(e.message); setStatus('error') })
  }, [activeList, refreshKey])

  return (
    <div className="relative flex h-full flex-col px-4 pb-4 pt-3">

      {/* Header */}
      <div className="relative mb-3 flex shrink-0 flex-col items-center pb-3">
        <img
          src="https://www.google.com/s2/favicons?domain=getbring.com&sz=64"
          alt="Bring"
          className="h-8 w-8 object-contain"
        />

        {/* Refresh */}
        <RefreshButton
          onClick={() => setRefreshKey(k => k + 1)}
          loading={status === 'loading'}
          className="absolute left-0 top-0"
        />

        {/* Blur toggle */}
        <button
          onClick={toggleBlur}
          title={blurred ? 'Show' : 'Hide'}
          className="absolute right-0 top-0 rounded p-1 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
        >
          {blurred ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>

      <div className={`flex flex-1 flex-col gap-2 transition-[filter] duration-200 overflow-hidden ${blurred ? 'blur-sm select-none pointer-events-none' : ''}`}>

      {/* List switcher */}
      {lists.length > 1 && (
        <div className="mb-2 flex gap-1 flex-wrap">
          {lists.map(l => (
            <button
              key={l.id}
              onClick={() => setActiveList(l)}
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                activeList?.id === l.id
                  ? 'bg-[var(--color-foreground)] text-[var(--card-bg)]'
                  : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
              }`}
            >
              {l.name}
            </button>
          ))}
        </div>
      )}


      {/* Loading */}
      {status === 'loading' && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-3.5 w-3.5 flex-shrink-0 animate-pulse rounded-full bg-[var(--color-border)]" />
              <div className="h-2.5 flex-1 animate-pulse rounded bg-[var(--color-border)]" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <p className="text-sm text-red-400">{error ?? 'Failed to load list.'}</p>
      )}

      {/* Empty */}
      {status === 'ok' && items.length === 0 && (
        <p className="text-sm text-[var(--color-muted-foreground)]">Nothing on the list 🎉</p>
      )}

      {/* Items */}
      {status === 'ok' && items.length > 0 && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 overflow-y-auto">
          {items.map(item => (
            <div key={item.id} className="flex items-start gap-2 min-w-0">
              <div className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 rounded-full border border-[var(--color-muted-foreground)] opacity-40" />
              <div className="min-w-0">
                <p className="text-[13px] font-medium leading-snug text-[var(--color-foreground)] truncate">
                  {item.name}
                </p>
                {item.spec && (
                  <p className="text-[11px] text-[var(--color-muted-foreground)] truncate">{item.spec}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}
