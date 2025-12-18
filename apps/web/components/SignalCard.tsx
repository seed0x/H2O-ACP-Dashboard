'use client'
import React from 'react'
import { Button } from './ui/Button'

export interface SignalAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'danger'
}

export interface SignalCardProps {
  title: string
  count: number
  description: string
  owner?: string | null
  priority?: 'high' | 'medium' | 'low'
  actions: SignalAction[]
  icon?: string
  onClick?: () => void
}

export function SignalCard({
  title,
  count,
  description,
  owner,
  priority = 'medium',
  actions,
  icon,
  onClick
}: SignalCardProps) {
  const priorityColors = {
    high: { border: '#EF5350', bg: 'rgba(239, 83, 80, 0.1)' },
    medium: { border: '#FF9800', bg: 'rgba(255, 152, 0, 0.1)' },
    low: { border: '#60A5FA', bg: 'rgba(96, 165, 250, 0.1)' }
  }

  const colors = priorityColors[priority]

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: 'var(--color-card)',
        border: `2px solid ${colors.border}`,
        borderRadius: '12px',
        padding: '20px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'none'
        }
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          {icon && (
            <div style={{ fontSize: '24px' }}>{icon}</div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h3 style={{ 
                margin: 0, 
                fontSize: '16px', 
                fontWeight: '600', 
                color: 'var(--color-text-primary)' 
              }}>
                {title}
              </h3>
              <span style={{
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
                backgroundColor: colors.bg,
                color: colors.border
              }}>
                {count}
              </span>
            </div>
            {owner && (
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                Owner: {owner || 'Unassigned'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <p style={{
        margin: '0 0 16px 0',
        fontSize: '14px',
        color: 'var(--color-text-secondary)',
        lineHeight: '1.5'
      }}>
        {description}
      </p>

      {/* Actions */}
      {actions.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {actions.map((action, idx) => (
            <Button
              key={idx}
              variant={action.variant || 'primary'}
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                action.onClick()
              }}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

