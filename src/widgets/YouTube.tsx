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

function loadChannels(): SavedChannel[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
}

function saveChannels(channels: SavedChannel[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(channels))
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

function useLatestVideo(channel: SavedChannel): ChannelState {
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
  }, [channel.channelId])

  return state
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChannelRow({ channel, onRemove }: { channel: SavedChannel; onRemove: () => void }) {
  const state = useLatestVideo(channel)

  return (
    <li className="flex flex-col gap-1.5 rounded border border-[var(--color-border)] p-2.5">
      {state.status === 'loading' && (
        <div className="flex items-center gap-2 py-1">
          <div className="h-3 w-3 animate-spin rounded-full border border-[var(--color-border)] border-t-[var(--color-muted-foreground)]" />
          <span className="text-xs text-[var(--color-muted-foreground)]">{channel.name}</span>
        </div>
      )}

      {state.status === 'error' && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-[var(--color-muted-foreground)]">{channel.name}</span>
          <span className="text-xs text-red-400">{state.message}</span>
          <button onClick={onRemove} className="text-xs text-[var(--color-muted-foreground)] hover:text-red-500">✕</button>
        </div>
      )}

      {state.status === 'success' && (() => {
        const { video } = state
        return (
          <div className="flex gap-2.5">
            <a href={video.url} target="_blank" rel="noreferrer" className="flex-shrink-0">
              <img
                src={video.thumbnail}
                alt={video.title}
                className="h-[54px] w-24 rounded object-cover"
              />
            </a>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                {video.channelName}
              </p>
              <a
                href={video.url}
                target="_blank"
                rel="noreferrer"
                className="line-clamp-2 text-xs font-medium leading-snug text-[var(--color-foreground)] hover:underline"
              >
                {video.title}
              </a>
              {video.publishedAt && (
                <p className="mt-0.5 text-[11px] text-[var(--color-muted-foreground)]">
                  {timeAgo(video.publishedAt)}
                </p>
              )}
            </div>
            <button
              onClick={onRemove}
              className="flex-shrink-0 self-start text-xs text-[var(--color-muted-foreground)] hover:text-red-500"
              aria-label="Remove"
            >
              ✕
            </button>
          </div>
        )
      })()}
    </li>
  )
}

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

  return (
    <div className="flex h-full flex-col bg-transparent p-8 min-h-72">
      <h3 className="mb-4 border-b border-[var(--color-border)] pb-4 text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
        YouTube
      </h3>
      <div className="flex flex-1 flex-col gap-2">
        {channels.length === 0 && (
          <p className="py-2 text-center text-xs text-[var(--color-muted-foreground)]">
            No channels added
          </p>
        )}
        <ul className="space-y-2">
          {channels.map(channel => (
            <ChannelRow
              key={channel.channelId}
              channel={channel}
              onRemove={() => handleRemove(channel.channelId)}
            />
          ))}
        </ul>
        <AddForm onAdd={handleAdd} />
      </div>
    </div>
  )
}
