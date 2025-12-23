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
  const paddingStyles: Record<string, React.CSSProperties> = {
    sm: { padding: 'var(--space-4)' },
    md: { padding: 'var(--space-6)' },
    lg: { padding: 'var(--space-8)' }
  }

  const baseStyles: React.CSSProperties = {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-sm)',
    ...paddingStyles[padding],
    ...(hover || onClick ? {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    } : {}),
    ...style
  }

  const hoverStyles: React.CSSProperties = hover || onClick ? {
    backgroundColor: 'var(--color-surface-elevated)',
    borderColor: 'var(--color-primary)',
    boxShadow: 'var(--shadow-md)',
  } : {}

  const Component = onClick ? 'button' : 'div'
  
  return (
    <Component
      type={onClick ? 'button' : undefined}
      className={className}
      onClick={onClick}
      style={baseStyles}
      onMouseEnter={hover || onClick ? (e) => {
        Object.assign(e.currentTarget.style, baseStyles, hoverStyles)
      } : undefined}
      onMouseLeave={hover || onClick ? (e) => {
        Object.assign(e.currentTarget.style, baseStyles)
      } : undefined}
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
