import { NextRequest, NextResponse } from 'next/server'
import { JsonStore } from '@/src/lib/store'

export async function POST(request: NextRequest) {
  try {
    const { paperIds } = await request.json()

    if (!paperIds || !Array.isArray(paperIds)) {
      return NextResponse.json(
        { error: 'paperIds array is required' },
        { status: 400 }
      )
    }

    // Load all scores
    const allScores = await JsonStore.getScores()

    // Filter scores for requested paper IDs
    const requestedScores: Record<string, any> = {}
    for (const paperId of paperIds) {
      if (allScores[paperId]) {
        requestedScores[paperId] = allScores[paperId]
      }
    }

    return NextResponse.json({
      scores: requestedScores,
      total: Object.keys(requestedScores).length,
    })
  } catch (error) {
    console.error('Error fetching scores:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch scores',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
