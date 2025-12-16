'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import UilDashboard from '@iconscout/react-unicons/icons/uil-dashboard'
import UilBuilding from '@iconscout/react-unicons/icons/uil-building'
import UilWrench from '@iconscout/react-unicons/icons/uil-wrench'
import UilUserCircle from '@iconscout/react-unicons/icons/uil-user-circle'
import UilFileAlt from '@iconscout/react-unicons/icons/uil-file-alt'
import UilUser from '@iconscout/react-unicons/icons/uil-user'
import UilCalendarAlt from '@iconscout/react-unicons/icons/uil-calendar-alt'
import UilImport from '@iconscout/react-unicons/icons/uil-import'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ size?: number | string; color?: string }>
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: UilDashboard },
  { name: 'All County Jobs', href: '/jobs', icon: UilBuilding },
  { name: 'H2O Service Calls', href: '/service-calls', icon: UilWrench },
  { name: 'Marketing', href: '/marketing', icon: UilCalendarAlt },
  { name: 'Builders', href: '/builders', icon: UilUserCircle },
  { name: 'Bids', href: '/bids', icon: UilFileAlt },
  { name: 'Import Data', href: '/admin/import', icon: UilImport },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside style={{
      position: 'fixed',
      left: 0,
      top: 0,
      height: '100vh',
      width: '256px',
      backgroundColor: 'var(--color-card)',
      borderRight: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
    }}>
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
        {navItems.map((item) => {
          const isActive = pathname === item.href
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
              <span style={{ fontSize: '14px', fontWeight: '500' }}>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid var(--color-border)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <UilUser size="20" color="#ffffff" />
          </div>
          <div>
            <div style={{
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--color-text-primary)',
            }}>Admin User</div>
            <div style={{
              fontSize: '12px',
              color: 'var(--color-text-secondary)',
            }}>Operations Manager</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
