/**
 * Semantic retrieval over stored document chunks.
 *
 * Because the target Postgres database may not have the pgvector extension
 * installed, embeddings are stored as `Float[]` and similarity is computed in
 * application code. This keeps Uforia portable to any standard Postgres.
 *
 * For large corpora on a pgvector-enabled database you can switch to an
 * in-database `<=>` cosine query — see the README "Scaling" section.
 */

import { prisma } from './db'
import { generateEmbedding, cosineSimilarity } from './embeddings'
import type { RetrievedChunk } from './llm'

/**
 * Embeds the query and returns the top-k most similar chunks across all
 * documents that are in the "ready" state.
 */
export async function retrieveRelevantChunks(
  query: string,
  topK = 6,
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await generateEmbedding(query)
  if (!queryEmbedding.length) return []

  // Pull candidate chunks together with their parent document metadata.
  const chunks = await prisma.documentChunk.findMany({
    where: { document: { status: 'ready' } },
    include: { document: { select: { fileName: true } } },
  })

  const scored = chunks
    .map((c) => ({
      documentId: c.documentId,
      fileName: c.document.fileName,
      chunkIndex: c.chunkIndex,
      chunkText: c.chunkText,
      score: cosineSimilarity(queryEmbedding, c.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)

  // Drop very weak matches to reduce noise in the LLM context.
  return scored.filter((c) => c.score > 0.1)
}
