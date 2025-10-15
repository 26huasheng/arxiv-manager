import { NextRequest, NextResponse } from 'next/server'
import { fetchArxiv } from '@/src/lib/arxiv'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/debug/arxiv?query=...&start=0&size=10
 * Debug endpoint to test arXiv API queries
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const query = searchParams.get('query') || 'cat:cs.AI'
    const start = parseInt(searchParams.get('start') || '0', 10)
    const size = parseInt(searchParams.get('size') || '10', 10)
    const sortBy = (searchParams.get('sortBy') || 'submittedDate') as 'submittedDate' | 'lastUpdatedDate'

    console.log('[Debug arXiv] Query:', { query, start, size, sortBy })

    const result = await fetchArxiv({
      query,
      start,
      size,
      sortBy,
    })

    return NextResponse.json({
      ok: true,
      query,
      totalResults: result.totalResults,
      entriesCount: result.entries.length,
      entries: result.entries,
      url: result.url,
    })
  } catch (error) {
    console.error('[Debug arXiv] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
