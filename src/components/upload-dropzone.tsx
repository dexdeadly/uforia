'use client'

import { useCallback, useRef, useState } from 'react'
import { UploadCloud, FileText, Image as ImageIcon, Loader2, X } from 'lucide-react'
import { cn, formatBytes } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const ACCEPTED = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff']

interface QueuedFile {
  file: File
  status: 'uploading' | 'done' | 'error'
  message?: string
}

/**
 * Drag-and-drop uploader for PDFs and images.
 * Uploads each file to /api/documents/upload and reports per-file progress.
 */
export function UploadDropzone({ onUploaded }: { onUploaded?: () => void }) {
  const [dragging, setDragging] = useState(false)
  const [queue, setQueue] = useState<QueuedFile[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadFile = useCallback(
    async (file: File) => {
      // Validate type client-side for fast feedback.
      if (!ACCEPTED.includes(file.type)) {
        setQueue((q) =>
          q.map((qf) =>
            qf.file === file
              ? { ...qf, status: 'error', message: 'Unsupported file type' }
              : qf,
          ),
        )
        toast.error(`${file.name}: only PDFs and images are supported`)
        return
      }

      try {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error ?? 'Upload failed')

        setQueue((q) =>
          q.map((qf) => (qf.file === file ? { ...qf, status: 'done' } : qf)),
        )
        toast.success(`${file.name} uploaded — processing started`)
        onUploaded?.()
      } catch (err: any) {
        setQueue((q) =>
          q.map((qf) =>
            qf.file === file
              ? { ...qf, status: 'error', message: err?.message ?? 'Upload failed' }
              : qf,
          ),
        )
        toast.error(`${file.name}: ${err?.message ?? 'upload failed'}`)
      }
    },
    [onUploaded],
  )

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return
      const arr = Array.from(files)
      setQueue((q) => [...q, ...arr.map((file) => ({ file, status: 'uploading' as const }))])
      arr.forEach((file) => uploadFile(file))
    },
    [uploadFile],
  )

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        className={cn(
          'glass flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-all',
          dragging
            ? 'border-primary bg-primary/10 glow-sm'
            : 'border-white/15 hover:border-primary/50 hover:bg-white/5',
        )}
      >
        <div className="animate-float mb-4 rounded-full bg-primary/15 p-4">
          <UploadCloud className="h-8 w-8 text-primary" />
        </div>
        <p className="text-lg font-semibold">
          Drop files here, or <span className="text-primary">browse</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          PDF documents and images (PNG, JPG, WebP…) up to 500 MB
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED.join(',')}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Upload queue */}
      {queue.length > 0 && (
        <ul className="space-y-2">
          {queue.map((qf, i) => (
            <li
              key={`${qf.file.name}-${i}`}
              className="glass flex items-center gap-3 rounded-lg px-4 py-3"
            >
              {qf.file.type === 'application/pdf' ? (
                <FileText className="h-5 w-5 shrink-0 text-primary" />
              ) : (
                <ImageIcon className="h-5 w-5 shrink-0 text-accent" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{qf.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(qf.file.size)}
                  {qf.message ? ` · ${qf.message}` : ''}
                </p>
              </div>
              {qf.status === 'uploading' && (
                <Loader2 className="h-4 w-4 animate-spin text-sky-300" />
              )}
              {qf.status === 'done' && (
                <span className="text-xs font-medium text-emerald-300">Uploaded</span>
              )}
              {qf.status === 'error' && (
                <X className="h-4 w-4 text-red-400" />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
