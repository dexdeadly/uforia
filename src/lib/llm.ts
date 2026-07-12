/**
 * LLM integration for answer generation.
 *
 * Uses the Claude API (official Anthropic SDK) with Claude Opus 4.8. If no
 * API key is configured the caller can fall back to a simple extractive
 * answer so the app still works for evaluation without credentials.
 */

import Anthropic from '@anthropic-ai/sdk'
import { CHAT_MODEL } from './env'

let client: Anthropic | null = null

/** Lazily creates the Anthropic client (reads ANTHROPIC_API_KEY from env). */
function getClient(): Anthropic {
  if (!client) client = new Anthropic()
  return client
}

export interface RetrievedChunk {
  documentId: string
  fileName: string
  chunkIndex: number
  chunkText: string
  score: number
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Builds the context block injected into the system prompt from retrieved
 * chunks. Each chunk is numbered so the model can cite sources as [1], [2]...
 */
function buildContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map(
      (c, i) =>
        `[${i + 1}] (source: "${c.fileName}", chunk ${c.chunkIndex})\n${c.chunkText}`,
    )
    .join('\n\n')
}

const SYSTEM_PROMPT = `You are Uforia, an expert research assistant specialised in UFO/UAP documents.
Answer the user's question using ONLY the provided context excerpts.

Rules:
- Cite the sources you used inline with bracket numbers, e.g. [1], [2].
- If the context does not contain the answer, say so honestly and do not invent facts.
- Distinguish what a document states from what it attributes or leaves open.
- Be concise, factual and well-structured. Use markdown when helpful.`

/**
 * Generates an answer grounded in the retrieved chunks using Claude.
 * Throws if the API key is missing or the request fails.
 */
export async function generateAnswer(
  question: string,
  chunks: RetrievedChunk[],
  history: ChatTurn[] = [],
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')

  const context = chunks.length
    ? buildContext(chunks)
    : '(No relevant excerpts were found in the uploaded documents.)'

  const messages: Anthropic.MessageParam[] = [
    // Keep only the most recent turns to bound the prompt size.
    ...history.slice(-6),
    {
      role: 'user',
      content: `Context excerpts:\n\n${context}\n\n---\nQuestion: ${question}`,
    },
  ]

  const response = await getClient().messages.create({
    model: CHAT_MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system: SYSTEM_PROMPT,
    messages,
  })

  if (response.stop_reason === 'refusal') {
    throw new Error('The model declined to answer this question.')
  }

  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim()
}

/**
 * Extractive fallback used when no LLM key is configured: returns the top
 * retrieved chunks verbatim so the app remains usable without credentials.
 */
export function extractiveAnswer(chunks: RetrievedChunk[]): string {
  if (!chunks.length) {
    return "I couldn't find anything relevant in your uploaded documents for that question."
  }
  const top = chunks.slice(0, 3)
  return (
    'No LLM key is configured, so here are the most relevant passages from your documents:\n\n' +
    top.map((c, i) => `**[${i + 1}] ${c.fileName}**\n\n${c.chunkText}`).join('\n\n')
  )
}
