'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { API_BASE_URL } from '../../lib/config'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { showToast } from '../../components/Toast'
import { handleApiError, logError } from '../../lib/error-handler'

interface PortalAccount {
  id: string
  portal_definition: {
    id: string
    name: string
    category: string
    jurisdiction: string | null
    base_url: string
    support_phone: string | null
  }
  tenant_id: string
  login_identifier: string
  account_number: string | null
  credential_vault_ref: string | null
  notes: string | null
  owner: string | null
  last_verified_at: string | null
  is_active: boolean
  created_at: string
}

export default function DirectoryPage() {
  const router = useRouter()
  const [portals, setPortals] = useState<PortalAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tenantFilter, setTenantFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  useEffect(() => {
    loadPortals()
  }, [tenantFilter])

  async function loadPortals() {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      
      const params: any = {}
      if (tenantFilter) params.tenant_id = tenantFilter
      if (search) params.search = search
      
      const response = await axios.get(`${API_BASE_URL}/directory/portal-accounts`, {
        headers,
        params,
        withCredentials: true
      })
      setPortals(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      logError(error, 'loadPortals')
      setPortals([])
    } finally {
      setLoading(false)
    }
  }

  function handleSearch() {
    loadPortals()
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`${label} copied to clipboard`, 'success')
    }).catch(() => {
      showToast(`Failed to copy ${label}`, 'error')
    })
  }

  function openPortal(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const filteredPortals = portals.filter(portal => {
    if (categoryFilter && portal.portal_definition.category !== categoryFilter) return false
    return true
  })

  const categories = ['permit', 'inspection', 'utility', 'vendor', 'builder', 'warranty', 'finance', 'other']

  if (loading) {
    return (
      <div style={{ padding: '32px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '400px',
          color: 'var(--color-text-secondary)'
        }}>
          Loading portals...
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader
        title="Portals Directory"
        description="Centralized access to vendor, permit, inspection, and utility portals"
      />

      {/* Filters */}
      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '16px'
        }}>
          <Input
            placeholder="Search portals, login, or account #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Select
            options={[
              { value: '', label: 'All Tenants' },
              { value: 'h2o', label: 'H2O' },
              { value: 'all_county', label: 'All County' }
            ]}
            value={tenantFilter}
            onChange={(e) => setTenantFilter(e.target.value)}
          />
          <Select
            options={[
              { value: '', label: 'All Categories' },
              ...categories.map(cat => ({ value: cat, label: cat.charAt(0).toUpperCase() + cat.slice(1) }))
            ]}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          />
        </div>
        <Button onClick={handleSearch} variant="secondary">Search</Button>
      </div>

      {/* Portals List */}
      {filteredPortals.length === 0 ? (
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '48px',
          textAlign: 'center',
          color: 'var(--color-text-secondary)'
        }}>
          No portals found. {search && 'Try adjusting your search.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {filteredPortals.map(portal => (
            <div
              key={portal.id}
              style={{
                backgroundColor: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: 'var(--color-text-primary)',
                    marginBottom: '4px'
                  }}>
                    {portal.portal_definition.name}
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: 'var(--color-text-secondary)',
                    marginBottom: '8px'
                  }}>
                    {portal.portal_definition.jurisdiction && `${portal.portal_definition.jurisdiction} • `}
                    <StatusBadge status={portal.portal_definition.category} variant="category" />
                    {' • '}
                    <StatusBadge status={portal.tenant_id} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <Button
                    variant="primary"
                    onClick={() => openPortal(portal.portal_definition.base_url)}
                    style={{ fontSize: '13px', padding: '8px 16px' }}
                  >
                    Open Portal
                  </Button>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                padding: '12px',
                backgroundColor: 'var(--color-background)',
                borderRadius: '8px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Login</div>
                  <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {portal.login_identifier}
                    <button
                      onClick={() => copyToClipboard(portal.login_identifier, 'Login')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-primary)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '4px 8px'
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
                {portal.account_number && (
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Account #</div>
                    <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {portal.account_number}
                      <button
                        onClick={() => copyToClipboard(portal.account_number!, 'Account number')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-primary)',
                          cursor: 'pointer',
                          fontSize: '12px',
                          padding: '4px 8px'
                        }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
                {portal.portal_definition.support_phone && (
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Support</div>
                    <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                      <a href={`tel:${portal.portal_definition.support_phone}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                        {portal.portal_definition.support_phone}
                      </a>
                    </div>
                  </div>
                )}
                {portal.owner && (
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Owner</div>
                    <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>{portal.owner}</div>
                  </div>
                )}
                {portal.last_verified_at && (
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Last Verified</div>
                    <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                      {new Date(portal.last_verified_at).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>

              {portal.credential_vault_ref && (
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                  Credentials: {portal.credential_vault_ref}
                </div>
              )}
              {portal.notes && (
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', padding: '8px', backgroundColor: 'var(--color-background)', borderRadius: '6px' }}>
                  {portal.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}






