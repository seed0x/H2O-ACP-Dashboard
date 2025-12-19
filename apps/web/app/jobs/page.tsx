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
import { showToast } from '../../components/Toast'
import { handleApiError } from '../../lib/error-handler'
import { QuickAction } from '../../components/QuickActions'
import { getPageTenant } from '../../contexts/TenantContext'

interface Job {
  id: string | number
  tenant_id: string
  builder_id: number
  community: string
  lot_number: string
  phase: string
  address_line1: string
  city: string
  status: string
  scheduled_start: string | null
  assigned_to?: string
}

export default function JobsPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    loadJobs()
  }, [])

  async function loadJobs() {
    try {
      const token = localStorage.getItem('token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      // Jobs are All County specific
      const tenantId = getPageTenant('jobs')
      const response = await axios.get(`${API_BASE_URL}/jobs?tenant_id=${tenantId}`, { 
        headers,
        withCredentials: true 
      })
      setJobs(Array.isArray(response.data) ? response.data : [])
      setLoading(false)
    } catch (error) {
      console.error('Failed to load jobs:', error)
      handleApiError(error, 'Loading jobs', loadJobs)
      setJobs([])
      setLoading(false)
    }
  }

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = search === '' || 
      job.community.toLowerCase().includes(search.toLowerCase()) ||
      job.lot_number.includes(search) ||
      job.address_line1.toLowerCase().includes(search.toLowerCase())
    
    const matchesStatus = statusFilter === '' || job.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  async function handleQuickComplete(jobId: string | number) {
    try {
      const token = localStorage.getItem('token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      await axios.patch(`${API_BASE_URL}/jobs/${jobId}`, 
        { status: 'Completed' },
        { headers, withCredentials: true }
      )
      showToast('Job marked as completed', 'success')
      await loadJobs()
    } catch (error: any) {
      logError(error, 'quickCompleteJob')
      showToast(handleApiError(error), 'error')
    }
  }

  function getQuickActions(job: Job): QuickAction[] {
    const actions: QuickAction[] = []
    
    if (job.status === 'In Progress') {
      actions.push({
        label: 'Mark Complete',
        onClick: (e) => {
          e.stopPropagation()
          handleQuickComplete(job.id)
        },
        variant: 'primary',
        show: true
      })
    }
    
    actions.push({
      label: 'View Details',
      onClick: (e) => {
        e.stopPropagation()
        router.push(`/jobs/${job.id}`)
      },
      variant: 'secondary',
      show: true
    })
    
    return actions
  }

  const columns = [
    {
      header: 'Community',
      accessor: 'community' as keyof Job
    },
    {
      header: 'Lot',
      accessor: 'lot_number' as keyof Job,
      width: '100px'
    },
    {
      header: 'Phase',
      accessor: 'phase' as keyof Job,
      width: '120px'
    },
    {
      header: 'Address',
      accessor: (row: Job) => `${row.address_line1}, ${row.city}`
    },
    {
      header: 'Status',
      accessor: (row: Job) => <StatusBadge status={row.status} />,
      width: '150px'
    },
    {
      header: 'Scheduled Start',
      accessor: (row: Job) => row.scheduled_start 
        ? new Date(row.scheduled_start).toLocaleDateString() 
        : 'Not scheduled',
      width: '150px'
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
          Loading jobs...
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader
        title="All County Jobs"
        description="New construction projects and installations"
        action={<Button onClick={() => router.push('/jobs/new')}>+ New Job</Button>}
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
            placeholder="Search community, lot, or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'New', label: 'New' },
              { value: 'Scheduled', label: 'Scheduled' },
              { value: 'In Progress', label: 'In Progress' },
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
        data={filteredJobs}
        columns={columns}
        onRowClick={(job) => router.push(`/jobs/${job.id}`)}
        emptyMessage="No jobs found. Create your first job to get started."
        actions={getQuickActions}
      />
    </div>
  )
}
