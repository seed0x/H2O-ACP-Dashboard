import React from 'react'

interface StatCardProps {
  title: string
  value: number
  color: string
  href?: string
  alert?: boolean
  trend?: number  // Optional percentage (e.g., +12.5%)
  actionUrl?: string  // Optional action URL
}

export function StatCard({ 
  title, 
  value, 
  color, 
  href, 
  alert,
  trend,
  actionUrl 
}: StatCardProps) {
  const content = (
    <div className={`
      ${alert ? 'bg-red-500/5 border-red-500' : 'bg-[var(--color-card)] border border-[var(--color-border)]'}
      shadow-xl rounded-lg p-4 transition-all group
      ${href ? 'cursor-pointer hover:border-[var(--color-primary)]/30 hover:shadow-2xl hover:scale-[1.02]' : ''}
      aspect-video flex flex-col justify-between min-h-[100px]
    `}
    style={{
      backgroundColor: alert ? undefined : 'var(--color-card)'
    }}>
      <div className="text-xs text-[var(--color-text-secondary)] mb-2 uppercase tracking-wider font-medium">
        {title}
      </div>
      <div className="flex items-end justify-between">
        <div className="flex flex-col">
          <div className="text-2xl font-bold tabular-nums" style={{ color }}>
            {value}
          </div>
          {trend !== undefined && (
            <div className={`text-xs mt-1 ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {trend >= 0 ? '+' : ''}{trend}%
            </div>
          )}
        </div>
        {href && (
          <a
            href={href}
            className="text-xs text-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity font-medium"
            onClick={(e) => e.stopPropagation()}
            style={{ minWidth: 'fit-content' }}
          >
            View All →
          </a>
        )}
      </div>
    </div>
  )
  
  if (href) {
    return <a href={href} className="no-underline">{content}</a>
  }
  return content
}

