import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import { getUA } from '@/src/lib/ua'

// Force Node.js runtime
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/debug-html
 * Debug HTML scraping - parse pastweek list and return IDs
 */
export async function GET() {
  try {
    console.log('[Debug HTML] Fetching pastweek list...')

    const url = 'https://arxiv.org/list/cs/pastweek?show=2000'
    const response = await fetch(url, {
      headers: {
        'User-Agent': getUA(),
      },
    })

    const status = response.status

    // Handle 429 with advice
    if (status === 429) {
      return NextResponse.json({
        ok: false,
        status: 429,
        msg: 'Rate limited by arXiv',
        advice: 'Use API mode instead: FORCE_SOURCE=api npm run rebuild',
      })
    }

    if (status !== 200) {
      throw new Error(`HTTP ${status}`)
    }

    const html = await response.text()
    console.log(`[Debug HTML] Downloaded ${html.length} bytes`)

    // Parse with cheerio
    const $ = cheerio.load(html)
    const idSet = new Set<string>()

    // Find all links like /abs/2410.12345v1 or /abs/cs/0701001v2
    $('a[href^="/abs/"]').each((_, el) => {
      const href = $(el).attr('href') || ''
      // Extract ID with version: /abs/2410.12345v1 -> 2410.12345v1
      const m = href.match(/\/abs\/((?:[a-z\-]+\/\d{7})|\d{4}\.\d{4,5})(v\d+)?/i)
      if (m) {
        const arxivId = `${m[1]}${m[2] || ''}`
        idSet.add(arxivId)
      }
    })

    const allIds = Array.from(idSet)
    const sampleIds = allIds.slice(0, 5)

    console.log(`[Debug HTML] Found ${allIds.length} unique arXiv IDs`)
    console.log(`[Debug HTML] Sample:`, sampleIds)

    return NextResponse.json({
      ok: true,
      url,
      htmlLength: html.length,
      totalIds: allIds.length,
      sampleIds,
    })
  } catch (error) {
    console.error('[Debug HTML] Error:', error)
    return NextResponse.json(
      {
        ok: false,
        error: 'Debug HTML failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        advice: 'Try API mode: FORCE_SOURCE=api npm run rebuild',
      },
      { status: 500 }
    )
  }
}
