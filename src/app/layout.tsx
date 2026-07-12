import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { ChunkLoadErrorHandler } from '@/components/chunk-load-error-handler'
import { Starfield } from '@/components/starfield'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const jakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-display' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'Uforia — Ask questions about UFO documents',
  description:
    'Uforia is a cosmic RAG (Retrieval-Augmented Generation) workspace. Upload UFO documents and images, then ask questions and get cited answers grounded in your own files.',
  keywords: ['UFO', 'UAP', 'RAG', 'document search', 'AI', 'semantic search', 'Uforia'],
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'Uforia — Ask questions about UFO documents',
    description: 'Upload UFO documents and chat with them. Cited, grounded answers.',
    images: ['/og-image.png'],
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jakartaSans.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {/* Animated cosmic starfield rendered behind all content */}
          <Starfield />
          <div className="relative z-10 flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <Toaster />
          {/* IMPORTANT: Do not remove — handles chunk loading race conditions in the dev server */}
          <ChunkLoadErrorHandler />
        </ThemeProvider>
      </body>
    </html>
  )
}
