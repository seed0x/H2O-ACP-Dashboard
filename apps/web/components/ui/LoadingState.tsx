import React from 'react'

interface LoadingStateProps {
  message?: string
  fullHeight?: boolean
  className?: string
}

/**
 * Standardized loading state component
 * Provides consistent loading indicators throughout the application
 */
export function LoadingState({ 
  message = 'Loading...', 
  fullHeight = false,
  className = '' 
}: LoadingStateProps) {
  return (
    <div 
      className={`flex flex-col items-center justify-center ${className}`}
      style={{
        padding: 'var(--space-8)',
        minHeight: fullHeight ? '400px' : '200px'
      }}
    >
      <div 
        className="animate-spin rounded-full border-4 border-t-transparent"
        style={{
          width: '40px',
          height: '40px',
          borderColor: 'var(--color-border)',
          borderTopColor: 'var(--color-primary)',
          marginBottom: 'var(--space-4)'
        }}
      />
      <p style={{ 
        fontSize: 'var(--text-sm)', 
        color: 'var(--color-text-secondary)'
      }}>
        {message}
      </p>
    </div>
  )
}

/**
 * Inline loading spinner for smaller contexts
 */
export function InlineSpinner({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <div 
      className={`animate-spin rounded-full border-2 border-t-transparent ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderColor: 'var(--color-border)',
        borderTopColor: 'var(--color-primary)'
      }}
    />
  )
}

