import { NextRequest, NextResponse } from 'next/server'
import { rebuildRecent7d } from '@/src/lib/arxiv'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/sync
 * Sync recent 7 days of papers (legacy endpoint)
 * Note: This is kept for backward compatibility. Use /api/admin/rebuild-7d instead.
 */
export async function POST(req: NextRequest) {
  try {
    console.log('[Sync] Starting 7-day sync (legacy endpoint)...')

    const result = await rebuildRecent7d()

    return NextResponse.json({
      ok: true,
      count: result.count,
      stats: result.stats,
      meta: result.meta,
      message: `Synced ${result.count} papers from last 7 days`,
    })
  } catch (error) {
    console.error('[Sync] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
