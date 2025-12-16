import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  ...props 
}: ButtonProps) {
  const getVariantStyles = (): React.CSSProperties => {
    const variants: Record<string, React.CSSProperties> = {
      primary: {
        backgroundColor: 'var(--color-primary)',
        color: '#ffffff',
        border: 'none'
      },
      secondary: {
        backgroundColor: 'var(--color-hover)',
        color: 'var(--color-text-primary)',
        border: '1px solid var(--color-border)'
      },
      danger: {
        backgroundColor: '#EF5350',
        color: '#ffffff',
        border: 'none'
      },
      ghost: {
        backgroundColor: 'transparent',
        color: 'var(--color-text-secondary)',
        border: '1px solid var(--color-border)'
      }
    }
    return variants[variant]
  }

  const getSizeStyles = (): React.CSSProperties => {
    const sizes: Record<string, React.CSSProperties> = {
      sm: { padding: '6px 12px', fontSize: '13px' },
      md: { padding: '10px 20px', fontSize: '14px' },
      lg: { padding: '14px 28px', fontSize: '16px' }
    }
    return sizes[size]
  }

  return (
    <button
      style={{
        fontWeight: '500',
        borderRadius: '8px',
        transition: 'all 0.2s',
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        opacity: props.disabled ? 0.5 : 1,
        ...getVariantStyles(),
        ...getSizeStyles()
      }}
      onMouseEnter={(e) => {
        if (!props.disabled) {
          if (variant === 'primary') {
            e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'
          } else {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.opacity = '0.9'
          }
        }
      }}
      onMouseLeave={(e) => {
        if (!props.disabled) {
          if (variant === 'primary') {
            e.currentTarget.style.backgroundColor = 'var(--color-primary)'
          } else {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.opacity = '1'
          }
        }
      }}
      {...props}
    >
      {children}
    </button>
  )
}
