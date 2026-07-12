/**
 * Optical Character Recognition (OCR) for image documents using tesseract.js.
 *
 * Runs server-side only. tesseract.js downloads its WASM core and English
 * language data on first use and caches them, so the first image is slower.
 */

/**
 * Extracts text from an image buffer (PNG, JPEG, WebP, etc.) via OCR.
 * Returns the recognized text (may be empty for images without text).
 */
export async function extractImageText(buffer: Buffer): Promise<string> {
  const Tesseract = await import('tesseract.js')

  const worker = await Tesseract.createWorker('eng')
  try {
    const {
      data: { text },
    } = await worker.recognize(buffer)
    return (text ?? '').trim()
  } finally {
    await worker.terminate().catch(() => undefined)
  }
}
