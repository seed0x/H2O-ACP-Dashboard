import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  className?: string
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  className = '',
  ...props 
}: ButtonProps) {
  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: 'var(--color-primary)',
      color: '#ffffff',
      border: '1px solid transparent',
    },
    secondary: {
      backgroundColor: 'transparent',
      color: 'var(--color-text-primary)',
      border: '1px solid var(--color-border)',
    },
    danger: {
      backgroundColor: 'var(--color-error)',
      color: '#ffffff',
      border: '1px solid transparent',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--color-text-secondary)',
      border: '1px solid transparent',
    }
  }

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: {
      padding: '6px 12px',
      fontSize: 'var(--text-xs)',
      minHeight: '32px',
    },
    md: {
      padding: '10px 20px',
      fontSize: 'var(--text-sm)',
      minHeight: '44px',
    },
    lg: {
      padding: '14px 28px',
      fontSize: 'var(--text-base)',
      minHeight: '48px',
    }
  }

  const baseStyles: React.CSSProperties = {
    fontFamily: 'inherit',
    fontWeight: 500,
    borderRadius: 'var(--radius-lg)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...variantStyles[variant],
    ...sizeStyles[size],
  }

  const hoverStyles: React.CSSProperties = 
    variant === 'primary' 
      ? { backgroundColor: 'var(--color-primary-hover)' }
      : variant === 'secondary'
      ? { backgroundColor: 'var(--color-surface-elevated)', borderColor: 'var(--color-primary)' }
      : variant === 'danger'
      ? { backgroundColor: '#DC2626' }
      : { backgroundColor: 'var(--color-surface-elevated)', color: 'var(--color-text-primary)' }

  return (
    <button
      className={className}
      style={baseStyles}
      onMouseEnter={(e) => {
        Object.assign(e.currentTarget.style, hoverStyles)
      }}
      onMouseLeave={(e) => {
        Object.assign(e.currentTarget.style, baseStyles)
      }}
      onFocus={(e) => {
        if (variant === 'primary') {
          e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-primary), 0 0 0 4px var(--color-bg)'
        } else if (variant === 'danger') {
          e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-error), 0 0 0 4px var(--color-bg)'
        }
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = ''
      }}
      {...props}
    >
      {children}
    </button>
  )
}
