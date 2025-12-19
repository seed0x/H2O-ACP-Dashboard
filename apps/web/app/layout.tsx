'use client'
import './globals.css'
import './mobile-styles.css'
import { Sidebar } from '../components/Sidebar'
import { AuthGuard } from '../components/AuthGuard'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { ToastContainer } from '../components/Toast'
import { NotificationCenter } from '../components/NotificationCenter'
import { TenantProvider } from '../contexts/TenantContext'
import { TenantSwitcher } from '../components/TenantSwitcher'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
      if (window.innerWidth > 768) {
        setSidebarOpen(false)
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, backgroundColor: 'var(--color-bg)', minHeight: '100vh' }}>
        <ErrorBoundary>
          <TenantProvider>
            <AuthGuard>
              {!isLoginPage && (
                <>
                  <Sidebar isMobile={isMobile} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                  {isMobile && (
                    <button
                      onClick={() => setSidebarOpen(true)}
                      style={{
                        position: 'fixed',
                        top: '16px',
                        left: '16px',
                        zIndex: 1000,
                        padding: '12px',
                        backgroundColor: 'var(--color-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        color: 'var(--color-text-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '44px',
                        minHeight: '44px'
                      }}
                    >
                      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                  )}
                </>
              )}
              {!isLoginPage && (
                <header style={{
                  position: 'fixed',
                  top: 0,
                  left: isMobile ? '0' : '256px',
                  right: 0,
                  height: '64px',
                  backgroundColor: 'var(--color-card)',
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: isMobile ? '0 16px 0 60px' : '0 24px',
                  zIndex: 99
                }}>
                  <TenantSwitcher />
                  <NotificationCenter />
                </header>
              )}
              <main style={{ 
                marginLeft: isLoginPage || (isMobile && !sidebarOpen) ? '0' : (isMobile ? '0' : '256px'), 
                marginTop: isLoginPage ? '0' : '64px',
                minHeight: isLoginPage ? '100vh' : 'calc(100vh - 64px)', 
                width: isLoginPage ? '100%' : (isMobile ? '100%' : 'calc(100% - 256px)'),
                padding: isMobile ? '16px' : '0',
                transition: 'margin-left 0.3s ease'
              }}>
                {children}
              </main>
              <ToastContainer />
            </AuthGuard>
          </TenantProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
