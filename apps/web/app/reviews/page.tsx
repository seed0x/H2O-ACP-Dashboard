'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Table } from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { reviewApi, ReviewRequest, Review, RecoveryTicket } from '../../lib/api/reviews'
import axios from 'axios'
import { API_BASE_URL } from '../../lib/config'
import { showToast } from '../../components/Toast'
import { handleApiError, logError } from '../../lib/error-handler'
import { QuickAction } from '../../components/QuickActions'

export default function ReviewsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'requests' | 'reviews' | 'tickets'>('requests')
  const [reviewRequests, setReviewRequests] = useState<ReviewRequest[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [recoveryTickets, setRecoveryTickets] = useState<RecoveryTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const tenantId = 'h2o'

  useEffect(() => {
    loadData()
  }, [activeTab, statusFilter])

  async function loadData() {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      const config = { headers, withCredentials: true }

      if (activeTab === 'requests') {
        const data = await reviewApi.listRequests(tenantId, statusFilter || undefined)
        setReviewRequests(Array.isArray(data) ? data : [])
      } else if (activeTab === 'reviews') {
        const data = await reviewApi.listReviews(tenantId)
        setReviews(Array.isArray(data) ? data : [])
      } else if (activeTab === 'tickets') {
        const data = await reviewApi.listRecoveryTickets(tenantId, statusFilter || undefined)
        setRecoveryTickets(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      logError(error, 'loadData')
      // Don't show toast for initial load errors, just log them
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load data:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  const filteredRequests = reviewRequests.filter(r => 
    !search || r.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    r.customer_email?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredReviews = reviews.filter(r =>
    !search || r.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    r.comment?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredTickets = recoveryTickets.filter(t =>
    !search || t.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    t.issue_description.toLowerCase().includes(search.toLowerCase())
  )

  const handleMakePublic = async (reviewId: string) => {
    try {
      await reviewApi.updateReview(reviewId, { is_public: true })
      await loadData()
      showToast('Review made public successfully', 'success')
    } catch (error) {
      logError(error, 'makeReviewPublic')
      showToast(handleApiError(error), 'error')
    }
  }

  const handleUpdateTicketStatus = async (ticketId: string, status: string) => {
    try {
      await reviewApi.updateRecoveryTicket(ticketId, { status })
      await loadData()
      showToast('Ticket status updated successfully', 'success')
    } catch (error) {
      logError(error, 'updateTicketStatus')
      showToast(handleApiError(error), 'error')
    }
  }

  const handleSendRequest = async (requestId: string) => {
    try {
      await reviewApi.sendRequest(requestId)
      await loadData()
      showToast('Review request sent successfully', 'success')
    } catch (error) {
      logError(error, 'sendReviewRequest')
      showToast(handleApiError(error), 'error')
    }
  }

  const handleBulkSend = async (requestIds: string[]) => {
    try {
      await Promise.all(requestIds.map(id => reviewApi.sendRequest(id)))
      await loadData()
      showToast(`Sent ${requestIds.length} review request(s) successfully`, 'success')
    } catch (error) {
      logError(error, 'bulkSendReviewRequests')
      showToast(handleApiError(error), 'error')
    }
  }

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader
        title="Review Management"
        description="Manage review requests, customer reviews, and recovery tickets"
      />

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'requests', label: 'Review Requests' },
            { id: 'reviews', label: 'Reviews' },
            { id: 'tickets', label: 'Recovery Tickets' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '12px 24px',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === tab.id ? '#111827' : '#6b7280',
                fontWeight: activeTab === tab.id ? '600' : '500',
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'center' }}>
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '300px' }}
        />
        {activeTab !== 'reviews' && (
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '200px' }}
            options={activeTab === 'requests' ? [
              { value: '', label: 'All Statuses' },
              { value: 'pending', label: 'Pending' },
              { value: 'sent', label: 'Sent' },
              { value: 'completed', label: 'Completed' },
              { value: 'expired', label: 'Expired' },
            ] : [
              { value: '', label: 'All Statuses' },
              { value: 'open', label: 'Open' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'closed', label: 'Closed' },
            ]}
          />
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div>Loading...</div>
      ) : activeTab === 'requests' ? (
        <div>
          {/* Production Queue Header */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '16px',
            padding: '16px',
            backgroundColor: 'var(--color-card)',
            borderRadius: '8px',
            border: '1px solid var(--color-border)'
          }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px', color: 'var(--color-text-primary)' }}>
                Review Request Queue
              </h3>
              <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                {filteredRequests.filter(r => r.status === 'pending').length} pending • {filteredRequests.filter(r => r.status === 'sent').length} sent
              </div>
            </div>
            {filteredRequests.filter(r => r.status === 'pending' && r.customer_email).length > 0 && (
              <Button 
                onClick={() => {
                  const pendingIds = filteredRequests
                    .filter(r => r.status === 'pending' && r.customer_email)
                    .map(r => r.id)
                  handleBulkSend(pendingIds)
                }}
              >
                Send All Pending ({filteredRequests.filter(r => r.status === 'pending' && r.customer_email).length})
              </Button>
            )}
          </div>
          <Table
            columns={[
              { header: 'Customer', accessor: 'customer_name' },
              { header: 'Email', accessor: 'customer_email' },
              { header: 'Status', accessor: (row: ReviewRequest) => <StatusBadge status={row.status} /> },
              { header: 'Days Since', accessor: (row: ReviewRequest) => {
                const daysSince = Math.floor((new Date().getTime() - new Date(row.created_at).getTime()) / (1000 * 60 * 60 * 24))
                return `${daysSince} day${daysSince !== 1 ? 's' : ''}`
              }},
              { header: 'Sent', accessor: (row: ReviewRequest) => row.sent_at ? new Date(row.sent_at).toLocaleDateString() : '-' },
            ]}
            data={filteredRequests}
            onRowClick={(row) => router.push(`/review-requests/${row.id}`)}
            actions={(row: ReviewRequest) => {
              const actions: QuickAction[] = []
              if (row.status === 'pending' && row.customer_email) {
                actions.push({
                  label: 'Send Now',
                  onClick: (e) => {
                    e.stopPropagation()
                    handleSendRequest(row.id)
                  },
                  variant: 'primary',
                  show: true
                })
              }
              actions.push({
                label: 'View Details',
                onClick: (e) => {
                  e.stopPropagation()
                  router.push(`/review-requests/${row.id}`)
                },
                variant: 'secondary',
                show: true
              })
              return actions
            }}
          />
        </div>
      ) : activeTab === 'reviews' ? (
        <Table
          columns={[
            { header: 'Customer', accessor: 'customer_name' },
            { header: 'Rating', accessor: (row: Review) => '⭐'.repeat(row.rating) },
            { header: 'Comment', accessor: (row: Review) => row.comment ? (row.comment.length > 50 ? row.comment.substring(0, 50) + '...' : row.comment) : '-' },
            { header: 'Public', accessor: (row: Review) => row.is_public ? 'Yes' : 'No' },
            { header: 'Created', accessor: (row: Review) => new Date(row.created_at).toLocaleDateString() },
          ]}
          data={filteredReviews}
          onRowClick={(row) => router.push(`/reviews/${row.id}`)}
          actions={(row: Review) => {
            const actions: QuickAction[] = []
            if (!row.is_public) {
              actions.push({
                label: 'Make Public',
                onClick: (e) => {
                  e.stopPropagation()
                  handleMakePublic(row.id)
                },
                variant: 'primary',
                show: true
              })
            }
            actions.push({
              label: 'View Details',
              onClick: (e) => {
                e.stopPropagation()
                router.push(`/reviews/${row.id}`)
              },
              variant: 'secondary',
              show: true
            })
            return actions
          }}
        />
      ) : (
        <Table
          columns={[
            { header: 'Customer', accessor: 'customer_name' },
            { header: 'Issue', accessor: (row: RecoveryTicket) => row.issue_description.length > 50 ? row.issue_description.substring(0, 50) + '...' : row.issue_description },
            { header: 'Status', accessor: (row: RecoveryTicket) => <StatusBadge status={row.status} /> },
            { header: 'Assigned To', accessor: (row: RecoveryTicket) => row.assigned_to || '-' },
            { header: 'Created', accessor: (row: RecoveryTicket) => new Date(row.created_at).toLocaleDateString() },
          ]}
          data={filteredTickets}
          onRowClick={(row) => router.push(`/recovery-tickets/${row.id}`)}
          actions={(row: RecoveryTicket) => {
            const actions: QuickAction[] = []
            actions.push({
              label: 'Update Status',
              onClick: (e) => {
                e.stopPropagation()
                const newStatus = prompt('Enter new status (open, in_progress, resolved, closed):', row.status)
                if (newStatus && ['open', 'in_progress', 'resolved', 'closed'].includes(newStatus)) {
                  handleUpdateTicketStatus(row.id, newStatus)
                }
              },
              variant: 'secondary',
              show: true
            })
            actions.push({
              label: 'View Details',
              onClick: (e) => {
                e.stopPropagation()
                router.push(`/recovery-tickets/${row.id}`)
              },
              variant: 'secondary',
              show: true
            })
            return actions
          }}
        />
      )}
    </div>
  )
}

