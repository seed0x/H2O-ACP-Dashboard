'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { API_BASE_URL } from '../../lib/config'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Table } from '../../components/ui/Table'
import { Card } from '../../components/ui/Card'
import { useTenant, getPageTenant } from '../../contexts/TenantContext'
import { logError } from '../../lib/error-handler'

interface Customer {
  id: string
  tenant_id: string
  name: string
  phone?: string
  email?: string
  address_line1?: string
  city?: string
  state?: string
  zip?: string
  service_calls_count?: number
  created_at: string
}

export default function CustomersPage() {
  const router = useRouter()
  const { currentTenant } = useTenant()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (currentTenant) {
      loadCustomers()
    }
  }, [currentTenant, search])

  async function loadCustomers() {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      
      // Customers are only for H2O tenant (marketing page tenant)
      const tenantId = currentTenant === 'both' ? getPageTenant('marketing') : (currentTenant || getPageTenant('marketing'))
      const params: any = { tenant_id: tenantId }
      if (search) params.search = search
      
      const response = await axios.get(`${API_BASE_URL}/customers`, {
        headers,
        params,
        withCredentials: true
      })
      
      setCustomers(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      logError(error, 'loadCustomers')
      setCustomers([])
    } finally {
      setLoading(false)
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

  const columns = [
    {
      header: 'Name',
      accessor: (row: Customer) => (
        <a
          href={`/customers/${row.id}`}
          style={{ 
            color: 'var(--color-primary)', 
            textDecoration: 'none',
            fontWeight: 500
          }}
          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
        >
          {row.name}
        </a>
      )
    },
    {
      header: 'Phone',
      accessor: (row: Customer) => row.phone ? (
        <a 
          href={`tel:${row.phone}`} 
          style={{ 
            color: 'var(--color-primary)', 
            textDecoration: 'none'
          }}
          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
        >
          {row.phone}
        </a>
      ) : formatTableCell(null),
      width: '140px'
    },
    {
      header: 'Email',
      accessor: (row: Customer) => row.email ? (
        <a 
          href={`mailto:${row.email}`} 
          style={{ 
            color: 'var(--color-primary)', 
            textDecoration: 'none'
          }}
          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
        >
          {row.email}
        </a>
      ) : formatTableCell(null),
      width: '200px'
    },
    {
      header: 'Address',
      accessor: (row: Customer) => formatTableCell(
        [row.address_line1, row.city, row.state, row.zip]
          .filter(Boolean)
          .join(', ') || null
      )
    },
    {
      header: 'Service Calls',
      accessor: (row: Customer) => (
        <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>
          {row.service_calls_count || 0}
        </span>
      ),
      width: '120px'
    },
    {
      header: 'Created',
      accessor: (row: Customer) => formatTableCell(
        row.created_at ? new Date(row.created_at).toLocaleDateString() : null
      ),
      width: '120px'
    }
  ]

  if (loading) {
    return (
      <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
        <div 
          className="animate-spin rounded-full border-4 border-t-transparent"
          style={{
            width: '40px',
            height: '40px',
            borderColor: 'var(--color-border)',
            borderTopColor: 'var(--color-primary)',
            margin: '0 auto 16px'
          }}
        />
        <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
          Loading customers...
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <PageHeader
        title="Customers"
        description="Manage customer relationships and view service history"
        action={<Button onClick={() => router.push('/customers/new')}>+ New Customer</Button>}
      />

      {/* Search */}
      <Card className="mb-6">
        <Input
          placeholder="Search by name, phone, email, or address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Card>

      {/* Table */}
      <Table
        data={customers}
        columns={columns}
        onRowClick={(customer) => router.push(`/customers/${customer.id}`)}
        emptyMessage="No customers found. Create your first customer to get started."
      />
    </div>
  )
}

