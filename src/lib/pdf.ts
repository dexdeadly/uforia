/**
 * PDF text extraction using `pdf-parse` (v2).
 *
 * Runs server-side only. The package is listed in
 * `experimental.serverComponentsExternalPackages` so Next.js does not attempt
 * to bundle it.
 */

export interface PdfExtractResult {
  text: string
  pageCount: number
}

/**
 * Extracts plain text from a PDF buffer.
 * Returns the concatenated text and the number of pages.
 */
export async function extractPdfText(buffer: Buffer): Promise<PdfExtractResult> {
  // Dynamic import keeps the heavy dependency out of the edge/client bundle.
  const { PDFParse } = await import('pdf-parse')

  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  try {
    const result = await parser.getText()
    return {
      text: (result?.text ?? '').trim(),
      pageCount: result?.total ?? 0,
    }
  } finally {
    // Release the underlying pdf.js worker/resources.
    await parser.destroy().catch(() => undefined)
  }
}
