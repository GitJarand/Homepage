import { build } from 'esbuild'
import { mkdirSync, writeFileSync } from 'fs'
import { cp } from 'fs/promises'

const FUNC_DIR = '.vercel/output/functions/api/[...slug].func'

// Create output directories
mkdirSync(FUNC_DIR, { recursive: true })
mkdirSync('.vercel/output/static', { recursive: true })

// Copy Vite build → static output
await cp('dist', '.vercel/output/static', { recursive: true })

// Bundle entire server (all npm deps included — no external, self-contained)
await build({
  entryPoints: ['server/vercel-handler.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: `${FUNC_DIR}/index.js`,
})

// Vercel function metadata
writeFileSync(`${FUNC_DIR}/.vc-config.json`, JSON.stringify({
  runtime: 'nodejs20.x',
  handler: 'index.js',
  launcherType: 'Nodejs',
  supportsResponseStreaming: false,
}))

// Top-level routing: /api/* → function, everything else → SPA
writeFileSync('.vercel/output/config.json', JSON.stringify({
  version: 3,
  routes: [
    { src: '^/api(/.*)?$', dest: '/api/[...slug]' },
    { handle: 'filesystem' },
    { src: '^/(.*)$', dest: '/index.html' },
  ],
}))

console.log('✓ Vercel build output ready')
