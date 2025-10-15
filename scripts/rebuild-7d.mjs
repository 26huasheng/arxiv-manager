#!/usr/bin/env node

/**
 * Offline rebuild script for N-day data (UA Integration Pack v1.0)
 * Uses arXiv server clock, HTML fallback, and unified UA
 * Usage: npm run rebuild
 * Environment variables:
 *   - REBUILD_DAYS: Number of days (default: 7)
 *   - USE_SERVER_CLOCK: Use arXiv server time (default: 1)
 *   - FORCE_SOURCE: 'auto' | 'api' | 'html' (default: 'auto')
 *   - ARXIV_UA: Full User-Agent string (priority 1)
 *   - ARXIV_CONTACT_EMAIL: Email only (priority 2)
 * Examples:
 *   - npm run rebuild
 *   - REBUILD_DAYS=14 npm run rebuild
 *   - FORCE_SOURCE=html npm run rebuild
 *   - ARXIV_CONTACT_EMAIL=yourname@example.com npm run rebuild
 */

// Load .env.local or .env for environment variables
import fs from 'node:fs'
import dotenv from 'dotenv'

if (fs.existsSync('.env.local')) {
  console.log('[UA] Loading .env.local')
  dotenv.config({ path: '.env.local' })
} else if (fs.existsSync('.env')) {
  console.log('[UA] Loading .env')
  dotenv.config()
}

// Print current UA configuration
const uaSource = process.env.ARXIV_UA
  ? `ARXIV_UA=${process.env.ARXIV_UA}`
  : process.env.ARXIV_CONTACT_EMAIL
  ? `ARXIV_CONTACT_EMAIL=${process.env.ARXIV_CONTACT_EMAIL}`
  : 'default-hardcoded (mailto:2134893202@qq.com)'

console.log(`[UA] Using: ${uaSource}`)
console.log()

import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = resolve(__dirname, '..')

console.log('='.repeat(70))
console.log('arXiv Manager - N-Day Rebuild (UA Integration Pack v1.0)')
console.log('Server Clock + HTML Fallback + Unified UA')
console.log('='.repeat(70))
console.log()

async function main() {
  try {
    // Read environment variables
    const days = parseInt(process.env.REBUILD_DAYS || '7', 10)
    const useServerClock = process.env.USE_SERVER_CLOCK !== '0'
    const forceSource = process.env.FORCE_SOURCE || 'auto'

    // Dynamically import the arxiv module
    console.log('[Rebuild] Loading arxiv module...')
    const arxivModulePath = 'file://' + resolve(projectRoot, 'src/lib/arxiv.ts')

    let arxivModule
    try {
      arxivModule = await import(arxivModulePath)
    } catch (importError) {
      console.error('[Rebuild] Failed to import arxiv module:', importError)
      console.error()
      console.error('Common issues:')
      console.error('  - If you see "named export decode not found":')
      console.error('    This means the he module CJS/ESM compatibility issue.')
      console.error('    Make sure v2.6+ is correctly applied (he default import).')
      console.error()
      throw importError
    }

    const { rebuildRecentNDays, CS_CATEGORIES } = arxivModule

    console.log(`[Rebuild] Using ${CS_CATEGORIES.length} CS categories`)
    console.log(`[Rebuild] Starting ${days}-day data rebuild...`)
    console.log(`[Rebuild] Use server clock: ${useServerClock}`)
    console.log(`[Rebuild] Force source: ${forceSource}`)
    console.log('[Rebuild] Expected duration: 1-3 minutes (depends on API speed)')
    console.log()

    const startTime = Date.now()

    // Run rebuild
    const result = await rebuildRecentNDays({ days, useServerClock, forceSource })

    const duration = ((Date.now() - startTime) / 1000).toFixed(1)

    if (!result.ok) {
      throw new Error('Rebuild returned ok=false')
    }

    console.log()
    console.log('='.repeat(70))
    console.log('✅ Rebuild Complete!')
    console.log('='.repeat(70))
    console.log()
    console.log('Statistics:')
    console.log(`  - Duration:          ${duration}s`)
    console.log(`  - Papers found:      ${result.count}`)
    console.log(`  - Data source:       ${result.stats.source}`)
    console.log(`  - Window:            ${result.stats.windowDays || days} days`)
    console.log(`  - Base time:         ${result.stats.baseNowISO}`)
    console.log(`  - Window start:      ${result.stats.windowStartISO}`)
    console.log(`  - UA:                ${uaSource}`)

    if (result.stats.source === 'api') {
      console.log(`  - Pages fetched:     ${result.stats.pageCount}`)
      console.log(`  - Total fetched:     ${result.stats.totalFetched}`)
      console.log(`  - Query chunks:      ${result.stats.chunksUsed}`)
    } else if (result.stats.source === 'html+id_list') {
      console.log(`  - IDs scraped:       ${result.stats.totalIds}`)
      console.log(`  - Batches:           ${result.stats.batches}`)
      console.log(`  - Total fetched:     ${result.stats.totalFetched}`)
    }
    console.log()

    if (result.count > 0) {
      console.log('Sample papers:')
      console.log(`  - Check data/papers.json for full list`)
      console.log(`  - Check data/meta.json for metadata`)
      console.log()
    }

    console.log('Files written:')
    console.log(`  - Papers:            data/papers.json (${result.count} papers)`)
    console.log(`  - Metadata:          data/meta.json (source: ${result.stats.source})`)
    console.log()
    console.log('='.repeat(70))
    console.log('Next steps:')
    console.log('  1. Run: npm run dev')
    console.log('  2. Open: http://localhost:3000')
    console.log('  3. Check UA: http://localhost:3000/api/admin/show-ua')
    console.log('  4. Test API: http://localhost:3000/api/admin/ping-arxiv?mode=api')
    console.log('  5. Debug: http://localhost:3000/api/admin/debug-ingest')
    console.log('='.repeat(70))
    console.log()

    if (result.count === 0) {
      console.warn('⚠️  WARNING: No papers found!')
      console.warn('   Possible causes:')
      console.warn('   - System clock is incorrect (check: date)')
      console.warn('   - arXiv API temporarily unavailable')
      console.warn('   - Network connectivity issues')
      console.warn('   - HTML endpoint rate limited (429)')
      console.warn()
      console.warn('   Troubleshooting:')
      console.warn('   1. Check system time: date')
      console.warn('   2. Try HTML mode: FORCE_SOURCE=html npm run rebuild')
      console.warn('   3. Try API mode: FORCE_SOURCE=api npm run rebuild')
      console.warn('   4. Check UA: curl localhost:3000/api/admin/show-ua')
      console.warn('   5. Test endpoints:')
      console.warn('      - curl localhost:3000/api/admin/ping-arxiv?mode=api')
      console.warn('      - curl localhost:3000/api/admin/ping-arxiv?mode=html')
      console.log()
      process.exit(1)
    }

    process.exit(0)
  } catch (error) {
    console.error()
    console.error('='.repeat(70))
    console.error('❌ Rebuild Failed')
    console.error('='.repeat(70))
    console.error()
    console.error('Error details:')
    console.error(error)
    console.error()
    console.error('Common issues:')
    console.error('  - Network connectivity problems')
    console.error('  - arXiv API temporarily unavailable')
    console.error('  - System clock incorrect (check: date)')
    console.error('  - XML/HTML parsing errors')
    console.error('  - he module named export error (check v2.6+ applied)')
    console.error('  - Missing UA configuration (check .env.local)')
    console.error()
    console.error('Troubleshooting:')
    console.error('  1. Check network: curl -I https://export.arxiv.org')
    console.error('  2. Try HTML fallback: FORCE_SOURCE=html npm run rebuild')
    console.error('  3. Check system time: date')
    console.error('  4. Check UA: curl localhost:3000/api/admin/show-ua')
    console.error('  5. Test from browser: npm run dev → visit /api/admin/ping-arxiv?mode=api')
    console.error()
    process.exit(1)
  }
}

main()
