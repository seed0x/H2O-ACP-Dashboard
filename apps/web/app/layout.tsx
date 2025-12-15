'use client'
import './globals.css'
import { Sidebar } from '../components/Sidebar'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, backgroundColor: 'var(--color-bg)', minHeight: '100vh' }}>
        <Sidebar />
        <main style={{ marginLeft: '256px', minHeight: '100vh', width: 'calc(100% - 256px)' }}>
          {children}
        </main>
      </body>
    </html>
  )
}

