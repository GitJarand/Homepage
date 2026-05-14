import { Hono } from 'hono'

const youtube = new Hono()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
}

function extractFirst(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([^<]+)<\/${tag}>`))
  return m ? decodeEntities(m[1].trim()) : null
}

function extractAttr(xml: string, tag: string, attr: string): string | null {
  const m = xml.match(new RegExp(`<${tag}[^>]*${attr}="([^"]+)"`))
  return m ? m[1] : null
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Resolve a channel URL/handle to { channelId, name }
youtube.get('/resolve', async (c) => {
  const raw = c.req.query('url')?.trim()
  if (!raw) return c.json({ error: 'url required' }, 400)

  // Direct channel ID
  if (/^UC[\w-]{22}$/.test(raw)) {
    return c.json({ channelId: raw, name: raw })
  }

  // Extract channel ID from /channel/UCxxx URL without fetching
  const directMatch = raw.match(/youtube\.com\/channel\/(UC[\w-]{22})/)
  if (directMatch) {
    const channelId = directMatch[1]
    // Still fetch to get the name
    try {
      const xml = await fetch(
        `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      ).then(r => r.text())
      const name = extractFirst(xml, 'name') ?? channelId
      return c.json({ channelId, name })
    } catch {
      return c.json({ channelId, name: channelId })
    }
  }

  // For @handle / /c/ / /user/ — fetch the page and extract channel ID
  const url = raw.startsWith('http') ? raw : `https://www.youtube.com/${raw}`
  try {
    const html = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    }).then(r => r.text())

    const idMatch = html.match(/"channelId":"(UC[\w-]{22})"/)
      ?? html.match(/\/channel\/(UC[\w-]{22})/)
    if (!idMatch) return c.json({ error: 'Could not find channel ID' }, 404)
    const channelId = idMatch[1]

    const nameMatch = html.match(/<meta property="og:title" content="([^"]+)"/)
      ?? html.match(/<title>([^<]+) - YouTube<\/title>/)
    const name = nameMatch ? nameMatch[1].replace(' - YouTube', '').trim() : channelId

    return c.json({ channelId, name })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: msg }, 502)
  }
})

// Get the latest video for a channel ID
youtube.get('/latest', async (c) => {
  const channelId = c.req.query('channelId')?.trim()
  if (!channelId) return c.json({ error: 'channelId required' }, 400)

  try {
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
    if (!res.ok) return c.json({ error: `YouTube returned ${res.status}` }, 502)
    const xml = await res.text()

    // Grab the first <entry> block only
    const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/)
    if (!entryMatch) return c.json({ error: 'No videos found' }, 404)
    const entry = entryMatch[1]

    const videoId = extractFirst(entry, 'yt:videoId')
    if (!videoId) return c.json({ error: 'No video ID found' }, 404)

    const title = extractFirst(entry, 'media:title')
      ?? extractFirst(entry, 'title')
      ?? 'Untitled'
    const publishedAt = extractFirst(entry, 'published') ?? null
    const channelName = extractFirst(xml, 'name') ?? channelId

    return c.json({
      videoId,
      title,
      publishedAt,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      channelName,
      url: `https://www.youtube.com/watch?v=${videoId}`,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: msg }, 502)
  }
})

export default youtube
