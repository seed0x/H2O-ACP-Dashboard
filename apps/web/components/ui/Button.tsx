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
  const variantClasses = {
    primary: 'bg-[var(--color-primary)] text-white border-transparent hover:bg-[var(--color-primary-hover)] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg)]',
    secondary: 'bg-transparent text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[var(--color-surface-elevated)] hover:border-[var(--color-primary)]',
    danger: 'bg-[var(--color-error)] text-white border-transparent hover:bg-[#DC2626] focus:ring-2 focus:ring-[var(--color-error)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg)]',
    ghost: 'bg-transparent text-[var(--color-text-secondary)] border border-transparent hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)]'
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs min-h-[32px]',
    md: 'px-5 py-2.5 text-sm min-h-[44px]',
    lg: 'px-7 py-3.5 text-base min-h-[48px]'
  }

  return (
    <button
      className={`
        font-medium rounded-lg transition-all duration-200
        focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  )
}
