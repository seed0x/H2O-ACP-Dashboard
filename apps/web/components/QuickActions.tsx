'use client'
import React from 'react'
import { Button } from './ui/Button'

export interface QuickAction {
  label: string
  onClick: (e: React.MouseEvent) => void
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md'
  disabled?: boolean
  show?: boolean
}

interface QuickActionsProps {
  actions: QuickAction[]
  isMobile?: boolean
}

export function QuickActions({ actions, isMobile = false }: QuickActionsProps) {
  const visibleActions = actions.filter(a => a.show !== false)
  
  if (visibleActions.length === 0) return null

  // On mobile, show as dropdown menu
  if (isMobile && visibleActions.length > 1) {
    const [isOpen, setIsOpen] = React.useState(false)
    
    return (
      <div style={{ position: 'relative' }}>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsOpen(!isOpen)
          }}
          style={{
            padding: '6px 12px',
            backgroundColor: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            color: 'var(--color-text-primary)',
            cursor: 'pointer',
            fontSize: '14px',
            minWidth: '44px',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ⋮
        </button>
        {isOpen && (
          <>
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 998
              }}
              onClick={() => setIsOpen(false)}
            />
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                backgroundColor: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                zIndex: 999,
                minWidth: '150px',
                padding: '4px'
              }}
            >
              {visibleActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation()
                    action.onClick(e)
                    setIsOpen(false)
                  }}
                  disabled={action.disabled}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    textAlign: 'left',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: action.disabled 
                      ? 'var(--color-text-secondary)' 
                      : 'var(--color-text-primary)',
                    cursor: action.disabled ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    borderRadius: '4px',
                    minHeight: '44px'
                  }}
                  onMouseEnter={(e) => {
                    if (!action.disabled) {
                      e.currentTarget.style.backgroundColor = 'var(--color-hover)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  // On desktop or single action, show buttons
  return (
    <div 
      style={{ 
        display: 'flex', 
        gap: '8px',
        alignItems: 'center'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {visibleActions.map((action, idx) => (
        <Button
          key={idx}
          variant={action.variant || 'secondary'}
          size={action.size || 'sm'}
          onClick={action.onClick}
          disabled={action.disabled}
        >
          {action.label}
        </Button>
      ))}
    </div>
  )
}


