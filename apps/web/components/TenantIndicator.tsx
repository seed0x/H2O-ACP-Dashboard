'use client'

import { useTenant, TENANT_CONFIG, TenantId } from '../contexts/TenantContext'

interface TenantIndicatorProps {
  tenant?: TenantId
  variant?: 'full' | 'short' | 'icon'
  size?: 'sm' | 'md' | 'lg'
}

export function TenantIndicator({ 
  tenant, 
  variant = 'short',
  size = 'md'
}: TenantIndicatorProps) {
  const { currentTenant } = useTenant()
  const displayTenant = tenant || currentTenant
  const config = TENANT_CONFIG[displayTenant]
  
  // Guard against undefined config
  if (!config) {
    console.warn(`TenantIndicator: Invalid tenant "${displayTenant}"`, { tenant, currentTenant })
    return null
  }
  
  const sizeStyles = {
    sm: { padding: '2px 6px', fontSize: '11px', gap: '4px' },
    md: { padding: '4px 10px', fontSize: '12px', gap: '6px' },
    lg: { padding: '6px 14px', fontSize: '14px', gap: '8px' }
  }
  
  const style = sizeStyles[size]
  
  if (variant === 'icon') {
    return (
      <span
        title={config.name || ''}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size === 'sm' ? '20px' : size === 'md' ? '28px' : '36px',
          height: size === 'sm' ? '20px' : size === 'md' ? '28px' : '36px',
          borderRadius: '50%',
          backgroundColor: config.bgColor,
          border: `1px solid ${config.borderColor}`,
          fontSize: size === 'sm' ? '10px' : size === 'md' ? '14px' : '18px',
          cursor: 'default'
        }}
      >
        {config.icon || ''}
      </span>
    )
  }
  
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: style.gap,
        padding: style.padding,
        fontSize: style.fontSize,
        fontWeight: 500,
        borderRadius: '6px',
        backgroundColor: config.bgColor,
        border: `1px solid ${config.borderColor}`,
        color: config.color,
        whiteSpace: 'nowrap'
      }}
    >
      <span>{config.icon || ''}</span>
      <span>{variant === 'full' ? (config.name || '') : (config.shortName || '')}</span>
    </span>
  )
}

export function TenantTag({ tenant }: { tenant: TenantId }) {
  const config = TENANT_CONFIG[tenant]
  
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 6px',
        fontSize: '10px',
        fontWeight: 600,
        borderRadius: '4px',
        backgroundColor: config.bgColor,
        color: config.color,
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}
    >
      {config.shortName}
    </span>
  )
}

export function TenantDot({ tenant, size = 8 }: { tenant: TenantId; size?: number }) {
  const config = TENANT_CONFIG[tenant]
  
  return (
    <span
      title={config.name}
      style={{
        display: 'inline-block',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: config.color
      }}
    />
  )
}

