import { XMLParser } from 'fast-xml-parser'
import he from 'he'
const { decode: heDecodeEntity } = he
import * as cheerio from 'cheerio'
import fs from 'node:fs'
import path from 'node:path'
import { getUA } from './ua'

/**
 * All Computer Science categories on arXiv
 */
const CS_CATEGORIES = [
  'cs.AI', 'cs.AR', 'cs.CC', 'cs.CE', 'cs.CG', 'cs.CL', 'cs.CR', 'cs.CV', 'cs.CY', 'cs.DB',
  'cs.DC', 'cs.DL', 'cs.DM', 'cs.DS', 'cs.ET', 'cs.FL', 'cs.GL', 'cs.GR', 'cs.GT', 'cs.HC',
  'cs.IR', 'cs.IT', 'cs.LG', 'cs.LO', 'cs.MA', 'cs.MM', 'cs.MS', 'cs.NA', 'cs.NE', 'cs.NI',
  'cs.OH', 'cs.OS', 'cs.PF', 'cs.PL', 'cs.RO', 'cs.SC', 'cs.SD', 'cs.SE', 'cs.SI', 'cs.SY'
] as const

/**
 * Get server time from arXiv API (using response Date header)
 */
export async function getServerNow(): Promise<{
  serverNow: Date
  dateHeader: string
  probeUrl: string
  status: number
}> {
  const probeUrl = 'https://export.arxiv.org/api/query?search_query=cat:cs.AI&max_results=1&sortBy=lastUpdatedDate&sortOrder=descending'

  try {
    console.log('[Clock] Probing arXiv server time...')
    const response = await fetch(probeUrl, {
      headers: {
        'User-Agent': getUA(),
        'Accept': 'application/atom+xml',
      },
    })

    const dateHeader = response.headers.get('date') || ''
    const status = response.status

    if (dateHeader) {
      const serverNow = new Date(dateHeader)
      console.log(`[Clock] Server time: ${serverNow.toISOString()}`)
      console.log(`[Clock] Date header: ${dateHeader}`)
      return { serverNow, dateHeader, probeUrl, status }
    } else {
      console.warn('[Clock] No Date header, falling back to local time')
      return {
        serverNow: new Date(),
        dateHeader: '(not available)',
        probeUrl,
        status,
      }
    }
  } catch (error) {
    console.error('[Clock] Failed to get server time, using local time:', error)
    return {
      serverNow: new Date(),
      dateHeader: '(error)',
      probeUrl,
      status: 0,
    }
  }
}

/**
 * Sleep utility for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Build query chunks (10 categories per chunk)
 */
export function buildCategoryChunks(): { query: string; label: string }[] {
  const chunks: string[][] = []
  for (let i = 0; i < CS_CATEGORIES.length; i += 10) {
    chunks.push(CS_CATEGORIES.slice(i, i + 10))
  }

  return chunks.map((cats, idx) => {
    const raw = cats.map(c => `cat:${c}`).join(' OR ')
    const params = new URLSearchParams()
    params.set('search_query', raw)
    params.set('sortBy', 'submittedDate')
    params.set('sortOrder', 'descending')

    return {
      query: params.toString(),
      label: `chunk-${idx + 1}`,
    }
  })
}

/**
 * Fetch a single page from arXiv API
 */
export async function fetchPage({
  query,
  start = 0,
  size = 200,
  ua,
}: {
  query: string
  start: number
  size: number
  ua?: string
}) {
  const url = `https://export.arxiv.org/api/query?${query}&start=${start}&max_results=${size}`

  console.log(`[arXiv] Fetching: ${url.slice(0, 120)}...`)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': ua || getUA(),
        'Accept': 'application/atom+xml',
      },
    })

    if (response.status !== 200) {
      const text = await response.text()
      console.error(`[arXiv] HTTP ${response.status}: ${text.slice(0, 500)}`)
      throw new Error(`HTTP ${response.status}`)
    }

    const xml = await response.text()

    if (!xml || xml.length < 100) {
      console.warn(`[arXiv] Empty or short response: ${xml.length} bytes`)
      return { entries: [], totalResults: 0, xmlPreview: xml, url }
    }

    // Parse XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
    })

    const obj = parser.parse(xml)
    const feed = obj?.feed

    if (!feed) {
      console.warn('[arXiv] No feed in response')
      return { entries: [], totalResults: 0, xmlPreview: xml.slice(0, 800), url }
    }

    const entry = feed.entry
    const entries = Array.isArray(entry) ? entry : entry ? [entry] : []

    const totalResults = Number(feed?.['opensearch:totalResults'] ?? 0)

    console.log(`[arXiv] Parsed ${entries.length} entries (total: ${totalResults})`)

    return {
      entries,
      totalResults,
      xmlPreview: xml.slice(0, 800),
      url,
    }
  } catch (error) {
    console.error(`[arXiv] Fetch error:`, error)
    throw error
  }
}

/**
 * Normalize a single entry
 */
export function normalizeEntry(e: any): any | null {
  try {
    // Extract arXiv ID with version
    const m = String(e.id).match(/arxiv\.org\/abs\/((?:[a-z\-]+\/\d{7})|\d{4}\.\d{4,5})(v\d+)?/i)
    if (!m) return null

    const arxivId = `${m[1]}${m[2] || ''}`

    // Decode and normalize title
    const rawTitle = String(e.title ?? e.title?.['#text'] ?? '')
    const title = heDecodeEntity(rawTitle).replace(/\s+/g, ' ').trim()

    // Decode and normalize summary
    const rawSummary = String(e.summary ?? e.summary?.['#text'] ?? '')
    const abstract = heDecodeEntity(rawSummary).replace(/\s+/g, ' ').trim()

    // Extract authors
    const au = e.author ? (Array.isArray(e.author) ? e.author : [e.author]) : []
    const authors = au.map((a: any) => String(a?.name ?? a)).filter(Boolean)

    // Extract categories
    const cat = e.category ? (Array.isArray(e.category) ? e.category : [e.category]) : []
    const categories = cat.map((c: any) => String(c?.['@_term'] ?? c?.term ?? c)).filter(Boolean)

    // Extract dates
    const publishedAt = new Date(e.published)
    const updatedAt = new Date(e.updated)

    if (!isFinite(+publishedAt) && !isFinite(+updatedAt)) {
      return null
    }

    const sourceUrl = `https://arxiv.org/abs/${arxivId}`
    const pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`

    return {
      id: `arxiv-${arxivId}`,
      arxivId,
      title,
      abstract,
      authors,
      categories,
      publishedAt,
      updatedAt,
      sourceUrl,
      pdfUrl,
      source: 'arxiv',
    }
  } catch (err) {
    console.warn(`[arXiv] Failed to normalize entry:`, err)
    return null
  }
}

/**
 * Fetch papers via API category search
 */
export async function fetchRecentWindowAPI({
  days = 7,
  pageSize = 200,
  delayMs = 1200,
  useServerClock = true,
}: {
  days?: number
  pageSize?: number
  delayMs?: number
  useServerClock?: boolean
} = {}) {
  // Get base time (server or local)
  let baseNow: Date
  if (useServerClock) {
    const { serverNow } = await getServerNow()
    baseNow = serverNow
    console.log(`[arXiv API] Using server time: ${baseNow.toISOString()}`)
  } else {
    baseNow = new Date()
    console.log(`[arXiv API] Using local time: ${baseNow.toISOString()}`)
  }

  const windowStart = new Date(baseNow.getTime() - days * 86400000)
  console.log(`[arXiv API] Fetching papers from last ${days} days`)
  console.log(`[arXiv API] Window start: ${windowStart.toISOString()}`)

  const chunks = buildCategoryChunks()
  console.log(`[arXiv API] Using ${chunks.length} query chunks (${CS_CATEGORIES.length} categories)`)

  const kept: any[] = []
  let pages = 0
  let fetched = 0

  // Enumerate all chunks
  for (const chunk of chunks) {
    console.log(`[arXiv API] Processing ${chunk.label}...`)
    let start = 0

    while (true) {
      pages++
      const { entries, totalResults } = await fetchPage({
        query: chunk.query,
        start,
        size: pageSize,
      })

      if (!entries.length) {
        console.log(`[arXiv API] No more entries in ${chunk.label}`)
        break
      }

      fetched += entries.length

      for (const e of entries) {
        const x = normalizeEntry(e)
        if (!x) continue

        // recentAt = max(publishedAt, updatedAt)
        const recentAt = x.updatedAt > x.publishedAt ? x.updatedAt : x.publishedAt
        if (recentAt >= windowStart) {
          kept.push(x)
        }
      }

      // Check if last entry is outside window
      const last = entries[entries.length - 1]
      const lp = new Date(last.updated || last.published || 0)

      if (!isFinite(+lp) || lp < windowStart || start + pageSize >= totalResults) {
        console.log(`[arXiv API] ${chunk.label} complete (kept ${kept.length} so far)`)
        break
      }

      start += pageSize

      // Rate limiting
      if (delayMs > 0) {
        await sleep(delayMs)
      }
    }
  }

  console.log(`[arXiv API] First pass complete: ${kept.length} papers`)

  // Fallback: if no results, try lastUpdatedDate
  if (kept.length === 0) {
    console.log(`[arXiv API] No results with submittedDate, trying fallback with lastUpdatedDate...`)

    const fallbackChunks = chunks.map(c => ({
      query: c.query.replace('sortBy=submittedDate', 'sortBy=lastUpdatedDate'),
      label: c.label + '-fallback',
    }))

    for (const fc of fallbackChunks) {
      console.log(`[arXiv API] Processing ${fc.label}...`)
      let start = 0

      while (true) {
        pages++
        const { entries, totalResults } = await fetchPage({
          query: fc.query,
          start,
          size: pageSize,
        })

        if (!entries.length) break

        fetched += entries.length

        for (const e of entries) {
          const x = normalizeEntry(e)
          if (!x) continue

          const recentAt = x.updatedAt > x.publishedAt ? x.updatedAt : x.publishedAt
          if (recentAt >= windowStart) {
            kept.push(x)
          }
        }

        const last = entries[entries.length - 1]
        const lp = new Date(last.updated || last.published || 0)

        if (!isFinite(+lp) || lp < windowStart || start + pageSize >= totalResults) {
          break
        }

        start += pageSize

        if (delayMs > 0) {
          await sleep(delayMs)
        }
      }
    }

    console.log(`[arXiv API] Fallback pass complete: ${kept.length} papers`)
  }

  // Deduplicate by arxivId
  const map = new Map<string, any>()
  for (const p of kept) {
    if (!map.has(p.arxivId)) {
      map.set(p.arxivId, p)
    }
  }

  // Sort by publishedAt desc
  const papers = Array.from(map.values()).sort((a, b) => {
    return b.publishedAt.getTime() - a.publishedAt.getTime()
  })

  console.log(`[arXiv API] After deduplication: ${papers.length} unique papers`)

  const stats = {
    source: 'api' as const,
    windowDays: days,
    pageCount: pages,
    totalFetched: fetched,
    totalKept: papers.length,
    chunksUsed: chunks.length,
    categoriesCount: CS_CATEGORIES.length,
    baseNowISO: baseNow.toISOString(),
    windowStartISO: windowStart.toISOString(),
    usedServerClock: useServerClock,
  }

  return {
    papers,
    stats,
  }
}

/**
 * Fetch papers via HTML pastweek list + id_list batch query
 */
export async function fetchRecentWindowHTML({
  days = 7,
  delayMs = 800,
  useServerClock = true,
}: {
  days?: number
  delayMs?: number
  useServerClock?: boolean
} = {}) {
  console.log(`[arXiv HTML] Starting HTML pastweek fallback...`)

  // Get base time
  let baseNow: Date
  if (useServerClock) {
    const { serverNow } = await getServerNow()
    baseNow = serverNow
    console.log(`[arXiv HTML] Using server time: ${baseNow.toISOString()}`)
  } else {
    baseNow = new Date()
    console.log(`[arXiv HTML] Using local time: ${baseNow.toISOString()}`)
  }

  const windowStart = new Date(baseNow.getTime() - days * 86400000)
  console.log(`[arXiv HTML] Window start: ${windowStart.toISOString()}`)

  // Step 1: Fetch HTML page
  const listUrl = 'https://arxiv.org/list/cs/pastweek?show=2000'
  console.log(`[arXiv HTML] Fetching ${listUrl}`)

  try {
    const response = await fetch(listUrl, {
      headers: {
        'User-Agent': getUA(),
      },
    })

    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    console.log(`[arXiv HTML] Downloaded ${html.length} bytes`)

    // Step 2: Parse with cheerio
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
    console.log(`[arXiv HTML] Found ${allIds.length} unique arXiv IDs`)

    if (allIds.length === 0) {
      return {
        papers: [],
        stats: {
          source: 'html+id_list' as const,
          totalIds: 0,
          batches: 0,
          totalFetched: 0,
          totalKept: 0,
          baseNowISO: baseNow.toISOString(),
          windowStartISO: windowStart.toISOString(),
          usedServerClock: useServerClock,
        },
      }
    }

    // Step 3: Batch query with id_list
    const batchSize = 100
    const allPapers: any[] = []
    let batches = 0
    let totalFetched = 0

    for (let i = 0; i < allIds.length; i += batchSize) {
      const batch = allIds.slice(i, i + batchSize)
      batches++

      const idList = batch.join(',')
      const query = `id_list=${encodeURIComponent(idList)}`

      console.log(`[arXiv HTML] Batch ${batches}: fetching ${batch.length} papers...`)

      const { entries } = await fetchPage({
        query,
        start: 0,
        size: batchSize,
      })

      totalFetched += entries.length

      for (const e of entries) {
        const x = normalizeEntry(e)
        if (!x) continue

        // Filter by time window
        const recentAt = x.updatedAt > x.publishedAt ? x.updatedAt : x.publishedAt
        if (recentAt >= windowStart) {
          allPapers.push(x)
        }
      }

      // Rate limiting
      if (delayMs > 0 && i + batchSize < allIds.length) {
        await sleep(delayMs)
      }
    }

    console.log(`[arXiv HTML] Fetched ${totalFetched} papers, kept ${allPapers.length} within window`)

    // Deduplicate by arxivId
    const map = new Map<string, any>()
    for (const p of allPapers) {
      if (!map.has(p.arxivId)) {
        map.set(p.arxivId, p)
      }
    }

    // Sort by publishedAt desc
    const papers = Array.from(map.values()).sort((a, b) => {
      return b.publishedAt.getTime() - a.publishedAt.getTime()
    })

    console.log(`[arXiv HTML] After deduplication: ${papers.length} unique papers`)

    return {
      papers,
      stats: {
        source: 'html+id_list' as const,
        totalIds: allIds.length,
        batches,
        totalFetched,
        totalKept: papers.length,
        baseNowISO: baseNow.toISOString(),
        windowStartISO: windowStart.toISOString(),
        usedServerClock: useServerClock,
      },
    }
  } catch (error) {
    console.error('[arXiv HTML] Error:', error)
    throw error
  }
}

/**
 * Write JSON file
 */
function writeJSON(file: string, data: any) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8')
}

/**
 * Rebuild recent N-day data (API first, HTML fallback)
 */
export async function rebuildRecentNDays({
  days = 7,
  useServerClock = true,
  forceSource = 'auto',
}: {
  days?: number
  useServerClock?: boolean
  forceSource?: 'auto' | 'api' | 'html'
} = {}) {
  console.log(`[Rebuild] Starting ${days}-day rebuild...`)
  console.log(`[Rebuild] Use server clock: ${useServerClock}`)
  console.log(`[Rebuild] Force source: ${forceSource}`)

  let papers: any[] = []
  let stats: any = {}

  // Try API first (unless forceSource='html')
  if (forceSource === 'auto' || forceSource === 'api') {
    const apiResult = await fetchRecentWindowAPI({ days, useServerClock })
    papers = apiResult.papers
    stats = apiResult.stats

    if (papers.length > 0 || forceSource === 'api') {
      console.log(`[Rebuild] API returned ${papers.length} papers`)
    }
  }

  // If API returned 0 and we're in auto mode, try HTML
  if (papers.length === 0 && forceSource === 'auto') {
    console.log(`[Rebuild] API returned 0 papers, trying HTML fallback...`)
    const htmlResult = await fetchRecentWindowHTML({ days, useServerClock })
    papers = htmlResult.papers
    stats = htmlResult.stats
  }

  // If forceSource='html', use HTML directly
  if (forceSource === 'html') {
    const htmlResult = await fetchRecentWindowHTML({ days, useServerClock })
    papers = htmlResult.papers
    stats = htmlResult.stats
  }

  // Write papers.json
  const papersPath = path.resolve('data/papers.json')
  writeJSON(papersPath, papers)
  console.log(`[Rebuild] Wrote ${papers.length} papers to ${papersPath}`)

  // Write meta.json
  const metaPath = path.resolve('data/meta.json')
  const meta = {
    lastFetchedAt: new Date().toISOString(),
    count: papers.length,
    windowDays: days,
    baseNowISO: stats.baseNowISO,
    windowStartISO: stats.windowStartISO,
    usedServerClock: useServerClock,
    source: stats.source,
    version: '2.6.0+ua1.0',
  }
  writeJSON(metaPath, meta)
  console.log(`[Rebuild] Wrote metadata to ${metaPath}`)

  return {
    ok: true,
    count: papers.length,
    stats,
    meta,
  }
}

/**
 * Export for debugging
 */
export { CS_CATEGORIES }

/**
 * Backward compatibility: export fetchRecentWindowAPI as fetchRecentWindow
 */
export { fetchRecentWindowAPI as fetchRecentWindow }

// ============================================================================
// BACKWARD COMPATIBILITY EXPORTS (Build Compat Pack v3.0.4)
// ============================================================================

/**
 * Validate if URL is from arXiv whitelist
 * Used by: app/api/admin/repair/route.ts
 */
export function validateUrl(url: string): boolean {
  try {
    const u = new URL(url)
    const allowed = ['arxiv.org', 'export.arxiv.org', 'www.arxiv.org']
    return allowed.includes(u.hostname.toLowerCase())
  } catch {
    return false
  }
}

/**
 * Regenerate URLs from paper ID
 * Used by: app/api/admin/repair/route.ts
 * @param paperOrId - Can be a paper object with id field, or a string ID
 * @returns Object with sourceUrl and pdfUrl
 */
export function regenerateUrls(
  paperOrId: string | { id: string; arxivId?: string }
): { sourceUrl: string; pdfUrl: string } {
  // Extract arxivId
  let arxivId: string

  if (typeof paperOrId === 'string') {
    // Input is "arxiv-2410.12345v1" or "2410.12345v1"
    arxivId = paperOrId.replace(/^arxiv-/, '')
  } else {
    // Input is paper object
    arxivId = paperOrId.arxivId || paperOrId.id.replace(/^arxiv-/, '')
  }

  return {
    sourceUrl: `https://arxiv.org/abs/${arxivId}`,
    pdfUrl: `https://arxiv.org/pdf/${arxivId}.pdf`,
  }
}

/**
 * Rebuild recent 7 days (alias for rebuildRecentNDays)
 * Used by: app/api/admin/sync/route.ts
 */
export async function rebuildRecent7d() {
  return rebuildRecentNDays({ days: 7 })
}

/**
 * Fetch arXiv with flexible options (wrapper for fetchPage)
 * Used by: app/api/debug/arxiv/route.ts
 * @param opts - Query options
 * @returns Fetched entries and metadata
 */
export async function fetchArxiv(opts: {
  query: string
  start?: number
  size?: number
  sortBy?: 'submittedDate' | 'lastUpdatedDate'
}) {
  // Build query string
  const params = new URLSearchParams()
  params.set('search_query', opts.query)
  params.set('sortBy', opts.sortBy || 'submittedDate')
  params.set('sortOrder', 'descending')

  const result = await fetchPage({
    query: params.toString(),
    start: opts.start ?? 0,
    size: opts.size ?? 10,
  })

  return result
}
