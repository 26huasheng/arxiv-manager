import { NextRequest, NextResponse } from 'next/server'
import { JsonStore } from '@/src/lib/store'
import { Collection } from '@/src/types/paper'

// GET - List all collections
export async function GET(request: NextRequest) {
  try {
    const collections = await JsonStore.getCollections()

    // Sort by updatedAt descending
    collections.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )

    return NextResponse.json({
      collections,
      total: collections.length,
    })
  } catch (error) {
    console.error('Error fetching collections:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch collections',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// POST - Create new collection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Collection name is required' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    const collection: Collection = {
      id: `col-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      description: description?.trim() || '',
      paperIds: [],
      createdAt: now,
      updatedAt: now,
    }

    await JsonStore.addCollection(collection)

    console.log(`Created collection: ${collection.id} (${collection.name})`)

    return NextResponse.json({
      success: true,
      collection,
    })
  } catch (error) {
    console.error('Error creating collection:', error)
    return NextResponse.json(
      {
        error: 'Failed to create collection',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// PUT - Update collection
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, description } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Collection ID is required' },
        { status: 400 }
      )
    }

    const updates: Partial<Collection> = {}
    if (name !== undefined) updates.name = name.trim()
    if (description !== undefined) updates.description = description.trim()

    await JsonStore.updateCollection(id, updates)

    console.log(`Updated collection: ${id}`)

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Error updating collection:', error)
    return NextResponse.json(
      {
        error: 'Failed to update collection',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// DELETE - Delete collection
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Collection ID is required' },
        { status: 400 }
      )
    }

    await JsonStore.deleteCollection(id)

    console.log(`Deleted collection: ${id}`)

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Error deleting collection:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete collection',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
