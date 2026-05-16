import { Hono } from 'hono'

const news = new Hono()

interface NewsItem {
  title: string
  url: string
  description: string | null
  publishedAt: string | null
  imageUrl: string | null
  sourceLabel?: string
}

const SOURCE_LABELS: Record<string, string> = {
  'rockpapershotgun.com': 'RPS',
  'kotaku.com': 'Kotaku',
  'destructoid.com': 'Destructoid',
  'eurogamer.net': 'Eurogamer',
  'pcgamer.com': 'PCGamer',
  'gamesradar.com': 'GamesRadar',
  'vg247.com': 'VG247',
  'videogameschronicle.com': 'VGC',
  'xbox.com': 'Xbox Wire',
  'slashdot.org': 'Slashdot',
  'feedburner.com': 'Penny Arcade',
  'venturebeat.com': 'VentureBeat',
  'wired.com': 'Wired',
  '9to5mac.com': '9to5Mac',
  '9to5google.com': '9to5Google',
  'arstechnica.com': 'Ars Technica',
  'businessinsider.com': 'Business Insider',
  'engadget.com': 'Engadget',
  'gizmodo.com': 'Gizmodo',
  'ycombinator.com': 'Hacker News',
  'macrumors.com': 'MacRumors',
  'mashable.com': 'Mashable',
  'pcworld.com': 'PCWorld',
  'techcrunch.com': 'TechCrunch',
  'theverge.com': 'The Verge',
  'theguardian.com': 'The Guardian',
  'thenextweb.com': 'TNW',
  'lifehacker.com': 'Lifehacker',
  'nytimes.com': 'NYT Tech',
  'digitaltrends.com': 'Digital Trends',
  'fastcompany.com': 'Fast Company',
  'howtogeek.com': 'How-To Geek',
  'boingboing.net': 'Boing Boing',
  'daringfireball.net': 'Daring Fireball',
}

function labelFromUrl(url: string): string {
  try {
    // Reddit: extract subreddit name as label
    const redditMatch = url.match(/reddit\.com\/r\/([^/+.]+)/)
    if (redditMatch) return `r/${redditMatch[1]}`
    const host = new URL(url).hostname.replace(/^www\./, '')
    return Object.entries(SOURCE_LABELS).find(([k]) => host.includes(k))?.[1] ?? host
  } catch { return '' }
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

function parseItems(xml: string, limit: number, sourceLabel?: string): NewsItem[] {
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

    return { title, url, description, publishedAt, imageUrl, sourceLabel }
  })
}

const feeds: Record<string, string | string[]> = {
  vg: 'https://www.vg.no/rss/feed/',
  nrk: [
    'https://www.nrk.no/toppsaker.rss',
    'https://www.nrk.no/sport/toppsaker.rss',
    'https://www.nrk.no/kultur/toppsaker.rss',
    'https://www.nrk.no/urix/toppsaker.rss',
    'https://www.nrk.no/norge/toppsaker.rss',
  ],
  'reddit-fpl-lfc': [
    'https://old.reddit.com/r/FantasyPL/.rss',
    'https://old.reddit.com/r/LiverpoolFC/.rss',
    'https://old.reddit.com/r/soccer/.rss',
    'https://old.reddit.com/r/Gunners/.rss',
    'https://old.reddit.com/r/MCFC/.rss',
    'https://old.reddit.com/r/chelseafc/.rss',
    'https://old.reddit.com/r/PremierLeague/.rss',
    'https://old.reddit.com/r/reddevils/.rss',
    'https://old.reddit.com/r/coys/.rss',
  ],
  'tech-gaming': [
    'https://www.rockpapershotgun.com/feed',
    'https://kotaku.com/rss',
    'https://www.destructoid.com/feed',
    'https://www.eurogamer.net/feed',
    'https://www.pcgamer.com/feeds.xml',
    'https://www.gamesradar.com/feeds.xml',
    'https://www.vg247.com/feed',
    'https://www.videogameschronicle.com/category/news/feed/',
    'https://news.xbox.com/en-us/feed/',
    'https://rss.slashdot.org/Slashdot/slashdotGames',
    'http://feeds.feedburner.com/pa-mainsite',
    'https://venturebeat.com/feed/',
    'https://www.wired.com/feed/rss',
    'https://9to5mac.com/feed/',
    'https://9to5google.com/feed/',
    'https://feeds.arstechnica.com/arstechnica/index',
    'https://feeds.businessinsider.com/custom/all',
    'https://www.engadget.com/rss.xml',
    'https://gizmodo.com/rss',
    'https://news.ycombinator.com/rss',
    'https://feeds.macrumors.com/MacRumors-All',
    'https://mashable.com/feeds/rss/all',
    'https://www.pcworld.com/index.rss',
    'https://techcrunch.com/feed/',
    'https://www.theverge.com/rss/index.xml',
    'https://www.theguardian.com/technology/rss',
    'https://thenextweb.com/feed/',
    'https://lifehacker.com/rss',
    'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml',
    'https://www.digitaltrends.com/feed/',
    'https://www.fastcompany.com/technology/rss',
    'https://www.howtogeek.com/feed/',
    'https://boingboing.net/feed',
    'https://daringfireball.net/feeds/main',
    'https://rss.slashdot.org/Slashdot/slashdot',
  ],
}

news.get('/feed', async (c) => {
  const source = c.req.query('source') ?? 'vg'
  const limit = Math.min(parseInt(c.req.query('limit') ?? '15', 10), 100)
  const sort = c.req.query('sort') ?? 'hot'

  const feedUrl = feeds[source]
  if (!feedUrl) return c.json({ error: 'Unknown source' }, 400)

  // Multi-feed: fetch all in parallel, merge and sort by date
  if (Array.isArray(feedUrl)) {
    // Optional subreddit filter: only fetch the requested sub-feeds
    const subredditsParam = c.req.query('subreddits')
    let feedsToUse = feedUrl
    if (subredditsParam) {
      const subs = subredditsParam.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      if (subs.length > 0) {
        const filtered = feedUrl.filter(url => {
          const m = url.match(/reddit\.com\/r\/([^/+.]+)/i)
          return m ? subs.includes(m[1].toLowerCase()) : true
        })
        if (filtered.length > 0) feedsToUse = filtered
      }
    }

    // Each feed contributes equally: cap per-feed at ceil(limit / feeds) so every source shows up
    const perFeed = Math.max(5, Math.ceil(limit / feedsToUse.length))
    const results = await Promise.allSettled(
      feedsToUse.map(async url => {
        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), 5000)
        try {
          // Apply sort to Reddit URLs: insert /new/ before .rss
          const resolvedUrl = (sort === 'new' && url.includes('reddit.com'))
            ? url.replace('/.rss', '/new/.rss')
            : url
          const isRedditUrl = resolvedUrl.includes('reddit.com')
          const res = await fetch(resolvedUrl, {
            headers: {
              'User-Agent': isRedditUrl
                ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
                : 'Mozilla/5.0',
              'Accept': 'application/rss+xml, application/xml, text/xml, */*',
              'Accept-Encoding': 'identity',
              ...(isRedditUrl && { 'Cookie': '' }),
            },
            signal: ctrl.signal,
          })
          if (!res.ok) return [] as NewsItem[]
          return parseItems(await res.text(), perFeed, labelFromUrl(url))
        } catch { return [] as NewsItem[] }
        finally { clearTimeout(timer) }
      })
    )
    const all = results.flatMap(r => r.status === 'fulfilled' ? r.value : [])
    // Deduplicate by URL
    const seen = new Set<string>()
    const deduped = all.filter(item => {
      if (!item.url || seen.has(item.url)) return false
      seen.add(item.url)
      return true
    })
    deduped.sort((a, b) => {
      const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
      const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
      return tb - ta
    })
    return c.json({ source, items: deduped.slice(0, limit) })
  }

  // Single-feed: retry with backoff
  const isReddit = (feedUrl as string).includes('reddit.com')
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'identity',
    'Cache-Control': 'no-cache',
    ...(isReddit && { 'Cookie': '' }),
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, 800 * attempt))
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 8000)
      let res: Response
      try {
        res = await fetch(feedUrl as string, { headers, signal: ctrl.signal })
      } finally {
        clearTimeout(timer)
      }
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
