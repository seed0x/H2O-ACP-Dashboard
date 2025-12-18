'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { API_BASE_URL } from '../../lib/config'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Table } from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { QuickAction } from '../../components/QuickActions'
import { showToast } from '../../components/Toast'
import { handleApiError, logError } from '../../lib/error-handler'

interface ServiceCall {
  id: string | number
  tenant_id: string
  builder_id: number
  customer_name: string
  address_line1: string
  city: string
  phone: string
  email?: string
  issue_description: string
  status: string
  priority: string
  created_at: string
  assigned_to?: string
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
      const token = localStorage.getItem('token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      const response = await axios.get(`${API_BASE_URL}/service-calls?tenant_id=h2o`, { 
        headers,
        withCredentials: true 
      })
      setServiceCalls(Array.isArray(response.data) ? response.data : [])
      setLoading(false)
    } catch (error) {
      console.error('Failed to load service calls:', error)
      setServiceCalls([])
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

  async function handleQuickComplete(callId: string | number) {
    try {
      const token = localStorage.getItem('token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      await axios.patch(`${API_BASE_URL}/service-calls/${callId}`, 
        { status: 'Completed' },
        { headers, withCredentials: true }
      )
      showToast('Service call marked as completed', 'success')
      await loadServiceCalls()
    } catch (error: any) {
      logError(error, 'quickCompleteServiceCall')
      showToast(handleApiError(error), 'error')
    }
  }

  async function handleCreateReview(callId: string | number) {
    try {
      const token = localStorage.getItem('token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      const call = serviceCalls.find(c => c.id === callId)
      if (!call || !call.email) {
        showToast('Service call must have customer email to create review request', 'error')
        return
      }
      await axios.post(`${API_BASE_URL}/reviews/requests`, {
        tenant_id: call.tenant_id,
        service_call_id: callId,
        customer_name: call.customer_name,
        customer_email: call.email,
        customer_phone: call.phone
      }, { headers, withCredentials: true })
      showToast('Review request created successfully', 'success')
      await loadServiceCalls()
    } catch (error: any) {
      logError(error, 'createReviewRequest')
      showToast(handleApiError(error), 'error')
    }
  }

  function getQuickActions(call: ServiceCall): QuickAction[] {
    const actions: QuickAction[] = []
    
    if (call.status !== 'Completed') {
      actions.push({
        label: 'Mark Complete',
        onClick: (e) => {
          e.stopPropagation()
          handleQuickComplete(call.id)
        },
        variant: 'primary',
        show: true
      })
    }
    
    if (call.status === 'Completed' && call.email) {
      actions.push({
        label: 'Create Review',
        onClick: (e) => {
          e.stopPropagation()
          handleCreateReview(call.id)
        },
        variant: 'secondary',
        show: true
      })
    }
    
    actions.push({
      label: 'View Details',
      onClick: (e) => {
        e.stopPropagation()
        router.push(`/service-calls/${call.id}`)
      },
      variant: 'secondary',
      show: true
    })
    
    return actions
  }

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
        actions={getQuickActions}
      />
    </div>
  )
}
