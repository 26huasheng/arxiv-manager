import { NextResponse } from 'next/server'
import { getUA } from '@/src/lib/ua'

// Force Node.js runtime
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/show-ua
 * Debug endpoint to show current User-Agent configuration
 */
export async function GET() {
  try {
    const ua = getUA()

    return NextResponse.json({
      ua,
      info: {
        hasEnvUA: !!process.env.ARXIV_UA,
        hasEnvEmail: !!process.env.ARXIV_CONTACT_EMAIL,
        usingDefault: !process.env.ARXIV_UA && !process.env.ARXIV_CONTACT_EMAIL,
      },
    })
  } catch (error) {
    console.error('[Show UA] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to get UA',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
