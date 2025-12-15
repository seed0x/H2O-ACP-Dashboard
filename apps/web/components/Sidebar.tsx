'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

interface NavItem {
  name: string
  href: string
  icon: string
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: '📊' },
  { name: 'All County Jobs', href: '/jobs', icon: '🏗️' },
  { name: 'H2O Service Calls', href: '/service-calls', icon: '🔧' },
  { name: 'Builders', href: '/builders', icon: '👷' },
  { name: 'Bids', href: '/bids', icon: '📋' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-dark-panel border-r border-dark-border flex flex-col">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-dark-border">
        <h1 className="text-xl font-bold text-dark-text">H2O-ACP Dashboard</h1>
        <p className="text-xs text-dark-muted mt-1">Operations Platform</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                ${isActive 
                  ? 'bg-primary text-white' 
                  : 'text-dark-muted hover:bg-dark-hover hover:text-dark-text'
                }
              `}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-dark-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 rounded-full bg-dark-hover flex items-center justify-center text-dark-text">
            👤
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-dark-text">Admin User</div>
            <div className="text-xs text-dark-muted">Operations Manager</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
