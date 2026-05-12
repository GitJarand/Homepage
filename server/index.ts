import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import calendar from './routes/calendar'

const app = new Hono()

app.use('*', cors({ origin: 'http://localhost:5173' }))

app.route('/api/calendar', calendar)

app.get('/health', (c) => c.json({ ok: true }))

serve({ fetch: app.fetch, port: 3001 }, () => {
  console.log('Server running on http://localhost:3001')
})
