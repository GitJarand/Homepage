import { useState, useEffect, useCallback } from 'react'
import { RefreshButton } from '../components/RefreshButton'
import { BlurButton, useBlur } from '../components/BlurButton'
import { useWorkMode, WORK_LOGO } from '../lib/workMode'

type WCTab = 'upcoming' | 'groups'

interface Team  { id: number; name: string; short: string; crest: string }
interface Match {
  id: number; utcDate: string; status: string
  matchday: number | null; stage: string; group: string | null
  homeTeam: Team; awayTeam: Team
  score: { home: number | null; away: number | null }
}
interface GroupEntry {
  position: number
  team: { id: number; name: string; short: string; crest: string }
  played: number; won: number; draw: number; lost: number; points: number; gd: number
}
interface Group { group: string; table: GroupEntry[] }

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(utcDate: string) {
  const d    = new Date(utcDate)
  const now  = new Date()
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const diffDays = Math.floor(
    (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() -
     new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000
  )
  if (diffDays === 0) return `Today ${time}`
  if (diffDays === 1) return `Tomorrow ${time}`
  if (diffDays <= 6)  return `${d.toLocaleDateString('en-GB', { weekday: 'short' })} ${time}`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ` ${time}`
}

function groupByDate(matches: Match[]): { label: string; matches: Match[] }[] {
  const map = new Map<string, Match[]>()
  for (const m of matches) {
    const d = new Date(m.utcDate)
    const key = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(m)
  }
  return [...map.entries()].map(([label, matches]) => ({ label, matches }))
}

// ── Match row ─────────────────────────────────────────────────────────────────

function MatchRow({ match }: { match: Match }) {
  const isLive     = match.status === 'IN_PLAY' || match.status === 'PAUSED'
  const isFinished = match.status === 'FINISHED'
  const showScore  = isLive || isFinished
  const { home, away } = match.score

  return (
    <div className="flex items-center gap-2 py-1.5 first:pt-0">
      <img src={match.homeTeam.crest} alt="" className="h-5 w-5 shrink-0 object-contain" />
      <span className="flex-1 truncate text-[12px] font-medium text-[var(--color-foreground)]">
        {match.homeTeam.short}
      </span>
      <span className={`w-14 shrink-0 text-center text-[11px] tabular-nums ${isLive ? 'font-bold text-green-500' : isFinished ? 'font-semibold text-[var(--color-foreground)]' : 'text-[var(--color-muted-foreground)]'}`}>
        {showScore ? `${home ?? 0} – ${away ?? 0}` : formatTime(match.utcDate)}
      </span>
      <span className="flex-1 truncate text-right text-[12px] font-medium text-[var(--color-foreground)]">
        {match.awayTeam.short}
      </span>
      <img src={match.awayTeam.crest} alt="" className="h-5 w-5 shrink-0 object-contain" />
    </div>
  )
}

function MatchSkeleton() {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-5 w-5 animate-pulse rounded-full bg-[var(--color-border)]" />
          <div className="h-2.5 flex-1 animate-pulse rounded bg-[var(--color-border)]" />
          <div className="h-2.5 w-14 animate-pulse rounded bg-[var(--color-border)]" />
          <div className="h-2.5 flex-1 animate-pulse rounded bg-[var(--color-border)]" />
          <div className="h-5 w-5 animate-pulse rounded-full bg-[var(--color-border)]" />
        </div>
      ))}
    </div>
  )
}

// ── Tab views ─────────────────────────────────────────────────────────────────

function UpcomingView({ matches, loading }: { matches: Match[] | null; loading: boolean }) {
  if (loading) return <MatchSkeleton />
  if (!matches) return <p className="text-sm text-red-400">Failed to load.</p>

  const grouped = groupByDate(matches)

  return (
    <div className="flex flex-col gap-3">
      {grouped.map(({ label, matches: ms }) => (
        <div key={label}>
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">{label}</p>
          <div className="flex flex-col divide-y divide-[var(--color-border)]">
            {ms.map(m => <MatchRow key={m.id} match={m} />)}
          </div>
        </div>
      ))}
      {matches.length === 0 && <p className="text-sm text-[var(--color-muted-foreground)]">No upcoming matches.</p>}
    </div>
  )
}

function GroupsView({ data, loading }: { data: { groups: Group[] } | null; loading: boolean }) {
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    if (data?.groups.length && !selected) setSelected(data.groups[0].group)
  }, [data])

  if (loading) return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-3 animate-pulse rounded bg-[var(--color-border)]" />
      ))}
    </div>
  )
  if (!data) return <p className="text-sm text-red-400">Failed to load.</p>

  const group = data.groups.find(g => g.group === selected)

  return (
    <div className="flex flex-col gap-3">
      {/* Group picker */}
      <div className="flex flex-wrap gap-1">
        {data.groups.map(g => {
          const letter = g.group.replace('Group ', '')
          return (
            <button
              key={g.group}
              onClick={() => setSelected(g.group)}
              className={`flex h-6 w-6 items-center justify-center rounded text-[11px] font-semibold transition-colors ${selected === g.group ? 'bg-[var(--color-foreground)] text-[var(--card-bg)]' : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'}`}
            >
              {letter}
            </button>
          )
        })}
      </div>

      {/* Table */}
      {group && (
        <div>
          <div className="mb-1 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
            <span className="flex-1">Team</span>
            <span className="w-5 text-center">P</span>
            <span className="w-5 text-center">W</span>
            <span className="w-5 text-center">D</span>
            <span className="w-5 text-center">L</span>
            <span className="w-6 text-center">GD</span>
            <span className="w-6 text-center">Pts</span>
          </div>
          <div className="flex flex-col divide-y divide-[var(--color-border)]">
            {group.table.map(e => (
              <div key={e.team.id} className="flex items-center gap-1 py-1.5 text-[11px]">
                <span className="w-4 shrink-0 text-[var(--color-muted-foreground)] tabular-nums">{e.position}</span>
                <img src={e.team.crest} alt="" className="h-4 w-4 shrink-0 object-contain" />
                <span className="flex-1 truncate font-medium text-[var(--color-foreground)]">{e.team.short}</span>
                <span className="w-5 text-center tabular-nums text-[var(--color-muted-foreground)]">{e.played}</span>
                <span className="w-5 text-center tabular-nums text-[var(--color-muted-foreground)]">{e.won}</span>
                <span className="w-5 text-center tabular-nums text-[var(--color-muted-foreground)]">{e.draw}</span>
                <span className="w-5 text-center tabular-nums text-[var(--color-muted-foreground)]">{e.lost}</span>
                <span className="w-6 text-center tabular-nums text-[var(--color-muted-foreground)]">{e.gd > 0 ? `+${e.gd}` : e.gd}</span>
                <span className="w-6 text-center font-bold tabular-nums text-[var(--color-foreground)]">{e.points}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main widget ───────────────────────────────────────────────────────────────

export function WorldCup() {
  const [tab, setTab]               = useState<WCTab>('upcoming')
  const [refreshKey, setRefreshKey] = useState(0)
  const [blurred, toggleBlur]       = useBlur('homepage:blur-worldcup')
  const workMode = useWorkMode()

  const [upcomingData, setUpcomingData]       = useState<Match[] | null>(null)
  const [upcomingLoading, setUpcomingLoading] = useState(true)

  const [groupsData, setGroupsData]         = useState<{ groups: Group[] } | null>(null)
  const [groupsLoading, setGroupsLoading]   = useState(false)

  async function apiFetch<T>(url: string): Promise<T | null> {
    try {
      const r = await fetch(url)
      const d = await r.json()
      if (d.error) return null
      return d as T
    } catch { return null }
  }

  useEffect(() => {
    setUpcomingLoading(true)
    setUpcomingData(null)
    apiFetch<{ matches: Match[] }>('/api/worldcup/upcoming')
      .then(d => setUpcomingData(d?.matches ?? null))
      .finally(() => setUpcomingLoading(false))
  }, [refreshKey])

  useEffect(() => {
    if (tab !== 'groups' || groupsData) return
    setGroupsLoading(true)
    apiFetch<{ groups: Group[] }>('/api/worldcup/groups')
      .then(d => setGroupsData(d))
      .finally(() => setGroupsLoading(false))
  }, [tab])

  const handleRefresh = useCallback(() => {
    setUpcomingData(null)
    setGroupsData(null)
    setRefreshKey(k => k + 1)
  }, [])

  return (
    <div className="flex h-full flex-col px-4 pb-4 pt-3">

      {/* Header */}
      <div className="relative mb-2 flex shrink-0 items-center justify-center">
        {workMode
          ? <img src={WORK_LOGO} alt="" className="h-6 object-contain" />
          : <span className="text-2xl leading-none">🌍🏆</span>
        }
        <div className="absolute left-0 flex items-center gap-0.5">
          <RefreshButton onClick={handleRefresh} loading={upcomingLoading || groupsLoading} />
          <BlurButton blurred={blurred} onToggle={toggleBlur} />
        </div>
        <div className="absolute right-0 flex items-center gap-0.5">
          <button
            onClick={() => setTab('upcoming')}
            className={`rounded p-1 text-base leading-none transition-opacity ${tab === 'upcoming' ? 'opacity-100' : 'opacity-30 hover:opacity-60'}`}
            title="Upcoming matches"
          >
            ⚽
          </button>
          <button
            onClick={() => setTab('groups')}
            className={`rounded p-1 text-base leading-none transition-opacity ${tab === 'groups' ? 'opacity-100' : 'opacity-30 hover:opacity-60'}`}
            title="Group standings"
          >
            📊
          </button>
        </div>
      </div>

      <div className={`flex flex-1 flex-col overflow-hidden transition-[filter] duration-200${blurred ? ' blur-sm select-none pointer-events-none' : ''}`}>
        <div className="flex-1 overflow-y-auto">
          {tab === 'upcoming' && <UpcomingView matches={upcomingData} loading={upcomingLoading} />}
          {tab === 'groups'   && <GroupsView   data={groupsData}     loading={groupsLoading} />}
        </div>
      </div>
    </div>
  )
}
