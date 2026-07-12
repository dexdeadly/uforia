'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Sparkles, FileText, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UfoMark } from '@/components/logo'
import { cn, DocumentDTO } from '@/lib/utils'
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
  'Summarize key findings',
  'List dates and locations',
  'Named witnesses',
  'Evidence described',
]

type Tab = 'CHAT' | 'ANALYSIS' | 'SUMMARY'

/** Full-screen chat interface with sidebar */
export function ChatInterface() {
  const [documents, setDocuments] = useState<DocumentDTO[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('CHAT')
  const sessionId = useRef<string>(
    `s_${Math.random().toString(36).slice(2)}_${Date.now()}`,
  )
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load documents
  useEffect(() => {
    fetchDocuments()
  }, [])

  async function fetchDocuments() {
    try {
      const res = await fetch('/api/documents')
      if (!res.ok) throw new Error('Failed to fetch documents')
      const data = await res.json()
      setDocuments(data.filter((d: DocumentDTO) => d.status === 'ready'))
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not load documents')
    }
  }

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
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left Sidebar - Files */}
      <aside className="w-80 border-r border-border bg-card/30 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-mono text-xs font-semibold uppercase tracking-widest text-primary">
            // Files
          </h3>
          <span className="font-mono text-xs text-muted-foreground">
            {documents.length}
          </span>
        </div>
        
        <div className="space-y-2">
          {documents.length === 0 && (
            <div className="rounded border border-dashed border-border p-6 text-center">
              <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="font-mono text-xs text-muted-foreground">
                NO FILES DETECTED
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground/70">
                Upload to begin
              </p>
            </div>
          )}
          
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="group relative rounded-lg border border-primary/20 bg-card/50 p-3 transition-all hover:border-primary/40 hover:bg-card/70"
            >
              <div className="flex items-start gap-2">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs font-medium text-foreground">
                    {doc.fileName}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    {doc.chunkCount} chunks indexed
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col">
        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border bg-card/20 px-6">
          {(['CHAT', 'ANALYSIS', 'SUMMARY'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'relative px-4 py-3 font-mono text-xs font-semibold uppercase tracking-wider transition-colors',
                activeTab === tab
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>

        {/* Chat Content */}
        <div className="flex flex-1 flex-col overflow-hidden p-6">
          <div className="flex-1 space-y-6 overflow-y-auto pr-1">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="animate-float mb-6">
                  <UfoMark className="h-20 w-20 drop-shadow-[0_0_24px_rgba(16,185,129,0.6)]" />
                </div>
                <h2 className="font-mono text-xl font-bold uppercase tracking-wider text-primary">
                  Signal Awaiting
                </h2>
                <p className="mt-3 max-w-md font-mono text-sm text-muted-foreground">
                  Upload documents to the left, then transmit a query.
                </p>
                <p className="mt-1 max-w-md font-mono text-sm text-muted-foreground">
                  Query → alien intelligence
                </p>
                
                {documents.length > 0 && (
                  <div className="mt-8 grid w-full max-w-xl gap-2 sm:grid-cols-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => ask(s)}
                        className="rounded-md border border-primary/20 bg-card/30 px-4 py-3 text-left font-mono text-xs text-foreground transition-all hover:border-primary/50 hover:bg-card/50 hover:glow-sm"
                      >
                        → {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={cn('flex gap-3', m.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {m.role === 'assistant' && (
                  <div className="mt-1 shrink-0 rounded-md bg-primary/15 p-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-4 py-3 font-mono text-sm leading-relaxed',
                    m.role === 'user'
                      ? 'bg-primary/90 text-primary-foreground'
                      : 'border border-primary/20 bg-card/70',
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>

                  {/* Citations */}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-3 space-y-1.5 border-t border-primary/20 pt-3">
                      <p className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
                        Sources
                      </p>
                      {m.sources.map((s) => (
                        <details key={s.ref} className="group">
                          <summary className="flex cursor-pointer list-none items-center gap-2 font-mono text-xs text-muted-foreground hover:text-foreground">
                            <FileText className="h-3.5 w-3.5 text-primary" />
                            <span className="font-medium">[{s.ref}] {s.fileName}</span>
                            <span className="opacity-60">
                              · chunk {s.chunkIndex} · {(s.score * 100).toFixed(0)}%
                            </span>
                          </summary>
                          <p className="mt-1.5 rounded border border-primary/10 bg-card/50 px-3 py-2 font-mono text-xs text-muted-foreground">
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
                <div className="mt-1 shrink-0 rounded-md bg-primary/15 p-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-card/70 px-4 py-3 font-mono text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching transmission…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              ask(input)
            }}
            className="mt-4 flex items-center gap-2 rounded-lg border border-primary/30 bg-card/50 p-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  ask(input)
                }
              }}
              placeholder="Transmit query to alien intelligence..."
              className="flex-1 bg-transparent px-3 py-2 font-mono text-sm outline-none placeholder:text-muted-foreground/60"
            />
            <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <span className="hidden sm:inline">ENTER</span>
              <span className="hidden sm:inline">→</span>
              <span className="hidden sm:inline">TRANSMIT</span>
              <span className="mx-1">|</span>
              <span className="hidden sm:inline">SHIFT+ENTER</span>
              <span className="hidden sm:inline">→</span>
              <span className="hidden sm:inline">NEW LINE</span>
            </div>
            <Button 
              type="submit" 
              size="sm" 
              disabled={loading || !input.trim()} 
              className="glow-sm font-mono text-xs uppercase"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
