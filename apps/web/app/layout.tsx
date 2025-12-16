'use client'
import './globals.css'
import { Sidebar } from '../components/Sidebar'
import { AuthGuard } from '../components/AuthGuard'
import { usePathname } from 'next/navigation'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'
  
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, backgroundColor: 'var(--color-bg)', minHeight: '100vh' }}>
        <AuthGuard>
          {!isLoginPage && <Sidebar />}
          <main style={{ 
            marginLeft: isLoginPage ? '0' : '256px', 
            minHeight: '100vh', 
            width: isLoginPage ? '100%' : 'calc(100% - 256px)' 
          }}>
            {children}
          </main>
        </AuthGuard>
      </body>
    </html>
  )
}

