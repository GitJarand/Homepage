import { Hono } from 'hono'

const football = new Hono()

const API_KEY = process.env.FOOTBALL_API_KEY ?? ''
const BASE    = 'https://api.football-data.org/v4'

// 5-minute in-memory cache to stay within free tier rate limits
const cache = new Map<string, { data: unknown; ts: number }>()
const TTL   = 5 * 60 * 1000

async function apiFetch(path: string): Promise<unknown> {
  const cached = cache.get(path)
  if (cached && Date.now() - cached.ts < TTL) return cached.data
  const res  = await fetch(`${BASE}${path}`, {
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
  matchday: number | null; stage: string
  homeTeam: RawTeam; awayTeam: RawTeam
  score: { fullTime: { home: number | null; away: number | null } }
  competition: { name: string; code: string; emblem: string }
}

function normalize(m: RawMatch) {
  return {
    id:        m.id,
    utcDate:   m.utcDate,
    status:    m.status,
    matchday:  m.matchday,
    stage:     m.stage,
    homeTeam:  { name: m.homeTeam.name, short: m.homeTeam.shortName || m.homeTeam.tla, crest: m.homeTeam.crest },
    awayTeam:  { name: m.awayTeam.name, short: m.awayTeam.shortName || m.awayTeam.tla, crest: m.awayTeam.crest },
    score:     m.score.fullTime,
    competition: { name: m.competition?.name ?? '', code: m.competition?.code ?? '', emblem: m.competition?.emblem ?? '' },
  }
}

type Mode = 'pl' | 'cl' | 'lfc'

football.get('/next', async (c) => {
  if (!API_KEY) return c.json({ error: 'FOOTBALL_API_KEY not configured' }, 500)

  const mode = (c.req.query('mode') ?? 'pl') as Mode

  try {
    if (mode === 'lfc') {
      const data = await apiFetch('/teams/64/matches?status=SCHEDULED&limit=5') as { matches: RawMatch[] }
      return c.json({ matches: data.matches.slice(0, 5).map(normalize), mode })
    }

    const code = mode === 'cl' ? 'CL' : 'PL'
    const data  = await apiFetch(`/competitions/${code}/matches?status=SCHEDULED`) as { matches: RawMatch[] }
    const upcoming = data.matches

    if (upcoming.length === 0) return c.json({ matches: [], mode })

    if (mode === 'pl') {
      // Group by matchday — return only the next round
      const nextMatchday = Math.min(...upcoming.map(m => m.matchday ?? 999))
      const round = upcoming.filter(m => m.matchday === nextMatchday)
      return c.json({ matches: round.map(normalize), matchday: nextMatchday, mode })
    } else {
      // CL: group by stage, return next stage's matches
      const sorted    = [...upcoming].sort((a, b) => a.utcDate.localeCompare(b.utcDate))
      const nextStage = sorted[0].stage
      const round     = sorted.filter(m => m.stage === nextStage)
      return c.json({ matches: round.map(normalize), stage: nextStage, mode })
    }
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

export default football
