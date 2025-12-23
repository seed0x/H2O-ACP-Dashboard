import React from 'react'
import { Button } from './Button'
import UilExclamationTriangle from '@iconscout/react-unicons/icons/uil-exclamation-triangle'

interface ErrorStateProps {
  title?: string
  message: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

/**
 * Standardized error state component
 * Provides consistent error messaging throughout the application
 */
export function ErrorState({ 
  title = 'Something went wrong',
  message, 
  action,
  className = '' 
}: ErrorStateProps) {
  return (
    <div 
      className={`flex flex-col items-center justify-center p-12 text-center ${className}`}
      style={{
        minHeight: '200px',
      }}
    >
      <div 
        style={{ 
          marginBottom: 'var(--space-4)',
          color: 'var(--color-error)'
        }}
      >
        <UilExclamationTriangle size={48} color="var(--color-error)" />
      </div>
      <h3 style={{ 
        fontSize: 'var(--text-lg)', 
        fontWeight: 600, 
        color: 'var(--color-text-primary)',
        marginBottom: '8px'
      }}>
        {title}
      </h3>
      <p style={{ 
        fontSize: 'var(--text-sm)', 
        color: 'var(--color-text-secondary)',
        marginBottom: action ? 'var(--space-6)' : '0',
        maxWidth: '400px'
      }}>
        {message}
      </p>
      {action && (
        <Button 
          variant="primary" 
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}

/**
 * Error state within a card container
 */
export function ErrorStateCard({ 
  title,
  message, 
  action,
  className = '' 
}: ErrorStateProps) {
  return (
    <div 
      className={`border border-[var(--color-error)] rounded-lg ${className}`}
      style={{
        padding: 'var(--space-6)',
        backgroundColor: 'var(--color-error-bg)',
      }}
    >
      <ErrorState 
        title={title}
        message={message}
        action={action}
      />
    </div>
  )
}

