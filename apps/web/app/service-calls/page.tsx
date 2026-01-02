'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { API_BASE_URL } from '../../lib/config'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Table } from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/StatusBadge'
import UilCheckCircle from '@iconscout/react-unicons/icons/uil-check-circle'
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
  additional_techs?: string
  payment_status?: string
  billing_writeup_status?: string
  paperwork_turned_in?: boolean
  scheduled_start?: string
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

  function formatTableCell(value: any): React.ReactNode {
    if (!value || value === 'null' || value === 'undefined' || value === null || value === '') {
      return (
        <div className="flex items-center justify-center text-[var(--color-text-secondary)]/50" style={{ minHeight: '100%' }}>
          —
        </div>
      )
    }
    return String(value)
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
      accessor: (row: ServiceCall) => row.customer_name ? (
        <a
          href={`/customers?search=${encodeURIComponent(row.customer_name)}`}
          style={{ 
            color: 'var(--color-primary)', 
            textDecoration: 'none',
            fontWeight: 500
          }}
          onClick={(e) => {
            e.stopPropagation()
            router.push(`/customers?search=${encodeURIComponent(row.customer_name)}`)
          }}
          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
        >
          {row.customer_name}
        </a>
      ) : formatTableCell(null)
    },
    {
      header: 'Address',
      accessor: (row: ServiceCall) => formatTableCell(`${row.address_line1 || ''}, ${row.city || ''}`.trim().replace(/^,\s*|,\s*$/g, '') || null)
    },
    {
      header: 'Issue',
      accessor: (row: ServiceCall) => (
        <div style={{ maxWidth: '300px' }}>
          {formatTableCell(row.issue_description ? row.issue_description.substring(0, 60) + (row.issue_description.length > 60 ? '...' : '') : null)}
        </div>
      )
    },
    {
      header: 'Tech(s)',
      accessor: (row: ServiceCall) => {
        const techs = []
        if (row.assigned_to) techs.push(row.assigned_to)
        if (row.additional_techs) techs.push(...row.additional_techs.split(',').map(t => t.trim()).filter(Boolean))
        return techs.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {techs.map((tech, idx) => (
              <span key={idx} style={{
                padding: '2px 8px',
                backgroundColor: 'var(--color-hover)',
                borderRadius: '4px',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-primary)'
              }}>
                {tech}
              </span>
            ))}
          </div>
        ) : formatTableCell(null)
      },
      width: '150px'
    },
    {
      header: 'Scheduled',
      accessor: (row: ServiceCall) => {
        if (!row.scheduled_start) return formatTableCell(null)
        const date = new Date(row.scheduled_start)
        return (
          <div style={{ fontSize: 'var(--text-sm)' }}>
            <div style={{ fontWeight: 500 }}>{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
              {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </div>
          </div>
        )
      },
      width: '120px'
    },
    {
      header: 'Payment',
      accessor: (row: ServiceCall) => {
        if (!row.payment_status) return formatTableCell(null)
        const colorMap: Record<string, string> = {
          'Paid': 'green',
          'Unpaid': 'red',
          'Partial': 'yellow',
          'Pending': 'blue'
        }
        const variant = (colorMap[row.payment_status] || 'default') as 'default' | 'success' | 'error' | 'warning' | 'info' | 'priority' | 'category'
        return <StatusBadge status={row.payment_status} variant={variant} />
      },
      width: '100px'
    },
    {
      header: 'Paperwork',
      accessor: (row: ServiceCall) => row.paperwork_turned_in ? (
        <span style={{ 
          padding: '4px 8px',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          color: 'rgb(34, 197, 94)',
          borderRadius: '4px',
          fontSize: 'var(--text-xs)',
          fontWeight: 500
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <UilCheckCircle size={12} color="rgb(34, 197, 94)" />
            Turned In
          </div>
        </span>
      ) : formatTableCell(null),
      width: '110px'
    },
    {
      header: 'Priority',
      accessor: (row: ServiceCall) => row.priority ? <StatusBadge status={row.priority} variant="priority" /> : formatTableCell(null),
      width: '100px'
    },
    {
      header: 'Status',
      accessor: (row: ServiceCall) => row.status ? <StatusBadge status={row.status} /> : formatTableCell(null),
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
