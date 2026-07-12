'use client'

import { useEffect, useState } from 'react'
import {
  Database,
  Sparkles,
  Cpu,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Health {
  ok: boolean
  dbConnected: boolean
  llmConfigured: boolean
  chatModel: string
  embeddingModel: string
  missingEnv: string[]
}

function StatusRow({
  icon: Icon,
  label,
  ok,
  detail,
}: {
  icon: any
  label: string
  ok: boolean
  detail: string
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-primary" />
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
      </div>
      {ok ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
      ) : (
        <XCircle className="h-5 w-5 text-red-400" />
      )}
    </div>
  )
}

export default function SettingsPage() {
  const [health, setHealth] = useState<Health | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/health', { cache: 'no-store' })
      setHealth(await res.json())
    } catch {
      setHealth(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold">
            <span className="text-cosmic">Settings</span> &amp; status
          </h1>
          <p className="mt-2 text-muted-foreground">
            System configuration and a live health check of your environment.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {loading && !health ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Checking system…
        </div>
      ) : health ? (
        <div className="space-y-6">
          {/* Overall banner */}
          <div
            className={`glass rounded-2xl p-5 ${
              health.ok ? 'border-emerald-500/30' : 'border-amber-500/30'
            }`}
          >
            <div className="flex items-center gap-3">
              {health.ok ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              ) : (
                <XCircle className="h-6 w-6 text-amber-400" />
              )}
              <div>
                <p className="font-semibold">
                  {health.ok ? 'All systems operational' : 'Configuration needs attention'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {health.ok
                    ? 'Uforia is fully configured and ready to use.'
                    : 'Some configuration is missing — see details below.'}
                </p>
              </div>
            </div>
          </div>

          {/* Status rows */}
          <div className="glass space-y-3 rounded-2xl p-5">
            <StatusRow
              icon={Database}
              label="Database (PostgreSQL)"
              ok={health.dbConnected}
              detail={
                health.dbConnected
                  ? 'Connected and reachable.'
                  : 'Not reachable — check DATABASE_URL.'
              }
            />
            <StatusRow
              icon={Sparkles}
              label="Answer generation (LLM)"
              ok={health.llmConfigured}
              detail={
                health.llmConfigured
                  ? `Using ${health.chatModel}.`
                  : 'No ANTHROPIC_API_KEY — falling back to extractive answers.'
              }
            />
            <StatusRow
              icon={Cpu}
              label="Embeddings (local)"
              ok
              detail={`${health.embeddingModel} runs on-device — no API key needed.`}
            />
          </div>

          {/* Missing env */}
          {health.missingEnv.length > 0 && (
            <div className="glass rounded-2xl p-5">
              <h3 className="mb-2 font-semibold text-amber-300">Missing environment variables</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {health.missingEnv.map((v) => (
                  <li key={v} className="font-mono text-xs">
                    • {v}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                Add these to your <code className="font-mono">.env</code> file. See{' '}
                <code className="font-mono">.env.example</code> for the full list.
              </p>
            </div>
          )}

          {/* How it works */}
          <div className="glass rounded-2xl p-5">
            <h3 className="mb-3 font-semibold">How Uforia is configured</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">Storage:</strong> uploaded files are stored
                in object storage (S3-compatible).
              </li>
              <li>
                <strong className="text-foreground">Embeddings:</strong> generated locally with
                Transformers.js — fully portable, no external embedding service.
              </li>
              <li>
                <strong className="text-foreground">Retrieval:</strong> cosine similarity over
                stored vectors, so it works on any standard PostgreSQL.
              </li>
              <li>
                <strong className="text-foreground">Answers:</strong> generated by the
                configured chat model with inline source citations.
              </li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 text-center text-red-300">
          Could not load system status.
        </div>
      )}
    </div>
  )
}
