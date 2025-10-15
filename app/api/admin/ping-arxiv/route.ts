import { NextRequest, NextResponse } from 'next/server'
import { XMLParser } from 'fast-xml-parser'
import * as cheerio from 'cheerio'
import { getUA } from '@/src/lib/ua'

// Force Node.js runtime
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * GET /api/admin/ping-arxiv?mode=api&cat=cs.AI
 * GET /api/admin/ping-arxiv?mode=html
 * Test arXiv API or HTML access with retry logic
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('mode') || 'api'
  const cat = searchParams.get('cat') || 'cs.AI'

  try {
    if (mode === 'html') {
      // Test HTML list page with 429 retry
      console.log(`[Ping] Testing HTML mode...`)

      const url = 'https://arxiv.org/list/cs/pastweek?show=50'
      let response = await fetch(url, {
        headers: {
          'User-Agent': getUA(),
        },
      })

      let status = response.status

      // Handle 429 with retry
      if (status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        if (retryAfter) {
          const waitTime = parseInt(retryAfter, 10) * 1000
          console.log(`[Ping] Got 429, Retry-After: ${retryAfter}s, waiting...`)
          await sleep(waitTime)
        } else {
          // Exponential backoff: 15s then 30s
          console.log(`[Ping] Got 429, no Retry-After, trying 15s backoff...`)
          await sleep(15000)
        }

        // Retry once
        response = await fetch(url, {
          headers: {
            'User-Agent': getUA(),
          },
        })
        status = response.status

        // Still 429? Try one more time with 30s backoff
        if (status === 429) {
          console.log(`[Ping] Still 429, trying 30s backoff...`)
          await sleep(30000)
          response = await fetch(url, {
            headers: {
              'User-Agent': getUA(),
            },
          })
          status = response.status
        }
      }

      // If still 429, give up
      if (status === 429) {
        return NextResponse.json({
          ok: false,
          mode: 'html',
          status: 429,
          msg: 'Rate limited after retries',
          advice: 'Use API mode instead or wait longer. Try: ?mode=api',
        })
      }

      const html = await response.text()
      const length = html.length

      // Parse with cheerio
      const $ = cheerio.load(html)
      const absLinks: string[] = []
      $('a[href^="/abs/"]').each((_, el) => {
        const href = $(el).attr('href') || ''
        if (href) {
          absLinks.push(href)
        }
      })

      const hasAbsLinks = absLinks.length > 0
      const firstAbsHref = absLinks[0] || ''
      const previewText = html.slice(0, 500)

      console.log(`[Ping] HTML Status: ${status}`)
      console.log(`[Ping] HTML Length: ${length} bytes`)
      console.log(`[Ping] Found ${absLinks.length} abs links`)

      return NextResponse.json({
        mode: 'html',
        status,
        url,
        length,
        hasAbsLinks,
        firstAbsHref,
        absLinksCount: absLinks.length,
        previewText,
        ok: status === 200 && hasAbsLinks,
      })
    } else {
      // Test API mode with proper entry parsing
      console.log(`[Ping] Testing API mode (category: ${cat})...`)

      const params = new URLSearchParams()
      params.set('search_query', `cat:${cat}`)
      params.set('sortBy', 'lastUpdatedDate')
      params.set('sortOrder', 'descending')
      params.set('max_results', '1')

      const url = `https://export.arxiv.org/api/query?${params.toString()}`

      const response = await fetch(url, {
        headers: {
          'User-Agent': getUA(),
          'Accept': 'application/atom+xml, text/xml;q=0.9, */*;q=0.8',
        },
      })

      const status = response.status
      const xml = await response.text()
      const length = xml.length
      const preview = xml.slice(0, 500)

      // Parse with fast-xml-parser
      let hasEntry = false
      let totalResults = 0

      if (status === 200 && xml.length > 100) {
        try {
          const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            textNodeName: '#text',
          })

          const obj = parser.parse(xml)
          const feed = obj?.feed

          if (feed) {
            const entry = feed.entry
            // Handle both single entry (object) and multiple entries (array)
            const entries = Array.isArray(entry) ? entry : entry ? [entry] : []
            hasEntry = entries.length > 0
            totalResults = Number(feed?.['opensearch:totalResults'] ?? 0)
          }
        } catch (parseError) {
          console.error('[Ping] XML parse error:', parseError)
        }
      }

      console.log(`[Ping] API Status: ${status}`)
      console.log(`[Ping] API Length: ${length} bytes`)
      console.log(`[Ping] Has <entry>: ${hasEntry}`)
      console.log(`[Ping] Total results: ${totalResults}`)

      return NextResponse.json({
        mode: 'api',
        status,
        url,
        length,
        preview,
        hasEntry,
        totalResults,
        ok: status === 200 && hasEntry,
      })
    }
  } catch (error) {
    console.error('[Ping] Error:', error)
    return NextResponse.json(
      {
        error: 'Ping failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
