import { NextRequest, NextResponse } from 'next/server'
import { JsonStore } from '@/src/lib/store'

// POST - Add paper to collection
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const collectionId = params.id
    const body = await request.json()
    const { paperId } = body

    if (!paperId) {
      return NextResponse.json(
        { error: 'Paper ID is required' },
        { status: 400 }
      )
    }

    await JsonStore.addPaperToCollection(collectionId, paperId)

    console.log(`Added paper ${paperId} to collection ${collectionId}`)

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Error adding paper to collection:', error)
    return NextResponse.json(
      {
        error: 'Failed to add paper to collection',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// DELETE - Remove paper from collection
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const collectionId = params.id
    const { searchParams } = new URL(request.url)
    const paperId = searchParams.get('paperId')

    if (!paperId) {
      return NextResponse.json(
        { error: 'Paper ID is required' },
        { status: 400 }
      )
    }

    await JsonStore.removePaperFromCollection(collectionId, paperId)

    console.log(`Removed paper ${paperId} from collection ${collectionId}`)

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Error removing paper from collection:', error)
    return NextResponse.json(
      {
        error: 'Failed to remove paper from collection',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
