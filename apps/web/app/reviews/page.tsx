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
      console.error('Failed to load data:', error)
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
    } catch (error) {
      console.error('Failed to make review public:', error)
      alert('Failed to make review public')
    }
  }

  const handleUpdateTicketStatus = async (ticketId: string, status: string) => {
    try {
      await reviewApi.updateRecoveryTicket(ticketId, { status })
      await loadData()
    } catch (error) {
      console.error('Failed to update ticket:', error)
      alert('Failed to update ticket status')
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
          >
            <option value="">All Statuses</option>
            {activeTab === 'requests' ? (
              <>
                <option value="pending">Pending</option>
                <option value="sent">Sent</option>
                <option value="completed">Completed</option>
                <option value="expired">Expired</option>
              </>
            ) : (
              <>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </>
            )}
          </Select>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div>Loading...</div>
      ) : activeTab === 'requests' ? (
        <Table
          columns={[
            { key: 'customer_name', label: 'Customer' },
            { key: 'customer_email', label: 'Email' },
            { key: 'status', label: 'Status' },
            { key: 'sent_at', label: 'Sent' },
            { key: 'created_at', label: 'Created' },
          ]}
          data={filteredRequests.map(r => ({
            ...r,
            status: <StatusBadge status={r.status} />,
            sent_at: r.sent_at ? new Date(r.sent_at).toLocaleDateString() : '-',
            created_at: new Date(r.created_at).toLocaleDateString(),
          }))}
        />
      ) : activeTab === 'reviews' ? (
        <Table
          columns={[
            { key: 'customer_name', label: 'Customer' },
            { key: 'rating', label: 'Rating' },
            { key: 'comment', label: 'Comment' },
            { key: 'is_public', label: 'Public' },
            { key: 'created_at', label: 'Created' },
            { key: 'actions', label: 'Actions' },
          ]}
          data={filteredReviews.map(r => ({
            ...r,
            rating: '⭐'.repeat(r.rating),
            comment: r.comment ? (r.comment.length > 50 ? r.comment.substring(0, 50) + '...' : r.comment) : '-',
            is_public: r.is_public ? 'Yes' : 'No',
            created_at: new Date(r.created_at).toLocaleDateString(),
            actions: !r.is_public ? (
              <Button onClick={() => handleMakePublic(r.id)} size="small">
                Make Public
              </Button>
            ) : '-',
          }))}
        />
      ) : (
        <Table
          columns={[
            { key: 'customer_name', label: 'Customer' },
            { key: 'issue_description', label: 'Issue' },
            { key: 'status', label: 'Status' },
            { key: 'assigned_to', label: 'Assigned To' },
            { key: 'created_at', label: 'Created' },
            { key: 'actions', label: 'Actions' },
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
                onChange={(e) => handleUpdateTicketStatus(t.id, e.target.value)}
                style={{ width: '150px' }}
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </Select>
            ),
          }))}
        />
      )}
    </div>
  )
}

