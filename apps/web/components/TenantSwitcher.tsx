'use client'

import { useState, useRef, useEffect } from 'react'
import { useTenant, TENANT_CONFIG, TenantId } from '../contexts/TenantContext'

interface TenantSwitcherProps {
  compact?: boolean
  className?: string
}

export function TenantSwitcher({ compact = false, className = '' }: TenantSwitcherProps) {
  const { currentTenant, setTenant, canAccessTenant } = useTenant()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const currentConfig = TENANT_CONFIG[currentTenant]
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  const availableTenants: TenantId[] = (['both', 'all_county', 'h2o'] as TenantId[])
    .filter(canAccessTenant)
  
  if (availableTenants.length <= 1) {
    return (
      <div 
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: currentConfig.bgColor,
          borderRadius: '8px',
          border: `1px solid ${currentConfig.borderColor}`
        }}
      >
        <span>{currentConfig.icon}</span>
        {!compact && (
          <span style={{ fontSize: '13px', fontWeight: 500, color: currentConfig.color }}>
            {currentConfig.name}
          </span>
        )}
      </div>
    )
  }
  
  return (
    <div ref={dropdownRef} className={className} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: compact ? '8px' : '8px 12px',
          backgroundColor: currentConfig.bgColor,
          borderRadius: '8px',
          border: `1px solid ${currentConfig.borderColor}`,
          cursor: 'pointer',
          transition: 'all 0.2s',
          minWidth: compact ? 'auto' : '140px'
        }}
      >
        <span style={{ fontSize: '16px' }}>{currentConfig.icon}</span>
        {!compact && (
          <>
            <span style={{ flex: 1, textAlign: 'left', fontSize: '13px', fontWeight: 500, color: currentConfig.color }}>
              {currentConfig.name}
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
              <path d="M2.5 4.5L6 8L9.5 4.5" stroke={currentConfig.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </>
        )}
      </button>
      
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: compact ? 'auto' : 0,
          minWidth: '160px',
          marginTop: '4px',
          backgroundColor: 'var(--color-card)',
          borderRadius: '8px',
          border: '1px solid var(--color-border)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 100,
          overflow: 'hidden'
        }}>
          {availableTenants.map((tenant) => {
            const config = TENANT_CONFIG[tenant]
            const isSelected = tenant === currentTenant
            
            return (
              <button
                key={tenant}
                onClick={() => { setTenant(tenant); setIsOpen(false) }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  border: 'none',
                  backgroundColor: isSelected ? config.bgColor : 'transparent',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s'
                }}
              >
                <span style={{ fontSize: '16px' }}>{config.icon}</span>
                <span style={{ flex: 1, textAlign: 'left', fontSize: '13px', fontWeight: isSelected ? 600 : 400, color: isSelected ? config.color : 'var(--color-text-primary)' }}>
                  {config.name}
                </span>
                {isSelected && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke={config.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function TenantFilter() {
  const { currentTenant, setTenant, canAccessTenant } = useTenant()
  
  const tenants: TenantId[] = (['both', 'all_county', 'h2o'] as TenantId[]).filter(canAccessTenant)
  
  if (tenants.length <= 1) return null
  
  return (
    <div style={{ display: 'flex', gap: '4px', padding: '4px', backgroundColor: 'var(--color-hover)', borderRadius: '8px' }}>
      {tenants.map((tenant) => {
        const config = TENANT_CONFIG[tenant]
        const isSelected = tenant === currentTenant
        
        return (
          <button
            key={tenant}
            onClick={() => setTenant(tenant)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: isSelected ? config.bgColor : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <span style={{ fontSize: '14px' }}>{config.icon}</span>
            <span style={{ fontSize: '12px', fontWeight: isSelected ? 600 : 400, color: isSelected ? config.color : 'var(--color-text-secondary)' }}>
              {config.shortName}
            </span>
          </button>
        )
      })}
    </div>
  )
}

