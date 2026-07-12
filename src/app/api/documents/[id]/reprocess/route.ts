import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { processDocument } from '@/lib/process'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/documents/[id]/reprocess
 * Retries text extraction + embedding for a document (e.g. after an error).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const doc = await prisma.document.findUnique({ where: { id: params.id } })
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    await prisma.document.update({
      where: { id: params.id },
      data: { status: 'pending', errorMessage: null },
    })

    void processDocument(params.id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Failed to reprocess document' },
      { status: 500 },
    )
  }
}
