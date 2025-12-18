'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { reviewApi, Review } from '../../../lib/api/reviews'
import { PageHeader } from '../../../components/ui/PageHeader'
import { Button } from '../../../components/ui/Button'
import { showToast } from '../../../components/Toast'
import { handleApiError, logError } from '../../../lib/error-handler'

export default function ReviewDetail({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const router = useRouter()
  const [review, setReview] = useState<Review | null>(null)
  const [reviewRequest, setReviewRequest] = useState<any>(null)
  const [id, setId] = useState<string>('')
  const [loading, setLoading] = useState(true)

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
      const reviewData = await reviewApi.getReview(id)
      setReview(reviewData)
      
      // Load review request if available
      if (reviewData.review_request_id) {
        try {
          const requestData = await reviewApi.getRequest(reviewData.review_request_id)
          setReviewRequest(requestData)
        } catch (err) {
          logError(err, 'loadReviewRequest')
        }
      }
    } catch (err: any) {
      logError(err, 'loadReview')
      showToast(handleApiError(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleMakePublic() {
    if (!review) return
    try {
      await reviewApi.updateReview(review.id, { is_public: true })
      showToast('Review made public successfully', 'success')
      await loadData()
    } catch (error) {
      logError(error, 'makeReviewPublic')
      showToast(handleApiError(error), 'error')
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ color: 'var(--color-text-secondary)' }}>Loading review...</div>
      </div>
    )
  }

  if (!review) {
    return (
      <div style={{ padding: '32px' }}>
        <div style={{ color: '#EF5350', marginBottom: '16px' }}>Review not found</div>
        <Button onClick={() => router.push('/reviews')}>Back to Reviews</Button>
      </div>
    )
  }

  const isNegativeReview = review.rating <= 3

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <PageHeader
        title={`Review from ${review.customer_name}`}
        description={`Rating: ${'⭐'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}`}
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button onClick={() => router.push('/reviews')} variant="secondary">Back</Button>
            {!review.is_public && (
              <Button onClick={handleMakePublic}>
                Make Public
              </Button>
            )}
          </div>
        }
      />

      {/* Negative Review Alert */}
      {isNegativeReview && (
        <div style={{
          padding: '16px',
          backgroundColor: 'rgba(255, 152, 0, 0.1)',
          border: '1px solid #FF9800',
          borderRadius: '8px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '24px' }}>⚠️</span>
          <div>
            <div style={{ fontWeight: '600', color: '#FF9800', marginBottom: '4px' }}>
              Negative Review - Recovery Ticket Created
            </div>
            <div style={{ fontSize: '14px', color: '#FF9800' }}>
              This review was captured privately and a recovery ticket should have been created automatically.
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* Review Details */}
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: 'var(--color-text-primary)' }}>
            Review Details
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Rating
              </div>
              <div style={{ fontSize: '32px', lineHeight: '1' }}>
                {'⭐'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Customer
              </div>
              <div style={{ fontSize: '16px', fontWeight: '500', color: 'var(--color-text-primary)' }}>
                {review.customer_name}
              </div>
              {review.customer_email && (
                <a href={`mailto:${review.customer_email}`} style={{ fontSize: '14px', color: 'var(--color-primary)', textDecoration: 'none', marginTop: '4px', display: 'block' }}>
                  ✉️ {review.customer_email}
                </a>
              )}
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Public Status
              </div>
              <div style={{ 
                display: 'inline-block',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                backgroundColor: review.is_public ? 'rgba(76, 175, 80, 0.15)' : 'rgba(158, 158, 158, 0.15)',
                color: review.is_public ? '#66BB6A' : '#BDBDBD'
              }}>
                {review.is_public ? 'Public' : 'Private'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Submitted
              </div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                {new Date(review.created_at).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Review Request Context */}
        {reviewRequest && (
          <div style={{
            backgroundColor: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: 'var(--color-text-primary)' }}>
              Review Request Context
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Status
                </div>
                <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                  {reviewRequest.status}
                </div>
              </div>
              {reviewRequest.sent_at && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Sent At
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                    {new Date(reviewRequest.sent_at).toLocaleString()}
                  </div>
                </div>
              )}
              {reviewRequest.completed_at && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Completed At
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                    {new Date(reviewRequest.completed_at).toLocaleString()}
                  </div>
                </div>
              )}
              {reviewRequest.service_call_id && (
                <div>
                  <a 
                    href={`/service-calls/${reviewRequest.service_call_id}`}
                    style={{ fontSize: '14px', color: 'var(--color-primary)', textDecoration: 'none' }}
                  >
                    View Service Call →
                  </a>
                </div>
              )}
              {reviewRequest.job_id && (
                <div>
                  <a 
                    href={`/jobs/${reviewRequest.job_id}`}
                    style={{ fontSize: '14px', color: 'var(--color-primary)', textDecoration: 'none' }}
                  >
                    View Job →
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Comment */}
      {review.comment && (
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
            Customer Comment
          </h2>
          <div style={{ 
            padding: '16px', 
            backgroundColor: 'var(--color-hover)', 
            borderRadius: '8px',
            fontSize: '14px',
            color: 'var(--color-text-primary)',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.6'
          }}>
            {review.comment}
          </div>
        </div>
      )}
    </div>
  )
}


