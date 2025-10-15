#!/usr/bin/env node

/**
 * Offline rebuild script - Run without dev server
 * Usage: node scripts/rebuild.mjs
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = resolve(__dirname, '..')

// Dynamically import the arxiv module
async function run() {
  console.log('='.repeat(60))
  console.log('arXiv Manager - Offline Rebuild')
  console.log('='.repeat(60))
  console.log()

  try {
    // Import the arxiv module
    const arxivModule = await import('../src/lib/arxiv.ts')
    const { ingestLastNDays } = arxivModule

    console.log('[Rebuild] Starting 7-day data ingestion...')
    console.log('[Rebuild] This may take 30-60 seconds...')
    console.log()

    // Ingest papers from last 7 days with validation
    const result = await ingestLastNDays({
      days: 7,
      size: 300,
      validate: true,
    })

    console.log()
    console.log('='.repeat(60))
    console.log('Ingestion Complete')
    console.log('='.repeat(60))
    console.log(`  Total papers:     ${result.count}`)
    console.log(`  Added:            ${result.added}`)
    console.log(`  Kept:             ${result.kept}`)
    console.log(`  Dropped (invalid): ${result.dropped}`)
    console.log(`  First date:       ${result.firstDate}`)
    console.log(`  Last date:        ${result.lastDate}`)
    console.log(`  Cutoff:           ${result.cutoff}`)
    console.log('='.repeat(60))
    console.log()

    // Ensure data directory exists
    const dataDir = resolve(projectRoot, 'data')
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true })
      console.log(`[Rebuild] Created directory: ${dataDir}`)
    }

    // Write papers.json
    const papersPath = resolve(dataDir, 'papers.json')
    writeFileSync(papersPath, JSON.stringify(result.items, null, 2), 'utf-8')
    console.log(`[Rebuild] ✓ Wrote ${result.count} papers to:`)
    console.log(`           ${papersPath}`)

    // Write meta.json
    const metaPath = resolve(dataDir, 'meta.json')
    const meta = {
      lastFetchedAt: new Date().toISOString(),
      count: result.count,
      firstDate: result.firstDate,
      lastDate: result.lastDate,
      cutoff: result.cutoff,
      dropped: result.dropped,
      validated: true,
      version: '2.1.0',
    }
    writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8')
    console.log(`[Rebuild] ✓ Wrote metadata to:`)
    console.log(`           ${metaPath}`)

    console.log()
    console.log('='.repeat(60))
    console.log('Rebuild Complete! 🎉')
    console.log('='.repeat(60))
    console.log()
    console.log('Next steps:')
    console.log('  1. Run: npm run dev')
    console.log('  2. Open: http://localhost:3000')
    console.log()

    if (result.count === 0) {
      console.warn('⚠️  WARNING: No papers were found in the last 7 days.')
      console.warn('   This might indicate an issue with the arXiv API or date filtering.')
      console.warn('   Check the logs above for more details.')
      console.log()
    }
  } catch (error) {
    console.error()
    console.error('='.repeat(60))
    console.error('❌ Rebuild Failed')
    console.error('='.repeat(60))
    console.error(error)
    console.error()
    process.exit(1)
  }
}

run()
