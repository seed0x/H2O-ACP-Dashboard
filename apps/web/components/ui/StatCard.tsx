import React, { useState } from 'react'

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
  const [isHovered, setIsHovered] = useState(false)

  const baseStyles: React.CSSProperties = {
    backgroundColor: alert ? 'rgba(239, 68, 68, 0.05)' : 'var(--color-card)',
    border: alert ? '1px solid #EF4444' : '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    padding: 'var(--space-4)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '100px',
    aspectRatio: '16 / 9',
    transition: 'all 0.2s ease',
    ...(href ? { cursor: 'pointer' } : {}),
    ...(isHovered && href ? {
      borderColor: 'var(--color-primary)',
      transform: 'scale(1.02)',
    } : {})
  }

  const content = (
    <div
      style={baseStyles}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{
        fontSize: 'var(--text-xs)',
        color: 'var(--color-text-secondary)',
        marginBottom: 'var(--space-2)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        fontWeight: 500,
      }}>
        {title}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            color,
          }}>
            {value}
          </div>
          {trend !== undefined && (
            <div style={{
              fontSize: 'var(--text-xs)',
              marginTop: '4px',
              color: trend >= 0 ? '#10B981' : '#EF4444',
            }}>
              {trend >= 0 ? '+' : ''}{trend}%
            </div>
          )}
        </div>
        {href && (
          <a
            href={href}
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-primary)',
              opacity: isHovered ? 1 : 0,
              transition: 'opacity 0.2s ease',
              fontWeight: 500,
              minWidth: 'fit-content',
              textDecoration: 'none',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            View All →
          </a>
        )}
      </div>
    </div>
  )
  
  if (href) {
    return (
      <a href={href} style={{ textDecoration: 'none', display: 'block' }}>
        {content}
      </a>
    )
  }
  return content
}

