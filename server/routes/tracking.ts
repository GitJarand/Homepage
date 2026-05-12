import { Hono } from 'hono'
import { getAdapter, listCarriers } from '../tracking/registry'

const tracking = new Hono()

// GET /api/tracking/carriers — list all supported carriers
tracking.get('/carriers', (c) => c.json(listCarriers()))

// GET /api/tracking?q=TRACKINGNUMBER&carrier=bring
tracking.get('/', async (c) => {
  const q = c.req.query('q')?.trim()
  const carrier = c.req.query('carrier')

  if (!q) return c.json({ error: 'Missing tracking number (q)' }, 400)

  const adapter = getAdapter(q, carrier)
  if (!adapter) {
    return c.json({ error: `No carrier matched for "${q}". Pass ?carrier= to specify one explicitly.` }, 404)
  }

  try {
    const result = await adapter.track(q)
    return c.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 502)
  }
})

export default tracking
