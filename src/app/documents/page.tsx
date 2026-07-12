'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { UploadCloud, Search, Inbox, Loader2 } from 'lucide-react'
import { DocumentCard } from '@/components/document-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDocuments } from '@/hooks/use-documents'

type Filter = 'all' | 'ready' | 'processing' | 'error'

export default function DocumentsPage() {
  const { documents, loading, error, deleteDocument, reprocessDocument } = useDocuments()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(() => {
    return documents.filter((d) => {
      const matchesQuery = d.fileName.toLowerCase().includes(query.toLowerCase())
      const matchesFilter =
        filter === 'all'
          ? true
          : filter === 'processing'
            ? d.status === 'processing' || d.status === 'pending'
            : d.status === filter
      return matchesQuery && matchesFilter
    })
  }, [documents, query, filter])

  const counts = useMemo(
    () => ({
      all: documents.length,
      ready: documents.filter((d) => d.status === 'ready').length,
      processing: documents.filter(
        (d) => d.status === 'processing' || d.status === 'pending',
      ).length,
      error: documents.filter((d) => d.status === 'error').length,
    }),
    [documents],
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-4xl font-bold">
            Document <span className="text-cosmic">library</span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            Manage your corpus. {counts.ready} of {counts.all} documents indexed and ready.
          </p>
        </div>
        <Button asChild className="glow-sm">
          <Link href="/upload">
            <UploadCloud className="h-4 w-4" />
            Upload more
          </Link>
        </Button>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by file name…"
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 rounded-lg glass p-1">
          {(['all', 'ready', 'processing', 'error'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f} ({counts[f]})
            </button>
          ))}
        </div>
      </div>

      {/* Content states */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading documents…
        </div>
      ) : error ? (
        <div className="glass rounded-2xl p-12 text-center text-red-300">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="glass flex flex-col items-center rounded-2xl p-16 text-center">
          <Inbox className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="font-display text-xl font-semibold">
            {documents.length === 0 ? 'No documents yet' : 'No matches'}
          </h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {documents.length === 0
              ? 'Upload your first UFO PDF or image to start building your knowledge base.'
              : 'Try a different search term or filter.'}
          </p>
          {documents.length === 0 && (
            <Button asChild className="mt-6 glow-sm">
              <Link href="/upload">
                <UploadCloud className="h-4 w-4" />
                Upload documents
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onDelete={deleteDocument}
              onReprocess={reprocessDocument}
            />
          ))}
        </div>
      )}
    </div>
  )
}
