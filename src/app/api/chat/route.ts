import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { retrieveRelevantChunks } from '@/lib/retrieval'
import { generateAnswer, extractiveAnswer, type ChatTurn } from '@/lib/llm'
import { hasLlm } from '@/lib/env'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * POST /api/chat
 * Body: { question: string, sessionId?: string, history?: ChatTurn[] }
 *
 * Runs the RAG flow: retrieve relevant chunks → generate a cited answer →
 * persist the user + assistant messages → return the answer with sources.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const question: string = (body?.question ?? '').toString().trim()
    const sessionId: string = (body?.sessionId ?? 'default').toString()
    const history: ChatTurn[] = Array.isArray(body?.history) ? body.history : []

    if (!question) {
      return NextResponse.json({ error: 'A question is required' }, { status: 400 })
    }

    // 1. Retrieve the most relevant chunks across the corpus.
    const chunks = await retrieveRelevantChunks(question, 6)

    // 2. Generate the answer (LLM if configured, otherwise extractive).
    let answer: string
    if (hasLlm()) {
      try {
        answer = await generateAnswer(question, chunks, history)
      } catch {
        // Gracefully degrade if the LLM call fails.
        answer = extractiveAnswer(chunks)
      }
    } else {
      answer = extractiveAnswer(chunks)
    }

    // 3. Build a de-duplicated source list for citations.
    const sources = chunks.map((c, i) => ({
      ref: i + 1,
      documentId: c.documentId,
      fileName: c.fileName,
      chunkIndex: c.chunkIndex,
      score: Number(c.score.toFixed(4)),
      preview: c.chunkText.slice(0, 240),
    }))

    // 4. Persist the conversation (best-effort).
    try {
      await prisma.chatMessage.create({
        data: { sessionId, role: 'user', content: question },
      })
      await prisma.chatMessage.create({
        data: {
          sessionId,
          role: 'assistant',
          content: answer,
          sources: JSON.stringify(sources),
        },
      })
    } catch {
      // Persistence is non-critical for returning the answer.
    }

    return NextResponse.json({ answer, sources })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Failed to generate an answer' },
      { status: 500 },
    )
  }
}
