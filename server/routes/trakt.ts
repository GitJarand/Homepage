import { Hono } from 'hono'

const trakt = new Hono()

const CLIENT_ID  = process.env.TRAKT_CLIENT_ID ?? ''
const TMDB_KEY   = process.env.TMDB_API_KEY ?? ''
const OMDB_KEY   = process.env.OMDB_API_KEY ?? ''
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

async function fetchPosterTMDB(tmdbId: number, type: 'movie' | 'show'): Promise<string | null> {
  if (!TMDB_KEY || !tmdbId) return null
  try {
    const endpoint = type === 'show' ? 'tv' : 'movie'
    const res = await fetch(
      `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_KEY}&language=en-US`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const data = await res.json() as { poster_path?: string }
    return data.poster_path ? `https://image.tmdb.org/t/p/w300${data.poster_path}` : null
  } catch { return null }
}

async function fetchPosterOMDB(imdbId: string): Promise<string | null> {
  if (!OMDB_KEY || !imdbId) return null
  try {
    const res = await fetch(
      `https://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_KEY}`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const data = await res.json() as { Poster?: string }
    const url = data.Poster
    return url && url !== 'N/A' ? url : null
  } catch { return null }
}

async function fetchPoster(
  tmdbId: number | null,
  imdbId: string | null,
  type: 'movie' | 'show'
): Promise<string | null> {
  // Try TMDB first, fall back to OMDb
  if (tmdbId && TMDB_KEY) {
    const url = await fetchPosterTMDB(tmdbId, type)
    if (url) return url
  }
  if (imdbId && OMDB_KEY) {
    return fetchPosterOMDB(imdbId)
  }
  return null
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
    const filtered = raw.filter(i => i.type === 'movie' || i.type === 'show')

    const items: MediaItem[] = await Promise.all(
      filtered.map(async (item) => {
        const type  = item.type as 'movie' | 'show'
        const media = type === 'movie' ? item.movie! : item.show!
        const tmdbId = media.ids.tmdb ?? null
        const imdbId = media.ids.imdb ?? null
        const poster = await fetchPoster(tmdbId, imdbId, type)

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
