import React from 'react'

interface IconWrapperProps {
  Icon: React.ComponentType<{ size?: number | string; color?: string }>
  size?: number
  color?: string
}

/**
 * Wrapper component for consistent icon sizing and styling
 * Used across multiple pages for uniform icon rendering
 */
export function IconWrapper({ Icon, size = 20, color = 'var(--color-text-secondary)' }: IconWrapperProps) {
  return <Icon size={size} color={color} />
}

