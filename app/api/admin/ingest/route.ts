import { NextResponse } from 'next/server'
import { ingestArxivPapers } from '@/src/lib/arxiv-ingest'

export async function POST() {
  try {
    console.log('Starting arXiv ingestion via API...')

    const result = await ingestArxivPapers('cat:cs.*', 100)

    return NextResponse.json({
      success: true,
      message: `Added ${result.added} new papers`,
      data: result,
    })
  } catch (error) {
    console.error('Error in ingest API:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
