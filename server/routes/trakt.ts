import { Hono } from 'hono'

const trakt = new Hono()

const CLIENT_ID  = process.env.TRAKT_CLIENT_ID ?? ''
const TRAKT_USER = process.env.TRAKT_USER ?? 'giladg'
const TRAKT_LIST = process.env.TRAKT_LIST ?? 'latest-releases'
const OMDB_KEY   = process.env.OMDB_API_KEY ?? ''

interface TraktItem {
  rank: number
  listed_at: string
  type: 'movie' | 'show' | 'season' | 'episode' | 'person'
  movie?: { title: string; year: number; ids: { tmdb?: number; imdb?: string; slug?: string } }
  show?:  { title: string; year: number; ids: { tmdb?: number; imdb?: string; slug?: string } }
}

export interface MediaItem {
  type: 'movie' | 'show'
  title: string
  year: number | null
  traktSlug: string | null
  imdbId: string | null
  imdbRating: string | null   // e.g. "7.4" or null
  listedAt: string
}

// OMDb rating cache — ratings rarely change, keep 24 h
const ratingCache = new Map<string, { rating: string | null; ts: number }>()
const RATING_TTL  = 24 * 60 * 60 * 1000

async function fetchImdbRating(imdbId: string): Promise<string | null> {
  const cached = ratingCache.get(imdbId)
  if (cached && Date.now() - cached.ts < RATING_TTL) return cached.rating

  if (!OMDB_KEY) return null

  try {
    const res = await fetch(
      `https://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_KEY}`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const data = await res.json() as { imdbRating?: string; Response?: string }
    const rating = data.Response === 'True' && data.imdbRating && data.imdbRating !== 'N/A'
      ? data.imdbRating
      : null
    ratingCache.set(imdbId, { rating, ts: Date.now() })
    return rating
  } catch {
    return null
  }
}

trakt.get('/list', async (c) => {
  if (!CLIENT_ID) return c.json({ error: 'TRAKT_CLIENT_ID not configured' }, 500)

  try {
    const res = await fetch(
      `https://api.trakt.tv/users/${TRAKT_USER}/lists/${TRAKT_LIST}/items?extended=full&limit=100`,
      {
        headers: {
          'Content-Type': 'application/json',
          'trakt-api-version': '2',
          'trakt-api-key': CLIENT_ID,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(8000),
      }
    )

    if (!res.ok) {
      const text = await res.text()
      return c.json({ error: `Trakt ${res.status}: ${text}` }, 500)
    }

    const raw = await res.json() as TraktItem[]

    const filtered = raw.filter(i => i.type === 'movie' || i.type === 'show')

    // Batch-fetch IMDb ratings (all in parallel, failures silently null)
    const ratings = await Promise.allSettled(
      filtered.map(item => {
        const media = item.type === 'movie' ? item.movie! : item.show!
        const id    = media.ids.imdb ?? null
        return id ? fetchImdbRating(id) : Promise.resolve(null)
      })
    )

    const items: MediaItem[] = filtered.map((item, idx) => {
      const type  = item.type as 'movie' | 'show'
      const media = type === 'movie' ? item.movie! : item.show!
      const ratingResult = ratings[idx]
      return {
        type,
        title:      media.title,
        year:       media.year ?? null,
        traktSlug:  media.ids.slug ?? null,
        imdbId:     media.ids.imdb ?? null,
        imdbRating: ratingResult.status === 'fulfilled' ? ratingResult.value : null,
        listedAt:   item.listed_at,
      }
    })

    return c.json({ items })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

// Debug: see raw Trakt response — /api/trakt/debug
trakt.get('/debug', async (c) => {
  if (!CLIENT_ID) return c.json({ error: 'TRAKT_CLIENT_ID not configured' }, 500)
  const res = await fetch(
    `https://api.trakt.tv/users/${TRAKT_USER}/lists/${TRAKT_LIST}/items?extended=full&limit=20`,
    {
      headers: {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': CLIENT_ID,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    }
  )
  const raw = await res.json() as unknown[]
  const types = (raw as Array<{ type?: string }>).map(i => i.type)
  return c.json({ status: res.status, count: raw.length, types, first: raw[0] ?? null })
})

// Debug: list all of user's lists — /api/trakt/lists
trakt.get('/lists', async (c) => {
  if (!CLIENT_ID) return c.json({ error: 'TRAKT_CLIENT_ID not configured' }, 500)
  const res = await fetch(
    `https://api.trakt.tv/users/${TRAKT_USER}/lists`,
    {
      headers: {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': CLIENT_ID,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    }
  )
  const raw = await res.json() as unknown
  return c.json({ status: res.status, lists: raw })
})

export default trakt
