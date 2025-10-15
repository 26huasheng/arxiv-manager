import { parseStringPromise } from 'xml2js'
import { Paper } from '@/src/types/paper'
import { JsonStore } from '@/src/lib/store'

interface ArxivEntry {
  id: string[]
  title: string[]
  summary: string[]
  author: Array<{ name: string[] }>
  published: string[]
  updated: string[]
  category?: Array<{ $: { term: string } }>
  link: Array<{ $: { href: string; title?: string; rel?: string } }>
}

interface ArxivFeed {
  feed: {
    entry?: ArxivEntry[]
  }
}

/**
 * Fetch papers from arXiv API
 * @param query - arXiv search query (default: cs.* categories)
 * @param maxResults - Maximum number of results to fetch
 */
export async function fetchArxivPapers(
  query: string = 'cat:cs.*',
  maxResults: number = 100
): Promise<Paper[]> {
  const url = new URL('http://export.arxiv.org/api/query')
  url.searchParams.set('search_query', query)
  url.searchParams.set('start', '0')
  url.searchParams.set('max_results', maxResults.toString())
  url.searchParams.set('sortBy', 'submittedDate')
  url.searchParams.set('sortOrder', 'descending')

  console.log(`Fetching from arXiv: ${url.toString()}`)

  try {
    const response = await fetch(url.toString())
    if (!response.ok) {
      throw new Error(`arXiv API error: ${response.status} ${response.statusText}`)
    }

    const xml = await response.text()
    const parsed = (await parseStringPromise(xml)) as ArxivFeed

    if (!parsed.feed.entry) {
      console.log('No entries found in arXiv response')
      return []
    }

    const papers: Paper[] = parsed.feed.entry.map((entry) => {
      // Extract arXiv ID from the full URL
      const arxivUrl = entry.id[0]
      const arxivId = arxivUrl.split('/abs/')[1] || arxivUrl

      // Extract categories
      const categories = entry.category
        ? entry.category.map((cat) => cat.$.term)
        : []

      // Extract authors
      const authors = entry.author
        ? entry.author.map((author) => author.name[0])
        : []

      // Find PDF URL
      const pdfLink = entry.link.find((link) => link.$.title === 'pdf')
      const pdfUrl = pdfLink
        ? pdfLink.$.href
        : `https://arxiv.org/pdf/${arxivId}.pdf`

      // Source URL
      const sourceUrl = `https://arxiv.org/abs/${arxivId}`

      return {
        id: `arxiv-${arxivId.replace(/\./g, '-')}`,
        title: entry.title[0].trim().replace(/\s+/g, ' '),
        authors,
        categories,
        abstract: entry.summary[0].trim().replace(/\s+/g, ' '),
        pdfUrl,
        sourceUrl,
        publishedAt: entry.published[0],
        updatedAt: entry.updated[0],
      }
    })

    console.log(`Fetched ${papers.length} papers from arXiv`)
    return papers
  } catch (error) {
    console.error('Error fetching from arXiv:', error)
    throw error
  }
}

/**
 * Ingest arXiv papers and merge with existing data
 * @param query - arXiv search query
 * @param maxResults - Maximum number of results to fetch
 */
export async function ingestArxivPapers(
  query: string = 'cat:cs.*',
  maxResults: number = 100
): Promise<{ added: number; total: number }> {
  try {
    // Fetch new papers from arXiv
    const newPapers = await fetchArxivPapers(query, maxResults)

    // Load existing papers
    const existingPapers = await JsonStore.getPapers()
    const existingIds = new Set(existingPapers.map((p) => p.id))

    // Deduplicate: only add papers that don't exist
    const papersToAdd = newPapers.filter((paper) => !existingIds.has(paper.id))

    // Merge and sort by publishedAt (descending)
    const allPapers = [...papersToAdd, ...existingPapers].sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )

    // Save to JSON
    await JsonStore.savePapers(allPapers)

    console.log(`Added ${papersToAdd.length} new papers. Total: ${allPapers.length}`)

    return {
      added: papersToAdd.length,
      total: allPapers.length,
    }
  } catch (error) {
    console.error('Error ingesting arXiv papers:', error)
    throw error
  }
}
