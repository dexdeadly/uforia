/**
 * Text embeddings and vector-similarity utilities.
 *
 * Embeddings are generated entirely locally using Transformers.js
 * (@xenova/transformers) with the `all-MiniLM-L6-v2` model. This keeps Uforia
 * fully portable — there is NO dependency on an external embeddings API, so the
 * app works the same on a laptop, in Docker, or on any cloud host.
 *
 * The model weights (~90 MB) are downloaded once on first use and cached on
 * disk (see TRANSFORMERS_CACHE in .env.example), so the first request after a
 * cold start is slower than subsequent ones.
 */

import { EMBEDDING_MODEL } from './env'

// `any` is used for the pipeline type because @xenova/transformers ships its
// own complex generic types that are not needed here.
let extractorPromise: Promise<any> | null = null

/**
 * Lazily loads (and caches) the feature-extraction pipeline. The pipeline is a
 * singleton: the model is only loaded into memory once per process.
 */
async function getExtractor(): Promise<any> {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline, env } = await import('@xenova/transformers')
      // Allow remote model download (default) but keep the local cache enabled.
      env.allowLocalModels = true
      return pipeline('feature-extraction', EMBEDDING_MODEL)
    })()
  }
  return extractorPromise
}

/** Dimensionality of the embedding vectors produced by the default model. */
export const EMBEDDING_DIMENSIONS = 384

/**
 * Generates a normalized embedding vector for a single piece of text.
 * Mean pooling + L2 normalization makes the vectors directly comparable with
 * cosine similarity (which then reduces to a dot product).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const input = (text ?? '').slice(0, 8000).trim()
  if (!input) return []

  const extractor = await getExtractor()
  const output = await extractor(input, { pooling: 'mean', normalize: true })
  return Array.from(output.data as Float32Array)
}

/**
 * Generates embeddings for many texts. Processed sequentially to keep memory
 * usage predictable for large documents.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const results: number[][] = []
  for (const text of texts) {
    results.push(await generateEmbedding(text))
  }
  return results
}

/**
 * Cosine similarity between two vectors. Returns a value in [-1, 1]; for the
 * normalized vectors produced above this is effectively the dot product.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a?.length || !b?.length || a.length !== b.length) return 0
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += (a[i] ?? 0) * (b[i] ?? 0)
    normA += (a[i] ?? 0) * (a[i] ?? 0)
    normB += (b[i] ?? 0) * (b[i] ?? 0)
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

/**
 * Splits cleaned text into overlapping chunks suitable for embedding and
 * retrieval. Overlap preserves context across chunk boundaries.
 */
export function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  const cleaned = (text ?? '').replace(/\s+/g, ' ').trim()
  if (!cleaned) return []

  const chunks: string[] = []
  let start = 0
  while (start < cleaned.length) {
    const end = Math.min(start + chunkSize, cleaned.length)
    const chunk = cleaned.slice(start, end).trim()
    if (chunk.length > 50) chunks.push(chunk)
    if (end === cleaned.length) break
    start += chunkSize - overlap
  }
  return chunks
}
