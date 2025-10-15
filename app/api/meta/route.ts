import { NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

/**
 * GET /api/meta
 * Get metadata about papers (last fetch time, count, etc.)
 */
export async function GET() {
  try {
    const metaPath = resolve(process.cwd(), 'data/meta.json')

    // Default meta if file doesn't exist
    const defaultMeta = {
      lastFetchAt: null,
      lastRepairAt: null,
      paperCount: 0,
      version: '2.0.0',
    }

    if (!existsSync(metaPath)) {
      return NextResponse.json(defaultMeta)
    }

    const meta = JSON.parse(readFileSync(metaPath, 'utf-8'))

    return NextResponse.json(meta)
  } catch (error) {
    console.error('[Meta] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to load metadata',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
