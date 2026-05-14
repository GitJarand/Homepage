import { Hono } from 'hono'

const news = new Hono()

interface NewsItem {
  title: string
  url: string
  description: string | null
  publishedAt: string | null
  imageUrl: string | null
}

function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&#xA0;/g, ' ')
}

function extractTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`)
  ) ?? xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`))
  return m ? decodeEntities(m[1].trim()) : null
}

function extractAttr(xml: string, tag: string, attr: string): string | null {
  const m = xml.match(new RegExp(`<${tag}[^>]*\\s${attr}="([^"]+)"`))
  return m ? m[1] : null
}

function parseItems(xml: string, limit: number): NewsItem[] {
  // Support both RSS <item> and Atom <entry>
  const isAtom = xml.includes('<entry>')
  const tag = isAtom ? 'entry' : 'item'
  const entries = [...xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'g'))].map(m => m[1])

  return entries.slice(0, limit).map(entry => {
    const title = extractTag(entry, 'title') ?? 'Untitled'

    // Atom uses <link href="..."/> (self-closing), RSS uses <link>url</link>
    const url = extractAttr(entry, 'link', 'href')
      ?? extractTag(entry, 'link')
      ?? extractTag(entry, 'guid')
      ?? ''

    const description = extractTag(entry, 'description') ?? extractTag(entry, 'content')
    const publishedAt = extractTag(entry, 'pubDate') ?? extractTag(entry, 'published') ?? extractTag(entry, 'updated')

    const rawImage =
      extractAttr(entry, 'media:content', 'url') ??
      extractAttr(entry, 'enclosure', 'url') ??
      entry.match(/<img[^>]+src="([^"]+)"/)?.[1] ??
      description?.match(/<img[^>]+src="([^"]+)"/)?.[1] ??
      null
    const imageUrl = rawImage ? decodeEntities(rawImage) : null

    return { title, url, description, publishedAt, imageUrl }
  })
}

news.get('/feed', async (c) => {
  const source = c.req.query('source') ?? 'vg'
  const limit = Math.min(parseInt(c.req.query('limit') ?? '15', 10), 30)

  const feeds: Record<string, string> = {
    vg: 'https://www.vg.no/rss/feed/',
    nrk: 'https://www.nrk.no/toppsaker.rss',
    'reddit-fpl-lfc': 'https://old.reddit.com/r/FantasyPL+LiverpoolFC+soccer/.rss',
  }

  const feedUrl = feeds[source]
  if (!feedUrl) return c.json({ error: 'Unknown source' }, 400)

  const isReddit = feedUrl.includes('reddit.com')
  const headers = {
    'User-Agent': isReddit
      ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      : 'Mozilla/5.0',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'identity',
    ...(isReddit && { 'Cookie': '' }),
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, 400 * attempt))
      const res = await fetch(feedUrl, { headers })
      if (!res.ok) return c.json({ error: `Feed returned ${res.status}` }, 502)
      const xml = await res.text()
      return c.json({ source, items: parseItems(xml, limit) })
    } catch (err) {
      if (attempt < 2) continue
      const cause = (err as { cause?: { message?: string } })?.cause
      const msg = cause?.message ?? (err instanceof Error ? err.message : 'Unknown error')
      return c.json({ error: msg }, 502)
    }
  }
})

export default news
