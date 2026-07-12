import Link from 'next/link'
import { Logo } from '@/components/logo'

/** Site footer with brand mark and quick links. */
export function Footer() {
  return (
    <footer className="glass mt-16 border-t border-primary/20">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:px-6 md:flex-row lg:px-8">
        <div className="flex flex-col items-center gap-1 md:items-start">
          <Logo />
          <p className="font-mono text-xs text-muted-foreground">
            Query → alien intelligence → grounded intel
          </p>
        </div>
        <div className="flex items-center gap-6 font-mono text-xs uppercase text-muted-foreground">
          <Link href="/upload" className="hover:text-primary">
            Upload
          </Link>
          <Link href="/documents" className="hover:text-primary">
            Library
          </Link>
          <Link href="/chat" className="hover:text-primary">
            Chat
          </Link>
          <Link href="/settings" className="hover:text-primary">
            Settings
          </Link>
        </div>
      </div>
      <div className="border-t border-primary/10 py-4 text-center font-mono text-xs text-muted-foreground">
        © {new Date().getFullYear()} UFORIA · Next.js · Local embeddings · RAG
      </div>
    </footer>
  )
}
