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
              { header: 'Status', accessor: 'status' },
              { header: 'Days Since', accessor: 'days_since' },
              { header: 'Sent', accessor: 'sent_at' },
              { header: 'Actions', accessor: 'actions' },
            ]}
            data={filteredRequests.map(r => {
              const daysSince = Math.floor((new Date().getTime() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24))
              return {
                ...r,
                status: <StatusBadge status={r.status} />,
                days_since: `${daysSince} day${daysSince !== 1 ? 's' : ''}`,
                sent_at: r.sent_at ? new Date(r.sent_at).toLocaleDateString() : '-',
                actions: r.status === 'pending' && r.customer_email ? (
                  <Button 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSendRequest(r.id)
                    }}
                  >
                    Send
                  </Button>
                ) : '-',
              }
            })}
            onRowClick={(row) => router.push(`/review-requests/${row.id}`)}
          />
        </div>
      ) : activeTab === 'reviews' ? (
        <Table
          columns={[
            { header: 'Customer', accessor: 'customer_name' },
            { header: 'Rating', accessor: 'rating' },
            { header: 'Comment', accessor: 'comment' },
            { header: 'Public', accessor: 'is_public' },
            { header: 'Created', accessor: 'created_at' },
            { header: 'Actions', accessor: 'actions' },
          ]}
          data={filteredReviews.map(r => ({
            ...r,
            rating: '⭐'.repeat(r.rating),
            comment: r.comment ? (r.comment.length > 50 ? r.comment.substring(0, 50) + '...' : r.comment) : '-',
            is_public: r.is_public ? 'Yes' : 'No',
            created_at: new Date(r.created_at).toLocaleDateString(),
            actions: !r.is_public ? (
              <Button 
                onClick={(e) => {
                  e.stopPropagation()
                  handleMakePublic(r.id)
                }} 
                size="sm"
              >
                Make Public
              </Button>
            ) : '-',
          }))}
          onRowClick={(row) => router.push(`/reviews/${row.id}`)}
        />
      ) : (
        <Table
          columns={[
            { header: 'Customer', accessor: 'customer_name' },
            { header: 'Issue', accessor: 'issue_description' },
            { header: 'Status', accessor: 'status' },
            { header: 'Assigned To', accessor: 'assigned_to' },
            { header: 'Created', accessor: 'created_at' },
            { header: 'Actions', accessor: 'actions' },
          ]}
          data={filteredTickets.map(t => ({
            ...t,
            issue_description: t.issue_description.length > 50 ? t.issue_description.substring(0, 50) + '...' : t.issue_description,
            status: <StatusBadge status={t.status} />,
            assigned_to: t.assigned_to || '-',
            created_at: new Date(t.created_at).toLocaleDateString(),
            actions: (
              <Select
                value={t.status}
                onChange={(e) => {
                  e.stopPropagation()
                  handleUpdateTicketStatus(t.id, e.target.value)
                }}
                onClick={(e) => e.stopPropagation()}
                style={{ width: '150px' }}
                options={[
                  { value: 'open', label: 'Open' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'resolved', label: 'Resolved' },
                  { value: 'closed', label: 'Closed' },
                ]}
              />
            ),
          }))}
          onRowClick={(row) => router.push(`/recovery-tickets/${row.id}`)}
        />
      )}
    </div>
  )
}

