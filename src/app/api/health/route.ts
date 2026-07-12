import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getMissingEnv, hasLlm, CHAT_MODEL, EMBEDDING_MODEL } from '@/lib/env'

export const dynamic = 'force-dynamic'

/**
 * GET /api/health
 * Reports configuration status used by the Settings page:
 * - which required env vars are missing
 * - whether the database is reachable
 * - whether an LLM key is configured
 */
export async function GET() {
  const missingEnv = getMissingEnv()

  let dbConnected = false
  try {
    await prisma.$queryRaw`SELECT 1`
    dbConnected = true
  } catch {
    dbConnected = false
  }

  return NextResponse.json({
    ok: missingEnv.length === 0 && dbConnected,
    dbConnected,
    llmConfigured: hasLlm(),
    chatModel: CHAT_MODEL,
    embeddingModel: EMBEDDING_MODEL,
    missingEnv,
  })
}
