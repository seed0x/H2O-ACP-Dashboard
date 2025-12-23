import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export function Card({ children, className = '', hover = false }: CardProps) {
  return (
    <div className={`
      bg-[var(--color-card)]/50 border border-white/[0.08] backdrop-blur-sm shadow-xl rounded-lg
      ${hover ? 'transition-all hover:border-[var(--color-primary)]/30 hover:shadow-2xl' : ''}
      ${className}
    `}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }: CardProps) {
  return (
    <div className={`px-6 py-4 border-b border-white/[0.08] ${className}`}>
      {children}
    </div>
  )
}

export function CardBody({ children, className = '' }: CardProps) {
  return (
    <div className={`px-6 py-4 ${className}`}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className = '' }: CardProps) {
  return (
    <div className={`px-6 py-4 border-t border-white/[0.08] bg-[var(--color-hover)]/50 rounded-b-lg ${className}`}>
      {children}
    </div>
  )
}
