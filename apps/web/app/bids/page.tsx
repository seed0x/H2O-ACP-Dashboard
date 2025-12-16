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

  useEffect(()=>{
    const token = localStorage.getItem('token')
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    async function load(){
      try {
        const b = await axios.get(`${API_BASE_URL}/builders`, { withCredentials: true })
        setBuilders(b.data)
        const res = await axios.get(`${API_BASE_URL}/bids`, { params: { tenant_id: tenant, search, builder_id: builderId || undefined, status: status || undefined }, withCredentials: true })
        setBids(res.data)
      } catch (err) {
        console.error('Failed to load bids:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function searchNow(){
    try {
      const res = await axios.get(`${API_BASE_URL}/bids`, { params: { tenant_id: tenant, search, builder_id: builderId || undefined, status: status || undefined }, withCredentials: true })
      setBids(res.data)
    } catch (err) {
      console.error('Failed to search bids:', err)
    }
  }

  async function create(){
    try{
      const tok = localStorage.getItem('token')
      axios.defaults.headers.common['Authorization'] = `Bearer ${tok}`
      const body = {
        tenant_id: tenant,
        project_name: 'Project ' + Math.random().toString(36).slice(2,6),
        status: 'Draft',
        builder_id: builderId || builders[0]?.id
      }
      await axios.post(`${API_BASE_URL}/bids`, body, { withCredentials: true })
      await searchNow()
    } catch (err: any){
      alert(err?.response?.data?.detail || 'Failed to create')
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
