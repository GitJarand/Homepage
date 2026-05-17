import { useState, useEffect } from 'react'

type Mode = 'pl' | 'cl' | 'lfc'

interface Team  { name: string; short: string; crest: string }
interface Match {
  id: number; utcDate: string; status: string
  matchday: number | null; stage: string
  homeTeam: Team; awayTeam: Team
  score: { home: number | null; away: number | null }
  competition: { name: string; code: string; emblem: string }
}
interface Response { matches: Match[]; matchday?: number; stage?: string; error?: string }

// Crests from football-data.org
const CRESTS: Record<Mode, string> = {
  pl:  'https://crests.football-data.org/PL.png',
  cl:  'https://crests.football-data.org/CL.png',
  lfc: 'https://crests.football-data.org/64.png',
}

// PL and CL logos are dark-colored — invert to white in dark mode
const DARK_INVERT: Record<Mode, boolean> = {
  pl:  true,
  cl:  true,
  lfc: false,
}

const LABELS: Record<Mode, string> = {
  pl:  'Premier League',
  cl:  'Champions League',
  lfc: 'Liverpool FC',
}

function formatMatchTime(utcDate: string): string {
  const d    = new Date(utcDate)
  const now  = new Date()
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const diffDays = Math.floor((d.setHours(0,0,0,0) - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000)
  if (diffDays === 0)  return `Today ${time}`
  if (diffDays === 1)  return `Tomorrow ${time}`
  if (diffDays <= 6)  return `${new Date(utcDate).toLocaleDateString('en-GB', { weekday: 'short' })} ${time}`
  return new Date(utcDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ` ${time}`
}

function formatStage(stage: string): string {
  return stage.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function Football() {
  const [mode, setMode]       = useState<Mode>('pl')
  const [data, setData]       = useState<Response | null>(null)
  const [status, setStatus]   = useState<'loading' | 'error' | 'ok'>('loading')
  const [error, setError]     = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setStatus('loading')
    fetch(`/api/football/next?mode=${mode}`)
      .then(r => r.json() as Promise<Response>)
      .then(d => {
        if (d.error) { setError(d.error); setStatus('error'); return }
        setData(d); setStatus('ok')
      })
      .catch((e: Error) => { setError(e.message); setStatus('error') })
  }, [mode, refreshKey])

  const matches = data?.matches ?? []

  const roundLabel = data?.matchday
    ? `Matchday ${data.matchday}`
    : data?.stage
    ? formatStage(data.stage)
    : null

  return (
    <div className="relative flex h-full flex-col px-4 pb-4 pt-3">

      {/* Header */}
      <div className="relative mb-3 flex shrink-0 flex-col items-center pb-3">
        <img src={CRESTS[mode]} alt={LABELS[mode]} className={`h-10 w-10 object-contain ${DARK_INVERT[mode] ? 'dark:brightness-0 dark:invert' : ''}`} />

        {/* Refresh */}
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

        {/* Mode switcher */}
        <div className="absolute right-0 top-0 flex items-center gap-1">
          {(['pl', 'cl', 'lfc'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              title={LABELS[m]}
              className="flex h-7 w-7 items-center justify-center rounded transition-opacity"
              style={{ opacity: mode === m ? 1 : 0.3 }}
            >
              <img src={CRESTS[m]} alt={LABELS[m]} className={`object-contain ${m === 'cl' ? 'h-9 w-9' : 'h-7 w-7'} ${DARK_INVERT[m] ? 'dark:brightness-0 dark:invert' : ''}`} />
            </button>
          ))}
        </div>
      </div>

      {/* Round label */}
      {roundLabel && status === 'ok' && (
        <p className="mb-2 text-center text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
          {roundLabel}
        </p>
      )}

      {/* Loading skeleton */}
      {status === 'loading' && (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-4 w-4 animate-pulse rounded-full bg-[var(--color-border)]" />
              <div className="h-2.5 flex-1 animate-pulse rounded bg-[var(--color-border)]" />
              <div className="h-2.5 w-10 animate-pulse rounded bg-[var(--color-border)]" />
              <div className="h-2.5 flex-1 animate-pulse rounded bg-[var(--color-border)]" />
              <div className="h-4 w-4 animate-pulse rounded-full bg-[var(--color-border)]" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <p className="text-sm text-red-400">{error ?? 'Failed to load matches.'}</p>
      )}

      {/* Match list */}
      {status === 'ok' && matches.length === 0 && (
        <p className="text-sm text-[var(--color-muted-foreground)]">No upcoming matches.</p>
      )}

      {status === 'ok' && matches.length > 0 && (
        <div className="flex flex-col divide-y divide-[var(--color-border)] overflow-y-auto">
          {matches.map(match => {
            const isLive      = match.status === 'IN_PLAY' || match.status === 'PAUSED'
            const isFinished  = match.status === 'FINISHED'
            const showScore   = isLive || isFinished
            const { home, away } = match.score

            return (
              <div key={match.id} className="flex items-center gap-2 py-2 first:pt-0">
                {/* Home */}
                <img src={match.homeTeam.crest} alt="" className="h-5 w-5 flex-shrink-0 object-contain" />
                <span className="flex-1 truncate text-[12px] font-medium text-[var(--color-foreground)]">
                  {match.homeTeam.short}
                </span>

                {/* Score / time */}
                <span className={`w-14 shrink-0 text-center text-[11px] tabular-nums ${isLive ? 'font-bold text-green-500' : isFinished ? 'font-semibold text-[var(--color-foreground)]' : 'text-[var(--color-muted-foreground)]'}`}>
                  {showScore
                    ? `${home ?? 0} – ${away ?? 0}`
                    : formatMatchTime(match.utcDate)
                  }
                </span>

                {/* Away */}
                <span className="flex-1 truncate text-right text-[12px] font-medium text-[var(--color-foreground)]">
                  {match.awayTeam.short}
                </span>
                <img src={match.awayTeam.crest} alt="" className="h-5 w-5 flex-shrink-0 object-contain" />

                {/* Competition badge for LFC mode */}
                {mode === 'lfc' && match.competition.emblem && (
                  <img src={match.competition.emblem} alt={match.competition.name} title={match.competition.name} className="h-4 w-4 flex-shrink-0 object-contain opacity-60" />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
