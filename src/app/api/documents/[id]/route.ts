import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { deleteFile } from '@/lib/storage'

export const dynamic = 'force-dynamic'

/**
 * GET /api/documents/[id]
 * Returns a single document including its current processing status. Used by
 * the client to poll while a document is being processed.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const doc = await prisma.document.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        fileName: true,
        contentType: true,
        fileSize: true,
        status: true,
        errorMessage: true,
        pageCount: true,
        uploadedAt: true,
        _count: { select: { chunks: true } },
      },
    })

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    return NextResponse.json({
      document: { ...doc, chunkCount: doc._count.chunks, _count: undefined },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Failed to load document' },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/documents/[id]
 * Removes the document, its chunks (cascade) and the underlying S3 object.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const doc = await prisma.document.findUnique({ where: { id: params.id } })
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Best-effort delete of the stored file; ignore storage errors so the DB
    // record is always cleaned up.
    await deleteFile(doc.cloudStoragePath).catch(() => undefined)
    await prisma.document.delete({ where: { id: params.id } })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Failed to delete document' },
      { status: 500 },
    )
  }
}
