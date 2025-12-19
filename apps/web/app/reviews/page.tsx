'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageHeader } from '../../components/ui/PageHeader'
import { showToast } from '../../components/Toast'
import { reviewApi, ReviewRequest, Review, RecoveryTicket, ReviewStats } from '../../lib/api/reviews'
import { handleApiError } from '../../lib/error-handler'
import { Suspense } from 'react'

function ReviewsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'requests'
  
  const [reviewRequests, setReviewRequests] = useState<ReviewRequest[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [recoveryTickets, setRecoveryTickets] = useState<RecoveryTicket[]>([])
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedRequests, setSelectedRequests] = useState<string[]>([])
  const tenantId = 'h2o'

  useEffect(() => {
    loadData()
  }, [activeTab, statusFilter])

  async function loadData() {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      
      if (activeTab === 'requests') {
        const [requestsData, statsData] = await Promise.all([
          reviewApi.listRequests(tenantId, statusFilter || undefined),
          reviewApi.getStats(tenantId)
        ])
        setReviewRequests(Array.isArray(requestsData) ? requestsData : [])
        setStats(statsData)
      } else if (activeTab === 'reviews') {
        const data = await reviewApi.listReviews(tenantId)
        setReviews(Array.isArray(data) ? data : [])
      } else if (activeTab === 'tickets') {
        const data = await reviewApi.listRecoveryTickets(tenantId, statusFilter || undefined)
        setRecoveryTickets(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      handleApiError(error, 'Loading review data')
    } finally {
      setLoading(false)
    }
  }

  const setActiveTab = (tab: string) => {
    router.push(`/reviews?tab=${tab}`)
  }

  const filteredRequests = reviewRequests.filter(r => 
    !search || 
    r.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    r.customer_email?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredReviews = reviews.filter(r =>
    !search || 
    r.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    r.comment?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredTickets = recoveryTickets.filter(t =>
    !search || 
    t.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    t.issue_description.toLowerCase().includes(search.toLowerCase())
  )

  const handleSendRequest = async (requestId: string) => {
    try {
      await reviewApi.sendRequest(requestId)
      await loadData()
      showToast('Review request sent successfully', 'success')
    } catch (error) {
      handleApiError(error, 'Sending review request')
    }
  }

  const handleMarkAsLost = async (requestId: string) => {
    try {
      await reviewApi.markRequestAsLost(requestId)
      await loadData()
      showToast('Request marked as lost', 'success')
    } catch (error) {
      handleApiError(error, 'Marking as lost')
    }
  }

  const handleBulkSend = async () => {
    if (selectedRequests.length === 0) return
    try {
      await Promise.all(selectedRequests.map(id => reviewApi.sendRequest(id)))
      await loadData()
      setSelectedRequests([])
      showToast(`Sent ${selectedRequests.length} review request(s)`, 'success')
    } catch (error) {
      handleApiError(error, 'Bulk sending')
    }
  }

  const handleMakePublic = async (reviewId: string, isPublic: boolean) => {
    try {
      await reviewApi.updateReview(reviewId, { is_public: isPublic })
      await loadData()
      showToast(`Review ${isPublic ? 'made public' : 'made private'}`, 'success')
    } catch (error) {
      handleApiError(error, 'Updating review')
    }
  }

  const handleUpdateTicketStatus = async (ticketId: string, status: string) => {
    try {
      await reviewApi.updateRecoveryTicket(ticketId, { status })
      await loadData()
      showToast('Ticket status updated', 'success')
    } catch (error) {
      handleApiError(error, 'Updating ticket')
    }
  }

  const handleAssignTicket = async (ticketId: string, assignedTo: string) => {
    try {
      await reviewApi.updateRecoveryTicket(ticketId, { assigned_to: assignedTo })
      await loadData()
      showToast('Ticket assigned successfully', 'success')
    } catch (error) {
      handleApiError(error, 'Assigning ticket')
    }
  }

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader
        title="Review Management"
        description="Track customer reviews from service call completion to feedback received"
      />

      {/* Stats Cards - Show on Requests tab */}
      {activeTab === 'requests' && stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '32px'
        }}>
          <StatCard title="Total Requests" value={stats.total_requests} color="#3B82F6" />
          <StatCard title="Pending" value={stats.pending} color="#9CA3AF" />
          <StatCard title="Sent" value={stats.sent} color="#60A5FA" />
          <StatCard title="Got (✓)" value={stats.completed} color="#10B981" />
          <StatCard title="Lost (✗)" value={stats.lost} color="#EF4444" />
          <StatCard 
            title="Conversion Rate" 
            value={`${stats.conversion_rate}%`} 
            color="#8B5CF6"
            subtitle={`Avg Rating: ${stats.average_rating}★`}
          />
        </div>
      )}

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid var(--color-border)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'requests', label: 'Review Requests', count: reviewRequests.length },
            { id: 'reviews', label: 'Reviews Received', count: reviews.length },
            { id: 'tickets', label: 'Recovery Tickets', count: recoveryTickets.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 24px',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                fontWeight: activeTab === tab.id ? '600' : '500',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {tab.label}
              <span style={{
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-hover)',
                color: activeTab === tab.id ? '#ffffff' : 'var(--color-text-secondary)',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Filters and Actions */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: '200px',
            padding: '10px 16px',
            backgroundColor: 'var(--color-hover)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            color: 'var(--color-text-primary)',
            fontSize: '14px'
          }}
        />
        
        {activeTab !== 'reviews' && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '10px 16px',
              backgroundColor: 'var(--color-hover)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text-primary)',
              fontSize: '14px',
              minWidth: '150px'
            }}
          >
            {activeTab === 'requests' ? (
              <>
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="sent">Sent</option>
                <option value="completed">Got</option>
                <option value="lost">Lost</option>
              </>
            ) : (
              <>
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </>
            )}
          </select>
        )}

        {activeTab === 'requests' && selectedRequests.length > 0 && (
          <button
            onClick={handleBulkSend}
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--color-primary)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Send Selected ({selectedRequests.length})
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-secondary)' }}>
          Loading...
        </div>
      ) : activeTab === 'requests' ? (
        <RequestsTab 
          requests={filteredRequests}
          selectedRequests={selectedRequests}
          setSelectedRequests={setSelectedRequests}
          onSend={handleSendRequest}
          onMarkLost={handleMarkAsLost}
        />
      ) : activeTab === 'reviews' ? (
        <ReviewsTab 
          reviews={filteredReviews}
          onMakePublic={handleMakePublic}
        />
      ) : (
        <TicketsTab 
          tickets={filteredTickets}
          onUpdateStatus={handleUpdateTicketStatus}
          onAssign={handleAssignTicket}
        />
      )}
    </div>
  )
}

function StatCard({ title, value, color, subtitle }: { title: string; value: string | number; color: string; subtitle?: string }) {
  return (
    <div style={{
      backgroundColor: 'var(--color-card)',
      border: '1px solid var(--color-border)',
      borderRadius: '12px',
      padding: '20px'
    }}>
      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '600' }}>
        {title}
      </div>
      <div style={{ fontSize: '32px', fontWeight: '700', color, marginBottom: subtitle ? '4px' : '0' }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
          {subtitle}
        </div>
      )}
    </div>
  )
}

function RequestsTab({ 
  requests, 
  selectedRequests, 
  setSelectedRequests,
  onSend, 
  onMarkLost 
}: { 
  requests: ReviewRequest[]; 
  selectedRequests: string[];
  setSelectedRequests: (ids: string[]) => void;
  onSend: (id: string) => void; 
  onMarkLost: (id: string) => void;
}) {
  const toggleSelect = (id: string) => {
    if (selectedRequests.includes(id)) {
      setSelectedRequests(selectedRequests.filter(i => i !== id))
    } else {
      setSelectedRequests([...selectedRequests, id])
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, any> = {
      pending: { bg: 'rgba(156, 163, 175, 0.15)', color: '#9CA3AF', label: 'Pending' },
      sent: { bg: 'rgba(96, 165, 250, 0.15)', color: '#60A5FA', label: 'Sent' },
      completed: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10B981', label: 'Got ✓' },
      lost: { bg: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', label: 'Lost ✗' },
      expired: { bg: 'rgba(251, 146, 60, 0.15)', color: '#FB923C', label: 'Expired' },
    }
    const style = styles[status] || styles.pending
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '500',
        backgroundColor: style.bg,
        color: style.color
      }}>
        {style.label}
      </span>
    )
  }

  const getDaysAgo = (dateString?: string) => {
    if (!dateString) return null
    const days = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24))
    return days
  }

  if (requests.length === 0) {
    return (
      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '48px',
        textAlign: 'center',
        color: 'var(--color-text-secondary)'
      }}>
        No review requests found. Requests are automatically created when service calls are completed.
      </div>
    )
  }

  return (
    <div style={{
      backgroundColor: 'var(--color-card)',
      border: '1px solid var(--color-border)',
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{
            backgroundColor: 'var(--color-hover)',
            borderBottom: '1px solid var(--color-border)'
          }}>
            <th style={{ padding: '16px', textAlign: 'left', width: '40px' }}>
              <input 
                type="checkbox"
                checked={selectedRequests.length === requests.filter(r => r.status === 'pending').length && requests.filter(r => r.status === 'pending').length > 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedRequests(requests.filter(r => r.status === 'pending').map(r => r.id))
                  } else {
                    setSelectedRequests([])
                  }
                }}
                style={{ cursor: 'pointer' }}
              />
            </th>
            <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Customer</th>
            <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Status</th>
            <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Timeline</th>
            <th style={{ padding: '16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request, index) => {
            const daysSinceSent = getDaysAgo(request.sent_at)
            const daysSinceCreated = getDaysAgo(request.created_at)
            
            return (
              <tr
                key={request.id}
                style={{
                  borderBottom: index < requests.length - 1 ? '1px solid var(--color-border)' : 'none'
                }}
              >
                <td style={{ padding: '16px' }}>
                  {request.status === 'pending' && (
                    <input 
                      type="checkbox"
                      checked={selectedRequests.includes(request.id)}
                      onChange={() => toggleSelect(request.id)}
                      style={{ cursor: 'pointer' }}
                    />
                  )}
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                    {request.customer_name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    {request.customer_email || 'No email'}
                  </div>
                </td>
                <td style={{ padding: '16px' }}>
                  {getStatusBadge(request.status)}
                </td>
                <td style={{ padding: '16px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  {request.status === 'pending' && daysSinceCreated !== null && (
                    <div>Created {daysSinceCreated}d ago</div>
                  )}
                  {request.status === 'sent' && daysSinceSent !== null && (
                    <div>Sent {daysSinceSent}d ago</div>
                  )}
                  {request.status === 'completed' && request.completed_at && (
                    <div>Completed {new Date(request.completed_at).toLocaleDateString()}</div>
                  )}
                  {request.status === 'lost' && (
                    <div>Marked as lost</div>
                  )}
                </td>
                <td style={{ padding: '16px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    {request.status === 'pending' && (
                      <button
                        onClick={() => onSend(request.id)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: 'var(--color-primary)',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#ffffff',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: 'pointer'
                        }}
                      >
                        Send Request
                      </button>
                    )}
                    {request.status === 'sent' && (
                      <button
                        onClick={() => onMarkLost(request.id)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid #EF4444',
                          borderRadius: '6px',
                          color: '#EF4444',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: 'pointer'
                        }}
                      >
                        Mark as Lost
                      </button>
                    )}
                    <button
                      onClick={() => window.open(`/review-requests/${request.id}`, '_blank')}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'var(--color-hover)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '6px',
                        color: 'var(--color-text-primary)',
                        fontSize: '12px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      View Details
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ReviewsTab({ reviews, onMakePublic }: { reviews: Review[]; onMakePublic: (id: string, isPublic: boolean) => void }) {
  const renderStars = (rating: number) => {
    return (
      <div style={{ display: 'flex', gap: '2px' }}>
        {[1, 2, 3, 4, 5].map(star => (
          <span key={star} style={{ fontSize: '16px', color: star <= rating ? '#FBBF24' : '#D1D5DB' }}>
            ★
          </span>
        ))}
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '48px',
        textAlign: 'center',
        color: 'var(--color-text-secondary)'
      }}>
        No reviews received yet. Reviews appear here after customers submit feedback.
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {reviews.map(review => (
        <div
          key={review.id}
          style={{
            backgroundColor: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                {review.customer_name}
              </div>
              {renderStars(review.rating)}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {review.is_public && (
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#10B981'
                }}>
                  Public
                </span>
              )}
              <button
                onClick={() => onMakePublic(review.id, !review.is_public)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: review.is_public ? 'var(--color-hover)' : 'var(--color-primary)',
                  border: review.is_public ? '1px solid var(--color-border)' : 'none',
                  borderRadius: '6px',
                  color: review.is_public ? 'var(--color-text-primary)' : '#ffffff',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                {review.is_public ? 'Make Private' : 'Make Public'}
              </button>
            </div>
          </div>
          {review.comment && (
            <div style={{
              padding: '16px',
              backgroundColor: 'var(--color-hover)',
              borderRadius: '8px',
              fontSize: '14px',
              color: 'var(--color-text-primary)',
              lineHeight: '1.6',
              marginBottom: '12px'
            }}>
              "{review.comment}"
            </div>
          )}
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            Submitted {new Date(review.created_at).toLocaleDateString()}
            {review.customer_email && ` • ${review.customer_email}`}
          </div>
        </div>
      ))}
    </div>
  )
}

function TicketsTab({ 
  tickets, 
  onUpdateStatus, 
  onAssign 
}: { 
  tickets: RecoveryTicket[]; 
  onUpdateStatus: (id: string, status: string) => void;
  onAssign: (id: string, assignedTo: string) => void;
}) {
  const getStatusBadge = (status: string) => {
    const styles: Record<string, any> = {
      open: { bg: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', label: 'Open' },
      in_progress: { bg: 'rgba(251, 146, 60, 0.15)', color: '#FB923C', label: 'In Progress' },
      resolved: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10B981', label: 'Resolved' },
      closed: { bg: 'rgba(156, 163, 175, 0.15)', color: '#9CA3AF', label: 'Closed' },
    }
    const style = styles[status] || styles.open
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '500',
        backgroundColor: style.bg,
        color: style.color
      }}>
        {style.label}
      </span>
    )
  }

  if (tickets.length === 0) {
    return (
      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '48px',
        textAlign: 'center',
        color: 'var(--color-text-secondary)'
      }}>
        No recovery tickets found. Tickets are automatically created for negative reviews (3 stars or less).
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {tickets.map(ticket => (
        <div
          key={ticket.id}
          style={{
            backgroundColor: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                {ticket.customer_name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                {ticket.customer_email || ticket.customer_phone || 'No contact info'}
              </div>
            </div>
            {getStatusBadge(ticket.status)}
          </div>
          
          <div style={{
            padding: '16px',
            backgroundColor: 'var(--color-hover)',
            borderRadius: '8px',
            fontSize: '14px',
            color: 'var(--color-text-primary)',
            lineHeight: '1.6',
            marginBottom: '16px'
          }}>
            {ticket.issue_description}
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={ticket.status}
              onChange={(e) => onUpdateStatus(ticket.id, e.target.value)}
              style={{
                padding: '8px 12px',
                backgroundColor: 'var(--color-hover)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                color: 'var(--color-text-primary)',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            <input
              placeholder="Assign to..."
              defaultValue={ticket.assigned_to || ''}
              onBlur={(e) => e.target.value && onAssign(ticket.id, e.target.value)}
              style={{
                padding: '8px 12px',
                backgroundColor: 'var(--color-hover)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                color: 'var(--color-text-primary)',
                fontSize: '13px',
                width: '200px'
              }}
            />

            <button
              onClick={() => window.open(`/recovery-tickets/${ticket.id}`, '_blank')}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--color-primary)',
                border: 'none',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              View Details
            </button>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '12px' }}>
            Created {new Date(ticket.created_at).toLocaleDateString()}
            {ticket.assigned_to && ` • Assigned to: ${ticket.assigned_to}`}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ReviewsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '32px' }}>Loading...</div>}>
      <ReviewsContent />
    </Suspense>
  )
}
