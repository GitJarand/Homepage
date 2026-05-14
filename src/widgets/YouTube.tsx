import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SavedChannel {
  channelId: string
  name: string
  addedAt: string
}

interface LatestVideo {
  videoId: string
  title: string
  publishedAt: string | null
  thumbnail: string
  channelName: string
  url: string
}

type ChannelState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; video: LatestVideo }

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'homepage:youtube-channels'
const WATCHED_KEY = 'homepage:youtube-watched'

function loadChannels(): SavedChannel[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
}

function saveChannels(channels: SavedChannel[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(channels))
}

function loadWatched(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(WATCHED_KEY) ?? '[]') as string[]) } catch { return new Set() }
}

function saveWatched(watched: Set<string>) {
  localStorage.setItem(WATCHED_KEY, JSON.stringify([...watched]))
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useLatestVideo(channel: SavedChannel, refreshKey: number): ChannelState {
  const [state, setState] = useState<ChannelState>({ status: 'loading' })

  useEffect(() => {
    setState({ status: 'loading' })
    fetch(`/api/youtube/latest?channelId=${encodeURIComponent(channel.channelId)}`)
      .then(async r => {
        const json = await r.json() as LatestVideo & { error?: string }
        if (json.error) setState({ status: 'error', message: json.error })
        else setState({ status: 'success', video: json })
      })
      .catch((err: Error) => setState({ status: 'error', message: err.message }))
  }, [channel.channelId, refreshKey])

  return state
}

// ─── Channel card ─────────────────────────────────────────────────────────────

function ChannelCard({
  channel,
  watched,
  onMarkWatched,
  onRemove,
  refreshKey,
}: {
  channel: SavedChannel
  watched: Set<string>
  onMarkWatched: (videoId: string) => void
  onRemove: () => void
  refreshKey: number
}) {
  const state = useLatestVideo(channel, refreshKey)

  // Loading skeleton
  if (state.status === 'loading') {
    return (
      <div className="flex flex-col gap-1.5 rounded border border-[var(--color-border)] p-2">
        <div className="aspect-video w-full animate-pulse rounded bg-[var(--color-border)]" />
        <div className="h-2.5 w-2/3 animate-pulse rounded bg-[var(--color-border)]" />
        <div className="h-2 w-full animate-pulse rounded bg-[var(--color-border)]" />
      </div>
    )
  }

  // Error state
  if (state.status === 'error') {
    return (
      <div className="group relative flex flex-col gap-1 rounded border border-[var(--color-border)] p-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">{channel.name}</p>
        <p className="text-[10px] text-red-400">{state.message}</p>
        <button
          onClick={onRemove}
          className="absolute right-1.5 top-1.5 hidden text-[10px] text-[var(--color-muted-foreground)] hover:text-red-500 group-hover:block"
        >
          ✕
        </button>
      </div>
    )
  }

  const { video } = state
  const isWatched = watched.has(video.videoId)

  // Watched — faded row
  if (isWatched) {
    return (
      <div className="group relative flex items-center gap-2 rounded border border-[var(--color-border)] p-2 opacity-40">
        <img src={video.thumbnail} alt="" className="h-10 w-[72px] flex-shrink-0 rounded object-cover grayscale" />
        <p className="truncate text-[10px] text-[var(--color-muted-foreground)]">{video.channelName}</p>
        <button
          onClick={onRemove}
          className="absolute right-1.5 top-1.5 hidden text-[10px] text-[var(--color-muted-foreground)] hover:text-red-500 group-hover:block"
        >
          ✕
        </button>
      </div>
    )
  }

  // Unwatched
  return (
    <div className="group relative flex gap-2 rounded border border-[var(--color-border)] p-2">
      <a href={video.url} target="_blank" rel="noreferrer" className="flex-shrink-0">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="h-10 w-[72px] rounded object-cover hover:opacity-90"
        />
      </a>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
          {video.channelName}
        </p>
        <a
          href={video.url}
          target="_blank"
          rel="noreferrer"
          className="line-clamp-2 text-[11px] font-medium leading-snug text-[var(--color-foreground)] hover:underline"
        >
          {video.title}
        </a>
        {video.publishedAt && (
          <p className="mt-0.5 text-[10px] text-[var(--color-muted-foreground)]">{timeAgo(video.publishedAt)}</p>
        )}
      </div>
      <div className="absolute right-1.5 top-1.5 hidden flex-col gap-1 group-hover:flex">
        <button onClick={onRemove} className="rounded bg-black/40 px-1 py-0.5 text-[10px] text-white hover:bg-red-500/80" title="Remove">✕</button>
        <button onClick={() => onMarkWatched(video.videoId)} className="rounded bg-black/40 px-1 py-0.5 text-[10px] text-white hover:bg-green-500/80" title="Mark watched">✓</button>
      </div>
    </div>
  )
}

// ─── Add form ─────────────────────────────────────────────────────────────────

function AddForm({ onAdd }: { onAdd: (channel: SavedChannel) => void }) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const input = url.trim()
    if (!input) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/youtube/resolve?url=${encodeURIComponent(input)}`)
      const json = await res.json() as { channelId: string; name: string; error?: string }
      if (json.error) { setError(json.error); return }
      onAdd({ channelId: json.channelId, name: json.name, addedAt: new Date().toISOString() })
      setUrl('')
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded border border-dashed border-[var(--color-border)] py-1.5 text-xs text-[var(--color-muted-foreground)] hover:border-[var(--color-foreground)] hover:text-[var(--color-foreground)]"
      >
        + Add channel
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <input
        autoFocus
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="youtube.com/@channel or channel URL"
        className="w-full rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs text-[var(--color-foreground)] outline-none focus:border-[#007AFF]"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-[#007AFF] px-3 py-1 text-xs text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Looking up…' : 'Add'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null) }}
          className="rounded px-2 py-1 text-xs text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function YouTube() {
  const [channels, setChannels] = useState<SavedChannel[]>(loadChannels)
  const [watched, setWatched] = useState<Set<string>>(loadWatched)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleAdd = useCallback((channel: SavedChannel) => {
    setChannels(prev => {
      if (prev.some(c => c.channelId === channel.channelId)) return prev
      const next = [...prev, channel]
      saveChannels(next)
      return next
    })
  }, [])

  const handleRemove = useCallback((channelId: string) => {
    setChannels(prev => {
      const next = prev.filter(c => c.channelId !== channelId)
      saveChannels(next)
      return next
    })
  }, [])

  const handleMarkWatched = useCallback((videoId: string) => {
    setWatched(prev => {
      const next = new Set(prev).add(videoId)
      saveWatched(next)
      return next
    })
  }, [])

  return (
    <div className="flex h-full flex-col bg-transparent p-8">
      <div className="mb-4 flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <h3 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">YouTube</h3>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          className="rounded p-1 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          title="Refresh"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
          </svg>
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
        {channels.length === 0 && (
          <p className="py-2 text-center text-xs text-[var(--color-muted-foreground)]">
            No channels added
          </p>
        )}
        {channels.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {channels.map(channel => (
              <ChannelCard
                key={channel.channelId}
                channel={channel}
                watched={watched}
                onMarkWatched={handleMarkWatched}
                onRemove={() => handleRemove(channel.channelId)}
                refreshKey={refreshKey}
              />
            ))}
          </div>
        )}
        <AddForm onAdd={handleAdd} />
      </div>
    </div>
  )
}
