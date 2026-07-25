import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'

import './globals.css'

import { appUrl } from '@/lib/env'
import { Toaster } from '@/components/ui'
import { AppProviders } from '@/components/providers'
import { X_HANDLE, X_URL } from '@/lib/social'

const TITLE = 'CaseSignal — Turn public records into source-backed case files.'
const DESCRIPTION =
  'CaseSignal reads the records you already have, indexes every excerpt, and builds a case file where each claim, date and difference links back to the page it came from.'

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: TITLE,
    template: '%s · CaseSignal',
  },
  description: DESCRIPTION,
  applicationName: 'CaseSignal',
  keywords: [
    'public records',
    'document analysis',
    'evidence',
    'citations',
    'investigation',
    'case file',
  ],
  authors: [{ name: 'CaseSignal', url: X_URL }],
  creator: X_HANDLE,
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    type: 'website',
    siteName: 'CaseSignal',
    title: TITLE,
    description: DESCRIPTION,
    url: appUrl,
    images: [{ url: '/og-image.svg', width: 1200, height: 630, alt: 'CaseSignal' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og-image.svg'],
    site: X_HANDLE,
    creator: X_HANDLE,
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F5F5F2',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh bg-page font-sans text-ink">
        <AppProviders>{children}</AppProviders>
        <Toaster />
      </body>
    </html>
  )
}
