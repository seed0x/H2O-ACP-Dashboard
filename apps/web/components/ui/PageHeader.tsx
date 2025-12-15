import React from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '32px'
    }}>
      <div>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          color: 'var(--color-text-primary)',
          marginBottom: description ? '8px' : '0'
        }}>
          {title}
        </h1>
        {description && (
          <p style={{
            fontSize: '14px',
            color: 'var(--color-text-secondary)'
          }}>
            {description}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
