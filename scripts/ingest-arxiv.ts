import { parseStringPromise } from 'xml2js'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { Paper } from '../src/types/paper'

/**
 * Extract full arXiv ID with version from entry.id URL
 * Examples:
 *   http://arxiv.org/abs/2401.12345v2 -> 2401.12345v2
 *   http://arxiv.org/abs/cs/0701001v1 -> cs/0701001v1
 *   http://arxiv.org/abs/2401.12345 -> 2401.12345
 */
function extractArxivId(idUrl: string): string {
  // Use indexed capture groups instead of named groups for ES5 compatibility
  const match = idUrl.match(/arxiv\.org\/abs\/(([a-z\-]+\/\d{7}|\d{4}\.\d{4,5}))(v\d+)?/)
  if (!match) {
    throw new Error(`Invalid arXiv ID URL: ${idUrl}`)
  }
  const core = match[1]  // First capture group: the core ID
  const ver = match[3] || ''  // Third capture group: version (optional)
  return `${core}${ver}`
}

/**
 * Normalize text: remove excessive whitespace and newlines
 */
function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n+/g, ' ') // Replace newlines with space
    .trim()
}

/**
 * Fetch papers from arXiv API
 */
async function fetchArxivPapers(query: string, maxResults: number) {
  const baseUrl = 'http://export.arxiv.org/api/query'
  const params = new URLSearchParams({
    search_query: query,
    start: '0',
    max_results: maxResults.toString(),
    sortBy: 'submittedDate',
    sortOrder: 'descending',
  })

  const url = `${baseUrl}?${params.toString()}`
  console.log('Fetching from arXiv:', url)

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`arXiv API error: ${response.status} ${response.statusText}`)
  }

  const xmlText = await response.text()
  return xmlText
}

/**
 * Parse arXiv XML feed and extract papers
 */
async function parseArxivFeed(xmlText: string): Promise<Paper[]> {
  const feed = await parseStringPromise(xmlText)
  const entries = feed.feed.entry || []

  const papers: Paper[] = []

  for (const entry of entries) {
    try {
      // Extract arXiv ID with version
      const arxivId = extractArxivId(entry.id[0])

      // Extract title and abstract (normalize whitespace)
      const title = normalizeText(entry.title[0])
      const abstract = normalizeText(entry.summary[0])

      // Extract authors
      const authors = (entry.author || []).map((a: any) => a.name[0])

      // Extract categories
      const categories = (entry.category || []).map((c: any) => c.$.term)

      // Extract published date
      const published = entry.published[0]

      // Construct URLs
      const sourceUrl = `https://arxiv.org/abs/${arxivId}`
      const pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`

      const paper: Paper = {
        id: `arxiv-${arxivId}`,
        arxivId,
        title,
        abstract,
        authors,
        categories,
        publishedAt: published,
        sourceUrl,
        pdfUrl,
        source: 'arxiv',
      }

      papers.push(paper)
    } catch (err) {
      console.warn('Failed to parse entry:', err instanceof Error ? err.message : err)
    }
  }

  return papers
}

/**
 * Load existing papers from data/papers.json
 */
function loadExistingPapers(): Paper[] {
  const filePath = resolve(process.cwd(), 'data/papers.json')
  if (!existsSync(filePath)) {
    return []
  }

  try {
    const content = readFileSync(filePath, 'utf-8')
    return JSON.parse(content)
  } catch (err) {
    console.warn('Failed to load existing papers:', err)
    return []
  }
}

/**
 * Save papers to data/papers.json (sorted by publishedAt desc)
 */
function savePapers(papers: Paper[]) {
  // Sort by publishedAt descending
  papers.sort((a, b) => {
    const dateA = new Date(a.publishedAt).getTime()
    const dateB = new Date(b.publishedAt).getTime()
    return dateB - dateA
  })

  const filePath = resolve(process.cwd(), 'data/papers.json')
  writeFileSync(filePath, JSON.stringify(papers, null, 2), 'utf-8')
  console.log(`Saved ${papers.length} papers to ${filePath}`)
}

/**
 * Ingest papers from arXiv
 */
export async function ingestArxivPapers(query: string, maxResults: number) {
  console.log('Starting arXiv ingestion...')
  console.log(`Query: ${query}`)
  console.log(`Max results: ${maxResults}`)
  console.log('')

  // Fetch XML feed
  const xmlText = await fetchArxivPapers(query, maxResults)
  console.log(`Fetched ${xmlText.length} bytes of XML`)

  // Parse papers
  const newPapers = await parseArxivFeed(xmlText)
  console.log(`Parsed ${newPapers.length} papers`)

  // Load existing papers (remove any mock data)
  let existingPapers = loadExistingPapers()
  console.log(`Loaded ${existingPapers.length} existing papers`)

  // Filter out mock data
  const beforeFilter = existingPapers.length
  existingPapers = existingPapers.filter(p => p.source !== 'mock')
  if (existingPapers.length < beforeFilter) {
    console.log(`Removed ${beforeFilter - existingPapers.length} mock papers`)
  }

  // Merge papers (upsert by arxivId)
  const paperMap = new Map<string, Paper>()

  // Add existing papers first
  existingPapers.forEach(p => {
    if (p.arxivId) {
      paperMap.set(p.arxivId, p)
    }
  })

  // Upsert new papers
  let added = 0
  let updated = 0
  newPapers.forEach(p => {
    // Skip papers without arxivId (should not happen for arXiv papers)
    if (!p.arxivId) {
      console.warn('Skipping paper without arxivId:', p.id)
      return
    }

    if (paperMap.has(p.arxivId)) {
      updated++
    } else {
      added++
    }
    paperMap.set(p.arxivId, p)
  })

  // Convert to array
  const allPapers = Array.from(paperMap.values())

  // Save to file
  savePapers(allPapers)

  console.log('')
  console.log('✅ Ingestion completed!')
  console.log(`   - New papers: ${added}`)
  console.log(`   - Updated papers: ${updated}`)
  console.log(`   - Total papers: ${allPapers.length}`)

  return {
    added,
    updated,
    total: allPapers.length,
  }
}

// Main function
async function main() {
  const query = process.env.ARXIV_SEARCH_QUERY || 'cat:cs.*'
  const maxResults = parseInt(process.env.ARXIV_MAX_RESULTS || '100', 10)

  try {
    await ingestArxivPapers(query, maxResults)
  } catch (error) {
    console.error('❌ Ingestion failed:', error)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}
