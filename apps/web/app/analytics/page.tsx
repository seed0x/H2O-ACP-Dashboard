'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../../lib/config'
import { PageHeader } from '../../components/ui/PageHeader'
import { handleApiError, logError } from '../../lib/error-handler'
import { StatSkeleton, CardSkeleton } from '../../components/ui/Skeleton'

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<any>(null)
  const [reviewAnalytics, setReviewAnalytics] = useState<any>(null)
  const [performance, setPerformance] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [])

  async function loadAnalytics() {
    try {
      const token = localStorage.getItem('token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      
      // Load overview data
      try {
        const overviewRes = await axios.get(`${API_BASE_URL}/analytics/overview`, { headers, withCredentials: true })
        setOverview(overviewRes.data)
      } catch (error) {
        handleApiError(error, 'Loading analytics overview', loadAnalytics)
        setOverview(null)
      }
      
      // Load review analytics
      try {
        const reviewsRes = await axios.get(`${API_BASE_URL}/analytics/reviews?days=30`, { headers, withCredentials: true })
        setReviewAnalytics(reviewsRes.data)
      } catch (error) {
        handleApiError(error, 'Loading review analytics', loadAnalytics)
        setReviewAnalytics(null)
      }
      
      // Load performance data
      try {
        const performanceRes = await axios.get(`${API_BASE_URL}/analytics/performance?days=30`, { headers, withCredentials: true })
        setPerformance(performanceRes.data)
      } catch (error) {
        handleApiError(error, 'Loading performance analytics', loadAnalytics)
        setPerformance(null)
      }
    } catch (err) {
      logError(err, 'loadAnalytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
        <PageHeader
          title="Analytics Dashboard"
          description="Business intelligence and performance metrics"
        />
        <div style={{ marginBottom: '32px' }}>
          <StatSkeleton count={6} />
        </div>
        <div style={{ marginBottom: '32px' }}>
          <CardSkeleton count={2} />
        </div>
        <CardSkeleton count={2} />
      </div>
    )
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <PageHeader
        title="Analytics Dashboard"
        description="Business intelligence and performance metrics"
      />

      {/* Overview Metrics */}
      {overview && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: 'var(--color-text-primary)' }}>
            Overview Metrics
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <MetricCard
              title="Active Jobs"
              value={overview.jobs?.active || 0}
              color="#60A5FA"
            />
            <MetricCard
              title="Completed This Week"
              value={overview.jobs?.completed_this_week || 0}
              color="#4CAF50"
            />
            <MetricCard
              title="Pending Service Calls"
              value={overview.service_calls?.pending || 0}
              color="#FF9800"
            />
            <MetricCard
              title="Average Rating"
              value={overview.reviews?.average_rating || 0}
              color="#9C27B0"
              suffix="⭐"
            />
            <MetricCard
              title="Review Completion Rate"
              value={`${((overview.metrics?.review_completion_rate || 0) * 100).toFixed(1)}%`}
              color="#2196F3"
            />
            <MetricCard
              title="Open Recovery Tickets"
              value={overview.recovery_tickets?.open || 0}
              color="#EF5350"
            />
          </div>
        </div>
      )}

      {/* Review Analytics */}
      {reviewAnalytics && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: 'var(--color-text-primary)' }}>
            Review Analytics
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <div style={{
              backgroundColor: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '24px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
                Rating Distribution
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[5, 4, 3, 2, 1].map(rating => {
                  const count = reviewAnalytics.rating_distribution?.[rating] || 0
                  const total = reviewAnalytics.total_reviews || 1
                  const percentage = (count / total) * 100
                  return (
                    <div key={rating} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '60px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                        {'⭐'.repeat(rating)}{'☆'.repeat(5 - rating)}
                      </div>
                      <div style={{ flex: 1, height: '24px', backgroundColor: 'var(--color-hover)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${percentage}%`,
                          height: '100%',
                          backgroundColor: rating >= 4 ? '#4CAF50' : rating >= 3 ? '#FF9800' : '#EF5350',
                          transition: 'width 0.3s'
                        }} />
                      </div>
                      <div style={{ width: '40px', textAlign: 'right', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)' }}>
                        {count}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{
              backgroundColor: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '24px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
                Public vs Private
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Public Reviews</span>
                  <span style={{ fontSize: '18px', fontWeight: '600', color: '#4CAF50' }}>
                    {reviewAnalytics.public_vs_private?.public || 0}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Private Reviews</span>
                  <span style={{ fontSize: '18px', fontWeight: '600', color: '#FF9800' }}>
                    {reviewAnalytics.public_vs_private?.private || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {performance && (
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: 'var(--color-text-primary)' }}>
            Performance Metrics
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <div style={{
              backgroundColor: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '24px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
                Service Call Performance
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Completed</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                    {performance.service_calls?.completed_count || 0}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Avg Completion Time</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                    {performance.service_calls?.average_completion_hours || 0} hrs
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              backgroundColor: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '24px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
                Job Performance
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Completed</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                    {performance.jobs?.completed_count || 0}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Avg Completion Time</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                    {performance.jobs?.average_completion_days || 0} days
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              backgroundColor: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '24px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
                Bid Performance
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Total Bids</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                    {performance.bids?.total || 0}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Win Rate</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#4CAF50' }}>
                    {((performance.bids?.win_rate || 0) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ title, value, color, suffix = '' }: {
  title: string
  value: string | number
  color: string
  suffix?: string
}) {
  return (
    <div style={{
      backgroundColor: 'var(--color-card)',
      border: '1px solid var(--color-border)',
      borderRadius: '12px',
      padding: '24px',
      transition: 'all 0.2s'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = color
      e.currentTarget.style.transform = 'translateY(-2px)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = 'var(--color-border)'
      e.currentTarget.style.transform = 'translateY(0)'
    }}
    >
      <div style={{
        fontSize: '13px',
        color: 'var(--color-text-secondary)',
        marginBottom: '12px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        fontWeight: '500'
      }}>{title}</div>
      <div style={{
        fontSize: '36px',
        fontWeight: '700',
        color: color
      }}>{value}{suffix}</div>
    </div>
  )
}







