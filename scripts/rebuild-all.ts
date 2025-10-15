import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { resolve } from 'path'

/**
 * Execute command and stream output
 */
function exec(command: string, description: string) {
  console.log('\n' + '='.repeat(60))
  console.log(`📦 ${description}`)
  console.log('='.repeat(60))
  console.log(`Running: ${command}\n`)

  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: process.cwd(),
    })
    console.log(`\n✅ ${description} completed\n`)
  } catch (error) {
    console.error(`\n❌ ${description} failed\n`)
    throw error
  }
}

/**
 * Rebuild all data: ingest -> repair -> embed
 */
async function rebuildAll() {
  console.log('🚀 arXiv Manager - Full Data Rebuild')
  console.log('====================================')
  console.log('This will:')
  console.log('  1. Ingest papers from arXiv')
  console.log('  2. Repair links and normalize text')
  console.log('  3. Generate embeddings for new papers')
  console.log('')

  const startTime = Date.now()

  try {
    // Step 1: Ingest papers from arXiv
    exec('tsx scripts/ingest-arxiv.ts', 'Step 1: Ingest Papers')

    // Step 2: Repair links
    exec('tsx scripts/repair-links.ts', 'Step 2: Repair Links')

    // Step 3: Generate embeddings (if embed script exists)
    const embedScript = resolve(process.cwd(), 'scripts/embed-titleabs.ts')
    if (existsSync(embedScript)) {
      exec('tsx scripts/embed-titleabs.ts', 'Step 3: Generate Embeddings')
    } else {
      console.log('\n⚠️  Embedding script not found, skipping...')
    }

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log('\n' + '='.repeat(60))
    console.log(`✅ FULL REBUILD COMPLETED (${duration}s)`)
    console.log('='.repeat(60))
    console.log('\nYou can now start the dev server:')
    console.log('  npm run dev')
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log('\n' + '='.repeat(60))
    console.error(`❌ REBUILD FAILED (${duration}s)`)
    console.log('='.repeat(60))
    process.exit(1)
  }
}

rebuildAll()
