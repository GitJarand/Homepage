import { Hono } from 'hono'

const trakt = new Hono()

const CLIENT_ID  = process.env.TRAKT_CLIENT_ID ?? ''
const TMDB_KEY   = process.env.TMDB_API_KEY ?? ''
const TRAKT_USER = process.env.TRAKT_USER ?? 'giladg'
const TRAKT_LIST = process.env.TRAKT_LIST ?? 'latest-releases'

interface TraktItem {
  rank: number
  listed_at: string
  notes: string | null
  type: 'movie' | 'show' | 'season' | 'episode' | 'person'
  movie?: { title: string; year: number; ids: { tmdb?: number; imdb?: string; slug?: string } }
  show?:  { title: string; year: number; ids: { tmdb?: number; imdb?: string; slug?: string } }
}

interface MediaItem {
  type: 'movie' | 'show'
  title: string
  year: number | null
  tmdbId: number | null
  posterUrl: string | null
  traktSlug: string | null
  listedAt: string
}

async function fetchPoster(tmdbId: number, type: 'movie' | 'show'): Promise<string | null> {
  if (!TMDB_KEY || !tmdbId) return null
  try {
    const endpoint = type === 'show' ? 'tv' : 'movie'
    const res = await fetch(
      `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_KEY}&language=en-US`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const data = await res.json() as { poster_path?: string }
    return data.poster_path
      ? `https://image.tmdb.org/t/p/w300${data.poster_path}`
      : null
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
        },
        signal: AbortSignal.timeout(8000),
      }
    )

    if (!res.ok) {
      const text = await res.text()
      return c.json({ error: `Trakt ${res.status}: ${text}` }, 500)
    }

    const raw = await res.json() as TraktItem[]

    // Keep only movies and shows
    const filtered = raw.filter(i => i.type === 'movie' || i.type === 'show')

    // Fetch TMDB posters in parallel (graceful — failures just mean no poster)
    const items: MediaItem[] = await Promise.all(
      filtered.map(async (item) => {
        const type  = item.type as 'movie' | 'show'
        const media = type === 'movie' ? item.movie! : item.show!
        const tmdbId = media.ids.tmdb ?? null
        const poster = tmdbId ? await fetchPoster(tmdbId, type) : null

        return {
          type,
          title: media.title,
          year:  media.year ?? null,
          tmdbId,
          posterUrl: poster,
          traktSlug: media.ids.slug ?? null,
          listedAt: item.listed_at,
        }
      })
    )

    return c.json({ items })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

export default trakt
