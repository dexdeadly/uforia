/**
 * Centralised environment variable access and validation.
 *
 * Every server-side feature reads configuration through this module so that a
 * missing or malformed variable fails fast with a clear, actionable message
 * instead of producing a confusing runtime error deep inside a request.
 */

type EnvKey =
  | 'DATABASE_URL'
  | 'ANTHROPIC_API_KEY'
  | 'UPLOADS_DIR'

/** Variables that must be present for the app to function at all. */
const REQUIRED: EnvKey[] = ['DATABASE_URL']

/**
 * Returns the value of an environment variable or throws a descriptive error.
 */
export function requireEnv(key: EnvKey): string {
  const value = process.env[key]
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable "${key}". ` +
        `Add it to your .env file — see .env.example for the full list.`,
    )
  }
  return value
}

/** Returns an optional environment variable with a fallback. */
export function optionalEnv(key: string, fallback = ''): string {
  return process.env[key]?.trim() || fallback
}

/**
 * Validates that all required variables are present. Returns the list of any
 * that are missing so callers (e.g. the settings page or a health check) can
 * surface configuration problems to the user.
 */
export function getMissingEnv(): string[] {
  return REQUIRED.filter((key) => !process.env[key] || process.env[key]!.trim() === '')
}

/** The chat model used for answer generation (configurable via env). */
export const CHAT_MODEL = optionalEnv('CHAT_MODEL', 'claude-opus-4-8')

/** The local embedding model run via Transformers.js. */
export const EMBEDDING_MODEL = optionalEnv('EMBEDDING_MODEL', 'Xenova/all-MiniLM-L6-v2')

/** Whether an LLM key is configured (answers fall back to extractive mode if not). */
export const hasLlm = (): boolean => !!process.env.ANTHROPIC_API_KEY
