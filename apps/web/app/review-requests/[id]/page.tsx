'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { reviewApi, ReviewRequest } from '../../../lib/api/reviews'
import { PageHeader } from '../../../components/ui/PageHeader'
import { Button } from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { Select } from '../../../components/ui/Select'
import { showToast } from '../../../components/Toast'
import { handleApiError, logError } from '../../../lib/error-handler'
import axios from 'axios'
import { API_BASE_URL } from '../../../lib/config'

export default function ReviewRequestDetail({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const router = useRouter()
  const [request, setRequest] = useState<ReviewRequest | null>(null)
  const [serviceCall, setServiceCall] = useState<any>(null)
  const [job, setJob] = useState<any>(null)
  const [review, setReview] = useState<any>(null)
  const [id, setId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    async function getParams() {
      const resolvedParams = params instanceof Promise ? await params : params
      setId(resolvedParams.id)
    }
    getParams()
  }, [params])

  useEffect(() => {
    if (!id) return
    loadData()
  }, [id])

  async function loadData() {
    try {
      setLoading(true)
      const requestData = await reviewApi.getRequest(id)
      setRequest(requestData)
      
      // Load related service call or job
      if (requestData.service_call_id) {
        try {
          const token = localStorage.getItem('token')
          const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
          const scRes = await axios.get(`${API_BASE_URL}/service-calls/${requestData.service_call_id}`, { headers, withCredentials: true })
          setServiceCall(scRes.data)
        } catch (err) {
          logError(err, 'loadServiceCall')
        }
      }
      
      if (requestData.job_id) {
        try {
          const token = localStorage.getItem('token')
          const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
          const jobRes = await axios.get(`${API_BASE_URL}/jobs/${requestData.job_id}`, { headers, withCredentials: true })
          setJob(jobRes.data)
        } catch (err) {
          logError(err, 'loadJob')
        }
      }
      
      // Check if review exists (if status is completed)
      if (requestData.status === 'completed') {
        try {
          // Try to find review by checking if completed_at is set
          // Note: We'd need an endpoint to get review by request_id, or we can list and filter
          const reviews = await reviewApi.listReviews(requestData.tenant_id)
          const matchingReview = reviews.find((r: any) => r.review_request_id === requestData.id)
          if (matchingReview) {
            setReview(matchingReview)
          }
        } catch (err) {
          logError(err, 'loadReview')
        }
      }
    } catch (err: any) {
      logError(err, 'loadReviewRequest')
      showToast(handleApiError(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(newStatus: string) {
    if (!id) return
    try {
      await reviewApi.updateRequest(id, { status: newStatus as any })
      showToast('Status updated successfully', 'success')
      await loadData()
    } catch (err: any) {
      logError(err, 'updateRequestStatus')
      showToast(handleApiError(err), 'error')
    }
  }

  async function sendRequest() {
    if (!id) return
    try {
      setSending(true)
      // This would trigger sending the review request
      // The actual implementation depends on your backend endpoint
      await reviewApi.updateRequest(id, { status: 'sent' })
      showToast('Review request sent successfully', 'success')
      await loadData()
    } catch (err: any) {
      logError(err, 'sendReviewRequest')
      showToast(handleApiError(err), 'error')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ color: 'var(--color-text-secondary)' }}>Loading review request...</div>
      </div>
    )
  }

  if (!request) {
    return (
      <div style={{ padding: '32px' }}>
        <div style={{ color: '#EF5350', marginBottom: '16px' }}>Review request not found</div>
        <Button onClick={() => router.push('/reviews')}>Back to Reviews</Button>
      </div>
    )
  }

  const isOverdue = request.status === 'pending' && request.created_at && 
    new Date(request.created_at) < new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  const daysSinceCreated = request.created_at 
    ? Math.floor((new Date().getTime() - new Date(request.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const reviewLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/reviews/submit/${request.token}`
    : ''

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <PageHeader
        title={`Review Request - ${request.customer_name}`}
        description={`Status: ${request.status} | Created: ${new Date(request.created_at).toLocaleDateString()}`}
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button onClick={() => router.push('/reviews')} variant="secondary">Back</Button>
            {request.status === 'pending' && (
              <Button onClick={sendRequest} disabled={sending}>
                {sending ? 'Sending...' : 'Send Request'}
              </Button>
            )}
          </div>
        }
      />

      {/* Overdue Alert */}
      {isOverdue && (
        <div style={{
          padding: '16px',
          backgroundColor: 'rgba(239, 83, 80, 0.1)',
          border: '1px solid #EF5350',
          borderRadius: '8px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '24px' }}>⚠️</span>
          <div>
            <div style={{ fontWeight: '600', color: '#EF5350', marginBottom: '4px' }}>
              Pending for {daysSinceCreated} day{daysSinceCreated !== 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: '14px', color: '#EF5350' }}>
              This review request should be sent to the customer.
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* Request Details */}
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: 'var(--color-text-primary)' }}>
            Request Details
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Status
              </div>
              <div style={{ marginBottom: '8px' }}>
                <StatusBadge status={request.status} />
              </div>
              <Select
                value={request.status}
                onChange={(e) => updateStatus(e.target.value)}
                options={[
                  { value: 'pending', label: 'Pending' },
                  { value: 'sent', label: 'Sent' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'expired', label: 'Expired' }
                ]}
              />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Customer
              </div>
              <div style={{ fontSize: '16px', fontWeight: '500', color: 'var(--color-text-primary)' }}>
                {request.customer_name}
              </div>
              {request.customer_email && (
                <a href={`mailto:${request.customer_email}`} style={{ fontSize: '14px', color: 'var(--color-primary)', textDecoration: 'none', marginTop: '4px', display: 'block' }}>
                  ✉️ {request.customer_email}
                </a>
              )}
              {request.customer_phone && (
                <a href={`tel:${request.customer_phone}`} style={{ fontSize: '14px', color: 'var(--color-primary)', textDecoration: 'none', marginTop: '4px', display: 'block' }}>
                  📞 {request.customer_phone}
                </a>
              )}
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Review Link
              </div>
              <div style={{ 
                padding: '12px', 
                backgroundColor: 'var(--color-hover)', 
                borderRadius: '6px',
                fontSize: '12px',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                marginBottom: '8px'
              }}>
                {reviewLink}
              </div>
              <Button 
                size="sm" 
                onClick={() => {
                  navigator.clipboard.writeText(reviewLink)
                  showToast('Link copied to clipboard', 'success')
                }}
              >
                Copy Link
              </Button>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: 'var(--color-text-primary)' }}>
            Timeline
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Created
              </div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                {new Date(request.created_at).toLocaleString()}
              </div>
            </div>
            {request.sent_at && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Sent
                </div>
                <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                  {new Date(request.sent_at).toLocaleString()}
                </div>
              </div>
            )}
            {request.completed_at && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Completed
                </div>
                <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                  {new Date(request.completed_at).toLocaleString()}
                </div>
              </div>
            )}
            {request.expires_at && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Expires
                </div>
                <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                  {new Date(request.expires_at).toLocaleString()}
                </div>
              </div>
            )}
            {request.reminder_sent && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Reminder
                </div>
                <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                  Reminder sent
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Items */}
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: 'var(--color-text-primary)' }}>
            Related Items
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {serviceCall && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Service Call
                </div>
                <a 
                  href={`/service-calls/${serviceCall.id}`}
                  style={{ fontSize: '14px', color: 'var(--color-primary)', textDecoration: 'none' }}
                >
                  View Service Call: {serviceCall.customer_name} →
                </a>
              </div>
            )}
            {job && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Job
                </div>
                <a 
                  href={`/jobs/${job.id}`}
                  style={{ fontSize: '14px', color: 'var(--color-primary)', textDecoration: 'none' }}
                >
                  View Job: {job.community} Lot {job.lot_number} →
                </a>
              </div>
            )}
            {review && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Review
                </div>
                <a 
                  href={`/reviews/${review.id}`}
                  style={{ fontSize: '14px', color: 'var(--color-primary)', textDecoration: 'none' }}
                >
                  View Review ({'⭐'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}) →
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

