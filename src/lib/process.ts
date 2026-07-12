/**
 * Document processing pipeline.
 *
 * Given an uploaded document record, this module:
 *   1. Downloads the file from S3.
 *   2. Extracts text (PDF text extraction or image OCR).
 *   3. Splits the text into overlapping chunks.
 *   4. Generates a local embedding for each chunk.
 *   5. Stores the chunks + embeddings and marks the document "ready".
 *
 * Errors are captured on the document record so the UI can surface them.
 */

import { prisma } from './db'
import { getFileBuffer } from './storage'
import { extractPdfText } from './pdf'
import { extractImageText } from './ocr'
import { chunkText, generateEmbedding } from './embeddings'

/** Returns true if the content type is a supported image format. */
export function isImage(contentType: string): boolean {
  return contentType.startsWith('image/')
}

/** Returns true if the content type is a PDF. */
export function isPdf(contentType: string): boolean {
  return contentType === 'application/pdf'
}

/** Whether Uforia can extract text from this file type. */
export function isSupported(contentType: string): boolean {
  return isPdf(contentType) || isImage(contentType)
}

/**
 * Runs the full extraction + embedding pipeline for a document.
 * Updates the document status as it progresses. Safe to call in the
 * background (errors are stored, never thrown to the caller's request).
 */
export async function processDocument(documentId: string): Promise<void> {
  const doc = await prisma.document.findUnique({ where: { id: documentId } })
  if (!doc) return

  try {
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'processing', errorMessage: null },
    })

    // 1. Download the original file from object storage.
    const buffer = await getFileBuffer(doc.cloudStoragePath)

    // 2. Extract text based on file type.
    let text = ''
    let pageCount: number | null = null

    if (isPdf(doc.contentType)) {
      const result = await extractPdfText(buffer)
      text = result.text
      pageCount = result.pageCount
    } else if (isImage(doc.contentType)) {
      text = await extractImageText(buffer)
    } else {
      throw new Error(`Unsupported content type: ${doc.contentType}`)
    }

    if (!text || text.trim().length < 5) {
      throw new Error(
        'No readable text could be extracted from this file. ' +
          'For scanned PDFs, try uploading the pages as images so OCR can run.',
      )
    }

    // 3. Chunk the extracted text.
    const chunks = chunkText(text)

    // 4. Replace any existing chunks, then embed and store the new ones.
    await prisma.documentChunk.deleteMany({ where: { documentId } })

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await generateEmbedding(chunks[i])
      await prisma.documentChunk.create({
        data: {
          documentId,
          chunkText: chunks[i],
          chunkIndex: i,
          embedding,
        },
      })
    }

    // 5. Mark ready.
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'ready',
        extractedText: text.slice(0, 100_000),
        pageCount: pageCount ?? undefined,
        errorMessage: null,
      },
    })
  } catch (err: any) {
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'error',
        errorMessage: err?.message?.slice(0, 1000) ?? 'Unknown processing error',
      },
    })
  }
}
