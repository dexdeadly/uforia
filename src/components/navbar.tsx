'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'

const NAV_LINKS = [
  { href: '/upload', label: '» OFFLINE' },
  { href: '/documents', label: '» N FILES' },
  { href: '/chat', label: '» CHAT' },
  { href: '/settings', label: '» OPENAI API' },
]

/** Top navigation bar with active-route highlighting and a mobile menu. */
export function Navbar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <header className="glass sticky top-0 z-50 w-full border-b border-primary/20">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <Logo />
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded px-3 py-2 font-mono text-xs font-medium uppercase tracking-wider transition-colors',
                isActive(link.href)
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-primary/10 hover:text-foreground',
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Mobile toggle */}
        <button
          className="inline-flex items-center justify-center rounded-md p-2 text-foreground md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="glass border-t border-primary/20 md:hidden">
          <div className="space-y-1 px-4 py-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'block rounded px-3 py-2 font-mono text-xs font-medium uppercase tracking-wider transition-colors',
                  isActive(link.href)
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-primary/10 hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
