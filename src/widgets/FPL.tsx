import { useState, useEffect, useCallback } from 'react'
import { RefreshButton } from '../components/RefreshButton'
import { BlurButton, useBlur } from '../components/BlurButton'

type View = 'summary' | 'team' | 'leagues'

interface Manager {
  managerId:   number
  managerName: string
  teamName:    string
  totalPoints: number
  overallRank: number
  gameweek: { id: number; name: string; points: number; rank: number } | null
}

interface Pick {
  id: number; name: string; team: string; position: string
  isCaptain: boolean; isViceCap: boolean; multiplier: number; onBench: boolean
}

interface League    { id: number; name: string; entryRank: number }
interface Leagues   { classic: League[]; h2h: League[] }
interface Standing  { rank: number; rankLastGw: number; managerName: string; teamName: string; totalPoints: number; gwPoints: number; managerId: number }
interface Standings { name: string; standings: Standing[] }

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtRank(n: number | null | undefined) {
  if (n == null)      return '–'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`
  if (n >= 1_000)     return `${Math.round(n / 1_000)}k`
  return n.toLocaleString()
}

function RankDelta({ curr, prev }: { curr: number; prev: number }) {
  if (curr < prev) return <span className="text-[10px] text-green-500">▲</span>
  if (curr > prev) return <span className="text-[10px] text-red-400">▼</span>
  return <span className="text-[10px] text-[var(--color-muted-foreground)]">–</span>
}

const POSITION_ORDER = ['GK', 'DEF', 'MID', 'FWD']

// ── FPL logo ──────────────────────────────────────────────────────────────────

function FplLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="6" fill="#37003C"/>
      <text x="16" y="22" textAnchor="middle" fontSize="12" fontWeight="800" fontFamily="system-ui,sans-serif" fill="#00FF87" letterSpacing="-0.5">FPL</text>
    </svg>
  )
}

// ── Sub-views ─────────────────────────────────────────────────────────────────

function SummaryView({ manager, loading }: { manager: Manager | null; loading: boolean }) {
  if (loading) return (
    <div className="flex flex-col gap-3">
      {[80, 60, 100, 60].map((w, i) => (
        <div key={i} className="h-3 animate-pulse rounded bg-[var(--color-border)]" style={{ width: `${w}%` }} />
      ))}
    </div>
  )
  if (!manager) return <p className="text-sm text-red-400">Failed to load manager data.</p>

  const gw = manager.gameweek

  return (
    <div className="flex flex-col gap-3">
      {/* Team name */}
      <p className="text-base font-bold leading-tight text-[var(--color-foreground)]">{manager.teamName}</p>

      {/* GW card */}
      {gw && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-2">
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">{gw.name}</p>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tabular-nums text-[var(--color-foreground)]">{gw.points}</span>
              <span className="text-xs text-[var(--color-muted-foreground)]">pts</span>
            </div>
            <span className="text-xs text-[var(--color-muted-foreground)]">Total rank <span className="font-semibold text-[var(--color-foreground)]">{fmtRank(manager.overallRank)}</span></span>
          </div>
          <p className="text-xs text-[var(--color-muted-foreground)]">GW rank <span className="font-semibold text-[var(--color-foreground)]">{fmtRank(gw.rank)}</span></p>
        </div>
      )}

      {/* Overall */}
      <div className="flex justify-between text-xs">
        <div>
          <p className="text-[var(--color-muted-foreground)]">Total points</p>
          <p className="text-lg font-bold tabular-nums text-[var(--color-foreground)]">{manager.totalPoints}</p>
        </div>
        <div className="text-right">
          <p className="text-[var(--color-muted-foreground)]">Overall rank</p>
          <p className="text-lg font-bold tabular-nums text-[var(--color-foreground)]">{fmtRank(manager.overallRank)}</p>
        </div>
      </div>
    </div>
  )
}

function TeamView({ picks, loading }: { picks: Pick[] | null; loading: boolean }) {
  if (loading) return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 11 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-2.5 w-6 animate-pulse rounded bg-[var(--color-border)]" />
          <div className="h-2.5 flex-1 animate-pulse rounded bg-[var(--color-border)]" />
          <div className="h-2.5 w-8 animate-pulse rounded bg-[var(--color-border)]" />
        </div>
      ))}
    </div>
  )
  if (!picks) return <p className="text-sm text-red-400">Failed to load picks.</p>

  const starters = picks.filter(p => !p.onBench)
  const bench    = picks.filter(p => p.onBench)

  const grouped = POSITION_ORDER.map(pos => ({
    pos,
    players: starters.filter(p => p.position === pos),
  })).filter(g => g.players.length > 0)

  return (
    <div className="flex flex-col gap-3">
      {grouped.map(({ pos, players }) => (
        <div key={pos}>
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">{pos}</p>
          <div className="flex flex-col gap-0.5">
            {players.map(p => (
              <PlayerRow key={p.id} pick={p} />
            ))}
          </div>
        </div>
      ))}

      {bench.length > 0 && (
        <div>
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Bench</p>
          <div className="flex flex-col gap-0.5 opacity-50">
            {bench.map(p => <PlayerRow key={p.id} pick={p} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function PlayerRow({ pick }: { pick: Pick }) {
  return (
    <div className="flex items-center gap-1.5 py-0.5">
      <span className="w-6 shrink-0 text-[10px] text-[var(--color-muted-foreground)]">{pick.team}</span>
      <span className="flex-1 truncate text-[12px] font-medium text-[var(--color-foreground)]">{pick.name}</span>
      {pick.isCaptain  && <span className="rounded bg-[#00FF87]/20 px-1 text-[9px] font-bold text-[#00aa60]">C</span>}
      {pick.isViceCap  && <span className="rounded bg-[var(--color-muted)] px-1 text-[9px] font-bold text-[var(--color-muted-foreground)]">V</span>}
      {pick.multiplier === 3 && <span className="rounded bg-[#00FF87]/20 px-1 text-[9px] font-bold text-[#00aa60]">TC</span>}
    </div>
  )
}

function LeaguesView({
  leagues, loading, selectedId, onSelect, standings, standingsLoading,
}: {
  leagues: Leagues | null; loading: boolean
  selectedId: number | null; onSelect: (id: number) => void
  standings: Standings | null; standingsLoading: boolean
}) {
  if (loading) return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-3 animate-pulse rounded bg-[var(--color-border)]" />
      ))}
    </div>
  )
  if (!leagues) return <p className="text-sm text-red-400">Failed to load leagues.</p>

  const allLeagues = leagues.classic.filter(l => l.name !== 'Overall')

  return (
    <div className="flex flex-col gap-3">
      {/* League selector */}
      <div className="flex flex-col gap-0.5">
        {allLeagues.map(l => (
          <button
            key={l.id}
            onClick={() => onSelect(l.id)}
            className={`flex items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors ${selectedId === l.id ? 'bg-[#37003C]/10 dark:bg-[#00FF87]/10 font-semibold' : 'hover:bg-[var(--color-muted)]'}`}
          >
            <span className="truncate text-[var(--color-foreground)]">{l.name}</span>
            <span className="ml-2 shrink-0 text-[var(--color-muted-foreground)]">#{l.entryRank}</span>
          </button>
        ))}
      </div>

      {/* Standings */}
      {selectedId && (
        <div>
          {standingsLoading && (
            <div className="flex flex-col gap-1.5 pt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-2.5 animate-pulse rounded bg-[var(--color-border)]" />
              ))}
            </div>
          )}
          {standings && !standingsLoading && (
            <div>
              <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">{standings.name}</p>
              <div className="flex flex-col divide-y divide-[var(--color-border)]">
                {standings.standings.slice(0, 10).map(e => (
                  <div key={e.managerId} className="flex items-center gap-2 py-1.5 text-[11px]">
                    <span className="w-4 shrink-0 text-[var(--color-muted-foreground)] tabular-nums">{e.rank}</span>
                    <RankDelta curr={e.rank} prev={e.rankLastGw} />
                    <span className="flex-1 truncate font-medium text-[var(--color-foreground)]">{e.teamName}</span>
                    <span className="shrink-0 text-[var(--color-muted-foreground)]">{e.gwPoints}</span>
                    <span className="w-8 shrink-0 text-right font-semibold tabular-nums text-[var(--color-foreground)]">{e.totalPoints}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main widget ───────────────────────────────────────────────────────────────

export function FPL() {
  const [view, setView]           = useState<View>('summary')
  const [refreshKey, setRefreshKey] = useState(0)
  const [blurred, toggleBlur]     = useBlur('homepage:blur-fpl', null, false)

  const [manager, setManager]           = useState<Manager | null>(null)
  const [managerLoading, setManagerLoading] = useState(true)

  const [picks, setPicks]           = useState<Pick[] | null>(null)
  const [picksLoading, setPicksLoading] = useState(false)

  const [leagues, setLeagues]           = useState<Leagues | null>(null)
  const [leaguesLoading, setLeaguesLoading] = useState(false)

  const [selectedLeague, setSelectedLeague]           = useState<number | null>(null)
  const [standings, setStandings]                     = useState<Standings | null>(null)
  const [standingsLoading, setStandingsLoading]       = useState(false)

  async function apiFetch<T>(url: string): Promise<T | null> {
    try {
      const r = await fetch(url)
      const d = await r.json()
      if (!r.ok || d.error) return null
      return d as T
    } catch { return null }
  }

  // Fetch manager summary on mount / refresh
  useEffect(() => {
    setManagerLoading(true)
    apiFetch<Manager>('/api/fpl/manager')
      .then(d => setManager(d))
      .finally(() => setManagerLoading(false))
  }, [refreshKey])

  // Fetch picks when team view is opened
  useEffect(() => {
    if (view !== 'team' || picks) return
    setPicksLoading(true)
    apiFetch<{ picks: Pick[] }>('/api/fpl/picks')
      .then(d => setPicks(d?.picks ?? null))
      .finally(() => setPicksLoading(false))
  }, [view])

  // Fetch leagues when leagues view is opened
  useEffect(() => {
    if (view !== 'leagues' || leagues) return
    setLeaguesLoading(true)
    apiFetch<Leagues>('/api/fpl/leagues')
      .then(d => setLeagues(d))
      .finally(() => setLeaguesLoading(false))
  }, [view])

  // Fetch standings when a league is selected
  useEffect(() => {
    if (!selectedLeague) return
    setStandingsLoading(true)
    setStandings(null)
    apiFetch<Standings>(`/api/fpl/league/${selectedLeague}`)
      .then(d => setStandings(d))
      .finally(() => setStandingsLoading(false))
  }, [selectedLeague])

  const handleRefresh = useCallback(() => {
    setManager(null); setPicks(null); setLeagues(null); setStandings(null)
    setRefreshKey(k => k + 1)
  }, [])

  const VIEWS: { key: View; label: string }[] = [
    { key: 'summary', label: 'Overview' },
    { key: 'team',    label: 'Team' },
    { key: 'leagues', label: 'Leagues' },
  ]

  return (
    <div className="flex h-full flex-col px-4 pb-4 pt-3">

      {/* Header */}
      <div className="relative mb-2 flex shrink-0 items-center justify-center">
        <FplLogo size={28} />
        <div className="absolute left-0 flex items-center gap-0.5">
          <RefreshButton onClick={handleRefresh} loading={managerLoading} />
          <BlurButton blurred={blurred} onToggle={toggleBlur} />
        </div>
      </div>

      {/* View tabs */}
      <div className="mb-2 flex shrink-0 gap-1 rounded-lg bg-[var(--color-muted)] p-0.5">
        {VIEWS.map(v => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={`flex-1 rounded-md py-1 text-[11px] font-medium transition-colors ${view === v.key ? 'bg-[var(--card-bg)] text-[var(--color-foreground)] shadow-sm' : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'}`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className={`flex-1 overflow-y-auto transition-[filter] duration-200${blurred ? ' blur-sm select-none pointer-events-none' : ''}`}>
        {view === 'summary' && <SummaryView manager={manager} loading={managerLoading} />}
        {view === 'team'    && <TeamView picks={picks} loading={picksLoading} />}
        {view === 'leagues' && (
          <LeaguesView
            leagues={leagues} loading={leaguesLoading}
            selectedId={selectedLeague} onSelect={setSelectedLeague}
            standings={standings} standingsLoading={standingsLoading}
          />
        )}
      </div>
    </div>
  )
}
