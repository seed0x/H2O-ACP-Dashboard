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
    primary: 'bg-[var(--color-primary)] text-white border-transparent hover:bg-[var(--color-primary-hover)]',
    secondary: 'bg-[var(--color-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[var(--color-card)]',
    danger: 'bg-red-500 text-white border-transparent hover:bg-red-600',
    ghost: 'bg-transparent text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-hover)]'
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs min-h-[36px]',
    md: 'px-5 py-2.5 text-sm min-h-[44px]',
    lg: 'px-7 py-3.5 text-base min-h-[48px]'
  }

  return (
    <button
      className={`
        font-medium rounded-lg transition-all active:scale-[0.98]
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${props.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  )
}
