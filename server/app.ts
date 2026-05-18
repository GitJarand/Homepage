import { Hono } from 'hono'
import { cors } from 'hono/cors'
import calendar from './routes/calendar'
import tracking from './routes/tracking'
import youtube from './routes/youtube'
import news from './routes/news'
import trakt from './routes/trakt'
import weather from './routes/weather'
import football from './routes/football'
import shopping from './routes/shopping'
import electricity from './routes/electricity'
import fpl from './routes/fpl'
import worldcup from './routes/worldcup'

const app = new Hono()

// Allow same-origin in production (Vercel) and localhost in dev
const allowedOrigin = process.env.CORS_ORIGIN
  ?? (process.env.NODE_ENV === 'production' ? '*' : 'http://localhost:5173')

app.use('*', cors({ origin: allowedOrigin }))

app.route('/api/calendar',    calendar)
app.route('/api/tracking',    tracking)
app.route('/api/youtube',     youtube)
app.route('/api/news',        news)
app.route('/api/trakt',       trakt)
app.route('/api/weather',     weather)
app.route('/api/football',    football)
app.route('/api/shopping',    shopping)
app.route('/api/electricity', electricity)
app.route('/api/fpl',        fpl)
app.route('/api/worldcup',   worldcup)

app.get('/health', (c) => c.json({ ok: true }))

export default app
