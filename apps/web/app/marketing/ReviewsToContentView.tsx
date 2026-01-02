'use client'
import { useState, useEffect } from 'react'
import { useTenant } from '../../contexts/TenantContext'
import { marketingApi, FlaggedReview, ChannelAccount } from '../../lib/api/marketing'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Button } from '../../components/ui/Button'
import { handleApiError, showSuccess } from '../../lib/error-handler'

export function ReviewsToContentView() {
  const { currentTenant } = useTenant()
  // Support both tenants - when 'both' is selected, default to h2o
  const tenantId = currentTenant === 'both' ? 'h2o' : (currentTenant || 'h2o')
  
  const [reviews, setReviews] = useState<FlaggedReview[]>([])
  const [channelAccounts, setChannelAccounts] = useState<ChannelAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [includeConverted, setIncludeConverted] = useState(false)
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [selectedReview, setSelectedReview] = useState<FlaggedReview | null>(null)
  const [convertForm, setConvertForm] = useState({
    channel_account_ids: [] as string[],
    scheduled_for: '',
    custom_caption: ''
  })
  const [converting, setConverting] = useState(false)

  useEffect(() => {
    loadData()
  }, [tenantId, includeConverted])

  const loadData = async () => {
    try {
      setLoading(true)
      const [reviewsData, accountsData] = await Promise.all([
        marketingApi.getFlaggedReviews(tenantId, includeConverted),
        marketingApi.listChannelAccounts(tenantId)
      ])
      setReviews(reviewsData)
      setChannelAccounts(accountsData)
    } catch (error) {
      handleApiError(error, 'Load reviews')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenConvert = (review: FlaggedReview) => {
    setSelectedReview(review)
    setConvertForm({
      channel_account_ids: [],
      scheduled_for: '',
      custom_caption: ''
    })
    setShowConvertModal(true)
  }

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedReview || convertForm.channel_account_ids.length === 0) return

    try {
      setConverting(true)
      await marketingApi.convertReviewToContent(selectedReview.id, {
        review_id: selectedReview.id,
        channel_account_ids: convertForm.channel_account_ids,
        scheduled_for: convertForm.scheduled_for || undefined,
        custom_caption: convertForm.custom_caption || undefined
      })
      showSuccess('Review converted to content successfully')
      setShowConvertModal(false)
      loadData()
    } catch (error) {
      handleApiError(error, 'Convert review to content')
    } finally {
      setConverting(false)
    }
  }

  const handleUnflag = async (reviewId: string) => {
    try {
      await marketingApi.flagReviewForContent(reviewId, false)
      showSuccess('Review unflagged')
      loadData()
    } catch (error) {
      handleApiError(error, 'Unflag review')
    }
  }

  const toggleChannelAccount = (accountId: string) => {
    setConvertForm(prev => ({
      ...prev,
      channel_account_ids: prev.channel_account_ids.includes(accountId)
        ? prev.channel_account_ids.filter(id => id !== accountId)
        : [...prev.channel_account_ids, accountId]
    }))
  }

  const renderStars = (rating: number) => {
    return Array(rating).fill(null).map((_, i) => (
      <span key={i} style={{ color: '#fbbf24' }}>★</span>
    ))
  }

  const readyToConvert = reviews.filter(r => !r.is_converted).length
  const converted = reviews.filter(r => r.is_converted).length

  return (
    <div>
      {/* Stats Summary */}
      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text-primary)' }}>
          Review to Content Pipeline
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
          Turn great customer reviews into shareable social content
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {reviews.length}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Flagged Reviews</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#10b981' }}>
              {readyToConvert}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Ready to Convert</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-primary)' }}>
              {converted}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Converted</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={includeConverted}
            onChange={(e) => setIncludeConverted(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <label style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
            Show converted reviews
          </label>
        </div>
      </div>

      {/* Reviews List */}
      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '24px'
      }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            Loading reviews...
          </div>
        ) : reviews.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No flagged reviews yet. Flag 4+ star reviews from the Reviews tab to use them here.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {reviews.map((review) => (
              <div key={review.id} style={{
                padding: '20px',
                backgroundColor: review.is_converted ? 'rgba(16, 185, 129, 0.05)' : 'var(--color-hover)',
                border: review.is_converted ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--color-border)',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '16px' }}>{renderStars(review.rating)}</span>
                      <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{review.customer_name}</span>
                      {review.is_converted && (
                        <StatusBadge status="Converted" variant="success" />
                      )}
                    </div>
                    
                    <div style={{
                      paddingLeft: '16px',
                      borderLeft: '2px solid var(--color-border)',
                      color: 'var(--color-text-secondary)',
                      fontStyle: 'italic',
                      marginBottom: '12px'
                    }}>
                      "{review.comment || 'No comment provided'}"
                    </div>
                    
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      {new Date(review.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                  
                  <div style={{ marginLeft: '16px', display: 'flex', gap: '8px' }}>
                    {!review.is_converted ? (
                      <>
                        <Button onClick={() => handleOpenConvert(review)}>
                          Convert to Post
                        </Button>
                        <button
                          onClick={() => handleUnflag(review.id)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: 'transparent',
                            border: '1px solid var(--color-border)',
                            borderRadius: '6px',
                            color: 'var(--color-text-secondary)',
                            fontSize: '14px',
                            cursor: 'pointer'
                          }}
                        >
                          Unflag
                        </button>
                      </>
                    ) : (
                      <a
                        href={`/marketing?tab=posts`}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: 'transparent',
                          border: '1px solid var(--color-border)',
                          borderRadius: '6px',
                          color: 'var(--color-text-primary)',
                          fontSize: '14px',
                          textDecoration: 'none'
                        }}
                      >
                        View Content
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Convert Modal */}
      {showConvertModal && selectedReview && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Convert Review to Content
              </h2>
              <button
                onClick={() => setShowConvertModal(false)}
                style={{
                  padding: '8px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontSize: '20px'
                }}
              >
                ×
              </button>
            </div>
            
            {/* Preview */}
            <div style={{
              backgroundColor: 'var(--color-hover)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>Preview:</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                {renderStars(selectedReview.rating)}
              </div>
              <div style={{ fontStyle: 'italic', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                "{selectedReview.comment}"
              </div>
              <div style={{ color: 'var(--color-text-muted)' }}>
                — {selectedReview.customer_name}
              </div>
            </div>
            
            <form onSubmit={handleConvert}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Channel Selection */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: 'var(--color-text-primary)' }}>
                    Post to Channels *
                  </label>
                  {channelAccounts.length === 0 ? (
                    <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                      No channel accounts configured.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {channelAccounts.map(account => (
                        <label
                          key={account.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px',
                            backgroundColor: convertForm.channel_account_ids.includes(account.id) 
                              ? 'rgba(59, 130, 246, 0.1)' 
                              : 'var(--color-hover)',
                            border: convertForm.channel_account_ids.includes(account.id) 
                              ? '1px solid var(--color-primary)' 
                              : '1px solid var(--color-border)',
                            borderRadius: '8px',
                            cursor: 'pointer'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={convertForm.channel_account_ids.includes(account.id)}
                            onChange={() => toggleChannelAccount(account.id)}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ color: 'var(--color-text-primary)' }}>{account.name}</span>
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                            {account.channel?.display_name || ''}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Schedule */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--color-text-primary)' }}>
                    Schedule For (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={convertForm.scheduled_for}
                    onChange={(e) => setConvertForm({ ...convertForm, scheduled_for: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      backgroundColor: 'var(--color-hover)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      color: 'var(--color-text-primary)',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    Leave empty to save as draft
                  </p>
                </div>
                
                {/* Custom Caption */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--color-text-primary)' }}>
                    Custom Caption (optional)
                  </label>
                  <textarea
                    value={convertForm.custom_caption}
                    onChange={(e) => setConvertForm({ ...convertForm, custom_caption: e.target.value })}
                    placeholder="Leave empty to auto-generate a testimonial caption..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      backgroundColor: 'var(--color-hover)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      color: 'var(--color-text-primary)',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                  />
                </div>
                
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <Button type="button" onClick={() => setShowConvertModal(false)} variant="secondary">
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={convertForm.channel_account_ids.length === 0 || converting}
                  >
                    {converting ? 'Converting...' : 'Create Content'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReviewsToContentView
