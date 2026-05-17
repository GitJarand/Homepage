import { build } from 'esbuild'
import { renameSync } from 'fs'

await build({
  entryPoints: ['server/vercel-handler.ts'],
  bundle: true,
  packages: 'external',
  platform: 'node',
  format: 'esm',
  outfile: 'api/_handler.js',
})

renameSync('api/_handler.js', 'api/[...slug].js')
console.log('✓ api/[...slug].js bundled')
