// Gera public/lembretes.ics a partir de src/data/plan.ts
import { build } from 'esbuild'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
const out = 'node_modules/.cache/ics.mjs'
mkdirSync('node_modules/.cache', { recursive: true })
await build({ entryPoints: ['src/lib/ics.ts'], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' })
const { buildIcs } = await import(pathToFileURL(out).href + '?t=' + Date.now())
writeFileSync('public/lembretes.ics', buildIcs())
rmSync(out)
console.log('public/lembretes.ics gerado')
