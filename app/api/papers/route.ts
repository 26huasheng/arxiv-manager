import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { Paper } from '@/src/types/paper'
import { parseRangeFromQuery, isPaperInRange } from '@/src/lib/timeRange'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id') || ''
    const query = searchParams.get('q') || ''
    const mode = searchParams.get('mode') || 'title' // title | author | fulltext

    // Load papers from JSON file
    const papersPath = resolve(process.cwd(), 'data/papers.json')
    const metaPath = resolve(process.cwd(), 'data/meta.json')

    if (!existsSync(papersPath)) {
      return NextResponse.json({
        papers: [],
        total: 0,
        meta: null,
      })
    }

    let papers: Paper[] = JSON.parse(readFileSync(papersPath, 'utf-8'))

    // Load meta
    let meta = null
    if (existsSync(metaPath)) {
      meta = JSON.parse(readFileSync(metaPath, 'utf-8'))
    }

    // If ID is provided, return single paper
    if (id) {
      const paper = papers.find(p => p.id === id)
      if (paper) {
        return NextResponse.json({
          papers: [paper],
          total: 1,
          meta,
        })
      } else {
        return NextResponse.json({
          papers: [],
          total: 0,
          meta,
        })
      }
    }

    // Time filtering (UI/UX Pack v3.1 - 仅支持 days ∈ {1,3,7})
    if (searchParams.has('days')) {
      const daysParam = parseInt(searchParams.get('days') || '7', 10)
      // Clamp to {1, 3, 7}
      const days = [1, 3, 7].includes(daysParam) ? daysParam : 7

      const now = new Date()
      const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      const range = { from, to: now }

      console.log(`[Papers API] Filtering by time: ${range.from.toISOString()} to ${range.to.toISOString()} (${days} days)`)
      const before = papers.length
      papers = papers.filter(paper => isPaperInRange(paper, range))
      console.log(`[Papers API] Filtered: ${before} → ${papers.length}`)
    }

    // Search filtering
    if (query) {
      const lowerQuery = query.toLowerCase()
      papers = papers.filter(paper => {
        switch (mode) {
          case 'author':
            return paper.authors.some(author =>
              author.toLowerCase().includes(lowerQuery)
            )
          case 'fulltext':
            return (
              paper.title.toLowerCase().includes(lowerQuery) ||
              paper.abstract.toLowerCase().includes(lowerQuery) ||
              paper.authors.some(author =>
                author.toLowerCase().includes(lowerQuery)
              )
            )
          case 'title':
          default:
            return paper.title.toLowerCase().includes(lowerQuery)
        }
      })
    }

    // Papers are already sorted by publishedAt desc in papers.json

    return NextResponse.json({
      papers,
      total: papers.length,
      meta,
    })
  } catch (error) {
    console.error('Error fetching papers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch papers' },
      { status: 500 }
    )
  }
}
