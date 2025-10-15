import { NextRequest, NextResponse } from 'next/server'
import { rebuildRecentNDays } from '@/src/lib/arxiv'

// Force Node.js runtime
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/rebuild-7d?days=7&useServerClock=true&forceSource=auto
 * POST /api/admin/rebuild-7d with body { days: 7, useServerClock: true, forceSource: 'auto' }
 * Rebuild N-day paper database (API first, HTML fallback)
 */
async function handleRebuild(request: NextRequest) {
  try {
    // Parse parameters from query (GET) or body (POST)
    let days = 7
    let useServerClock = true
    let forceSource: 'auto' | 'api' | 'html' = 'auto'

    if (request.method === 'GET') {
      const searchParams = request.nextUrl.searchParams
      days = parseInt(searchParams.get('days') || '7', 10)
      useServerClock = searchParams.get('useServerClock') !== 'false'
      const source = searchParams.get('forceSource') || 'auto'
      if (source === 'api' || source === 'html' || source === 'auto') {
        forceSource = source
      }
    } else if (request.method === 'POST') {
      try {
        const body = await request.json()
        days = body.days ?? 7
        useServerClock = body.useServerClock ?? true
        forceSource = body.forceSource ?? 'auto'
      } catch {
        // Ignore JSON parse errors, use defaults
      }
    }

    console.log(`[API] /api/admin/rebuild-7d called (days=${days}, useServerClock=${useServerClock}, forceSource=${forceSource})`)

    const result = await rebuildRecentNDays({ days, useServerClock, forceSource })

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Rebuild failed',
          message: 'rebuildRecentNDays returned ok=false',
        },
        { status: 500 }
      )
    }

    console.log('[API] Rebuild complete:')
    console.log(`  - Total papers: ${result.count}`)
    console.log(`  - Source: ${result.stats.source}`)
    console.log(`  - Stats:`, result.stats)

    return NextResponse.json({
      ok: true,
      count: result.count,
      stats: result.stats,
      meta: result.meta,
    })
  } catch (error) {
    console.error('[API] Rebuild error:', error)

    return NextResponse.json(
      {
        ok: false,
        error: 'Rebuild failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        preview: error instanceof Error ? error.stack?.slice(0, 500) : undefined,
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return handleRebuild(request)
}

export async function POST(request: NextRequest) {
  return handleRebuild(request)
}
