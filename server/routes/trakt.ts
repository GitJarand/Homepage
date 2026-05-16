import { Hono } from 'hono'

const trakt = new Hono()

const CLIENT_ID  = process.env.TRAKT_CLIENT_ID ?? ''
const TRAKT_USER = process.env.TRAKT_USER ?? 'giladg'
const TRAKT_LIST = process.env.TRAKT_LIST ?? 'latest-releases'

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
  listedAt: string
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

    const items: MediaItem[] = raw
      .filter(i => i.type === 'movie' || i.type === 'show')
      .map(item => {
        const type  = item.type as 'movie' | 'show'
        const media = type === 'movie' ? item.movie! : item.show!
        return {
          type,
          title:     media.title,
          year:      media.year ?? null,
          traktSlug: media.ids.slug ?? null,
          listedAt:  item.listed_at,
        }
      })

    return c.json({ items })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

export default trakt
