import { NextRequest, NextResponse } from 'next/server'
import { validateUrl, regenerateUrls } from '@/src/lib/arxiv'
import fs from 'node:fs'
import path from 'node:path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/repair
 * Repair invalid URLs in papers.json
 */
export async function POST(req: NextRequest) {
  try {
    const papersPath = path.resolve('data/papers.json')

    if (!fs.existsSync(papersPath)) {
      return NextResponse.json({ error: 'papers.json not found' }, { status: 404 })
    }

    const papers = JSON.parse(fs.readFileSync(papersPath, 'utf-8'))

    let repairedCount = 0
    const repaired = papers.map((paper: any) => {
      // Check if URLs are invalid
      const sourceValid = validateUrl(paper.sourceUrl || '')
      const pdfValid = validateUrl(paper.pdfUrl || '')

      if (!sourceValid || !pdfValid) {
        // Regenerate URLs from paper ID
        const { sourceUrl, pdfUrl } = regenerateUrls(paper)
        repairedCount++

        return {
          ...paper,
          sourceUrl,
          pdfUrl,
        }
      }

      return paper
    })

    // Write back to file
    fs.writeFileSync(papersPath, JSON.stringify(repaired, null, 2), 'utf-8')

    return NextResponse.json({
      ok: true,
      repairedCount,
      totalCount: papers.length,
      message: `Repaired ${repairedCount} papers`,
    })
  } catch (error) {
    console.error('[Repair] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
