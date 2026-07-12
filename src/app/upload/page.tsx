'use client'

import Link from 'next/link'
import { ArrowRight, Library } from 'lucide-react'
import { UploadDropzone } from '@/components/upload-dropzone'
import { DocumentCard } from '@/components/document-card'
import { Button } from '@/components/ui/button'
import { useDocuments } from '@/hooks/use-documents'

export default function UploadPage() {
  const { documents, fetchDocuments, deleteDocument, reprocessDocument } = useDocuments()

  // Show the most recent few documents below the dropzone as live feedback.
  const recent = documents.slice(0, 4)

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-display text-4xl font-bold">
          Upload <span className="text-cosmic">documents</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          Add PDFs and images to your corpus. Files are extracted, chunked and embedded
          automatically — you can start asking questions as soon as they turn{' '}
          <span className="text-emerald-300">Ready</span>.
        </p>
      </div>

      <UploadDropzone onUploaded={fetchDocuments} />

      {recent.length > 0 && (
        <div className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Recently added</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/documents">
                <Library className="h-4 w-4" />
                View library
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {recent.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onDelete={deleteDocument}
                onReprocess={reprocessDocument}
              />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button asChild size="lg" className="glow-sm">
              <Link href="/chat">
                Ask questions
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
