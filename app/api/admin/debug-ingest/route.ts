import { NextRequest, NextResponse } from 'next/server'
import { fetchRecentWindowAPI, fetchRecentWindowHTML } from '@/src/lib/arxiv'

// Force Node.js runtime
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/debug-ingest?days=7&forceSource=auto&useServerClock=1
 * Quick debug endpoint with configurable source
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '7', 10)
    const forceSource = (searchParams.get('forceSource') || 'auto') as 'auto' | 'api' | 'html'
    const useServerClock = searchParams.get('useServerClock') !== '0'

    console.log(`[Debug Ingest] days=${days}, forceSource=${forceSource}, useServerClock=${useServerClock}`)

    let papers: any[] = []
    let stats: any = {}

    // Auto mode: try API first, then HTML
    if (forceSource === 'auto') {
      console.log('[Debug Ingest] Auto mode: trying API first...')
      const apiResult = await fetchRecentWindowAPI({
        days,
        pageSize: 50,
        delayMs: 0,
        useServerClock,
      })
      papers = apiResult.papers
      stats = apiResult.stats

      if (papers.length === 0) {
        console.log('[Debug Ingest] API returned 0, trying HTML fallback...')
        const htmlResult = await fetchRecentWindowHTML({
          days,
          delayMs: 0,
          useServerClock,
        })
        papers = htmlResult.papers
        stats = htmlResult.stats
      }
    }
    // Force API mode
    else if (forceSource === 'api') {
      console.log('[Debug Ingest] Forcing API mode...')
      const apiResult = await fetchRecentWindowAPI({
        days,
        pageSize: 50,
        delayMs: 0,
        useServerClock,
      })
      papers = apiResult.papers
      stats = apiResult.stats
    }
    // Force HTML mode
    else if (forceSource === 'html') {
      console.log('[Debug Ingest] Forcing HTML mode...')
      const htmlResult = await fetchRecentWindowHTML({
        days,
        delayMs: 0,
        useServerClock,
      })
      papers = htmlResult.papers
      stats = htmlResult.stats
    }

    const sample = papers.slice(0, 3).map(p => ({
      id: p.arxivId,
      title: p.title.slice(0, 80),
    }))

    const hint = `To reproduce: FORCE_SOURCE=${forceSource} REBUILD_DAYS=${days} npm run rebuild`

    return NextResponse.json({
      ok: true,
      count: papers.length,
      stats,
      sample,
      hint,
    })
  } catch (error) {
    console.error('[Debug Ingest] Error:', error)
    return NextResponse.json(
      {
        ok: false,
        error: 'Debug ingest failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
