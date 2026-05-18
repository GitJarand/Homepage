import { Hono } from 'hono'

const trakt = new Hono()

const CLIENT_ID  = process.env.TRAKT_CLIENT_ID ?? ''
const TRAKT_USER = process.env.TRAKT_USER ?? 'giladg'
const TRAKT_LIST = process.env.TRAKT_LIST ?? 'latest-releases'

interface TraktMedia {
  title: string
  year: number
  rating: number
  votes: number
  ids: { tmdb?: number; imdb?: string; slug?: string }
}

interface TraktItem {
  rank: number
  listed_at: string
  type: 'movie' | 'show' | 'season' | 'episode' | 'person'
  movie?: TraktMedia
  show?:  TraktMedia
}

export interface MediaItem {
  type: 'movie' | 'show'
  title: string
  year: number | null
  traktSlug: string | null
  imdbId: string | null
  traktRating: string | null   // e.g. "7.4" or null
  listedAt: string
}

// Full list cache
let listCache: { items: MediaItem[]; ts: number } | null = null
const LIST_TTL = 10 * 60 * 1000 // 10 min

trakt.get('/list', async (c) => {
  if (!CLIENT_ID) return c.json({ error: 'TRAKT_CLIENT_ID not configured' }, 500)

  if (listCache && Date.now() - listCache.ts < LIST_TTL) {
    return c.json({ items: listCache.items })
  }

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
      }
    )

    if (!res.ok) {
      const text = await res.text()
      return c.json({ error: `Trakt ${res.status}: ${text}` }, 500)
    }

    const raw = await res.json() as TraktItem[]

    const items: MediaItem[] = raw
      .filter(i => i.type === 'movie' || i.type === 'show')
      .map(item => {
        const type  = item.type as 'movie' | 'show'
        const media = type === 'movie' ? item.movie! : item.show!
        const rating = media.rating && media.votes > 0
          ? media.rating.toFixed(1)
          : null
        return {
          type,
          title:       media.title,
          year:        media.year ?? null,
          traktSlug:   media.ids.slug ?? null,
          imdbId:      media.ids.imdb ?? null,
          traktRating: rating,
          listedAt:    item.listed_at,
        }
      })

    listCache = { items, ts: Date.now() }
    return c.json({ items })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

export default trakt
