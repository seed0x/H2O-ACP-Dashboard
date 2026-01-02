'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { API_BASE_URL } from '../lib/config'

// Helper function to check if user is a tech user (restricted to tech-schedule page)
function isTechUser(token: string): boolean {
  try {
    const parts = token.split('.')
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]))
      const username = payload.username || null
      // Only max is a tech user (northwynd removed)
      return username === 'max'
    }
  } catch (error) {
    console.error('Failed to parse token:', error)
  }
  return false
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const validateAuth = async () => {
      // Always allow access to login page
      if (pathname === '/login') {
        setIsChecking(false)
        return
      }
      
      // Check if user is authenticated
      const token = localStorage.getItem('token')
      
      // If no token and not on login page, redirect to login
      if (!token) {
        router.replace('/login')
        return
      }
      
      // Validate token with backend by making a lightweight API call
      try {
        const response = await fetch(`${API_BASE_URL}/users?limit=1`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        })
        
        // If token is invalid/expired, redirect to login
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token')
          router.replace('/login')
          return
        }
        
        // If request failed for other reasons, still allow access (will fail on actual API calls)
        if (!response.ok && response.status !== 401 && response.status !== 403) {
          console.warn('Auth validation request failed, but allowing access:', response.status)
        }
        
        // Check if user is a tech user
        const techUser = isTechUser(token)
        
        // Tech users can only access tech-schedule page
        if (techUser && pathname !== '/tech-schedule') {
          router.replace('/tech-schedule')
          return
        }
        
        // Token is valid, allow access
        setIsChecking(false)
      } catch (error) {
        // Network error - allow access but it will fail on actual API calls
        console.warn('Auth validation failed (network error), allowing access:', error)
        setIsChecking(false)
      }
    }
    
    validateAuth()
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

