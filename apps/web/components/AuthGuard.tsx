'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token')
    
    // Always allow access to login page
    if (pathname === '/login') {
      setIsChecking(false)
      return
    }
    
    // If no token and not on login page, redirect to login
    if (!token) {
      router.replace('/login')
      return
    }
    
    // Token exists, allow access
    setIsChecking(false)
  }, [pathname, router])

  // Show loading while checking authentication
  if (isChecking && pathname !== '/login') {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        color: 'var(--color-text-secondary)'
      }}>
        Loading...
      </div>
    )
  }

  return <>{children}</>
}

