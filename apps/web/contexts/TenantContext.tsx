'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'

export type TenantId = 'all_county' | 'h2o' | 'both'

interface TenantContextType {
  currentTenant: TenantId
  setTenant: (tenant: TenantId) => void
  userDefaultTenant: TenantId | null
  canAccessTenant: (tenant: TenantId) => boolean
  getTenantName: (tenant: TenantId) => string
  getTenantColor: (tenant: TenantId) => string
  isTenantSelected: (tenant: TenantId) => boolean
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

export const TENANT_CONFIG: Record<TenantId, { 
  name: string
  shortName: string
  icon: string 
  color: string
  bgColor: string
  borderColor: string
}> = {
  all_county: {
    name: 'All County',
    shortName: 'AC',
    icon: '🏗️',
    color: '#2563eb',
    bgColor: 'rgba(37, 99, 235, 0.1)',
    borderColor: 'rgba(37, 99, 235, 0.3)'
  },
  h2o: {
    name: 'H2O',
    shortName: 'H2O',
    icon: '💧',
    color: '#0d9488',
    bgColor: 'rgba(13, 148, 136, 0.1)',
    borderColor: 'rgba(13, 148, 136, 0.3)'
  },
  both: {
    name: 'Both Tenants',
    shortName: 'All',
    icon: '👥',
    color: '#7c3aed',
    bgColor: 'rgba(124, 58, 237, 0.1)',
    borderColor: 'rgba(124, 58, 237, 0.3)'
  }
}

interface TenantProviderProps {
  children: ReactNode
}

export function TenantProvider({ children }: TenantProviderProps) {
  const [currentTenant, setCurrentTenant] = useState<TenantId>('both')
  const [userDefaultTenant, setUserDefaultTenant] = useState<TenantId | null>(null)
  const [initialized, setInitialized] = useState(false)
  
  useEffect(() => {
    try {
      const token = localStorage.getItem('token')
      
      if (token) {
        const parts = token.split('.')
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]))
          const tenantFromToken = payload.tenant_id as TenantId | null
          
          setUserDefaultTenant(tenantFromToken)
          
          const savedTenant = localStorage.getItem('selectedTenant') as TenantId | null
          
          if (savedTenant && isValidTenant(savedTenant)) {
            setCurrentTenant(savedTenant)
          } else if (tenantFromToken && isValidTenant(tenantFromToken)) {
            setCurrentTenant(tenantFromToken)
          } else {
            setCurrentTenant('both')
          }
        }
      }
    } catch (error) {
      console.error('Failed to parse token for tenant:', error)
      setCurrentTenant('both')
    }
    
    setInitialized(true)
  }, [])
  
  const setTenant = useCallback((tenant: TenantId) => {
    setCurrentTenant(tenant)
    localStorage.setItem('selectedTenant', tenant)
  }, [])
  
  const canAccessTenant = useCallback((tenant: TenantId): boolean => {
    if (!userDefaultTenant) return true
    if (tenant === userDefaultTenant) return true
    if (tenant === 'both') return !userDefaultTenant
    return false
  }, [userDefaultTenant])
  
  const getTenantName = useCallback((tenant: TenantId): string => {
    return TENANT_CONFIG[tenant]?.name || tenant
  }, [])
  
  const getTenantColor = useCallback((tenant: TenantId): string => {
    return TENANT_CONFIG[tenant]?.color || '#6b7280'
  }, [])
  
  const isTenantSelected = useCallback((tenant: TenantId): boolean => {
    if (currentTenant === 'both') return true
    return currentTenant === tenant
  }, [currentTenant])
  
  if (!initialized) {
    return null
  }
  
  return (
    <TenantContext.Provider value={{
      currentTenant,
      setTenant,
      userDefaultTenant,
      canAccessTenant,
      getTenantName,
      getTenantColor,
      isTenantSelected
    }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}

function isValidTenant(tenant: string): tenant is TenantId {
  return tenant === 'all_county' || tenant === 'h2o' || tenant === 'both'
}

export function useTenantParam() {
  const { currentTenant } = useTenant()
  
  return useCallback((defaultTenant?: TenantId): string | undefined => {
    if (defaultTenant && defaultTenant !== 'both') {
      return defaultTenant
    }
    if (currentTenant === 'both') {
      return undefined
    }
    return currentTenant
  }, [currentTenant])
}

/**
 * Build API query string with tenant_id parameter
 * Use this when calling endpoints that require tenant_id
 * 
 * @param requiredTenant - The tenant this endpoint requires (e.g., 'h2o' for reviews)
 * @param currentTenant - The user's currently selected tenant
 * @param additionalParams - Any other query params to include
 */
export function buildTenantQuery(
  requiredTenant: 'h2o' | 'all_county',
  currentTenant: TenantId,
  additionalParams?: Record<string, string>
): string {
  const params = new URLSearchParams()
  
  // Always pass the required tenant for tenant-specific endpoints
  // When user selects 'both', still use the required tenant for the endpoint
  params.set('tenant_id', requiredTenant)
  
  if (additionalParams) {
    Object.entries(additionalParams).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
  }
  
  return params.toString()
}

/**
 * Build optional tenant query - returns empty string if 'both' is selected
 * Use this for endpoints that support filtering by tenant but don't require it
 */
export function buildOptionalTenantQuery(
  currentTenant: TenantId,
  defaultTenant?: 'h2o' | 'all_county'
): string {
  if (currentTenant === 'both') {
    return defaultTenant ? `tenant_id=${defaultTenant}` : ''
  }
  return `tenant_id=${currentTenant}`
}

export function getPageTenant(pageName: string): TenantId {
  switch (pageName) {
    case 'marketing':
    case 'service-calls':
    case 'reviews':
      return 'h2o'
    case 'jobs':
      return 'all_county'
    default:
      return 'both'
  }
}

