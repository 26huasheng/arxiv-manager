import { NextResponse } from 'next/server'
import { getServerNow } from '@/src/lib/arxiv'

// Force Node.js runtime
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/clock
 * Compare local time vs arXiv server time
 */
export async function GET() {
  try {
    const localNow = new Date()
    const localNowISO = localNow.toISOString()

    console.log('[Clock] Getting server time...')
    const serverInfo = await getServerNow()

    const drift = serverInfo.serverNow.getTime() - localNow.getTime()
    const driftMinutes = (drift / 60000).toFixed(2)

    console.log(`[Clock] Local: ${localNowISO}`)
    console.log(`[Clock] Server: ${serverInfo.serverNow.toISOString()}`)
    console.log(`[Clock] Drift: ${driftMinutes} minutes`)

    return NextResponse.json({
      localNowISO,
      ...serverInfo,
      serverNowISO: serverInfo.serverNow.toISOString(),
      driftMs: drift,
      driftMinutes: parseFloat(driftMinutes),
    })
  } catch (error) {
    console.error('[Clock] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to get clock info',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
