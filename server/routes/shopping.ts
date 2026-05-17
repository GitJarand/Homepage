import { Hono } from 'hono'

const shopping = new Hono()

const EMAIL    = process.env.BRING_LIST_EMAIL    ?? ''
const PASSWORD = process.env.BRING_LIST_PASSWORD ?? ''
const BASE     = 'https://api.getbring.com/rest/v2'

// Cache auth token (valid 7 days)
let authCache: { accessToken: string; uuid: string; expiresAt: number } | null = null

async function authenticate(): Promise<{ accessToken: string; uuid: string }> {
  if (authCache && Date.now() < authCache.expiresAt) {
    return { accessToken: authCache.accessToken, uuid: authCache.uuid }
  }

  const res = await fetch(`${BASE}/bringauth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: EMAIL, password: PASSWORD }),
    signal: AbortSignal.timeout(8000),
  })

  if (!res.ok) throw new Error(`Bring auth failed: ${res.status}`)

  const data = await res.json() as {
    access_token: string; uuid: string; expires_in: number
  }

  authCache = {
    accessToken: data.access_token,
    uuid:        data.uuid,
    expiresAt:   Date.now() + (data.expires_in - 3600) * 1000, // refresh 1h early
  }

  return { accessToken: data.access_token, uuid: data.uuid }
}

function bringHeaders(accessToken: string, uuid: string) {
  return {
    'Authorization':        `Bearer ${accessToken}`,
    'X-BRING-USER-UUID':    uuid,
    'X-BRING-CLIENT-SOURCE':'webApp',
    'Accept':               'application/json',
  }
}

// GET /api/shopping/lists
shopping.get('/lists', async (c) => {
  if (!EMAIL || !PASSWORD) return c.json({ error: 'BRING_LIST_EMAIL / BRING_LIST_PASSWORD not configured' }, 500)
  try {
    const { accessToken, uuid } = await authenticate()
    const res = await fetch(`${BASE}/bringlists`, {
      headers: bringHeaders(accessToken, uuid),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`Bring lists failed: ${res.status}`)
    const data = await res.json() as {
      lists: { listUuid: string; name: string; theme: string }[]
    }
    return c.json({ lists: data.lists.map(l => ({ id: l.listUuid, name: l.name })) })
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
    const res = await fetch(`${BASE}/bringlists/${listId}/items`, {
      headers: bringHeaders(accessToken, uuid),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`Bring items failed: ${res.status}`)
    const data = await res.json() as {
      purchase:  { uuid: string; itemId: string; specification: string }[]
      recently:  { uuid: string; itemId: string; specification: string }[]
    }
    return c.json({
      purchase: data.purchase.map(i => ({ id: i.uuid, name: i.itemId, spec: i.specification })),
      recently: data.recently.map(i => ({ id: i.uuid, name: i.itemId, spec: i.specification })),
    })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

export default shopping
