'use client'

import { FileText, Image as ImageIcon, Trash2, RotateCw, Layers } from 'lucide-react'
import { cn, formatBytes, type DocumentDTO } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { DocumentStatus } from '@/components/document-status'

interface Props {
  doc: DocumentDTO
  onDelete: (id: string) => void
  onReprocess: (id: string) => void
}

/** A card in the document library showing metadata, status and actions. */
export function DocumentCard({ doc, onDelete, onReprocess }: Props) {
  const isImage = doc.contentType.startsWith('image/')

  return (
    <div className="glass flex flex-col gap-3 rounded-xl p-5 transition-all hover:border-primary/40">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'rounded-lg p-2.5',
            isImage ? 'bg-accent/15 text-accent' : 'bg-primary/15 text-primary',
          )}
        >
          {isImage ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium" title={doc.fileName}>
            {doc.fileName}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatBytes(doc.fileSize)}
            {doc.pageCount ? ` · ${doc.pageCount} pages` : ''}
            {' · '}
            {new Date(doc.uploadedAt).toLocaleDateString()}
          </p>
        </div>
        <DocumentStatus status={doc.status} />
      </div>

      {doc.status === 'error' && doc.errorMessage && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {doc.errorMessage}
        </p>
      )}

      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Layers className="h-3.5 w-3.5" />
          {doc.chunkCount} chunk{doc.chunkCount === 1 ? '' : 's'} indexed
        </span>
        <div className="flex items-center gap-1">
          {(doc.status === 'error' || doc.status === 'ready') && (
            <Button
              variant="ghost"
              size="icon-sm"
              title="Reprocess"
              onClick={() => onReprocess(doc.id)}
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            title="Delete"
            className="text-red-400 hover:text-red-300"
            onClick={() => onDelete(doc.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
