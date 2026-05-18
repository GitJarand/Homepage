import { Hono } from 'hono'

const worldcup = new Hono()

const API_KEY   = process.env.FOOTBALL_API_KEY ?? ''
const BASE      = 'https://api.football-data.org/v4'
const NORWAY_ID = parseInt(process.env.WC_NORWAY_ID ?? '1473', 10)

const cache = new Map<string, { data: unknown; ts: number }>()
const TTL   = 5 * 60 * 1000

async function apiFetch(path: string): Promise<unknown> {
  const hit = cache.get(path)
  if (hit && Date.now() - hit.ts < TTL) return hit.data
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'X-Auth-Token': API_KEY, 'Accept': 'application/json' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`football-data ${res.status}: ${await res.text()}`)
  const data = await res.json()
  cache.set(path, { data, ts: Date.now() })
  return data
}

interface RawTeam  { id: number; name: string; shortName: string; tla: string; crest: string }
interface RawMatch {
  id: number; utcDate: string; status: string
  matchday: number | null; stage: string; group: string | null
  homeTeam: RawTeam; awayTeam: RawTeam
  score: { fullTime: { home: number | null; away: number | null } }
}

function nm(m: RawMatch) {
  return {
    id:       m.id,
    utcDate:  m.utcDate,
    status:   m.status,
    matchday: m.matchday,
    stage:    m.stage,
    group:    m.group,
    homeTeam: { id: m.homeTeam.id, name: m.homeTeam.name, short: m.homeTeam.shortName || m.homeTeam.tla, crest: m.homeTeam.crest },
    awayTeam: { id: m.awayTeam.id, name: m.awayTeam.name, short: m.awayTeam.shortName || m.awayTeam.tla, crest: m.awayTeam.crest },
    score:    m.score.fullTime,
  }
}

// Next matchday / round
worldcup.get('/next', async (c) => {
  if (!API_KEY) return c.json({ error: 'FOOTBALL_API_KEY not configured' }, 500)
  try {
    const data = await apiFetch('/competitions/WC/matches?status=SCHEDULED') as { matches: RawMatch[] }
    const matches = data.matches
    if (!matches.length) return c.json({ matches: [] })

    if (matches[0].matchday != null) {
      const nextMatchday = Math.min(...matches.map(m => m.matchday ?? 999))
      return c.json({ matches: matches.filter(m => m.matchday === nextMatchday).map(nm), matchday: nextMatchday })
    } else {
      const nextStage = [...matches].sort((a, b) => a.utcDate.localeCompare(b.utcDate))[0].stage
      return c.json({ matches: matches.filter(m => m.stage === nextStage).map(nm), stage: nextStage })
    }
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

// Group standings
worldcup.get('/groups', async (c) => {
  if (!API_KEY) return c.json({ error: 'FOOTBALL_API_KEY not configured' }, 500)
  try {
    const data = await apiFetch('/competitions/WC/standings') as {
      standings: Array<{
        type: string; group: string
        table: Array<{
          position: number
          team: RawTeam
          playedGames: number; won: number; draw: number; lost: number
          points: number; goalDifference: number
        }>
      }>
    }
    const groups = data.standings
      .filter(s => s.type === 'TOTAL')
      .map(s => ({
        group: s.group.replace('GROUP_', 'Group '),
        table: s.table.map(e => ({
          position: e.position,
          team: { id: e.team.id, name: e.team.name, short: e.team.shortName || e.team.tla, crest: e.team.crest },
          played: e.playedGames,
          won: e.won,
          draw: e.draw,
          lost: e.lost,
          points: e.points,
          gd: e.goalDifference,
        })),
      }))
    return c.json({ groups })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

// Upcoming matches
worldcup.get('/upcoming', async (c) => {
  if (!API_KEY) return c.json({ error: 'FOOTBALL_API_KEY not configured' }, 500)
  try {
    const data = await apiFetch('/competitions/WC/matches?status=SCHEDULED') as { matches: RawMatch[] }
    return c.json({ matches: data.matches.slice(0, 40).map(nm) })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

// Norway's matches
worldcup.get('/norway', async (c) => {
  if (!API_KEY) return c.json({ error: 'FOOTBALL_API_KEY not configured' }, 500)
  try {
    const data = await apiFetch(`/competitions/WC/matches?team=${NORWAY_ID}`) as { matches: RawMatch[] }
    return c.json({ matches: data.matches.map(nm) })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

export default worldcup
