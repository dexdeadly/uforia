import Link from 'next/link'
import {
  UploadCloud,
  MessageSquareText,
  ScanText,
  Sparkles,
  ShieldCheck,
  Quote,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UfoMark } from '@/components/logo'

const FEATURES = [
  {
    icon: UploadCloud,
    title: 'Upload anything',
    desc: 'Drag and drop PDFs and images. Scanned reports, photos and field notes all welcome.',
  },
  {
    icon: ScanText,
    title: 'Automatic extraction',
    desc: 'Text is pulled from PDFs and images (OCR), then split and indexed for search.',
  },
  {
    icon: Sparkles,
    title: 'Local embeddings',
    desc: 'Semantic vectors are generated on-device with Transformers.js — no embedding API required.',
  },
  {
    icon: MessageSquareText,
    title: 'Cited answers',
    desc: 'Ask questions in plain language and get answers grounded in your own documents.',
  },
  {
    icon: ShieldCheck,
    title: 'Portable & private',
    desc: 'Standard Next.js + Postgres. Run it locally, in Docker, or deploy to any cloud.',
  },
  {
    icon: Quote,
    title: 'Source transparency',
    desc: 'Every answer links back to the exact passages it was built from.',
  },
]

const STEPS = [
  { n: '01', title: 'Upload', desc: 'Add your UFO PDFs and images to the library.' },
  { n: '02', title: 'Index', desc: 'Uforia extracts text and builds semantic embeddings.' },
  { n: '03', title: 'Ask', desc: 'Chat with your corpus and get cited, grounded answers.' },
]

export default function HomePage() {
  return (
    <div className="relative">
      {/* Hero */}
      <section className="hero-gradient relative overflow-hidden">
        <div className="mx-auto max-w-5xl px-4 py-24 text-center sm:px-6 lg:py-32">
          <div className="animate-float mx-auto mb-8 w-fit">
            <UfoMark className="h-20 w-20 drop-shadow-[0_0_30px_rgba(16,185,129,0.6)]" />
          </div>
          <span className="glass inline-flex items-center gap-2 rounded px-4 py-1.5 font-mono text-xs font-medium uppercase tracking-wider text-primary">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Action Intelligence RAG
          </span>
          <h1 className="mt-6 font-mono text-4xl font-bold uppercase tracking-wider sm:text-5xl lg:text-6xl">
            <span className="text-cosmic">UFORIA</span> <br />
            <span className="text-foreground/80">Action Intelligence RAG</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl font-mono text-sm text-muted-foreground">
            Upload documents to the left, then transmit a query. <br />
            Query → alien intelligence. <br />
            Answers grounded in your files.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="glow font-mono uppercase">
              <Link href="/upload">
                <UploadCloud className="h-5 w-5" />
                Upload
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="font-mono uppercase">
              <Link href="/chat">
                Transmit Query
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-mono text-2xl font-bold uppercase tracking-wider text-primary sm:text-3xl">
            // System Capabilities
          </h2>
          <p className="mt-3 font-mono text-sm text-muted-foreground">
            Complete RAG pipeline → ingestion to grounded answers
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="glass rounded-lg border border-primary/20 p-6 transition-all hover:border-primary/40 hover:glow-sm"
            >
              <div className="mb-4 w-fit rounded bg-primary/15 p-3">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-mono text-sm font-semibold uppercase tracking-wide text-primary">{f.title}</h3>
              <p className="mt-2 font-mono text-xs text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-mono text-2xl font-bold uppercase tracking-wider text-primary sm:text-3xl">
            // Protocol
          </h2>
          <p className="mt-3 font-mono text-sm text-muted-foreground">
            Three steps → raw files to answers
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="glass relative rounded-lg border border-primary/20 p-8">
              <span className="font-mono text-4xl font-extrabold text-cosmic opacity-90">
                {s.n}
              </span>
              <h3 className="mt-4 font-mono text-lg font-semibold uppercase tracking-wide text-primary">{s.title}</h3>
              <p className="mt-2 font-mono text-xs text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="glass relative overflow-hidden rounded-lg border border-primary/20 p-10 text-center sm:p-16">
          <div className="aurora absolute inset-0 opacity-40" />
          <div className="relative">
            <h2 className="font-mono text-2xl font-bold uppercase tracking-wider text-primary sm:text-3xl">
              Ready → Explore Unknown
            </h2>
            <p className="mx-auto mt-3 max-w-xl font-mono text-sm text-muted-foreground">
              Upload first document → transmit query → receive grounded intel
            </p>
            <Button asChild size="lg" className="glow mt-8 font-mono uppercase">
              <Link href="/upload">
                Initialize
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
