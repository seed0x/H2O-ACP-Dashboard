'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../lib/config'
import { useTenant, getPageTenant } from '../contexts/TenantContext'
import UilDashboard from '@iconscout/react-unicons/icons/uil-dashboard'
import UilBuilding from '@iconscout/react-unicons/icons/uil-building'
import UilWrench from '@iconscout/react-unicons/icons/uil-wrench'
import UilUserCircle from '@iconscout/react-unicons/icons/uil-user-circle'
import UilFileAlt from '@iconscout/react-unicons/icons/uil-file-alt'
import UilUser from '@iconscout/react-unicons/icons/uil-user'
import UilCalendarAlt from '@iconscout/react-unicons/icons/uil-calendar-alt'
import UilChart from '@iconscout/react-unicons/icons/uil-chart'
import UilStar from '@iconscout/react-unicons/icons/uil-star'
import UilFolder from '@iconscout/react-unicons/icons/uil-folder'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ size?: number | string; color?: string }>
  badgeCategory?: 'reviews' | 'marketing' | 'dispatch'
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: UilDashboard },
  { name: 'All County Jobs', href: '/jobs', icon: UilBuilding },
  { name: 'H2O Service Calls', href: '/service-calls', icon: UilWrench },
  { name: 'Customers', href: '/customers', icon: UilUserCircle },
  { name: 'Reviews', href: '/reviews', icon: UilStar, badgeCategory: 'reviews' },
  { name: 'Analytics', href: '/analytics', icon: UilChart },
  { name: 'Marketing', href: '/marketing', icon: UilCalendarAlt, badgeCategory: 'marketing' },
  { name: 'Builders', href: '/builders', icon: UilUserCircle },
  { name: 'Bids', href: '/bids', icon: UilFileAlt },
  { name: 'Directory', href: '/directory', icon: UilFolder },
]

// Admin-only nav items
const adminNavItems: NavItem[] = [
  { name: 'Users', href: '/users', icon: UilUser },
]

// Tech users only see their schedule
const techNavItems: NavItem[] = [
  { name: 'My Schedule', href: '/tech-schedule', icon: UilCalendarAlt },
]

interface SidebarProps {
  isMobile?: boolean
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isMobile = false, isOpen = true, onClose }: SidebarProps) {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [isTechUser, setIsTechUser] = useState(false)
  
  useEffect(() => {
    // Get user info from JWT token
    try {
      const token = localStorage.getItem('token')
      if (token) {
        const parts = token.split('.')
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]))
          const role = payload.role || null
          const usernameFromToken = payload.username || null
          setUserRole(role)
          setUsername(usernameFromToken)
          // Check if user is a tech user (max or northwynd)
          setIsTechUser(usernameFromToken === 'max' || usernameFromToken === 'northwynd')
        }
      }
    } catch (error) {
      console.error('Failed to parse token for role:', error)
    }
  }, [])
  
  // Use tech nav items for tech users, otherwise use full nav + admin items if admin
  const displayNavItems = isTechUser 
    ? techNavItems 
    : userRole === 'admin' 
      ? [...navItems, ...adminNavItems]
      : navItems
  const pathname = usePathname()
  const { currentTenant } = useTenant()
  const [signalCounts, setSignalCounts] = useState<{ reviews: number; marketing: number; dispatch: number }>({
    reviews: 0,
    marketing: 0,
    dispatch: 0
  })

  useEffect(() => {
    loadSignalCounts()
    const interval = setInterval(loadSignalCounts, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [currentTenant])

  async function loadSignalCounts() {
    try {
      const token = localStorage.getItem('token')
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      // Signals are h2o specific, but respect tenant selection
      const tenantParam = currentTenant === 'both' ? getPageTenant('marketing') : currentTenant
      const response = await fetch(`${API_BASE_URL}/signals/all?tenant_id=${tenantParam}`, {
        headers,
        credentials: 'include'
      })

      if (response.ok) {
        const signals = await response.json() as Array<{ type: string; count: number }>
        const counts = {
          reviews: signals.filter((s) => s.type === 'reviews').reduce((sum: number, s) => sum + s.count, 0),
          marketing: signals.filter((s) => s.type === 'marketing').reduce((sum: number, s) => sum + s.count, 0),
          dispatch: signals.filter((s) => s.type === 'dispatch').reduce((sum: number, s) => sum + s.count, 0)
        }
        setSignalCounts(counts)
      }
    } catch (error) {
      console.error('Failed to load signal counts:', error)
    }
  }

  return (
    <>
      {isMobile && isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 998
          }}
        />
      )}
      <aside style={{
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100vh',
        width: isMobile ? '280px' : '256px',
        backgroundColor: 'var(--color-card)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 999,
        transform: isMobile ? (isOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
        transition: 'transform 0.3s ease',
        boxShadow: isMobile && isOpen ? '2px 0 8px rgba(0, 0, 0, 0.3)' : 'none'
      }}>
        {isMobile && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              minWidth: '44px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      {/* Logo/Brand */}
      <div style={{
        padding: '24px',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <h1 style={{
          fontSize: '20px',
          fontWeight: '700',
          color: 'var(--color-text-primary)',
          marginBottom: '4px',
        }}>H2O-ACP</h1>
        <p style={{
          fontSize: '12px',
          color: 'var(--color-text-secondary)',
        }}>Operations Platform</p>
      </div>

      {/* Navigation */}
      <nav style={{
        flex: 1,
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        {displayNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
                transition: 'all 0.2s',
                backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--color-text-secondary)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--color-hover)'
                  e.currentTarget.style.color = 'var(--color-text-primary)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = 'var(--color-text-secondary)'
                }
              }}
            >
              <Icon size="20" color="currentColor" />
              <span style={{ fontSize: '14px', fontWeight: '500', flex: 1 }}>{item.name}</span>
              {item.badgeCategory && signalCounts[item.badgeCategory] > 0 && (
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600',
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.3)' : '#EF5350',
                  color: isActive ? '#ffffff' : '#ffffff',
                  minWidth: '20px',
                  textAlign: 'center'
                }}>
                  {signalCounts[item.badgeCategory]}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid var(--color-border)',
      }}>
        <Link
          href="/profile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '8px',
            textDecoration: 'none',
            transition: 'all 0.2s',
            marginBottom: '8px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <UilUser size="20" color="#ffffff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--color-text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {username || 'User'}
            </div>
            <div style={{
              fontSize: '12px',
              color: 'var(--color-text-secondary)',
              textTransform: 'capitalize'
            }}>
              {userRole || 'User'}
            </div>
          </div>
        </Link>
        <button
          onClick={async () => {
            try {
              const token = localStorage.getItem('token')
              if (token) {
                const headers = { 'Authorization': `Bearer ${token}` }
                await axios.post(`${API_BASE_URL}/logout`, {}, {
                  headers,
                  withCredentials: true
                })
              }
            } catch (err) {
              // Ignore logout errors
            } finally {
              localStorage.removeItem('token')
              window.location.href = '/login'
            }
          }}
          style={{
            width: '100%',
            padding: '8px 16px',
            backgroundColor: 'transparent',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            color: 'var(--color-text-secondary)',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-hover)'
            e.currentTarget.style.color = 'var(--color-text-primary)'
            e.currentTarget.style.borderColor = 'var(--color-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = 'var(--color-text-secondary)'
            e.currentTarget.style.borderColor = 'var(--color-border)'
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Log Out
        </button>
      </div>
    </aside>
    </>
  )
}
