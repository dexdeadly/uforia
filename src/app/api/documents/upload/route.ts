import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { uploadBuffer } from '@/lib/storage'
import { isSupported, processDocument } from '@/lib/process'

export const dynamic = 'force-dynamic'
// Allow time for larger uploads to stream in.
export const maxDuration = 300

const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500 MB

/**
 * POST /api/documents/upload
 * Accepts a multipart form upload, stores the file in S3, creates a document
 * record, and kicks off text extraction + embedding in the background.
 *
 * The client polls GET /api/documents/[id] for the processing status.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const contentType = file.type || 'application/octet-stream'
    if (!isSupported(contentType)) {
      return NextResponse.json(
        { error: `Unsupported file type "${contentType}". Upload a PDF or an image.` },
        { status: 415 },
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024} MB.` },
        { status: 413 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // 1. Store the original file in object storage.
    const { cloud_storage_path } = await uploadBuffer(file.name, contentType, buffer)

    // 2. Create the document record in "pending" state.
    const doc = await prisma.document.create({
      data: {
        fileName: file.name,
        contentType,
        fileSize: file.size,
        cloudStoragePath: cloud_storage_path,
        status: 'pending',
      },
    })

    // 3. Process asynchronously (fire-and-forget). Errors are recorded on the
    //    document record by processDocument itself.
    void processDocument(doc.id)

    return NextResponse.json({ document: doc }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Upload failed' },
      { status: 500 },
    )
  }
}
