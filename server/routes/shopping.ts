import { Hono } from 'hono'

const shopping = new Hono()

const EMAIL    = process.env.BRING_LIST_EMAIL    ?? ''
const PASSWORD = process.env.BRING_LIST_PASSWORD ?? ''
const BASE     = 'https://api.getbring.com/rest/v2'

// Cache auth token (valid 7 days)
let authCache: { accessToken: string; uuid: string; publicUuid: string; bringListUUID: string; expiresAt: number } | null = null

async function authenticate(): Promise<{ accessToken: string; uuid: string; publicUuid: string; bringListUUID: string }> {
  if (authCache && Date.now() < authCache.expiresAt) {
    return { accessToken: authCache.accessToken, uuid: authCache.uuid, publicUuid: authCache.publicUuid, bringListUUID: authCache.bringListUUID }
  }

  const res = await fetch(`${BASE}/bringauth`, {
    method: 'POST',
    headers: {
      'Content-Type':          'application/x-www-form-urlencoded',
      'X-BRING-API-KEY':       'cof4Nc6D8saplXjE3h3HXqHH8m7VU2i1Gs0g85Ef',
      'X-BRING-CLIENT-SOURCE': 'webApp',
      'X-BRING-COUNTRY':       'US',
    },
    body: new URLSearchParams({ email: EMAIL, password: PASSWORD }),
    signal: AbortSignal.timeout(8000),
  })

  if (!res.ok) throw new Error(`Bring auth failed: ${res.status}`)

  const data = await res.json() as {
    access_token: string; uuid: string; publicUuid: string; bringListUUID: string; expires_in: number
  }

  authCache = {
    accessToken:   data.access_token,
    uuid:          data.uuid,
    publicUuid:    data.publicUuid,
    bringListUUID: data.bringListUUID,
    expiresAt:     Date.now() + (data.expires_in - 3600) * 1000,
  }

  return { accessToken: data.access_token, uuid: data.uuid, publicUuid: data.publicUuid, bringListUUID: data.bringListUUID }
}

function bringHeaders(accessToken: string, uuid: string) {
  return {
    'Authorization':         `Bearer ${accessToken}`,
    'X-BRING-USER-UUID':     uuid,
    'X-BRING-CLIENT-SOURCE': 'webApp',
    'X-BRING-API-KEY':       'cof4Nc6D8saplXjE3h3HXqHH8m7VU2i1Gs0g85Ef',
    'Accept':                'application/json',
  }
}

// Per-item translation cache — survives session, reset on server restart
const xlateCache = new Map<string, string>()

async function tryTranslate(name: string, langpair: string): Promise<string> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(name)}&langpair=${langpair}`
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!r.ok) return name
    const data = await r.json() as { responseData: { translatedText: string } }
    return data.responseData?.translatedText ?? name
  } catch {
    return name
  }
}

async function toEnglish(name: string): Promise<string> {
  if (!name) return name
  if (xlateCache.has(name)) return xlateCache.get(name)!
  const [de, no] = await Promise.all([
    tryTranslate(name, 'de|en'),
    tryTranslate(name, 'no|en'),
  ])
  // Prefer whichever translation actually changed the name; de wins ties
  const result = de !== name ? de : no !== name ? no : name
  xlateCache.set(name, result)
  return result
}

// GET /api/shopping/lists
shopping.get('/lists', async (c) => {
  if (!EMAIL || !PASSWORD) return c.json({ error: 'BRING_LIST_EMAIL / BRING_LIST_PASSWORD not configured' }, 500)
  try {
    const { accessToken, uuid, publicUuid, bringListUUID } = await authenticate()
    for (const id of [uuid, publicUuid]) {
      const r = await fetch(`${BASE}/bringlists/${id}`, {
        headers: bringHeaders(accessToken, uuid),
        signal: AbortSignal.timeout(8000),
      })
      if (r.ok) {
        const data = await r.json() as { lists: { listUuid: string; name: string }[] }
        if (data.lists?.length) {
          return c.json({ lists: data.lists.map(l => ({ id: l.listUuid, name: l.name })) })
        }
      }
    }
    return c.json({ lists: [{ id: bringListUUID, name: 'Shopping' }] })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

// GET /api/shopping/items?listId=xxx
shopping.get('/items', async (c) => {
  if (!EMAIL || !PASSWORD) return c.json({ error: 'BRING_LIST_EMAIL / BRING_LIST_PASSWORD not configured' }, 500)
  const listId = c.req.query('listId')
  if (!listId) return c.json({ error: 'Missing listId' }, 400)
  try {
    const { accessToken, uuid } = await authenticate()
    const res = await fetch(`${BASE}/bringlists/${listId}`, {
      headers: bringHeaders(accessToken, uuid),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`Bring items failed: ${res.status}`)
    const data = await res.json() as {
      purchase: { uuid?: string; name: string; specification: string }[]
      recently: { uuid?: string; name: string; specification: string }[]
    }
    const translate = (items: typeof data.purchase) =>
      Promise.all(items.map(async i => ({
        id:   i.uuid ?? i.name,
        name: await toEnglish(i.name),
        spec: i.specification,
      })))

    const [purchase, recently] = await Promise.all([
      translate(data.purchase ?? []),
      translate(data.recently ?? []),
    ])

    return c.json({ purchase, recently })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

export default shopping
