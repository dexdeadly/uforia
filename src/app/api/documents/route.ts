import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/documents
 * Returns all documents (newest first) with a chunk count, for the library.
 */
export async function GET() {
  try {
    const documents = await prisma.document.findMany({
      orderBy: { uploadedAt: 'desc' },
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

    return NextResponse.json({
      documents: documents.map((d) => ({
        ...d,
        chunkCount: d._count.chunks,
        _count: undefined,
      })),
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Failed to load documents' },
      { status: 500 },
    )
  }
}
