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
  const entries = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[1])
  return entries.slice(0, limit).map(entry => {
    const title = extractTag(entry, 'title') ?? 'Untitled'
    const url = extractTag(entry, 'link') ?? extractTag(entry, 'guid') ?? ''
    const description = extractTag(entry, 'description')
    const publishedAt = extractTag(entry, 'pubDate')

    // Try media:content, then enclosure, then og image in description
    const rawImage =
      extractAttr(entry, 'media:content', 'url') ??
      extractAttr(entry, 'enclosure', 'url') ??
      entry.match(/<img[^>]+src="([^"]+)"/)?.[1] ??
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
  }

  const feedUrl = feeds[source]
  if (!feedUrl) return c.json({ error: 'Unknown source' }, 400)

  try {
    const res = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/rss+xml, application/xml, text/xml',
        'Accept-Encoding': 'identity',
      },
    })
    if (!res.ok) return c.json({ error: `Feed returned ${res.status}` }, 502)
    const xml = await res.text()
    const items = parseItems(xml, limit)
    return c.json({ source, items })
  } catch (err) {
    const cause = (err as { cause?: { message?: string } })?.cause
    const msg = cause?.message ?? (err instanceof Error ? err.message : 'Unknown error')
    return c.json({ error: msg }, 502)
  }
})

export default news
