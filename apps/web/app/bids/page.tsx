'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../../lib/config'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { StatusBadge } from '../../components/ui/StatusBadge'

export default function BidsPage(){
  const [bids, setBids] = useState<any[]>([])
  const [tenant, setTenant] = useState('all_county')
  const [search, setSearch] = useState('')
  const [builderId, setBuilderId] = useState('')
  const [status, setStatus] = useState('')
  const [builders, setBuilders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [error, setError] = useState<string>('')

  function getAuthHeaders() {
    const token = localStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }

  useEffect(()=>{
    async function load(){
      try {
        setLoading(true)
        const headers = getAuthHeaders()
        const b = await axios.get(`${API_BASE_URL}/builders`, { headers, withCredentials: true })
        setBuilders(Array.isArray(b.data) ? b.data : [])
        const res = await axios.get(`${API_BASE_URL}/bids`, { 
          headers,
          params: { tenant_id: tenant, search, builder_id: builderId || undefined, status: status || undefined }, 
          withCredentials: true 
        })
        setBids(Array.isArray(res.data) ? res.data : [])
      } catch (err: any) {
        console.error('Failed to load bids:', err)
        setBids([])
        setBuilders([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function searchNow(){
    try {
      setError('')
      const headers = getAuthHeaders()
      const res = await axios.get(`${API_BASE_URL}/bids`, { 
        headers,
        params: { tenant_id: tenant, search, builder_id: builderId || undefined, status: status || undefined }, 
        withCredentials: true 
      })
      setBids(Array.isArray(res.data) ? res.data : [])
    } catch (err: any) {
      console.error('Failed to search bids:', err)
      setError(err.response?.data?.detail || 'Failed to search bids')
      setBids([])
    }
  }

  async function create(){
    try{
      setError('')
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Not authenticated. Please log in again.')
      }

      const body = {
        tenant_id: tenant,
        project_name: 'Project ' + Math.random().toString(36).slice(2,6),
        status: 'Draft',
        builder_id: builderId || builders[0]?.id
      }
      await axios.post(`${API_BASE_URL}/bids`, body, { 
        headers: { 'Authorization': `Bearer ${token}` },
        withCredentials: true 
      })
      await searchNow()
    } catch (err: any){
      console.error('Failed to create bid:', err)
      setError(err?.response?.data?.detail || err.message || 'Failed to create bid')
    }
  }

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
          Loading bids...
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader
        title="Bids"
        description="Manage project bids and proposals"
        action={<Button onClick={create}>+ New Bid</Button>}
      />

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: 'rgba(239, 83, 80, 0.1)',
          border: '1px solid #EF5350',
          borderRadius: '8px',
          color: '#EF5350',
          fontSize: '14px',
          marginBottom: '24px'
        }}>
          {error}
        </div>
      )}

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
          <Select
            options={[
              { value: 'all_county', label: 'All County' },
              { value: 'h2o', label: 'H2O' }
            ]}
            value={tenant}
            onChange={(e) => setTenant(e.target.value)}
          />
          <Input
            placeholder="Search bids..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            options={[
              { value: '', label: 'Any Builder' },
              ...builders.map(b => ({ value: b.id.toString(), label: b.name }))
            ]}
            value={builderId}
            onChange={(e) => setBuilderId(e.target.value)}
          />
          <Select
            options={[
              { value: '', label: 'Any Status' },
              { value: 'Draft', label: 'Draft' },
              { value: 'Sent', label: 'Sent' },
              { value: 'Won', label: 'Won' },
              { value: 'Lost', label: 'Lost' }
            ]}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
        </div>
        <Button onClick={searchNow} variant="secondary">Search</Button>
      </div>

      {/* Bids List */}
      {bids.length === 0 ? (
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '48px',
          textAlign: 'center',
          color: 'var(--color-text-secondary)'
        }}>
          No bids found. Create your first bid to get started.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {bids.map(b => (
            <a
              key={b.id}
              href={`/bids/${b.id}`}
              style={{
                display: 'block',
                backgroundColor: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
                padding: '20px',
                textDecoration: 'none',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: 'var(--color-text-primary)',
                    marginBottom: '8px'
                  }}>
                    {b.project_name}
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: 'var(--color-text-secondary)',
                    marginBottom: '4px'
                  }}>
                    Tenant: {b.tenant_id}
                  </div>
                </div>
                <StatusBadge status={b.status} />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
