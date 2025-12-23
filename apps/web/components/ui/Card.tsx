import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
  hover?: boolean
  onClick?: () => void
  style?: React.CSSProperties
}

/**
 * Standardized Card component for consistent styling across the application
 * Uses the new design system colors and spacing
 */
export function Card({ 
  children, 
  className = '', 
  padding = 'md',
  hover = false,
  onClick,
  style
}: CardProps) {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }

  const baseClasses = `
    bg-[var(--color-surface)]
    border border-[var(--color-border)]
    rounded-lg
    ${paddingClasses[padding]}
    ${hover ? 'transition-all duration-200 hover:bg-[var(--color-surface-elevated)] hover:border-[var(--color-primary)]/30 cursor-pointer' : ''}
    ${onClick ? 'cursor-pointer' : ''}
  `.trim().replace(/\s+/g, ' ')

  const Component = onClick ? 'button' : 'div'
  
  return (
    <Component
      type={onClick ? 'button' : undefined}
      className={`${baseClasses} ${className}`}
      onClick={onClick}
      style={{ 
        boxShadow: 'var(--shadow-sm)',
        ...style
      }}
    >
      {children}
    </Component>
  )
}

interface CardHeaderProps {
  title?: string | React.ReactNode
  subtitle?: string
  action?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export function CardHeader({ title, subtitle, action, children, className = '' }: CardHeaderProps) {
  if (children && !title) {
    return (
      <div className={`mb-6 ${className}`}>
        {children}
      </div>
    )
  }

  return (
    <div className={`flex items-start justify-between mb-6 ${className}`}>
      <div>
        {title && (
          <h2 style={{ 
            fontSize: 'var(--text-lg)', 
            fontWeight: 600, 
            color: 'var(--color-text-primary)',
            marginBottom: subtitle ? '4px' : '0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {title}
          </h2>
        )}
        {subtitle && (
          <p style={{ 
            fontSize: 'var(--text-sm)', 
            color: 'var(--color-text-secondary)',
            marginTop: '4px'
          }}>
            {subtitle}
          </p>
        )}
        {children}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

interface CardSectionProps {
  children: React.ReactNode
  title?: string
  className?: string
}

export function CardSection({ children, title, className = '' }: CardSectionProps) {
  return (
    <div className={`mb-6 last:mb-0 ${className}`}>
      {title && (
        <h3 style={{ 
          fontSize: 'var(--text-sm)', 
          fontWeight: 600, 
          color: 'var(--color-text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '12px'
        }}>
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}

export function CardBody({ children, className = '' }: CardProps) {
  return (
    <div className={className}>
      {children}
    </div>
  )
}
