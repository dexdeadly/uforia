'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { DocumentDTO } from '@/lib/utils'
import { toast } from 'sonner'

/**
 * Loads documents from the API and auto-polls while any are still being
 * processed, so the library reflects status changes in near real-time.
 */
export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch('/api/documents', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Failed to load documents')
      setDocuments(data.documents ?? [])
      setError(null)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load.
  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // Poll while any document is pending/processing.
  useEffect(() => {
    const inFlight = documents.some(
      (d) => d.status === 'pending' || d.status === 'processing',
    )
    if (inFlight) {
      timer.current = setTimeout(fetchDocuments, 2500)
    }
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [documents, fetchDocuments])

  const deleteDocument = useCallback(
    async (id: string) => {
      // Optimistic removal.
      setDocuments((d) => d.filter((doc) => doc.id !== id))
      try {
        const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Delete failed')
        toast.success('Document deleted')
      } catch {
        toast.error('Could not delete document')
        fetchDocuments()
      }
    },
    [fetchDocuments],
  )

  const reprocessDocument = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/documents/${id}/reprocess`, { method: 'POST' })
        if (!res.ok) throw new Error('Reprocess failed')
        toast.success('Reprocessing started')
        fetchDocuments()
      } catch {
        toast.error('Could not reprocess document')
      }
    },
    [fetchDocuments],
  )

  return { documents, loading, error, fetchDocuments, deleteDocument, reprocessDocument }
}
