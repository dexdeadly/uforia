'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Sparkles, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UfoMark } from '@/components/logo'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Source {
  ref: number
  documentId: string
  fileName: string
  chunkIndex: number
  score: number
  preview: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
}

const SUGGESTIONS = [
  'Summarize the key findings across my documents',
  'What dates and locations are mentioned?',
  'List any named witnesses or officials',
  'What evidence is described?',
]

/** Full chat experience: message list, citations, suggestions and composer. */
export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const sessionId = useRef<string>(
    `s_${Math.random().toString(36).slice(2)}_${Date.now()}`,
  )
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function ask(question: string) {
    const q = question.trim()
    if (!q || loading) return

    const history = messages.map((m) => ({ role: m.role, content: m.content }))
    setMessages((m) => [...m, { role: 'user', content: q }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, sessionId: sessionId.current, history }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Request failed')

      setMessages((m) => [
        ...m,
        { role: 'assistant', content: data.answer, sources: data.sources ?? [] },
      ])
    } catch (err: any) {
      toast.error(err?.message ?? 'Something went wrong')
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: `⚠️ ${err?.message ?? 'Something went wrong. Please try again.'}`,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-13rem)] flex-col">
      {/* Messages */}
      <div className="flex-1 space-y-6 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="animate-float mb-4">
              <UfoMark className="h-16 w-16 drop-shadow-[0_0_20px_rgba(167,139,250,0.6)]" />
            </div>
            <h2 className="font-display text-2xl font-bold">
              Ask anything about your documents
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Uforia searches your uploaded UFO files and answers with citations
              back to the source passages.
            </p>
            <div className="mt-6 grid w-full max-w-xl gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="glass rounded-lg px-4 py-3 text-left text-sm transition-colors hover:border-primary/50 hover:bg-white/5"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={cn('flex gap-3', m.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            {m.role === 'assistant' && (
              <div className="mt-1 shrink-0 rounded-full bg-primary/15 p-2">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
            )}
            <div
              className={cn(
                'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                m.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'glass',
              )}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>

              {/* Citations */}
              {m.sources && m.sources.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3">
                  <p className="text-xs font-semibold text-muted-foreground">Sources</p>
                  {m.sources.map((s) => (
                    <details key={s.ref} className="group">
                      <summary className="flex cursor-pointer list-none items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                        <FileText className="h-3.5 w-3.5 text-primary" />
                        <span className="font-medium">[{s.ref}] {s.fileName}</span>
                        <span className="opacity-60">
                          · chunk {s.chunkIndex} · {(s.score * 100).toFixed(0)}%
                        </span>
                      </summary>
                      <p className="mt-1.5 rounded-md bg-white/5 px-3 py-2 text-xs text-muted-foreground">
                        {s.preview}…
                      </p>
                    </details>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="mt-1 shrink-0 rounded-full bg-primary/15 p-2">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="glass flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching your documents…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          ask(input)
        }}
        className="glass mt-4 flex items-end gap-2 rounded-2xl p-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              ask(input)
            }
          }}
          rows={1}
          placeholder="Ask a question about your UFO documents…"
          className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
        />
        <Button type="submit" size="icon" disabled={loading || !input.trim()} className="glow-sm">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  )
}
