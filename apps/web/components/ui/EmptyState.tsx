import React from 'react'
import { Button } from './Button'

interface EmptyStateProps {
  icon?: React.ComponentType<{ size?: number | string; color?: string }>
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  }
  className?: string
}

/**
 * Standardized empty state component
 * Provides consistent styling and messaging when no data is available
 */
export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  className = '' 
}: EmptyStateProps) {
  return (
    <div 
      className={`flex flex-col items-center justify-center p-12 text-center ${className}`}
      style={{
        minHeight: '200px',
      }}
    >
      {Icon && (
        <div 
          style={{ 
            marginBottom: 'var(--space-4)',
            opacity: 0.5
          }}
        >
          <Icon size={48} color="var(--color-text-tertiary)" />
        </div>
      )}
      <h3 style={{ 
        fontSize: 'var(--text-lg)', 
        fontWeight: 600, 
        color: 'var(--color-text-primary)',
        marginBottom: '8px'
      }}>
        {title}
      </h3>
      {description && (
        <p style={{ 
          fontSize: 'var(--text-sm)', 
          color: 'var(--color-text-secondary)',
          marginBottom: action ? 'var(--space-6)' : '0',
          maxWidth: '400px'
        }}>
          {description}
        </p>
      )}
      {action && (
        <Button 
          variant={action.variant || 'primary'} 
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}

/**
 * Empty state with dashed border container
 * Useful for inline empty states within cards or panels
 */
export function EmptyStateCard({ 
  icon: Icon,
  title, 
  description, 
  action, 
  className = '' 
}: EmptyStateProps) {
  return (
    <div 
      className={`border-2 border-dashed border-[var(--color-border)] rounded-lg ${className}`}
      style={{
        padding: 'var(--space-8)',
        backgroundColor: 'var(--color-surface-elevated)',
      }}
    >
      <EmptyState 
        icon={Icon}
        title={title}
        description={description}
        action={action}
      />
    </div>
  )
}

