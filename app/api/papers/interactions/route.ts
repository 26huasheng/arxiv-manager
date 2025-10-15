import { NextRequest, NextResponse } from 'next/server'
import { JsonStore } from '@/src/lib/store'

export async function GET(request: NextRequest) {
  try {
    const interactions = await JsonStore.getInteractions()

    return NextResponse.json({
      interactions,
      total: Object.keys(interactions).length,
    })
  } catch (error) {
    console.error('Error fetching interactions:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch interactions',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
