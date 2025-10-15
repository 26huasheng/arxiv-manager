import { NextRequest, NextResponse } from 'next/server'
import { JsonStore } from '@/src/lib/store'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paperId = params.id
    const body = await request.json()
    const { liked, saved, rating, collections } = body

    console.log(`Updating interaction for paper: ${paperId}`, body)

    // Get current interactions
    const interactions = await JsonStore.getInteractions()
    const currentInteraction = interactions[paperId] || { paperId }

    // Update fields
    const updatedInteraction = {
      ...currentInteraction,
      paperId,
    }

    if (liked !== undefined) {
      updatedInteraction.liked = liked
    }
    if (saved !== undefined) {
      updatedInteraction.saved = saved
    }
    if (rating !== undefined) {
      updatedInteraction.rating = rating
    }
    if (collections !== undefined) {
      updatedInteraction.collections = collections
    }

    // Save interaction
    await JsonStore.updateInteraction(paperId, updatedInteraction)

    return NextResponse.json({
      success: true,
      interaction: updatedInteraction,
    })
  } catch (error) {
    console.error('Error updating interaction:', error)
    return NextResponse.json(
      {
        error: 'Failed to update interaction',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paperId = params.id
    const interactions = await JsonStore.getInteractions()
    const interaction = interactions[paperId] || null

    return NextResponse.json({
      interaction,
    })
  } catch (error) {
    console.error('Error fetching interaction:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch interaction',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
