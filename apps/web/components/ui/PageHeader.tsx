import React from 'react'
import { Button } from './Button'

interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
  breadcrumbs?: Array<{ label: string; href?: string }>
}

/**
 * Standardized page header component
 * Provides consistent layout and styling for page titles
 */
export function PageHeader({ title, description, action, breadcrumbs }: PageHeaderProps) {
  return (
    <div style={{ marginBottom: 'var(--space-6)' }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav style={{ 
          marginBottom: 'var(--space-4)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-secondary)'
        }}>
          {breadcrumbs.filter(Boolean).map((crumb, index) => (
            <React.Fragment key={index}>
              {crumb.href ? (
                <a 
                  href={crumb.href}
                  style={{ 
                    color: 'var(--color-primary)',
                    textDecoration: 'none',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
                >
                  {crumb.label}
                </a>
              ) : (
                <span>{crumb.label}</span>
              )}
              {index < breadcrumbs.length - 1 && (
                <span style={{ color: 'var(--color-text-tertiary)' }}>/</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: description ? 'flex-start' : 'center',
        gap: 'var(--space-4)',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ 
            fontSize: 'var(--text-2xl)', 
            fontWeight: 700, 
            color: 'var(--color-text-primary)',
            marginBottom: description ? 'var(--space-2)' : '0',
            lineHeight: 1.2
          }}>
            {title}
          </h1>
          {description && (
            <p style={{ 
              fontSize: 'var(--text-base)', 
              color: 'var(--color-text-secondary)',
              lineHeight: 1.5
            }}>
              {description}
            </p>
          )}
        </div>
        {action && (
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {action}
          </div>
        )}
      </div>
    </div>
  )
}
