import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'arXiv Manager - AI-powered Paper Discovery',
  description: 'Manage and explore arXiv papers with AI-powered insights, semantic search, and smart collections',
}

/**
 * RootLayout - Main app layout
 * Note: Authentication removed as per requirements. TODO: Add NextAuth later if needed.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" className="light">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
