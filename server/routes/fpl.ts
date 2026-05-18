import { Hono } from 'hono'

const fpl = new Hono()

const FPL_BASE  = 'https://fantasy.premierleague.com/api'

function teamId(): number {
  const id = parseInt(process.env.FPL_TEAM_ID ?? '', 10)
  if (!id) throw new Error('FPL_TEAM_ID not configured')
  return id
}

// ── Cache ─────────────────────────────────────────────────────────────────────

const cache = new Map<string, { data: unknown; ts: number }>()

async function fplFetch(path: string, ttlMs: number): Promise<unknown> {
  const hit = cache.get(path)
  if (hit && Date.now() - hit.ts < ttlMs) return hit.data

  const res = await fetch(`${FPL_BASE}${path}`, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`FPL ${res.status}: ${path}`)
  const data = await res.json()
  cache.set(path, { data, ts: Date.now() })
  return data
}

// ── Routes ────────────────────────────────────────────────────────────────────

// Manager summary + current GW stats
fpl.get('/manager', async (c) => {
  try {
    const id = teamId()
    const [entry, bootstrap, history] = await Promise.all([
      fplFetch(`/entry/${id}/`, 5 * 60_000) as Promise<any>,
      fplFetch('/bootstrap-static/', 5 * 60_000) as Promise<any>,
      fplFetch(`/entry/${id}/history/`, 5 * 60_000) as Promise<any>,
    ])

    const currentGw = bootstrap.events.find((e: any) => e.is_current)
      ?? bootstrap.events.findLast((e: any) => e.finished)

    const gwHistory: any[] = history.current ?? []
    const prevGw = gwHistory.length >= 2 ? gwHistory[gwHistory.length - 2] : null

    return c.json({
      managerId:         id,
      managerName:       `${entry.player_first_name} ${entry.player_last_name}`,
      teamName:          entry.name,
      totalPoints:       entry.summary_overall_points,
      overallRank:       entry.summary_overall_rank,
      prevOverallRank:   prevGw?.overall_rank ?? null,
      prevGwRank:        prevGw?.rank ?? null,
      gameweek: currentGw ? {
        id:     currentGw.id,
        name:   currentGw.name,
        points: entry.summary_event_points,
        rank:   entry.summary_event_rank,
      } : null,
    })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

// GW picks with player names/positions
fpl.get('/picks', async (c) => {
  try {
    const id        = teamId()
    const bootstrap = await fplFetch('/bootstrap-static/', 5 * 60_000) as any

    const currentGw = bootstrap.events.find((e: any) => e.is_current)
      ?? bootstrap.events.findLast((e: any) => e.finished)
    if (!currentGw) return c.json({ error: 'No active gameweek' }, 404)

    const gwPicks = await fplFetch(`/entry/${id}/event/${currentGw.id}/picks/`, 60_000) as any

    const playerMap = new Map(bootstrap.elements.map((p: any) => [p.id, p]))
    const typeMap   = new Map(bootstrap.element_types.map((t: any) => [t.id, t.singular_name_short]))
    const teamMap   = new Map(bootstrap.teams.map((t: any) => [t.id, t.short_name]))

    const picks = gwPicks.picks.map((pick: any) => {
      const player = playerMap.get(pick.element) as any
      return {
        id:        player.id,
        name:      player.web_name,
        team:      teamMap.get(player.team),
        position:  typeMap.get(player.element_type),
        isCaptain: pick.is_captain,
        isViceCap: pick.is_vice_captain,
        multiplier: pick.multiplier,
        onBench:   pick.position > 11,
      }
    })

    return c.json({ gameweek: currentGw.id, picks, activeChip: gwPicks.active_chip })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

// User's leagues
fpl.get('/leagues', async (c) => {
  try {
    const id    = teamId()
    const entry = await fplFetch(`/entry/${id}/`, 5 * 60_000) as any
    return c.json({
      classic: entry.leagues.classic.map((l: any) => ({ id: l.id, name: l.name, entryRank: l.entry_rank })),
      h2h:     entry.leagues.h2h.map((l: any)     => ({ id: l.id, name: l.name, entryRank: l.entry_rank })),
    })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

// Classic league standings
fpl.get('/league/:id', async (c) => {
  try {
    const data = await fplFetch(`/leagues-classic/${c.req.param('id')}/standings/`, 5 * 60_000) as any
    return c.json({
      name: data.league.name,
      standings: data.standings.results.map((e: any) => ({
        rank:        e.rank,
        rankLastGw:  e.last_rank,
        managerName: e.player_name,
        teamName:    e.entry_name,
        totalPoints: e.total,
        gwPoints:    e.event_total,
        managerId:   e.entry,
      })),
    })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

// GW history
fpl.get('/history', async (c) => {
  try {
    const id   = teamId()
    const data = await fplFetch(`/entry/${id}/history/`, 5 * 60_000) as any
    return c.json({
      current: data.current.map((gw: any) => ({
        gw:           gw.event,
        points:       gw.points,
        totalPoints:  gw.total_points,
        rank:         gw.rank,
        overallRank:  gw.overall_rank,
        transfers:    gw.event_transfers,
        transferCost: gw.event_transfers_cost,
        bench:        gw.points_on_bench,
      })),
    })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

export default fpl
