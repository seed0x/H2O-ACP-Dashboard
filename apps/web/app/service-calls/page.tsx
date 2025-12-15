'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { API_URL } from '../../lib/config'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Table } from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'

interface ServiceCall {
  id: number
  tenant_id: string
  builder_id: number
  customer_name: string
  address_line1: string
  city: string
  phone: string
  issue_description: string
  status: string
  priority: string
  created_at: string
}

export default function ServiceCallsPage() {
  const router = useRouter()
  const [serviceCalls, setServiceCalls] = useState<ServiceCall[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    loadServiceCalls()
  }, [])

  async function loadServiceCalls() {
    try {
      const response = await axios.get(`${API_URL}/service-calls?tenant_id=h2o`, { 
        withCredentials: true 
      })
      setServiceCalls(response.data)
      setLoading(false)
    } catch (error) {
      console.error('Failed to load service calls:', error)
      setLoading(false)
    }
  }

  const filteredCalls = serviceCalls.filter(call => {
    const matchesSearch = search === '' || 
      call.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      call.address_line1.toLowerCase().includes(search.toLowerCase()) ||
      call.issue_description.toLowerCase().includes(search.toLowerCase())
    
    const matchesStatus = statusFilter === '' || call.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const columns = [
    {
      header: 'Customer',
      accessor: 'customer_name' as keyof ServiceCall
    },
    {
      header: 'Address',
      accessor: (row: ServiceCall) => `${row.address_line1}, ${row.city}`
    },
    {
      header: 'Issue',
      accessor: (row: ServiceCall) => row.issue_description.substring(0, 50) + '...'
    },
    {
      header: 'Phone',
      accessor: 'phone' as keyof ServiceCall,
      width: '140px'
    },
    {
      header: 'Priority',
      accessor: (row: ServiceCall) => <StatusBadge status={row.priority} variant="priority" />,
      width: '120px'
    },
    {
      header: 'Status',
      accessor: (row: ServiceCall) => <StatusBadge status={row.status} />,
      width: '130px'
    },
    {
      header: 'Created',
      accessor: (row: ServiceCall) => new Date(row.created_at).toLocaleDateString(),
      width: '120px'
    }
  ]

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
          Loading service calls...
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader
        title="H2O Service Calls"
        description="Service and warranty call management"
        action={<Button onClick={() => router.push('/service-calls/new')}>+ New Service Call</Button>}
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '16px' 
        }}>
          <Input
            placeholder="Search customer, address, or issue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'New', label: 'New' },
              { value: 'Scheduled', label: 'Scheduled' },
              { value: 'Dispatched', label: 'Dispatched' },
              { value: 'Completed', label: 'Completed' },
              { value: 'On Hold', label: 'On Hold' }
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <Table
        data={filteredCalls}
        columns={columns}
        onRowClick={(call) => router.push(`/service-calls/${call.id}`)}
        emptyMessage="No service calls found. Create your first service call to get started."
      />
    </div>
  )
}
