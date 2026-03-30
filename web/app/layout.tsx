import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  fallback: ['system-ui', 'arial'],
})

export const metadata: Metadata = {
  title: 'Fundflow - MultiTenant Payment Management Platform',
  description: 'Streamline your organization\'s payment tracking, member management, and receipt generation with Fundflow',
  icons: {
    icon: [
      { url: '/favicon.svg?v=1', type: 'image/svg+xml' },
      { url: '/favicon.ico?v=1', sizes: 'any' },
    ],
    apple: [
      { url: '/favicon.svg?v=1', type: 'image/svg+xml' },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  )
}

