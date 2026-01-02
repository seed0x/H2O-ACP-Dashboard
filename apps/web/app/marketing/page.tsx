'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { showToast } from '../../components/Toast'
import { API_BASE_URL } from '../../lib/config'
import { useTenant, TENANT_CONFIG } from '../../contexts/TenantContext'
import { marketingApi, oauthApi, type PostInstance, type ContentItem, type ChannelAccount, type MediaAsset, type LocalSEOTopic, type Offer } from '../../lib/api/marketing'
import { apiGet, apiPost } from '../../lib/api/client'
import { PhotoUpload } from '../../components/marketing/PhotoUpload'
import { handleApiError, showSuccess } from '../../lib/error-handler'
import { CalendarSkeleton } from '../../components/marketing/CalendarSkeleton'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { LocalSEOView } from './LocalSEOView'
import { OffersView } from './OffersView'
import { ContentMixWidget } from './ContentMixWidget'
import { SeasonalEventsView } from './SeasonalEventsView'
import { ReviewsToContentView } from './ReviewsToContentView'
import { CalendarView } from './CalendarView'

const styles = `
  @media (max-width: 768px) {
    .marketing-header { flex-direction: column; align-items: flex-start !important; gap: 16px; }
    .marketing-tabs { overflow-x: auto; }
    .marketing-filter-grid { grid-template-columns: 1fr !important; }
    .marketing-calendar-controls { flex-direction: column; align-items: flex-start !important; }
    .marketing-table-wrapper { overflow-x: auto; }
    .marketing-table th, .marketing-table td { min-width: 120px; }
    .marketing-modal { padding: 12px !important; }
    .marketing-modal-content { padding: 16px !important; max-width: 100% !important; }
    .marketing-account-card { flex-direction: column; align-items: flex-start !important; gap: 12px; }
    .marketing-calendar-grid { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .marketing-calendar-day-cell { min-height: 80px !important; padding: 8px !important; }
    .marketing-month-view-post { font-size: 9px !important; padding: 4px !important; }
  }
`

function MarketingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'calendar'

  const tabs = [
    { id: 'calendar', label: 'Calendar' },
    { id: 'posts', label: 'Posts' },
    { id: 'local-seo', label: 'Local SEO' },
    { id: 'offers', label: 'Offers' },
    { id: 'events', label: 'Events' },
    { id: 'reviews', label: 'Reviews → Content' },
    { id: 'accounts', label: 'Accounts' }
  ]

  const setActiveTab = (tabId: string) => {
    router.push(`/marketing?tab=${tabId}`)
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div style={{ padding: '32px' }}>
        <PageHeader
          title="Marketing Content Calendar"
          description="Plan and track marketing posts across all channels"
        />

        {/* Tabs */}
        <div style={{
          borderBottom: '1px solid var(--color-border)',
          marginBottom: '32px'
        }}>
          <div className="marketing-tabs" style={{ display: 'flex', gap: '8px' }}>
            {tabs.map((tab) => (
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
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.color = 'var(--color-text-primary)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.color = 'var(--color-text-secondary)'
                  }
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1">
          {activeTab === 'calendar' && <CalendarView />}
          {activeTab === 'posts' && <PostsView />}
          {activeTab === 'local-seo' && <LocalSEOView />}
          {activeTab === 'offers' && <OffersView />}
          {activeTab === 'events' && <SeasonalEventsView />}
          {activeTab === 'reviews' && <ReviewsToContentView />}
          {activeTab === 'accounts' && <AccountsView />}
        </div>
        
        {/* Content Mix Widget - shows on calendar tab */}
        {activeTab === 'calendar' && (
          <div style={{ marginTop: '24px' }}>
            <ContentMixWidget />
          </div>
        )}
      </div>
    </>
  )
}

// Demand Signals Panel Component
function DemandSignalsPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [signals, setSignals] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [period, setPeriod] = useState<7 | 30>(7)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (isOpen) {
      // Reset signals when period changes to show loading state
      setSignals(null)
      setError('')
      loadDemandSignals()
    }
  }, [isOpen, period])

  async function loadDemandSignals() {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Not authenticated')
      }

      const data = await apiGet(`/marketing/demand-signals?tenant_id=h2o&days=${period}`)
      console.log('Demand signals data received:', data)
      setSignals(data)
    } catch (error: any) {
      console.error('Failed to load demand signals:', error)
      setError(error.message || 'Failed to load demand signals')
      setSignals(null) // Clear signals on error
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateContent(query: string, category: string) {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Not authenticated')
      }

      // Create a draft ContentItem pre-filled with the query
      const title = `Content for: ${query}`
      const baseCaption = `Based on search demand: "${query}"\n\nCreate engaging content about ${query} for ${category} services.`

      const response = await fetch(`${API_BASE_URL}/marketing/content-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          tenant_id: 'h2o',
          title: title,
          base_caption: baseCaption,
          status: 'Idea',
          owner: 'admin',
          tags: [category, 'demand-signal'],
          source_type: 'demand_signal',
          source_ref: query
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to create content' }))
        throw new Error(errorData.detail || 'Failed to create content')
      }

      showToast(`Created draft content for "${query}"`, 'success')
      // Optionally refresh signals or navigate to posts tab
    } catch (error: any) {
      console.error('Failed to create content:', error)
      showToast(error.message || 'Failed to create content', 'error')
    }
  }

  const categoryLabels: Record<string, string> = {
    water_heater: 'Water Heater',
    plumbing: 'Plumbing',
    emergency: 'Emergency',
    installation: 'Installation',
    repair: 'Repair',
    maintenance: 'Maintenance',
    general: 'General'
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          right: '20px',
          top: '50%',
          transform: 'translateY(-50%)',
          padding: '12px 16px',
          backgroundColor: 'var(--color-primary)',
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px 0 0 8px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '600',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          zIndex: 100
        }}
        title="Show Demand Signals"
      >
        📊 Demand Signals
      </button>
    )
  }

  return (
    <div className="w-[300px] bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-5 max-h-[calc(100vh-200px)] overflow-y-auto sticky top-6 shadow-lg flex-shrink-0">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
          📊 Demand Signals
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            padding: '4px 8px',
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            fontSize: '20px',
            lineHeight: 1
          }}
        >
          ×
        </button>
      </div>

      {/* Period Selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          onClick={() => setPeriod(7)}
          style={{
            flex: 1,
            padding: '8px',
            backgroundColor: period === 7 ? 'var(--color-primary)' : 'var(--color-hover)',
            color: period === 7 ? '#ffffff' : 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: period === 7 ? '600' : '500'
          }}
        >
          7 Days
        </button>
        <button
          onClick={() => setPeriod(30)}
          style={{
            flex: 1,
            padding: '8px',
            backgroundColor: period === 30 ? 'var(--color-primary)' : 'var(--color-hover)',
            color: period === 30 ? '#ffffff' : 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: period === 30 ? '600' : '500'
          }}
        >
          30 Days
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-secondary)' }}>
          Loading...
        </div>
      )}

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: 'rgba(239, 83, 80, 0.1)',
          border: '1px solid #EF5350',
          borderRadius: '6px',
          color: '#EF5350',
          fontSize: '13px',
          marginBottom: '16px'
        }}>
          {error}
        </div>
      )}

      {!loading && !error && signals && (
        <>
          {!signals.configured && (
            <div style={{
              padding: '12px',
              backgroundColor: 'rgba(255, 193, 7, 0.1)',
              border: '1px solid #FFC107',
              borderRadius: '6px',
              color: '#F57C00',
              fontSize: '13px',
              marginBottom: '16px'
            }}>
              {signals.message || 'Google Search Console not configured'}
            </div>
          )}

          {signals.configured && signals.queries && signals.queries.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-secondary)' }}>
              No search data available
            </div>
          )}

          {signals.configured && signals.queries && signals.queries.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                Top {signals.queries.length} queries ({signals.period})
              </div>
              {signals.queries.slice(0, 10).map((item: any, index: number) => (
                <div
                  key={index}
                  style={{
                    padding: '12px',
                    backgroundColor: 'var(--color-hover)',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '4px', fontSize: '14px' }}>
                        {item.query}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        {categoryLabels[item.category] || item.category} • {item.clicks} clicks
                      </div>
                    </div>
                    {item.trend && (
                      <div style={{
                        fontSize: '11px',
                        fontWeight: '600',
                        color: item.trend.direction === 'up' ? '#4CAF50' : item.trend.direction === 'down' ? '#EF5350' : 'var(--color-text-secondary)',
                        padding: '2px 6px',
                        backgroundColor: item.trend.direction === 'up' ? 'rgba(76, 175, 80, 0.1)' : item.trend.direction === 'down' ? 'rgba(239, 83, 80, 0.1)' : 'transparent',
                        borderRadius: '4px'
                      }}>
                        {item.trend.direction === 'up' ? '↑' : item.trend.direction === 'down' ? '↓' : '→'} {item.trend.change_pct > 0 ? '+' : ''}{item.trend.change_pct}%
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleCreateContent(item.query, item.category)}
                    style={{
                      width: '100%',
                      padding: '6px 12px',
                      backgroundColor: 'var(--color-primary)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                  >
                    Create Content
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function MarketingPage() {
  return (
    <Suspense fallback={<div style={{ padding: '32px' }}>Loading...</div>}>
      <MarketingContent />
    </Suspense>
  )
}

function PostsView() {
  const { currentTenant, getTenantName, getTenantColor, isTenantSelected } = useTenant()
  const [postInstances, setPostInstances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [contentStatusFilter, setContentStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showNewPostModal, setShowNewPostModal] = useState(false)
  const [selectedPost, setSelectedPost] = useState<any>(null)
  const [channelAccounts, setChannelAccounts] = useState<any[]>([])
  const [error, setError] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [generateItem, setGenerateItem] = useState<any>(null)
  const [postForm, setPostForm] = useState({
    title: '',
    base_caption: '',
    scheduled_for: '',
    channel_account_ids: [] as string[],
    status: 'Idea',
    owner: 'admin',
    content_category: '',
    media_urls: [] as string[],
    cta_type: '',
    cta_url: ''
  })
  const [mediaUrlInput, setMediaUrlInput] = useState('')

  useEffect(() => {
    loadPostInstances()
    loadChannelAccounts()
  }, [currentTenant])

  async function loadChannelAccounts() {
    try {
      const token = localStorage.getItem('token')
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      // For marketing, always use h2o tenant (marketing is h2o-specific)
      const response = await fetch(`${API_BASE_URL}/marketing/channel-accounts?tenant_id=h2o`, {
        headers,
        credentials: 'include'
      })
      const data = await response.json()
      setChannelAccounts(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load channel accounts:', error)
      setChannelAccounts([])
    }
  }

  async function loadPostInstances() {
    try {
      setLoading(true)
      
      let data = await marketingApi.listPostInstances('h2o', {
        status: statusFilter || undefined
      })
      
      if (!Array.isArray(data)) {
        data = []
      }
      
      // Filter by content item status if specified
      if (contentStatusFilter) {
        data = data.filter((pi: any) => pi.content_item?.status === contentStatusFilter)
      }
      
      // Filter by search term
      if (search) {
        const searchLower = search.toLowerCase()
        data = data.filter((pi: any) => 
          pi.content_item?.title?.toLowerCase().includes(searchLower) ||
          pi.content_item?.base_caption?.toLowerCase().includes(searchLower) ||
          pi.channel_account?.name?.toLowerCase().includes(searchLower)
        )
      }
      
      setPostInstances(data)
      setLoading(false)
    } catch (error) {
      console.error('Failed to load post instances:', error)
      handleApiError(error, 'Load post instances')
      setPostInstances([])
      setLoading(false)
    }
  }

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Not authenticated. Please log in again.')
      }

      // Validate required fields
      if (!postForm.title.trim()) {
        throw new Error('Title is required')
      }
      if (!postForm.base_caption.trim()) {
        throw new Error('Content is required')
      }
      if (!postForm.channel_account_ids || postForm.channel_account_ids.length === 0) {
        throw new Error('Please select at least one account')
      }

      // Step 1: Create ContentItem
      const contentItemBody: any = {
        tenant_id: 'h2o',
        title: postForm.title.trim(),
        base_caption: postForm.base_caption.trim(),
        status: postForm.status,
        owner: postForm.owner,
        content_category: postForm.content_category || null,
        media_urls: postForm.media_urls.length > 0 ? postForm.media_urls : null,
        cta_type: postForm.cta_type || null,
        cta_url: postForm.cta_url || null
      }
      
      const itemResponse = await fetch(`${API_BASE_URL}/marketing/content-items`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify(contentItemBody)
      })
      
      if (!itemResponse.ok) {
        const errorData = await itemResponse.json().catch(() => ({ detail: 'Failed to create content item' }))
        throw new Error(errorData.detail || `HTTP ${itemResponse.status}: ${itemResponse.statusText}`)
      }
      
      const contentItem = await itemResponse.json()

      // Step 2: Create PostInstances for selected accounts
      let scheduledFor: string | undefined
      if (postForm.scheduled_for) {
        const scheduledDate = new Date(postForm.scheduled_for)
        if (!isNaN(scheduledDate.getTime())) {
          scheduledFor = scheduledDate.toISOString()
        }
      }

      const instancesResponse = await fetch(`${API_BASE_URL}/marketing/post-instances/bulk?tenant_id=h2o`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          content_item_id: contentItem.id,
          channel_account_ids: postForm.channel_account_ids,
          scheduled_for: scheduledFor
        })
      })
      
      if (!instancesResponse.ok) {
        const errorData = await instancesResponse.json().catch(() => ({ detail: 'Failed to create post instances' }))
        throw new Error(errorData.detail || `HTTP ${instancesResponse.status}: ${instancesResponse.statusText}`)
      }
      
      setShowNewPostModal(false)
      setPostForm({ title: '', base_caption: '', scheduled_for: '', channel_account_ids: [], status: 'Idea', owner: 'admin', content_category: '', media_urls: [], cta_type: '', cta_url: '' })
      setMediaUrlInput('')
      await loadPostInstances()
    } catch (error: any) {
      console.error('Failed to create post:', error)
      setError(error.message || 'Failed to create post. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    loadPostInstances()
  }, [statusFilter, contentStatusFilter, search])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-secondary)' }}>
        Loading posts...
      </div>
    )
  }

  return (
    <div>
      {/* Header with New Post button */}
      <div className="marketing-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
          Marketing Posts
        </h2>
        <button
          onClick={() => setShowNewPostModal(true)}
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
          + New Post
        </button>
      </div>

      {/* New Post Modal */}
      {showNewPostModal && (
        <div className="marketing-modal" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="marketing-modal-content" style={{
            backgroundColor: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
              Create New Post
            </h3>
            {error && (
              <div style={{
                padding: '12px',
                backgroundColor: 'rgba(239, 83, 80, 0.1)',
                border: '1px solid #EF5350',
                borderRadius: '8px',
                color: '#EF5350',
                fontSize: '14px',
                marginBottom: '16px'
              }}>
                {error}
              </div>
            )}
            <form onSubmit={handleCreatePost}>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                    Title *
                  </label>
                  <input
                    required
                    value={postForm.title}
                    onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                    placeholder="Post title"
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      backgroundColor: 'var(--color-hover)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      color: 'var(--color-text-primary)',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                    Content *
                  </label>
                  <textarea
                    required
                    value={postForm.base_caption}
                    onChange={(e) => setPostForm({ ...postForm, base_caption: e.target.value })}
                    placeholder="Post content..."
                    rows={5}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      backgroundColor: 'var(--color-hover)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      color: 'var(--color-text-primary)',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                    Scheduled Date
                  </label>
                  <input
                    type="datetime-local"
                    value={postForm.scheduled_for}
                    onChange={(e) => setPostForm({ ...postForm, scheduled_for: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      backgroundColor: 'var(--color-hover)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      color: 'var(--color-text-primary)',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                    Accounts *
                  </label>
                  <div style={{ display: 'grid', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                    {Array.isArray(channelAccounts) && channelAccounts.length > 0 ? (
                      channelAccounts.map(account => (
                        <label key={account.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={postForm.channel_account_ids.includes(account.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setPostForm({ ...postForm, channel_account_ids: [...postForm.channel_account_ids, account.id] })
                              } else {
                                setPostForm({ ...postForm, channel_account_ids: postForm.channel_account_ids.filter(id => id !== account.id) })
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                            {account.name}
                            {account.channel && ` (${account.channel.display_name || account.channel.key})`}
                          </span>
                        </label>
                      ))
                    ) : (
                      <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', padding: '8px' }}>
                        No accounts available. Please add channel accounts first.
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: submitting ? 'var(--color-hover)' : 'var(--color-primary)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.6 : 1
                  }}
                >
                  {submitting ? 'Creating...' : 'Create Post'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewPostModal(false)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: 'var(--color-hover)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-text-primary)',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Accountability Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          onClick={() => { setStatusFilter(''); setContentStatusFilter(''); setSearch(''); }}
          style={{
            padding: '8px 16px',
            backgroundColor: !statusFilter && !search ? 'var(--color-primary)' : 'var(--color-hover)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            color: !statusFilter && !search ? '#ffffff' : 'var(--color-text-primary)',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          All Posts
        </button>
        <button
          onClick={() => { setContentStatusFilter('Needs Approval'); setStatusFilter(''); }}
          style={{
            padding: '8px 16px',
            backgroundColor: statusFilter === 'Needs_Approval' ? 'rgba(255, 152, 0, 0.2)' : 'var(--color-hover)',
            border: '1px solid ' + (statusFilter === 'Needs_Approval' ? '#FFA726' : 'var(--color-border)'),
            borderRadius: '8px',
            color: statusFilter === 'Needs_Approval' ? '#FFA726' : 'var(--color-text-primary)',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          ⚠️ Needs Approval
        </button>
        <button
          onClick={() => {
            const now = new Date();
            const future48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
            setStatusFilter('Scheduled');
            setContentStatusFilter('');
            setSearch('');
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--color-hover)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            color: 'var(--color-text-primary)',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          ⏰ Due in 48h
        </button>
        <button
          onClick={() => { setContentStatusFilter('Draft'); setStatusFilter(''); setSearch('overdue'); }}
          style={{
            padding: '8px 16px',
            backgroundColor: 'rgba(244, 67, 54, 0.2)',
            border: '1px solid #EF5350',
            borderRadius: '8px',
            color: '#EF5350',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          🔥 Overdue Drafts
        </button>
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <div className="marketing-filter-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <input
            placeholder="Search posts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '10px 16px',
              backgroundColor: 'var(--color-hover)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text-primary)',
              fontSize: '14px'
            }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '10px 16px',
              backgroundColor: 'var(--color-hover)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text-primary)',
              fontSize: '14px'
            }}
          >
            <option value="">All PostInstance Status</option>
            <option value="Planned">Planned</option>
            <option value="Draft">Draft</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Posted">Posted</option>
            <option value="Failed">Failed</option>
          </select>
          <select
            value={contentStatusFilter}
            onChange={(e) => setContentStatusFilter(e.target.value)}
            style={{
              padding: '10px 16px',
              backgroundColor: 'var(--color-hover)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text-primary)',
              fontSize: '14px'
            }}
          >
            <option value="">All Content Status</option>
            <option value="Idea">Idea</option>
            <option value="Draft">Draft</option>
            <option value="Needs Approval">Needs Approval</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Posted">Posted</option>
          </select>
        </div>
      </div>

      {/* PostInstances Table */}
      {!Array.isArray(postInstances) || postInstances.length === 0 ? (
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '48px',
          textAlign: 'center',
          color: 'var(--color-text-secondary)'
        }}>
          No posts found. Create your first marketing post or run the scheduler to create planned slots.
        </div>
      ) : (
        <div className="marketing-table-wrapper" style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <table className="marketing-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{
                backgroundColor: 'var(--color-hover)',
                borderBottom: '1px solid var(--color-border)'
              }}>
                {currentTenant === 'both' && (
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Tenant</th>
                )}
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Scheduled Date</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Account</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Title</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Type</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Approval Status</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Media</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>PostInstance Status</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(postInstances) && postInstances.map((instance, index) => {
                const contentItem = instance.content_item
                const channelAccount = instance.channel_account
                const tenantId = instance.tenant_id as 'h2o' | 'all_county'
                return (
                  <tr
                    key={instance.id}
                    onClick={() => setSelectedPost(instance)}
                    style={{
                      borderBottom: index < postInstances.length - 1 ? '1px solid var(--color-border)' : 'none',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-hover)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    {currentTenant === 'both' && (
                      <td style={{ padding: '16px', fontSize: '14px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          backgroundColor: TENANT_CONFIG[tenantId]?.bgColor || 'var(--color-hover)',
                          color: TENANT_CONFIG[tenantId]?.color || 'var(--color-text-primary)',
                          border: `1px solid ${TENANT_CONFIG[tenantId]?.borderColor || 'var(--color-border)'}`
                        }}>
                          {TENANT_CONFIG[tenantId]?.shortName || tenantId}
                        </span>
                      </td>
                    )}
                    <td style={{ padding: '16px', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                      {instance.scheduled_for ? new Date(instance.scheduled_for).toLocaleString() : 'Not scheduled'}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                      {channelAccount?.name || 'Unknown Account'}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                      {contentItem?.title || (
                        <div className="flex flex-col gap-1">
                          <span style={{ fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>Planned</span>
                          {instance.suggested_category && (
                            <StatusBadge 
                              status={instance.suggested_category.replace(/_/g, ' ')} 
                              variant="category"
                              className="text-[10px] px-1.5 py-0.5 w-fit"
                            />
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                      {contentItem?.content_category ? (
                        <StatusBadge 
                          status={contentItem.content_category.replace(/_/g, ' ')} 
                          variant="category"
                          className="text-[10px] px-1.5 py-0.5"
                        />
                      ) : (
                        instance.suggested_category ? (
                          <StatusBadge 
                            status={instance.suggested_category.replace(/_/g, ' ')} 
                            variant="category"
                            className="text-[10px] px-1.5 py-0.5"
                          />
                        ) : (
                          '-'
                        )
                      )}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px' }}>
                      {contentItem ? (
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          backgroundColor: contentItem.status === 'Needs Approval' ? 'rgba(255, 152, 0, 0.2)' : 'var(--color-hover)',
                          color: contentItem.status === 'Needs Approval' ? '#FFA726' : 'var(--color-text-primary)'
                        }}>
                          {contentItem.status}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>N/A</span>
                      )}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                      {contentItem?.media_assets ? contentItem.media_assets.length : 0}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        backgroundColor: instance.status === 'Planned' ? 'rgba(156, 39, 176, 0.2)' : 
                                       instance.status === 'Scheduled' ? 'rgba(33, 150, 243, 0.2)' :
                                       instance.status === 'Posted' ? 'rgba(76, 175, 80, 0.2)' :
                                       instance.status === 'Failed' ? 'rgba(244, 67, 54, 0.2)' : 'var(--color-hover)',
                        color: instance.status === 'Planned' ? '#9C27B0' :
                               instance.status === 'Scheduled' ? '#2196F3' :
                               instance.status === 'Posted' ? '#4CAF50' :
                               instance.status === 'Failed' ? '#EF5350' : 'var(--color-text-primary)'
                      }}>
                        {instance.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedPost && (
        <PostInstanceDetailModal
          instance={selectedPost}
          onClose={() => setSelectedPost(null)}
          onUpdate={() => {
            loadPostInstances()
            setSelectedPost(null)
          }}
        />
      )}
      
      {/* Generate Posts Modal (from row action) */}
      {generateItem && (
        <GeneratePostsModal
          contentItem={generateItem}
          channelAccounts={channelAccounts}
          onClose={() => setGenerateItem(null)}
          onSuccess={() => {
            setGenerateItem(null)
            loadPostInstances()
          }}
        />
      )}
    </div>
  )
}

function getStatusColor(status: string) {
  const colors: Record<string, any> = {
    'Planned': { backgroundColor: 'rgba(156, 39, 176, 0.15)', color: '#9C27B0' }, // Purple for planned slots
    'Idea': { backgroundColor: 'rgba(158, 158, 158, 0.15)', color: '#BDBDBD' },
    'Draft': { backgroundColor: 'rgba(96, 165, 250, 0.15)', color: '#60A5FA' },
    'Needs Approval': { backgroundColor: 'rgba(255, 152, 0, 0.15)', color: '#FFA726' },
    'Needs_Approval': { backgroundColor: 'rgba(255, 152, 0, 0.15)', color: '#FFA726' },
    'Approved': { backgroundColor: 'rgba(76, 175, 80, 0.15)', color: '#66BB6A' },
    'Scheduled': { backgroundColor: 'rgba(96, 165, 250, 0.2)', color: '#60A5FA' },
    'Posted': { backgroundColor: 'rgba(76, 175, 80, 0.15)', color: '#66BB6A' },
    'Failed': { backgroundColor: 'rgba(244, 67, 54, 0.15)', color: '#EF5350' }
  }
  return colors[status] || colors['Idea']
}

function SystemHealthPanel() {
  const [health, setHealth] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          return
        }

        const response = await fetch(
          `${API_BASE_URL}/marketing/system-health?tenant_id=h2o`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          }
        )

        if (response.ok) {
          const data = await response.json()
          setHealth(data)
        }
      } catch (error) {
        console.error('Failed to fetch system health:', error)
      } finally {
        setLoading(false)
      }
    }
    
    checkHealth()
    const interval = setInterval(checkHealth, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])
  
  if (loading || !health) {
    return null
  }
  
  const MetricCard = ({ title, value, icon, color }: { title: string, value: number, icon: string, color: string }) => {
    const colorMap: Record<string, { bg: string, text: string, border: string }> = {
      blue: { bg: 'rgba(59, 130, 246, 0.1)', text: 'rgb(59, 130, 246)', border: 'rgba(59, 130, 246, 0.3)' },
      green: { bg: 'rgba(34, 197, 94, 0.1)', text: 'rgb(34, 197, 94)', border: 'rgba(34, 197, 94, 0.3)' },
      red: { bg: 'rgba(239, 68, 68, 0.1)', text: 'rgb(239, 68, 68)', border: 'rgba(239, 68, 68, 0.3)' },
      yellow: { bg: 'rgba(234, 179, 8, 0.1)', text: 'rgb(234, 179, 8)', border: 'rgba(234, 179, 8, 0.3)' }
    }
    
    const colors = colorMap[color] || colorMap.blue
    
    return (
      <div style={{
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: '500',
          color: 'var(--color-text-secondary)'
        }}>
          <span>{icon}</span>
          <span>{title}</span>
        </div>
        <div style={{
          fontSize: '24px',
          fontWeight: '700',
          color: colors.text
        }}>
          {value}
        </div>
      </div>
    )
  }
  
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    }}>
      <MetricCard
        title="Scheduled Posts"
        value={health.scheduled_count}
        icon="📅"
        color="blue"
      />
      <MetricCard
        title="Published (30d)"
        value={health.published_count}
        icon="✅"
        color="green"
      />
      <MetricCard
        title="Failed Posts"
        value={health.failed_count}
        icon="⚠️"
        color="red"
      />
      <MetricCard
        title="Empty Slots"
        value={health.empty_slots}
        icon="📝"
        color="yellow"
      />
    </div>
  )
}

function AutoGeneratePanel({ onContentAdded }: { onContentAdded: () => void }) {
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string>('')

  const fetchSuggestions = async () => {
    setGenerating(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(
        `${API_BASE_URL}/marketing/content-suggestions?tenant_id=h2o`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch suggestions' }))
        throw new Error(errorData.detail || 'Failed to fetch suggestions')
      }

      const data = await response.json()
      setSuggestions(data.suggestions || [])
    } catch (error: any) {
      console.error('Failed to fetch suggestions:', error)
      setError(error.message || 'Failed to fetch suggestions')
      setSuggestions([])
    } finally {
      setGenerating(false)
    }
  }

  const applyToCalendar = async (suggestion: any) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Not authenticated')
      }

      // Create ContentItem from suggestion
      const contentResponse = await fetch(
        `${API_BASE_URL}/marketing/content-items`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            tenant_id: 'h2o',
            title: suggestion.suggested_title,
            base_caption: suggestion.suggested_caption,
            content_category: suggestion.suggested_category,
            status: 'Draft',
            owner: 'admin'
          })
        }
      )

      if (!contentResponse.ok) {
        const errorData = await contentResponse.json().catch(() => ({ detail: 'Failed to create content' }))
        throw new Error(errorData.detail || 'Failed to create content')
      }

      const newContent = await contentResponse.json()

      showToast(`Content "${suggestion.suggested_title}" created successfully!`, 'success')
      
      // Refresh calendar to show new content
      onContentAdded()
      
      // Remove suggestion from list
      setSuggestions(prev => prev.filter(s => s.keyword !== suggestion.keyword))
    } catch (error: any) {
      console.error('Failed to apply suggestion:', error)
      showToast(error.message || 'Failed to add content to calendar', 'error')
    }
  }

  if (suggestions.length === 0 && !generating && !error) {
    return null // Don't show panel if no suggestions and not loading
  }

  return (
    <div style={{
      background: 'linear-gradient(to bottom right, rgba(59, 130, 246, 0.1), rgba(99, 102, 241, 0.1))',
      padding: '20px',
      borderRadius: '12px',
      border: '1px solid rgba(59, 130, 246, 0.2)',
      marginBottom: '24px'
    }}>
      <h3 style={{
        margin: '0 0 16px 0',
        fontSize: '16px',
        fontWeight: '600',
        color: 'var(--color-text-primary)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span>✨</span>
        AI Content Suggestions
      </h3>

      <button
        onClick={fetchSuggestions}
        disabled={generating}
        style={{
          width: '100%',
          marginBottom: '16px',
          padding: '12px 20px',
          backgroundColor: generating ? 'var(--color-hover)' : 'rgb(37, 99, 235)',
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: generating ? 'not-allowed' : 'pointer',
          opacity: generating ? 0.6 : 1,
          transition: 'all 0.2s'
        }}
      >
        {generating ? 'Analyzing demand signals...' : '✨ Generate Suggestions'}
      </button>

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          color: 'rgb(239, 68, 68)',
          fontSize: '14px',
          marginBottom: '16px'
        }}>
          {error}
        </div>
      )}

      {suggestions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {suggestions.map((sug, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: 'var(--color-card)',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <StatusBadge
                      status={sug.priority === 'high' ? 'High Priority' : 'Medium Priority'}
                      variant="priority"
                      className="text-xs"
                    />
                    {sug.change_pct && (
                      <span style={{
                        fontSize: '12px',
                        color: 'var(--color-text-secondary)',
                        fontWeight: '500'
                      }}>
                        +{sug.change_pct.toFixed(1)}% demand
                      </span>
                    )}
                  </div>
                  <p style={{
                    margin: '0 0 4px 0',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'var(--color-text-primary)'
                  }}>
                    {sug.suggested_title}
                  </p>
                  <p style={{
                    margin: 0,
                    fontSize: '12px',
                    color: 'var(--color-text-secondary)'
                  }}>
                    Keyword: {sug.keyword}
                  </p>
                  <p style={{
                    margin: '8px 0 0 0',
                    fontSize: '12px',
                    color: 'var(--color-text-secondary)',
                    fontStyle: 'italic'
                  }}>
                    Category: {sug.suggested_category.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => applyToCalendar(sug)}
                style={{
                  width: '100%',
                  marginTop: '8px',
                  padding: '8px 16px',
                  backgroundColor: 'rgb(22, 163, 74)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgb(21, 128, 61)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgb(22, 163, 74)'
                }}
              >
                Add to Calendar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// CalendarView is now in CalendarView.tsx

function AccountsView() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [channels, setChannels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<any>(null)
  const [formError, setFormError] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [connectingAccountId, setConnectingAccountId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    channel_id: '',
    account_name: '',
    account_email: '',
    credential_vault_ref: ''
  })

  // Check if account is Google Business Profile
  const isGoogleAccount = (account: any, channel: any) => {
    const channelKey = channel?.key?.toLowerCase() || ''
    const channelName = channel?.name?.toLowerCase() || ''
    const accountName = account?.name?.toLowerCase() || ''
    return channelKey.includes('google') || channelKey.includes('gbp') || 
           channelName.includes('google') || accountName.includes('google')
  }

  // Handle Google OAuth connection
  async function handleConnectGoogle(accountId: string) {
    setConnectingAccountId(accountId)
    try {
      const result = await oauthApi.getGoogleAuthUrl(accountId)
      window.location.href = result.authorization_url
    } catch (error: any) {
      console.error('Failed to start OAuth:', error)
      showToast(error.message || 'Failed to connect Google. Make sure OAuth is configured.', 'error')
      setConnectingAccountId(null)
    }
  }

  // Handle disconnect
  async function handleDisconnectGoogle(accountId: string) {
    if (!confirm('Disconnect this Google account? Auto-posting will stop working.')) return
    try {
      await oauthApi.disconnectGoogle(accountId)
      showToast('Google account disconnected', 'success')
      loadData()
    } catch (error: any) {
      console.error('Failed to disconnect:', error)
      showToast(error.message || 'Failed to disconnect', 'error')
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const token = localStorage.getItem('token')
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const [accountsRes, channelsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/marketing/channel-accounts?tenant_id=h2o`, { 
          headers,
          credentials: 'include' 
        }),
        fetch(`${API_BASE_URL}/marketing/channels?tenant_id=h2o`, { 
          headers,
          credentials: 'include' 
        })
      ])
      
      if (!accountsRes.ok || !channelsRes.ok) {
        throw new Error('Failed to load data')
      }
      
      const accountsData = await accountsRes.json()
      const channelsData = await channelsRes.json()
      setAccounts(Array.isArray(accountsData) ? accountsData : [])
      setChannels(Array.isArray(channelsData) ? channelsData : [])
      setLoading(false)
    } catch (error) {
      console.error('Failed to load accounts:', error)
      setAccounts([])
      setChannels([])
      setLoading(false)
    }
  }

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)
    
    // Validation
    if (!formData.channel_id) {
      setFormError('Please select a channel')
      setSubmitting(false)
      return
    }
    if (!formData.account_name || !formData.account_name.trim()) {
      setFormError('Account name is required')
      setSubmitting(false)
      return
    }
    if (!formData.account_email || !formData.account_email.trim()) {
      setFormError('Account email is required')
      setSubmitting(false)
      return
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.account_email)) {
      setFormError('Please enter a valid email address')
      setSubmitting(false)
      return
    }
    
    try {
      const token = localStorage.getItem('token')
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const url = editingAccount 
        ? `${API_BASE_URL}/marketing/channel-accounts/${editingAccount.id}`
        : `${API_BASE_URL}/marketing/channel-accounts`
      const method = editingAccount ? 'PATCH' : 'POST'
      
      // Map form data to API schema
      const requestBody = {
        tenant_id: 'h2o',
        channel_id: formData.channel_id,
        name: formData.account_name,
        login_email: formData.account_email,
        credential_vault_ref: formData.credential_vault_ref || null
      }
      
      const response = await fetch(url, {
        method,
        headers,
        credentials: 'include',
        body: JSON.stringify(requestBody)
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to save account' }))
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      showToast(editingAccount ? 'Account updated successfully' : 'Account added successfully', 'success')
      setShowAddForm(false)
      setEditingAccount(null)
      setFormData({ channel_id: '', account_name: '', account_email: '', credential_vault_ref: '' })
      setFormError('')
      loadData()
    } catch (error: any) {
      console.error('Failed to save account:', error)
      setFormError(error.message || 'Failed to save account. Please try again.')
      showToast(error.message || 'Failed to save account', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(accountId: string) {
    if (!confirm('Delete this channel account? This action cannot be undone.')) return
    try {
      const token = localStorage.getItem('token')
      const headers: HeadersInit = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const response = await fetch(`${API_BASE_URL}/marketing/channel-accounts/${accountId}`, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      })
      
      if (response.ok) {
        showToast('Account deleted successfully', 'success')
        loadData()
      } else {
        throw new Error('Failed to delete account')
      }
    } catch (error: any) {
      console.error('Failed to delete account:', error)
      showToast(error.message || 'Failed to delete account', 'error')
    }
  }

  function handleEdit(account: any) {
    setEditingAccount(account)
    setFormData({
      channel_id: account.channel_id,
      account_name: account.name || account.account_name || '',
      account_email: account.login_email || account.account_email || '',
      credential_vault_ref: account.credential_vault_ref || ''
    })
    setShowAddForm(true)
    setFormError('')
  }

  function handleCancelForm() {
    setShowAddForm(false)
    setEditingAccount(null)
    setFormData({ channel_id: '', account_name: '', account_email: '', credential_vault_ref: '' })
    setFormError('')
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-secondary)' }}>
        Loading accounts...
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
          Channel Accounts
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
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
          + Add Account
        </button>
      </div>

      {/* Add/Edit Account Form */}
      {showAddForm && (
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
            {editingAccount ? 'Edit Channel Account' : 'Add Channel Account'}
          </h3>
          {formError && (
            <div style={{
              padding: '12px',
              backgroundColor: 'rgba(239, 83, 80, 0.1)',
              border: '1px solid #EF5350',
              borderRadius: '8px',
              color: '#EF5350',
              fontSize: '14px',
              marginBottom: '16px'
            }}>
              {formError}
            </div>
          )}
          <form onSubmit={handleAddAccount}>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                  Channel
                </label>
                <select
                  required
                  value={formData.channel_id}
                  onChange={(e) => setFormData({ ...formData, channel_id: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    backgroundColor: 'var(--color-hover)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-text-primary)',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select a channel</option>
                  {Array.isArray(channels) && channels.map(ch => (
                    <option key={ch.id} value={ch.id}>{ch.display_name || ch.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                  Account Name
                </label>
                <input
                  required
                  value={formData.account_name}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  placeholder="e.g., H2O Plumbers GBP"
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    backgroundColor: 'var(--color-hover)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-text-primary)',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                  Account Email
                </label>
                <input
                  required
                  type="email"
                  value={formData.account_email}
                  onChange={(e) => setFormData({ ...formData, account_email: e.target.value })}
                  placeholder="email@example.com"
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    backgroundColor: 'var(--color-hover)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-text-primary)',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                  Credential Vault Reference
                </label>
                <input
                  value={formData.credential_vault_ref}
                  onChange={(e) => setFormData({ ...formData, credential_vault_ref: e.target.value })}
                  placeholder="e.g., 1Password: Business/H2O GBP Login"
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    backgroundColor: 'var(--color-hover)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-text-primary)',
                    fontSize: '14px'
                  }}
                />
                <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  Store password reference only (no plain-text passwords)
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '10px 20px',
                  backgroundColor: submitting ? 'var(--color-hover)' : 'var(--color-primary)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.6 : 1
                }}
              >
                {submitting ? 'Saving...' : (editingAccount ? 'Update Account' : 'Save Account')}
              </button>
              <button
                type="button"
                onClick={handleCancelForm}
                disabled={submitting}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'var(--color-hover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  fontSize: '14px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.6 : 1
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Accounts List */}
      {!Array.isArray(accounts) || accounts.length === 0 ? (
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '48px',
          textAlign: 'center',
          color: 'var(--color-text-secondary)'
        }}>
          No channel accounts configured. Add one to get started.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {Array.isArray(accounts) && accounts.map(account => {
            const channel = channels.find(ch => ch.id === account.channel_id)
            return (
              <div
                key={account.id}
                className="marketing-account-card"
                style={{
                  backgroundColor: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                      {account.name || account.account_name}
                    </h4>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '500',
                      backgroundColor: account.oauth_connected ? 'rgba(76, 175, 80, 0.2)' : 'rgba(158, 158, 158, 0.2)',
                      color: account.oauth_connected ? '#66BB6A' : '#BDBDBD'
                    }}>
                      {account.oauth_connected ? '✓ Connected' : 'Manual'}
                    </span>
                    {account.status && (
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '500',
                        backgroundColor: account.status === 'active' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(158, 158, 158, 0.2)',
                        color: account.status === 'active' ? '#66BB6A' : '#BDBDBD'
                      }}>
                        {account.status}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                    <strong>{channel?.display_name || channel?.name || 'Unknown Channel'}</strong> • {account.login_email || account.account_email}
                  </div>
                  {account.credential_vault_ref && (
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                      🔐 Vault: {account.credential_vault_ref}
                    </div>
                  )}
                  {!account.oauth_connected && (
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px', fontStyle: 'italic' }}>
                      Manual posting required - OAuth not connected
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {/* Connect/Disconnect Google button for Google accounts */}
                  {isGoogleAccount(account, channel) && (
                    account.oauth_connected ? (
                      <button
                        onClick={() => handleDisconnectGoogle(account.id)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: 'rgba(239, 83, 80, 0.1)',
                          border: '1px solid #EF5350',
                          borderRadius: '8px',
                          color: '#EF5350',
                          fontSize: '14px',
                          cursor: 'pointer'
                        }}
                      >
                        Disconnect Google
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnectGoogle(account.id)}
                        disabled={connectingAccountId === account.id}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#4285F4',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: connectingAccountId === account.id ? 'wait' : 'pointer',
                          opacity: connectingAccountId === account.id ? 0.7 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {connectingAccountId === account.id ? 'Connecting...' : 'Connect Google'}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => handleEdit(account)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'var(--color-hover)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      color: 'var(--color-text-primary)',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(account.id)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'transparent',
                      border: '1px solid #EF5350',
                      borderRadius: '8px',
                      color: '#EF5350',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

    const monday = getThisWeekStart()
    const friday = new Date(monday)
    friday.setDate(monday.getDate() + 4) // Friday (4 days after Monday)
    friday.setHours(23, 59, 59, 999)
    return friday
  }
  
  const getNextWeekStart = () => {
    const monday = getThisWeekStart()
    const nextMonday = new Date(monday)
    nextMonday.setDate(monday.getDate() + 7)
    return nextMonday
  }
  
  const getNextWeekEnd = () => {
    const nextMonday = getNextWeekStart()
    const nextFriday = new Date(nextMonday)
    nextFriday.setDate(nextMonday.getDate() + 4)
    nextFriday.setHours(23, 59, 59, 999)
    return nextFriday
  }
  
  // Count planned slots for this week and next week
  const getPlannedSlotsCount = (startDate: Date, endDate: Date) => {
    return calendarData.reduce((count, dayData) => {
      const dayDate = new Date(dayData.date)
      if (dayDate >= startDate && dayDate <= endDate) {
        const plannedInDay = dayData.instances?.filter((inst: any) => !inst.content_item_id) || []
        return count + plannedInDay.length
      }
      return count
    }, 0)
  }
  
  const thisWeekStart = getThisWeekStart()
  const thisWeekEnd = getThisWeekEnd()
  const nextWeekStart = getNextWeekStart()
  const nextWeekEnd = getNextWeekEnd()
  const thisWeekPlanned = getPlannedSlotsCount(thisWeekStart, thisWeekEnd)
  const nextWeekPlanned = getPlannedSlotsCount(nextWeekStart, nextWeekEnd)
  
  // Save view mode preference
  const handleViewModeChange = (mode: 'week' | 'month') => {
    setViewMode(mode)
    localStorage.setItem('calendarViewMode', mode)
  }
  
  // Quick navigation to this week or next week
  const goToThisWeek = () => {
    setCurrentDate(getThisWeekStart())
    setViewMode('week')
  }
  
  const goToNextWeek = () => {
    setCurrentDate(getNextWeekStart())
    setViewMode('week')
  }
  
  const toggleDayExpansion = (dateStr: string) => {
    const newExpanded = new Set(expandedDays)
    if (newExpanded.has(dateStr)) {
      newExpanded.delete(dateStr)
    } else {
      newExpanded.add(dateStr)
    }
    setExpandedDays(newExpanded)
  }

  useEffect(() => {
    loadCalendar()
    loadChannels()
    loadChannelAccounts()
  }, [currentDate, viewMode])

  // Auto-generate planned slots on first load if calendar is empty
  const [hasAutoGenerated, setHasAutoGenerated] = useState(false)
  useEffect(() => {
    async function checkAndGenerateSlots() {
      if (!hasAutoGenerated && calendarData.length === 0 && !loading) {
        // Wait a bit for calendar to load, then check if still empty
        setTimeout(async () => {
          const totalInstances = calendarData.reduce((sum, day) => sum + (day.instances?.length || 0), 0)
          if (totalInstances === 0 && !hasAutoGenerated) {
            setHasAutoGenerated(true)
            try {
              const result = await marketingApi.topoffScheduler('h2o', 28)
              if (result.instances_created > 0) {
                showToast(`Auto-generated ${result.instances_created} planned slots for the next 28 days`, 'success')
                await loadCalendar()
              }
            } catch (error) {
              // Silently fail - user can manually trigger if needed
              console.log('Auto-generation skipped:', error)
            }
          }
        }, 2000) // Wait 2 seconds after initial load
      }
    }
    checkAndGenerateSlots()
  }, [calendarData.length, loading, hasAutoGenerated])

  // Auto-generate planned slots on first load if calendar is empty
  useEffect(() => {
    async function checkAndGenerateSlots() {
      if (calendarData.length === 0 && !loading) {
        // Wait a bit for calendar to load, then check if still empty
        setTimeout(async () => {
          if (calendarData.length === 0) {
            try {
              const result = await marketingApi.topoffScheduler('h2o', 28)
              if (result.instances_created > 0) {
                showToast(`Auto-generated ${result.instances_created} planned slots for the next 28 days`, 'success')
                await loadCalendar()
              }
            } catch (error) {
              // Silently fail - user can manually trigger if needed
              console.log('Auto-generation skipped:', error)
            }
          }
        }, 2000) // Wait 2 seconds after initial load
      }
    }
    checkAndGenerateSlots()
  }, [calendarData.length, loading])

  async function loadChannelAccounts() {
    try {
      const accounts = await marketingApi.listChannelAccounts('h2o')
      setChannelAccounts(accounts)
    } catch (error) {
      console.error('Failed to load channel accounts:', error)
      setChannelAccounts([])
    }
  }

  async function loadChannels() {
    try {
      const channelsData = await marketingApi.listChannels('h2o')
      setChannels(channelsData)
    } catch (error) {
      console.error('Failed to load channels:', error)
      setChannels([])
    }
  }

  async function loadCalendar() {
    try {
      setLoading(true)
      let start: Date
      let end: Date

      if (viewMode === 'month') {
        // For month view, get the first and last day of the month
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth()
        start = new Date(year, month, 1)
        end = new Date(year, month + 1, 0)
        
        // Find Monday of the week containing the 1st (Mon-Fri work week)
        const firstDayOfWeek = start.getDay()
        if (firstDayOfWeek === 0) {
          start.setDate(start.getDate() + 1) // Sunday -> Monday
        } else if (firstDayOfWeek > 1) {
          start.setDate(start.getDate() - (firstDayOfWeek - 1)) // Back to Monday
        }
        
        // Find Friday of the week containing the last day
        const lastDayOfWeek = end.getDay()
        if (lastDayOfWeek === 0) {
          end.setDate(end.getDate() - 2) // Sunday -> previous Friday
        } else if (lastDayOfWeek === 6) {
          end.setDate(end.getDate() - 1) // Saturday -> Friday
        }
        // If it's Monday-Friday, use it as is
      } else {
        // For week view, show current week (Mon-Fri) plus buffer
        start = new Date(currentDate)
        const dayOfWeek = start.getDay()
        const daysToMonday = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 0 : 1 - dayOfWeek)
        start.setDate(start.getDate() + daysToMonday - 7) // Previous week Monday
        
        end = new Date(currentDate)
        end.setDate(end.getDate() + daysToMonday + 60) // 60 days from current week Monday
      }

      // Validate dates before API call
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Invalid date range for calendar')
      }

      const data = await marketingApi.getCalendar('h2o', start, end)
      
      // Transform object format { "2024-12-18": [...] } to array format [{ date: "2024-12-18", instances: [...] }]
      const calendarArray = Object.entries(data || {}).map(([date, instances]) => ({
        date: String(date),
        instances: Array.isArray(instances) ? instances : []
      }))
      
      setCalendarData(calendarArray)
    } catch (error) {
      console.error('Failed to load calendar:', error)
      handleApiError(error, 'Load calendar')
      setCalendarData([])
    } finally {
      setLoading(false)
    }
  }

  const getWeekDays = () => {
    const days = []
    const start = new Date(currentDate)
    // Find Monday of current week (0=Sunday, 1=Monday, etc.)
    const dayOfWeek = start.getDay()
    const daysToMonday = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 0 : 1 - dayOfWeek)
    start.setDate(start.getDate() + daysToMonday)
    
    // Only include Monday (1) through Friday (5) - 5 days total (no Saturday/Sunday)
    for (let i = 0; i < 5; i++) {
      const day = new Date(start)
      day.setDate(start.getDate() + i)
      // Only include weekdays: Monday (1) through Friday (5)
      const dayOfWeek = day.getDay()
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        days.push(day)
      }
    }
    return days
  }

  const getMonthDays = () => {
    const days = []
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    // Get first day of month and its day of week
    const firstDay = new Date(year, month, 1)
    const firstDayOfWeek = firstDay.getDay()
    
    // Get last day of month
    const lastDay = new Date(year, month + 1, 0)
    
    // Find Monday of the week containing the 1st
    const startDate = new Date(firstDay)
    if (firstDayOfWeek === 0) {
      // Sunday - go to Monday
      startDate.setDate(startDate.getDate() + 1)
    } else if (firstDayOfWeek > 1) {
      // Tuesday-Saturday - go back to Monday
      startDate.setDate(startDate.getDate() - (firstDayOfWeek - 1))
    }
    
    // Find Friday of the week containing the last day
    const endDayOfWeek = lastDay.getDay()
    const endDate = new Date(lastDay)
    if (endDayOfWeek === 0) {
      // Sunday - go back to previous Friday
      endDate.setDate(endDate.getDate() - 2)
    } else if (endDayOfWeek === 6) {
      // Saturday - go back to Friday
      endDate.setDate(endDate.getDate() - 1)
    }
    // If it's Monday-Friday, use it as is
    
    // Generate all days in the month view, filtering out Saturday (6) and Sunday (0)
    const current = new Date(startDate)
    while (current <= endDate) {
      const dayOfWeek = current.getDay()
      // Only include weekdays: Monday (1) through Friday (5)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        days.push(new Date(current))
      }
      current.setDate(current.getDate() + 1)
    }
    
    return days
  }

  const getInstancesForDate = (date: Date) => {
    if (!date || isNaN(date.getTime())) {
      return []
    }
    try {
      const dateStr = date.toISOString().split('T')[0]
      const dayData = calendarData.find(d => d?.date === dateStr)
      const instances = Array.isArray(dayData?.instances) ? dayData.instances : []
      
      // If filter is enabled, only show planned slots (empty slots)
      if (showOnlyPlanned) {
        return instances.filter((inst: any) => !inst.content_item_id)
      }
      
      return instances
    } catch (error) {
      console.error('Error getting instances for date:', error)
      return []
    }
  }

  async function handleTopoff() {
    setTopoffLoading(true)
    try {
      const result = await marketingApi.topoffScheduler('h2o', 28)
      showToast(`Created ${result.instances_created} new slots, skipped ${result.instances_skipped} existing`, 'success')
      await loadCalendar()
    } catch (error: any) {
      console.error('Failed to top off slots:', error)
      handleApiError(error, 'Top off scheduler')
      showToast(error.message || 'Failed to top off slots', 'error')
    } finally {
      setTopoffLoading(false)
    }
  }

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Not authenticated. Please log in again.')
      }

      // Validate required fields
      if (!postForm.title.trim()) {
        throw new Error('Title is required')
      }
      if (!postForm.base_caption.trim()) {
        throw new Error('Content is required')
      }
      if (!postForm.channel_account_ids || postForm.channel_account_ids.length === 0) {
        throw new Error('Please select at least one account')
      }

      // Step 1: Create ContentItem
      const contentItem = await marketingApi.createContentItem({
        tenant_id: 'h2o',
        title: postForm.title.trim(),
        base_caption: postForm.base_caption.trim(),
        status: postForm.status,
        owner: postForm.owner,
        content_category: postForm.content_category || undefined,
        media_urls: postForm.media_urls.length > 0 ? postForm.media_urls : undefined
      })

      // Step 2: Create PostInstances for selected accounts
      let scheduledFor: string | undefined
      if (postForm.scheduled_for) {
        const scheduledDate = new Date(postForm.scheduled_for)
        if (!isNaN(scheduledDate.getTime())) {
          scheduledFor = scheduledDate.toISOString()
        }
      }

      await marketingApi.createPostInstances('h2o', {
        content_item_id: contentItem.id,
        channel_account_ids: postForm.channel_account_ids,
        scheduled_for: scheduledFor
      })
      
      setShowNewPostModal(false)
      setPostForm({ title: '', base_caption: '', scheduled_for: '', channel_account_ids: [], status: 'Idea', owner: 'admin', content_category: '', media_urls: [], cta_type: '', cta_url: '' })
      setMediaUrlInput('')
      setError('')
      await loadCalendar()
      showToast('Post created successfully', 'success')
    } catch (error: any) {
      console.error('Failed to create post:', error)
      handleApiError(error, 'Create post')
      setError(error.message || 'Failed to create post. Please try again.')
      showToast(error.message || 'Failed to create post', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-secondary)' }}>
        Loading calendar...
      </div>
    )
  }

  const weekDays = getWeekDays()
  const monthDays = getMonthDays()
  const displayDays = viewMode === 'month' ? monthDays : weekDays
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  // Calculate total planned slots (empty slots) in visible range
  const totalPlannedSlots = calendarData.reduce((sum, day) => {
    const instances = day.instances || []
    return sum + instances.filter((inst: any) => !inst.content_item_id).length
  }, 0)

  // Calculate total posts with content
  const totalPostsWithContent = calendarData.reduce((sum, day) => {
    const instances = day.instances || []
    return sum + instances.filter((inst: any) => inst.content_item_id).length
  }, 0)

  return (
    <div>
      {/* Summary Banner */}
      {totalPlannedSlots > 0 && (
        <div style={{
          backgroundColor: 'rgba(147, 51, 234, 0.15)',
          border: '1px solid rgba(147, 51, 234, 0.3)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'rgba(147, 51, 234, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              📅
            </div>
            <div>
              <div style={{
                fontSize: '16px',
                fontWeight: '600',
                color: 'var(--color-text-primary)',
                marginBottom: '4px'
              }}>
                {totalPlannedSlots} Planned Slot{totalPlannedSlots !== 1 ? 's' : ''} Need Content
              </div>
              <div style={{
                fontSize: '13px',
                color: 'var(--color-text-secondary)'
              }}>
                {totalPostsWithContent} post{totalPostsWithContent !== 1 ? 's' : ''} with content scheduled
              </div>
            </div>
          </div>
          <Button
            onClick={() => setShowOnlyPlanned(true)}
            variant="primary"
            className="bg-purple-600 hover:bg-purple-700"
          >
            View Empty Slots Only
          </Button>
        </div>
      )}

      {/* Calendar Controls */}
      <div className="marketing-calendar-controls" style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => {
              const newDate = new Date(currentDate)
              if (viewMode === 'month') {
                newDate.setMonth(newDate.getMonth() - 1)
              } else {
                newDate.setDate(newDate.getDate() - 7)
              }
              setCurrentDate(newDate)
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--color-hover)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text-primary)',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            ← {viewMode === 'month' ? 'Previous Month' : 'Previous'}
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--color-hover)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text-primary)',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Today
          </button>
          <button
            onClick={() => {
              const newDate = new Date(currentDate)
              if (viewMode === 'month') {
                newDate.setMonth(newDate.getMonth() + 1)
              } else {
                newDate.setDate(newDate.getDate() + 7)
              }
              setCurrentDate(newDate)
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--color-hover)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text-primary)',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            {viewMode === 'month' ? 'Next Month' : 'Next'} →
          </button>
        </div>

        <h3 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: '600',
          color: 'var(--color-text-primary)'
        }}>
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>

        <div className="flex gap-3 items-center flex-wrap">
          <Button
            onClick={() => setShowNewPostModal(true)}
            variant="primary"
            className="min-h-[44px]"
          >
            + New Post
          </Button>
          <Button
            onClick={handleTopoff}
            disabled={topoffLoading}
            variant="primary"
            className="min-h-[44px] bg-purple-600/80 hover:bg-purple-600 disabled:opacity-60 disabled:cursor-not-allowed"
            title="Generate planned slots for the next 28 days"
          >
            {topoffLoading ? 'Generating...' : '📅 Top off 28 days'}
          </Button>
          <div className="flex bg-[var(--color-hover)] rounded-lg p-1">
            <button
              onClick={() => handleViewModeChange('week')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all min-h-[44px] ${
                viewMode === 'week'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-transparent text-[var(--color-text-primary)] hover:bg-white/5'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => handleViewModeChange('month')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all min-h-[44px] ${
                viewMode === 'month'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-transparent text-[var(--color-text-primary)] hover:bg-white/5'
              }`}
            >
              Month
            </button>
          </div>
          <button
            onClick={() => setShowOnlyPlanned(!showOnlyPlanned)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all min-h-[44px] ${
              showOnlyPlanned
                ? 'bg-purple-600 text-white'
                : 'bg-[var(--color-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]'
            }`}
            title="Show only planned slots that need content"
          >
            {showOnlyPlanned ? '✓' : ''} Show Only Empty Slots
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <CalendarSkeleton viewMode={viewMode} />
      ) : (
        <div className="marketing-calendar-grid bg-[var(--color-card)]/50 border border-white/[0.08] backdrop-blur-sm shadow-xl rounded-lg overflow-hidden">
        <div className={`grid grid-cols-5 gap-px bg-[var(--color-border)] ${viewMode === 'month' ? 'min-w-[500px]' : ''}`}>
          {/* Day Headers - Monday through Friday only (no Saturday/Sunday) */}
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
            <div
              key={day}
              className="p-3 bg-[var(--color-hover)] text-center text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider"
            >
              {day}
            </div>
          ))}

          {/* Day Cells */}
          {displayDays.map(day => {
            const instances = getInstancesForDate(day)
            const isToday = day.toDateString() === new Date().toDateString()
            const isCurrentMonth = day.getMonth() === currentMonth && day.getFullYear() === currentYear
            const isOtherMonth = !isCurrentMonth
            const dayDate = new Date(day)
            dayDate.setHours(0, 0, 0, 0)
            const isThisWeek = dayDate >= thisWeekStart && dayDate <= thisWeekEnd
            const isNextWeek = dayDate >= nextWeekStart && dayDate <= nextWeekEnd
            const plannedCount = instances.filter((inst: any) => !inst.content_item_id).length
            
            return (
              <div
                key={day.toISOString()}
                className={`marketing-calendar-day-cell bg-[var(--color-card)] relative p-3 transition-colors ${isOtherMonth ? 'opacity-40' : ''} ${isToday ? 'ring-2 ring-[var(--color-primary)]/30' : ''} ${isThisWeek ? 'bg-orange-500/5 border-l-2 border-orange-500/30' : ''} ${isNextWeek && !isThisWeek ? 'bg-blue-500/5 border-l-2 border-blue-500/30' : ''}`}
                style={{
                  minHeight: viewMode === 'month' ? '120px' : '140px'
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`text-sm font-semibold ${isToday ? 'text-[var(--color-primary)]' : isOtherMonth ? 'text-[var(--color-text-tertiary)]' : 'text-[var(--color-text-primary)]'}`}>
                    {day.getDate()}
                  </div>
                  {plannedCount > 0 && (
                    <div className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium">
                      {plannedCount} empty
                    </div>
                  )}
                </div>
                
                {instances.length === 0 && (
                  <div className="text-[10px] text-[var(--color-text-tertiary)] italic mt-2 opacity-50">
                    No posts
                  </div>
                )}
                {instances.length > 0 && (() => {
                  const MAX_VISIBLE = 4
                  const dateStr = day.toISOString().split('T')[0]
                  const isExpanded = expandedDays.has(dateStr)
                  const visibleInstances = isExpanded 
                    ? instances 
                    : instances.slice(0, MAX_VISIBLE)
                  const hiddenCount = Math.max(0, instances.length - MAX_VISIBLE)
                  
                  return (
                    <div className="flex flex-col gap-1.5">
                      {visibleInstances.map((instance: any) => {
                        const contentItem = instance.content_item
                        const channelAccount = instance.channel_account
                        const accountName = channelAccount?.name || 'Unknown Account'
                        // A post is "planned" (empty) only if it has no content_item_id
                        // If content_item_id exists, show the content regardless of status
                        const isPlanned = !instance.content_item_id
                        
                        return (
                          <div
                            key={instance.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedPost(instance)
                            }}
                            className={`
                              ${viewMode === 'month' ? 'p-1.5 text-[10px]' : 'p-2 text-xs'}
                              rounded-md cursor-pointer transition-all
                              ${isPlanned 
                                ? 'bg-purple-500/20 border-2 border-dashed border-purple-400/60 hover:border-purple-400 hover:bg-purple-500/30' 
                                : instance.status === 'Posted'
                                ? 'bg-green-500/20 border-l-2 border-green-500 hover:border-green-400'
                                : 'bg-[var(--color-hover)]/50 border border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
                              }
                            `}
                            title={isPlanned 
                              ? `Planned slot - ${accountName}${instance.suggested_category ? ` - Needs: ${instance.suggested_category.replace(/_/g, ' ')}` : ''} - Click to add content`
                              : `${contentItem?.title || 'Untitled'} - ${accountName}${contentItem?.media_assets && contentItem.media_assets.length > 0 ? ` (${contentItem.media_assets.length} media)` : ''}`}
                          >
                            <div className={`font-semibold mb-1 overflow-hidden text-ellipsis whitespace-nowrap ${isPlanned ? 'text-purple-300' : 'text-[var(--color-text-primary)]'}`}>
                              {isPlanned ? (
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs">📅</span>
                                    <span className="text-xs italic">Empty slot</span>
                                  </div>
                                  {instance.suggested_category && (
                                    <StatusBadge 
                                      status={instance.suggested_category.replace(/_/g, ' ')} 
                                      variant="category"
                                      className="text-[8px] px-1 py-0 w-fit"
                                    />
                                  )}
                                </div>
                              ) : (
                                <span className="truncate">{contentItem?.title || 'Untitled'}</span>
                              )}
                            </div>
                            {isPlanned && viewMode === 'month' && (
                              <div className="text-[9px] text-[var(--color-text-secondary)] mt-0.5 truncate">
                                {accountName}
                              </div>
                            )}
                            {!isPlanned && contentItem?.media_assets && contentItem.media_assets.length > 0 && (
                              <div className="flex items-center gap-1 mt-1">
                                {contentItem.media_assets[0]?.file_type === 'image' && (
                                  <img
                                    src={contentItem.media_assets[0].file_url}
                                    alt=""
                                    className="w-4 h-4 rounded object-cover border border-white/20"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                    }}
                                  />
                                )}
                                <span className="text-[9px] text-[var(--color-text-secondary)]">
                                  {contentItem.media_assets.length} media
                                </span>
                              </div>
                            )}
                            {!isPlanned && viewMode === 'month' && (
                              <div className="text-[9px] text-[var(--color-text-secondary)] mt-0.5 truncate">
                                {accountName}
                              </div>
                            )}
                            {viewMode === 'week' && !isPlanned && (
                              <>
                                <div className="text-[10px] text-[var(--color-text-secondary)] mt-1 truncate">
                                  {accountName}
                                </div>
                                <div className="flex items-center justify-between gap-2 mt-1">
                                  <span className="text-[9px] text-[var(--color-text-secondary)]">
                                    {instance.status}
                                  </span>
                                  {instance.scheduled_for && (
                                    <span className="text-[9px] text-[var(--color-text-tertiary)]">
                                      {new Date(instance.scheduled_for).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                    </span>
                                  )}
                                </div>
                              </>
                            )}
                            {viewMode === 'month' && !isPlanned && (
                              <div className="text-[8px] text-[var(--color-text-secondary)] mt-0.5">
                                {instance.status}
                              </div>
                            )}
                          </div>
                        )
                      })}
                      {hiddenCount > 0 && !isExpanded && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleDayExpansion(dateStr)
                          }}
                          className="text-xs text-[var(--color-primary)] hover:text-[var(--color-primary)]/80 font-medium mt-1 flex items-center gap-1 transition-colors"
                          style={{ 
                            fontSize: '10px',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <span>+</span>
                          {hiddenCount} more post{hiddenCount > 1 ? 's' : ''}
                        </button>
                      )}
                      {isExpanded && hiddenCount > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleDayExpansion(dateStr)
                          }}
                          className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] font-medium mt-1 flex items-center gap-1 transition-colors"
                          style={{ 
                            fontSize: '10px',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          Show less
                        </button>
                      )}
                    </div>
                  )
                })()}
              </div>
            )
          })}
        </div>
      </div>
      )}

      {/* Post Instance Detail Modal */}
      {selectedPost && <PostInstanceDetailModal instance={selectedPost} onClose={() => setSelectedPost(null)} onUpdate={() => { loadCalendar(); setSelectedPost(null); }} />}

      {/* New Post Modal */}
      {showNewPostModal && (
        <div className="marketing-modal" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="marketing-modal-content" style={{
            backgroundColor: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
              Create New Post
            </h3>
            {error && (
              <div style={{
                padding: '12px',
                backgroundColor: 'rgba(239, 83, 80, 0.1)',
                border: '1px solid #EF5350',
                borderRadius: '8px',
                color: '#EF5350',
                fontSize: '14px',
                marginBottom: '16px'
              }}>
                {error}
              </div>
            )}
            <form onSubmit={handleCreatePost}>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                    Title *
                  </label>
                  <input
                    required
                    value={postForm.title}
                    onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                    placeholder="Post title"
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      backgroundColor: 'var(--color-hover)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      color: 'var(--color-text-primary)',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                    Content *
                  </label>
                  <textarea
                    required
                    value={postForm.base_caption}
                    onChange={(e) => setPostForm({ ...postForm, base_caption: e.target.value })}
                    placeholder="Post content..."
                    rows={5}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      backgroundColor: 'var(--color-hover)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      color: 'var(--color-text-primary)',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                    Scheduled Date
                  </label>
                  <input
                    type="datetime-local"
                    value={postForm.scheduled_for}
                    onChange={(e) => setPostForm({ ...postForm, scheduled_for: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      backgroundColor: 'var(--color-hover)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      color: 'var(--color-text-primary)',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                    Accounts *
                  </label>
                  <div style={{ display: 'grid', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                    {Array.isArray(channelAccounts) && channelAccounts.length > 0 ? (
                      channelAccounts.map(account => (
                        <label key={account.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={postForm.channel_account_ids.includes(account.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setPostForm({ ...postForm, channel_account_ids: [...postForm.channel_account_ids, account.id] })
                              } else {
                                setPostForm({ ...postForm, channel_account_ids: postForm.channel_account_ids.filter(id => id !== account.id) })
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                            {account.name}
                            {account.channel && ` (${account.channel.display_name || account.channel.key})`}
                          </span>
                        </label>
                      ))
                    ) : (
                      <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', padding: '8px' }}>
                        No accounts available. Please add channel accounts first.
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: submitting ? 'var(--color-hover)' : 'var(--color-primary)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.6 : 1
                  }}
                >
                  {submitting ? 'Creating...' : 'Create Post'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewPostModal(false)
                    setError('')
                    setPostForm({ title: '', base_caption: '', scheduled_for: '', channel_account_ids: [], status: 'Idea', owner: 'admin', content_category: '', media_urls: [], cta_type: '', cta_url: '' })
                    setMediaUrlInput('')
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: 'var(--color-hover)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-text-primary)',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function PostDetailModal({ post, channels, onClose, onUpdate }: { post: any, channels: any[], onClose: () => void, onUpdate: () => void }) {
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [showAudit, setShowAudit] = useState(false)
  const [editForm, setEditForm] = useState({
    title: post.title || '',
    body_text: post.body_text || '',
    scheduled_for: post.scheduled_for && typeof post.scheduled_for === 'string' ? post.scheduled_for.slice(0, 16) : '',
    draft_due_date: post.draft_due_date && typeof post.draft_due_date === 'string' ? post.draft_due_date.slice(0, 16) : '',
    channel_ids: Array.isArray(post.channel_ids) ? post.channel_ids : [],
    status: post.status || 'Draft',
    owner: post.owner || 'admin',
    reviewer: post.reviewer || '',
    tags: Array.isArray(post.tags) ? post.tags : [],
    target_city: post.target_city || '',
    cta_type: post.cta_type || 'None',
    cta_url: post.cta_url || ''
  })
  const [updateError, setUpdateError] = useState<string>('')
  const [updating, setUpdating] = useState(false)

  async function handleUpdate() {
    setUpdateError('')
    setUpdating(true)
    try {
      // Map editForm to content-item schema
      const updateData: any = {
        title: editForm.title,
        base_caption: editForm.body_text,
        status: editForm.status,
        owner: editForm.owner,
        reviewer: editForm.reviewer || null,
        draft_due_date: editForm.draft_due_date || null,
        tags: editForm.tags || [],
        target_city: editForm.target_city || null,
        cta_type: editForm.cta_type || null,
        cta_url: editForm.cta_url || null
      }
      
      const response = await fetch(`${API_BASE_URL}/marketing/content-items/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updateData)
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to update post' }))
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      onUpdate()
    } catch (error: any) {
      console.error('Failed to update post:', error)
      setUpdateError(error.message || 'Failed to update post. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  // NOTE: Mark-posted and mark-failed operations are for PostInstances, not ContentItems.
  // These operations should be performed using PostInstanceDetailModal, not PostDetailModal.
  // The legacy content-posts endpoints no longer exist in the new data model.
  // If you need to mark posts as posted/failed, use the PostInstanceDetailModal component.
  
  // Removed handleMarkPosted() - Use PostInstanceDetailModal.mark-posted endpoint instead
  // Removed handleMarkFailed() - Use PostInstanceDetailModal.mark-failed endpoint instead

  const postChannels = Array.isArray(post.channel_ids) && Array.isArray(channels)
    ? post.channel_ids.map((cid: string) => 
        channels.find(ch => ch.id === cid)?.name
      ).filter(Boolean).join(', ') || 'No channel'
    : 'No channel'

  async function loadAuditTrail() {
    try {
      const response = await fetch(`/api/v1/audit?entity_type=content_item&entity_id=${post.id}`, {
        credentials: 'include'
      })
      const data = await response.json()
      setAuditLogs(data)
      setShowAudit(true)
    } catch (error) {
      console.error('Failed to load audit trail:', error)
    }
  }

  return (
    <div className="marketing-modal" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="marketing-modal-content" style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '700px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
              {post.title}
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              {postChannels} • {post.owner}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '6px 12px',
              backgroundColor: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ×
          </button>
        </div>

        {/* Status Badge */}
        <div style={{ marginBottom: '20px' }}>
          <span style={{
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            ...getStatusColor(editForm.status)
          }}>
            {editForm.status}
          </span>
        </div>

        {/* Error Message */}
        {updateError && (
          <div style={{
            padding: '12px',
            backgroundColor: 'rgba(239, 83, 80, 0.1)',
            border: '1px solid #EF5350',
            borderRadius: '8px',
            color: '#EF5350',
            fontSize: '14px',
            marginBottom: '20px'
          }}>
            {updateError}
          </div>
        )}

        {/* Edit Form */}
        <div style={{ display: 'grid', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
              Title
            </label>
            <input
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: 'var(--color-hover)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                color: 'var(--color-text-primary)',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
              Content
            </label>
            <textarea
              value={editForm.body_text}
              onChange={(e) => setEditForm({ ...editForm, body_text: e.target.value })}
              rows={6}
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: 'var(--color-hover)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                color: 'var(--color-text-primary)',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                Scheduled Date
              </label>
              <input
                type="datetime-local"
                value={editForm.scheduled_for}
                onChange={(e) => setEditForm({ ...editForm, scheduled_for: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  backgroundColor: 'var(--color-hover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                Draft Due Date
              </label>
              <input
                type="datetime-local"
                value={editForm.draft_due_date}
                onChange={(e) => setEditForm({ ...editForm, draft_due_date: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  backgroundColor: 'var(--color-hover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                Status
              </label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  backgroundColor: 'var(--color-hover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  fontSize: '14px'
                }}
              >
                <option value="Idea">Idea</option>
                <option value="Draft">Draft</option>
                <option value="Needs_Approval">Needs Approval</option>
                <option value="Approved">Approved</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Posted">Posted</option>
                <option value="Failed">Failed</option>
                <option value="Canceled">Canceled</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                Owner *
              </label>
              <input
                required
                value={editForm.owner}
                onChange={(e) => setEditForm({ ...editForm, owner: e.target.value })}
                placeholder="Who owns this post"
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  backgroundColor: 'var(--color-hover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                Reviewer (optional)
              </label>
              <input
                value={editForm.reviewer}
                onChange={(e) => setEditForm({ ...editForm, reviewer: e.target.value })}
                placeholder="Who reviews/approves"
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  backgroundColor: 'var(--color-hover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                Target City
              </label>
              <input
                value={editForm.target_city}
                onChange={(e) => setEditForm({ ...editForm, target_city: e.target.value })}
                placeholder="Vancouver, WA"
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  backgroundColor: 'var(--color-hover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
              Channels
            </label>
            <div style={{ display: 'grid', gap: '8px' }}>
              {Array.isArray(channels) && channels.length > 0 ? (
                channels.map(ch => (
                  <label key={ch.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={editForm.channel_ids.includes(ch.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditForm({ ...editForm, channel_ids: [...editForm.channel_ids, ch.id] })
                        } else {
                          setEditForm({ ...editForm, channel_ids: editForm.channel_ids.filter(id => id !== ch.id) })
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>{ch.display_name || ch.name}</span>
                  </label>
                ))
              ) : (
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', padding: '8px' }}>
                  No channels available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
          <button
            onClick={handleUpdate}
            disabled={updating}
            style={{
              padding: '10px 20px',
              backgroundColor: updating ? 'var(--color-hover)' : 'var(--color-primary)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '500',
              cursor: updating ? 'not-allowed' : 'pointer',
              opacity: updating ? 0.6 : 1
            }}
          >
            {updating ? 'Saving...' : 'Save Changes'}
          </button>
          {/* NOTE: Mark-posted and mark-failed operations removed.
              These operations should be performed at the PostInstance level using PostInstanceDetailModal.
              ContentItems cannot be marked as posted/failed - only PostInstances can. */}
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--color-hover)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text-primary)',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={loadAuditTrail}
            style={{
              padding: '10px 20px',
              backgroundColor: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text-secondary)',
              fontSize: '14px',
              cursor: 'pointer',
              marginLeft: 'auto'
            }}
          >
            📋 History
          </button>
        </div>

        {/* Audit Trail */}
        {showAudit && (
          <div style={{ marginTop: '24px', borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
              Change History
            </h4>
            {auditLogs.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>No changes recorded</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {auditLogs.map((log: any) => (
                  <div
                    key={log.id}
                    style={{
                      padding: '12px',
                      backgroundColor: 'var(--color-hover)',
                      borderRadius: '8px',
                      fontSize: '13px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>{log.changed_by}</span>
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                        {new Date(log.changed_at).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ color: 'var(--color-text-secondary)' }}>
                      {log.action === 'create' && '✨ Created post'}
                      {log.action === 'update' && '✏️ Updated post'}
                      {log.action === 'delete' && '🗑️ Deleted post'}
                      {log.action === 'mark_posted' && '✅ Marked as posted'}
                      {log.action === 'mark_failed' && '❌ Marked as failed'}
                      {log.field && (
                        <span>
                          {' - '}
                          <span style={{ color: 'var(--color-text-primary)' }}>{log.field}</span>
                          {log.old_value && log.new_value && (
                            <span>
                              {': '}
                              <span style={{ textDecoration: 'line-through' }}>{log.old_value}</span>
                              {' → '}
                              <span style={{ fontWeight: '600' }}>{log.new_value}</span>
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Content Item Detail Modal
function ContentItemDetailModal({ item, channelAccounts, onClose, onUpdate }: { item: any, channelAccounts: any[], onClose: () => void, onUpdate: () => void }) {
  const [postInstances, setPostInstances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showGenerateModal, setShowGenerateModal] = useState(false)

  useEffect(() => {
    loadPostInstances()
  }, [item.id])

  async function loadPostInstances() {
    try {
      const token = localStorage.getItem('token')
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const response = await fetch(`${API_BASE_URL}/marketing/post-instances?tenant_id=h2o&content_item_id=${item.id}`, {
        headers,
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setPostInstances(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Failed to load post instances:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="marketing-modal" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="marketing-modal-content" style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
              {item.title}
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              {item.owner} • {item.status}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setShowGenerateModal(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--color-primary)',
                border: 'none',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Generate Posts
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '6px 12px',
                backgroundColor: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                fontSize: '18px'
              }}
            >
              ×
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: 'var(--color-text-primary)' }}>Content</h4>
          <div style={{
            padding: '12px',
            backgroundColor: 'var(--color-hover)',
            borderRadius: '8px',
            fontSize: '14px',
            color: 'var(--color-text-primary)',
            whiteSpace: 'pre-wrap'
          }}>
            {item.base_caption || 'No content'}
          </div>
        </div>

        <div>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: 'var(--color-text-primary)' }}>Post Instances</h4>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-secondary)' }}>Loading...</div>
          ) : postInstances.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-secondary)' }}>No post instances yet</div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {postInstances.map((instance: any) => {
                const account = channelAccounts.find(acc => acc.id === instance.channel_account_id)
                return (
                  <div
                    key={instance.id}
                    style={{
                      padding: '12px',
                      backgroundColor: 'var(--color-hover)',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>
                        {account?.name || 'Unknown Account'}
                      </div>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '500',
                        ...getStatusColor(instance.status)
                      }}>
                        {instance.status}
                      </span>
                    </div>
                    {instance.scheduled_for && (
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        Scheduled: {new Date(instance.scheduled_for).toLocaleString()}
                      </div>
                    )}
                    {instance.post_url && (
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>
                        <a href={instance.post_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>
                          View Post →
                        </a>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Generate Posts Modal */}
      {showGenerateModal && (
        <GeneratePostsModal
          contentItem={item}
          channelAccounts={channelAccounts}
          onClose={() => setShowGenerateModal(false)}
          onSuccess={() => {
            setShowGenerateModal(false)
            loadPostInstances()
            onUpdate()
          }}
        />
      )}
    </div>
  )
}

// Post Instance Detail Modal
function PostInstanceDetailModal({ instance, onClose, onUpdate }: { instance: any, onClose: () => void, onUpdate: () => void }) {
  const contentItem = instance.content_item
  const channelAccount = instance.channel_account
  const [showMarkPostedModal, setShowMarkPostedModal] = useState(false)
  const [showEditContentModal, setShowEditContentModal] = useState(false)
  const [isPlannedSlot, setIsPlannedSlot] = useState(false)
  
  useEffect(() => {
    // Check if this is a planned slot (no content_item_id)
    // If content_item_id exists, it's not a planned slot regardless of status
    const isPlanned = !instance.content_item_id
    setIsPlannedSlot(isPlanned)
    // Auto-open editor for planned slots (empty slots only)
    if (isPlanned) {
      setShowEditContentModal(true)
    }
  }, [instance])

  return (
    <div className="marketing-modal" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="marketing-modal-content" style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
              {instance.content_item_id ? (contentItem?.title || 'Untitled') : 'Planned Slot'}
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{channelAccount?.name || 'Unknown Account'} • {instance.status}</span>
              {instance.suggested_category && (
                <span style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(156, 39, 176, 0.2)',
                  color: '#9C27B0',
                  fontWeight: '500',
                  textTransform: 'capitalize'
                }}>
                  {instance.suggested_category.replace('_', ' ')}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '6px 12px',
              backgroundColor: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: 'var(--color-text-primary)' }}>Content</h4>
            {isPlannedSlot && (
              <button
                onClick={() => setShowEditContentModal(true)}
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
                Add Content
              </button>
            )}
          </div>
          <div style={{
            padding: '12px',
            backgroundColor: isPlannedSlot ? 'rgba(156, 39, 176, 0.1)' : 'var(--color-hover)',
            borderRadius: '8px',
            fontSize: '14px',
            color: isPlannedSlot ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
            whiteSpace: 'pre-wrap',
            fontStyle: isPlannedSlot ? 'italic' : 'normal'
          }}>
            {isPlannedSlot 
              ? '📅 Planned slot - Click "Add Content" to fill this post'
              : (instance.caption_override || contentItem?.base_caption || 'No content')
            }
          </div>
        </div>

        {instance.scheduled_for && (
          <div style={{ marginBottom: '20px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            <strong>Scheduled:</strong> {new Date(instance.scheduled_for).toLocaleString()}
          </div>
        )}

        {instance.post_url && (
          <div style={{ marginBottom: '20px' }}>
            <a href={instance.post_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>
              View Post →
            </a>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {instance.status !== 'Posted' && (
            <button
              onClick={() => setShowMarkPostedModal(true)}
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
              Mark as Posted
            </button>
          )}
        </div>
      </div>
      
      {/* Mark Posted Modal */}
      {showMarkPostedModal && (
        <MarkPostedModal
          instance={instance}
          onClose={() => setShowMarkPostedModal(false)}
          onSuccess={() => {
            setShowMarkPostedModal(false)
            onUpdate()
          }}
        />
      )}

      {/* Edit Content Modal for Planned Slots */}
      {showEditContentModal && (
        <EditPlannedSlotModal
          instance={instance}
          contentItem={contentItem}
          onClose={() => setShowEditContentModal(false)}
          onSuccess={() => {
            setShowEditContentModal(false)
            onUpdate()
          }}
        />
      )}
    </div>
  )
}

// Edit Planned Slot Modal - Allows adding content to planned slots
function EditPlannedSlotModal({ instance, contentItem, onClose, onSuccess }: { instance: any, contentItem: any, onClose: () => void, onSuccess: () => void }) {
  const [title, setTitle] = useState('')
  const [baseCaption, setBaseCaption] = useState('')
  const [contentCategory, setContentCategory] = useState(instance.suggested_category || '')
  const [postType, setPostType] = useState('Post')
  const [uploadedMediaAssets, setUploadedMediaAssets] = useState<MediaAsset[]>(contentItem?.media_assets || [])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  // GBP-specific fields
  const [gbpPostType, setGbpPostType] = useState(instance.gbp_post_type || '')
  const [gbpCtaType, setGbpCtaType] = useState(instance.gbp_cta_type || '')
  const [gbpLocationTargeting, setGbpLocationTargeting] = useState(instance.gbp_location_targeting || '')
  
  // Check if this is a GBP channel account
  const isGBP = instance.channel_account?.channel?.key === 'google_business_profile' || 
                instance.channel_account?.channel?.key === 'gbp' ||
                instance.channel_account?.name?.toLowerCase().includes('gbp') ||
                instance.channel_account?.name?.toLowerCase().includes('google business')
  
  const categories = [
    { value: 'ad_content', label: 'Ad Content' },
    { value: 'team_post', label: 'Team Post' },
    { value: 'coupon', label: 'Coupon' },
    { value: 'diy', label: 'DIY' },
    { value: 'blog_post', label: 'Blog Post' }
  ]



  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    
    // Validation
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (!baseCaption.trim()) {
      setError('Content is required')
      return
    }
    if (!instance?.tenant_id) {
      setError('Invalid post instance: missing tenant_id')
      return
    }
    if (!instance?.id) {
      setError('Invalid post instance: missing id')
      return
    }

    setSubmitting(true)
    try {
      // If content_item_id is null (planned slot), create a new content item and link it
      // Otherwise, update the existing content item
      if (!instance.content_item_id || !contentItem) {
        // Create new content item for planned slot
        const newItem = await marketingApi.createContentItem({
          tenant_id: instance.tenant_id,
          title: title.trim(),
          base_caption: baseCaption.trim(),
          content_category: contentCategory || instance.suggested_category || null,
          status: 'Draft',
          owner: 'admin'
        })

        if (!newItem?.id) {
          throw new Error('Failed to create content item: no ID returned')
        }

        // Media is already uploaded via PhotoUpload component - it handles uploads automatically
        // The PhotoUpload component uploads files when selected and calls onUploadComplete
        // If there are uploaded assets, they're already associated with the content item via contentItemId prop

        // Update the post instance to use the new content item
        const postInstanceUpdate: any = {
          content_item_id: newItem.id,
          status: 'Draft'
        }
        
        // Add GBP-specific fields if this is a GBP channel
        if (isGBP) {
          if (gbpPostType) postInstanceUpdate.gbp_post_type = gbpPostType
          if (gbpCtaType) postInstanceUpdate.gbp_cta_type = gbpCtaType
          if (gbpLocationTargeting) postInstanceUpdate.gbp_location_targeting = gbpLocationTargeting
        }
        
        await marketingApi.updatePostInstance(instance.id, postInstanceUpdate)
      } else {
        // Update existing content item
        if (!contentItem.id) {
          throw new Error('Invalid content item: missing id')
        }

        await marketingApi.updateContentItem(contentItem.id, {
          title: title.trim(),
          base_caption: baseCaption.trim(),
          content_category: contentCategory || undefined,
          status: 'Draft'
        })

        // Media is already uploaded via PhotoUpload component
        // The PhotoUpload component handles uploads and associates them with contentItemId

        // Update post instance status
        const postInstanceUpdate: any = {
          status: 'Draft'
        }
        
        // Add GBP-specific fields if this is a GBP channel
        if (isGBP) {
          if (gbpPostType) postInstanceUpdate.gbp_post_type = gbpPostType
          if (gbpCtaType) postInstanceUpdate.gbp_cta_type = gbpCtaType
          if (gbpLocationTargeting) postInstanceUpdate.gbp_location_targeting = gbpLocationTargeting
        }
        
        await marketingApi.updatePostInstance(instance.id, postInstanceUpdate)
      }

      showSuccess('Content added successfully')
      onSuccess()
    } catch (error: any) {
      console.error('Failed to add content:', error)
      const errorMessage = error?.message || handleApiError(error) || 'Failed to add content. Please try again.'
      setError(errorMessage)
      handleApiError(error, 'Add content to planned slot')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/70 backdrop-blur-sm">
      <div className="bg-[var(--color-card)]/50 border border-white/[0.08] backdrop-blur-sm shadow-xl rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-auto">
        <h3 className="mb-5 text-lg font-semibold text-[var(--color-text-primary)] uppercase tracking-widest text-xs">
          Add Content to Planned Slot
        </h3>
        {error && (
          <div className="p-3 mb-4 bg-red-500/10 border border-red-500 rounded-lg text-red-500 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <Input
              label="Title *"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title"
            />
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                Content Category {instance.suggested_category && <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: '400' }}>(Suggested: {instance.suggested_category.replace('_', ' ')})</span>}
              </label>
              <select
                value={contentCategory}
                onChange={(e) => setContentCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  backgroundColor: 'var(--color-hover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  fontSize: '14px'
                }}
              >
                <option value="">Select category...</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                Type
              </label>
              <select
                value={postType}
                onChange={(e) => setPostType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  backgroundColor: 'var(--color-hover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  fontSize: '14px'
                }}
              >
                <option value="Post">Post</option>
                <option value="Story">Story</option>
                <option value="Reel">Reel</option>
                <option value="Video">Video</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                Content / Idea *
              </label>
              <textarea
                required
                value={baseCaption}
                onChange={(e) => setBaseCaption(e.target.value)}
                placeholder="Post content or idea..."
                rows={5}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  backgroundColor: 'var(--color-hover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                Media (Images/Videos)
              </label>
              <PhotoUpload
                tenantId={instance.tenant_id}
                contentItemId={contentItem?.id}
                onUploadComplete={(assets) => {
                  setUploadedMediaAssets(assets)
                }}
                onUploadError={(error) => {
                  setError(error.message || 'Failed to upload media')
                }}
                existingAssets={contentItem?.media_assets || []}
                maxFiles={10}
                className="mt-2"
              />
            </div>
            
            {/* GBP-specific fields - only show for GBP channel accounts */}
            {isGBP && (
              <>
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '12px' }}>
                    Google Business Profile Settings
                  </h4>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                    Post Type
                  </label>
                  <select
                    value={gbpPostType}
                    onChange={(e) => setGbpPostType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      backgroundColor: 'var(--color-hover)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      color: 'var(--color-text-primary)',
                      fontSize: '14px'
                    }}
                  >
                    <option value="">Select post type...</option>
                    <option value="update">Update</option>
                    <option value="offer">Offer</option>
                    <option value="event">Event</option>
                    <option value="whats_new">What's New</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                    Call-to-Action Type
                  </label>
                  <select
                    value={gbpCtaType}
                    onChange={(e) => setGbpCtaType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      backgroundColor: 'var(--color-hover)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      color: 'var(--color-text-primary)',
                      fontSize: '14px'
                    }}
                  >
                    <option value="">Select CTA...</option>
                    <option value="call">Call</option>
                    <option value="book">Book</option>
                    <option value="learn_more">Learn More</option>
                    <option value="order_online">Order Online</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                    Location Targeting (City/Area)
                  </label>
                  <input
                    type="text"
                    value={gbpLocationTargeting}
                    onChange={(e) => setGbpLocationTargeting(e.target.value)}
                    placeholder="Vancouver WA, Camas WA, etc."
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      backgroundColor: 'var(--color-hover)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      color: 'var(--color-text-primary)',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex gap-3 mt-6">
            <Button
              type="submit"
              disabled={submitting}
              variant="primary"
              className="min-h-[44px] flex-1"
            >
              {submitting ? 'Saving...' : 'Save Content'}
            </Button>
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
              className="min-h-[44px]"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Mark Posted Modal - Requires proof
function MarkPostedModal({ instance, onClose, onSuccess }: { instance: any, onClose: () => void, onSuccess: () => void }) {
  const [postUrl, setPostUrl] = useState('')
  const [screenshotUrl, setScreenshotUrl] = useState('')
  const [postedManually, setPostedManually] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    setError('')
    
    // Require proof: either post URL or manual toggle with screenshot
    if (!postUrl && !postedManually) {
      setError('Please provide either a post URL or mark as manually posted with screenshot')
      return
    }
    
    if (postedManually && !screenshotUrl) {
      setError('Screenshot URL is required when marking as manually posted')
      return
    }

    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`${API_BASE_URL}/marketing/post-instances/${instance.id}/mark-posted`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          posted_at: new Date().toISOString(),
          post_url: postUrl || undefined,
          screenshot_url: screenshotUrl || undefined,
          posted_manually: postedManually
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to mark as posted' }))
        throw new Error(errorData.detail || 'Failed to mark as posted')
      }

      onSuccess()
    } catch (error: any) {
      console.error('Failed to mark as posted:', error)
      setError(error.message || 'Failed to mark as posted. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="marketing-modal" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px'
    }}>
      <div className="marketing-modal-content" style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
            Mark as Posted
          </h3>
          <button
            onClick={onClose}
            style={{
              padding: '6px 12px',
              backgroundColor: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ×
          </button>
        </div>

        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: 'rgba(239, 83, 80, 0.1)',
            border: '1px solid #EF5350',
            borderRadius: '8px',
            color: '#EF5350',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
            Post URL (if available)
          </label>
          <input
            type="url"
            value={postUrl}
            onChange={(e) => setPostUrl(e.target.value)}
            placeholder="https://..."
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: 'var(--color-hover)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text-primary)',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={postedManually}
              onChange={(e) => setPostedManually(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
              Posted Manually (requires screenshot)
            </span>
          </label>
          {postedManually && (
            <input
              type="url"
              value={screenshotUrl}
              onChange={(e) => setScreenshotUrl(e.target.value)}
              placeholder="Screenshot URL (required)"
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: 'var(--color-hover)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                color: 'var(--color-text-primary)',
                fontSize: '14px',
                marginTop: '8px'
              }}
            />
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: '10px 20px',
              backgroundColor: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text-primary)',
              fontSize: '14px',
              fontWeight: '500',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.5 : 1
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--color-primary)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '500',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.5 : 1
            }}
          >
            {submitting ? 'Saving...' : 'Mark as Posted'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Generate Posts Modal
function GeneratePostsModal({ contentItem, channelAccounts, onClose, onSuccess }: { contentItem: any, channelAccounts: any[], onClose: () => void, onSuccess: () => void }) {
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [scheduledFor, setScheduledFor] = useState('')
  const [captionOverrides, setCaptionOverrides] = useState<Record<string, string>>({})
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Default scheduling: use channel-based defaults
  useEffect(() => {
    // If multiple accounts selected, use first account's channel default
    // Otherwise, default to tomorrow 9 AM
    let defaultTime = new Date()
    defaultTime.setDate(defaultTime.getDate() + 1)
    defaultTime.setHours(9, 0, 0, 0)
    
    if (selectedAccounts.length > 0) {
      const firstAccount = channelAccounts.find(acc => acc.id === selectedAccounts[0])
      if (firstAccount?.channel) {
        // Channel-based defaults: GBP=9AM, Facebook=10AM, Instagram=11AM, Nextdoor=8AM
        const channelDefaults: Record<string, number> = {
          'google_business_profile': 9,
          'facebook': 10,
          'instagram': 11,
          'nextdoor': 8
        }
        const channelKey = firstAccount.channel.key || ''
        const defaultHour = channelDefaults[channelKey] || 9
        defaultTime.setHours(defaultHour, 0, 0, 0)
      }
    }
    
    setScheduledFor(defaultTime.toISOString().slice(0, 16))
  }, [selectedAccounts, channelAccounts])

  async function handleGenerate() {
    setError('')
    if (selectedAccounts.length === 0) {
      setError('Please select at least one account')
      return
    }

    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Not authenticated')
      }

      // Prepare scheduled_for datetime
      let scheduledForISO: string | undefined
      if (scheduledFor) {
        const scheduledDate = new Date(scheduledFor)
        if (!isNaN(scheduledDate.getTime())) {
          scheduledForISO = scheduledDate.toISOString()
        }
      }

      // Create PostInstances via bulk endpoint
      const response = await fetch(`${API_BASE_URL}/marketing/post-instances/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          content_item_id: contentItem.id,
          channel_account_ids: selectedAccounts,
          scheduled_for: scheduledForISO
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to generate posts' }))
        throw new Error(errorData.detail || 'Failed to generate posts')
      }

      const instances = await response.json()

      // Update caption overrides if any
      if (Object.keys(captionOverrides).length > 0) {
        for (const instance of instances) {
          const accountId = instance.channel_account_id
          if (captionOverrides[accountId]) {
            await fetch(`${API_BASE_URL}/marketing/post-instances/${instance.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              credentials: 'include',
              body: JSON.stringify({
                caption_override: captionOverrides[accountId]
              })
            })
          }
        }
      }

      onSuccess()
    } catch (error: any) {
      console.error('Failed to generate posts:', error)
      setError(error.message || 'Failed to generate posts. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function toggleAccount(accountId: string) {
    if (selectedAccounts.includes(accountId)) {
      setSelectedAccounts(selectedAccounts.filter(id => id !== accountId))
    } else {
      setSelectedAccounts([...selectedAccounts, accountId])
    }
  }

  function toggleExpanded(accountId: string) {
    setExpandedAccounts({
      ...expandedAccounts,
      [accountId]: !expandedAccounts[accountId]
    })
  }

  return (
    <div className="marketing-modal" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px'
    }}>
      <div className="marketing-modal-content" style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '700px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
              Generate Posts
            </h3>
            <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              {contentItem.title}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '6px 12px',
              backgroundColor: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ×
          </button>
        </div>

        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: 'rgba(239, 83, 80, 0.1)',
            border: '1px solid #EF5350',
            borderRadius: '8px',
            color: '#EF5350',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {/* Account Selection */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
            Select Accounts *
          </label>
          <div style={{ display: 'grid', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
            {Array.isArray(channelAccounts) && channelAccounts.length > 0 ? (
              channelAccounts.map(account => (
                <div key={account.id} style={{
                  padding: '12px',
                  backgroundColor: 'var(--color-hover)',
                  borderRadius: '8px',
                  border: selectedAccounts.includes(account.id) ? '2px solid var(--color-primary)' : '1px solid var(--color-border)'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedAccounts.includes(account.id)}
                      onChange={() => toggleAccount(account.id)}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                        {account.name}
                      </div>
                      {account.channel && (
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                          {account.channel.display_name || account.channel.key}
                        </div>
                      )}
                    </div>
                    {selectedAccounts.includes(account.id) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleExpanded(account.id)
                        }}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: 'transparent',
                          border: '1px solid var(--color-border)',
                          borderRadius: '6px',
                          color: 'var(--color-text-secondary)',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        {expandedAccounts[account.id] ? 'Hide' : 'Customize'}
                      </button>
                    )}
                  </label>
                  
                  {expandedAccounts[account.id] && selectedAccounts.includes(account.id) && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                        Caption Override (optional)
                      </label>
                      <textarea
                        value={captionOverrides[account.id] || ''}
                        onChange={(e) => setCaptionOverrides({
                          ...captionOverrides,
                          [account.id]: e.target.value
                        })}
                        placeholder={contentItem.base_caption || 'Enter custom caption...'}
                        style={{
                          width: '100%',
                          minHeight: '80px',
                          padding: '8px',
                          backgroundColor: 'var(--color-card)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '6px',
                          color: 'var(--color-text-primary)',
                          fontSize: '13px',
                          fontFamily: 'inherit',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                No accounts available. Please add channel accounts first.
              </div>
            )}
          </div>
        </div>

        {/* Default Schedule */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
            Default Schedule (optional)
          </label>
          <input
            type="datetime-local"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: 'var(--color-hover)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text-primary)',
              fontSize: '14px'
            }}
          />
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Leave empty to create as Draft. Scheduled posts require caption and datetime.
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: '10px 20px',
              backgroundColor: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text-primary)',
              fontSize: '14px',
              fontWeight: '500',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.5 : 1
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={submitting || selectedAccounts.length === 0}
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--color-primary)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '500',
              cursor: (submitting || selectedAccounts.length === 0) ? 'not-allowed' : 'pointer',
              opacity: (submitting || selectedAccounts.length === 0) ? 0.5 : 1
            }}
          >
            {submitting ? 'Generating...' : `Generate ${selectedAccounts.length} Post${selectedAccounts.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
  const isGoogleAccount = (account: any, channel: any) => {
    const channelKey = channel?.key?.toLowerCase() || ''
    const channelName = channel?.name?.toLowerCase() || ''
    const accountName = account?.name?.toLowerCase() || ''
    return channelKey.includes('google') || channelKey.includes('gbp') || 
           channelName.includes('google') || accountName.includes('google')
  }

  // Handle Google OAuth connection
  async function handleConnectGoogle(accountId: string) {
    setConnectingAccountId(accountId)
    try {
      const result = await oauthApi.getGoogleAuthUrl(accountId)
      // Redirect to Google OAuth
      window.location.href = result.authorization_url
    } catch (error: any) {
      console.error('Failed to start OAuth:', error)
      showToast(error.message || 'Failed to connect Google. Make sure OAuth is configured.', 'error')
      setConnectingAccountId(null)
    }
  }

  // Handle disconnect
  async function handleDisconnectGoogle(accountId: string) {
    if (!confirm('Disconnect this Google account? Auto-posting will stop working.')) return
    try {
      await oauthApi.disconnectGoogle(accountId)
      showToast('Google account disconnected', 'success')
      loadData()
    } catch (error: any) {
      console.error('Failed to disconnect:', error)
      showToast(error.message || 'Failed to disconnect', 'error')
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const token = localStorage.getItem('token')
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const [accountsRes, channelsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/marketing/channel-accounts?tenant_id=h2o`, { 
          headers,
          credentials: 'include' 
        }),
        fetch(`${API_BASE_URL}/marketing/channels?tenant_id=h2o`, { 
          headers,
          credentials: 'include' 
        })
      ])
      
      if (!accountsRes.ok || !channelsRes.ok) {
        throw new Error('Failed to load data')
      }
      
      const accountsData = await accountsRes.json()
      const channelsData = await channelsRes.json()
      setAccounts(Array.isArray(accountsData) ? accountsData : [])
      setChannels(Array.isArray(channelsData) ? channelsData : [])
      setLoading(false)
      setLoading(false)
    } catch (error) {
      console.error('Failed to load accounts:', error)
      setAccounts([]) // Set to empty array on error
      setChannels([]) // Set to empty array on error
      setLoading(false)
    }
  }

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)
    
    // Validation
    if (!formData.channel_id) {
      setFormError('Please select a channel')
      setSubmitting(false)
      return
    }
    if (!formData.account_name || !formData.account_name.trim()) {
      setFormError('Account name is required')
      setSubmitting(false)
      return
    }
    if (!formData.account_email || !formData.account_email.trim()) {
      setFormError('Account email is required')
      setSubmitting(false)
      return
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.account_email)) {
      setFormError('Please enter a valid email address')
      setSubmitting(false)
      return
    }
    
    try {
      const token = localStorage.getItem('token')
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const url = editingAccount 
        ? `${API_BASE_URL}/marketing/channel-accounts/${editingAccount.id}`
        : `${API_BASE_URL}/marketing/channel-accounts`
      const method = editingAccount ? 'PATCH' : 'POST'
      
      // Map form data to API schema
      const requestBody = {
        tenant_id: 'h2o',
        channel_id: formData.channel_id,
        name: formData.account_name,
        login_email: formData.account_email,
        credential_vault_ref: formData.credential_vault_ref || null
      }
      
      const response = await fetch(url, {
        method,
        headers,
        credentials: 'include',
        body: JSON.stringify(requestBody)
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to save account' }))
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      showToast(editingAccount ? 'Account updated successfully' : 'Account added successfully', 'success')
      setShowAddForm(false)
      setEditingAccount(null)
      setFormData({ channel_id: '', account_name: '', account_email: '', credential_vault_ref: '' })
      setFormError('')
      loadData()
    } catch (error: any) {
      console.error('Failed to save account:', error)
      setFormError(error.message || 'Failed to save account. Please try again.')
      showToast(error.message || 'Failed to save account', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(accountId: string) {
    if (!confirm('Delete this channel account? This action cannot be undone.')) return
    try {
      const token = localStorage.getItem('token')
      const headers: HeadersInit = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const response = await fetch(`${API_BASE_URL}/marketing/channel-accounts/${accountId}`, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      })
      
      if (response.ok) {
        showToast('Account deleted successfully', 'success')
        loadData()
      } else {
        throw new Error('Failed to delete account')
      }
    } catch (error: any) {
      console.error('Failed to delete account:', error)
      showToast(error.message || 'Failed to delete account', 'error')
    }
  }

  function handleEdit(account: any) {
    setEditingAccount(account)
    setFormData({
      channel_id: account.channel_id,
      account_name: account.name || account.account_name || '',
      account_email: account.login_email || account.account_email || '',
      credential_vault_ref: account.credential_vault_ref || ''
    })
    setShowAddForm(true)
    setFormError('')
  }

  function handleCancelForm() {
    setShowAddForm(false)
    setEditingAccount(null)
    setFormData({ channel_id: '', account_name: '', account_email: '', credential_vault_ref: '' })
    setFormError('')
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-secondary)' }}>
        Loading accounts...
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
          Channel Accounts
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
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
          + Add Account
        </button>
      </div>

      {/* Add/Edit Account Form */}
      {showAddForm && (
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
            {editingAccount ? 'Edit Channel Account' : 'Add Channel Account'}
          </h3>
          {formError && (
            <div style={{
              padding: '12px',
              backgroundColor: 'rgba(239, 83, 80, 0.1)',
              border: '1px solid #EF5350',
              borderRadius: '8px',
              color: '#EF5350',
              fontSize: '14px',
              marginBottom: '16px'
            }}>
              {formError}
            </div>
          )}
          <form onSubmit={handleAddAccount}>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                  Channel
                </label>
                <select
                  required
                  value={formData.channel_id}
                  onChange={(e) => setFormData({ ...formData, channel_id: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    backgroundColor: 'var(--color-hover)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-text-primary)',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select a channel</option>
                  {Array.isArray(channels) && channels.map(ch => (
                    <option key={ch.id} value={ch.id}>{ch.display_name || ch.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                  Account Name
                </label>
                <input
                  required
                  value={formData.account_name}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  placeholder="e.g., H2O Plumbers GBP"
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    backgroundColor: 'var(--color-hover)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-text-primary)',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                  Account Email
                </label>
                <input
                  required
                  type="email"
                  value={formData.account_email}
                  onChange={(e) => setFormData({ ...formData, account_email: e.target.value })}
                  placeholder="email@example.com"
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    backgroundColor: 'var(--color-hover)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-text-primary)',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                  Credential Vault Reference
                </label>
                <input
                  value={formData.credential_vault_ref}
                  onChange={(e) => setFormData({ ...formData, credential_vault_ref: e.target.value })}
                  placeholder="e.g., 1Password: Business/H2O GBP Login"
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    backgroundColor: 'var(--color-hover)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-text-primary)',
                    fontSize: '14px'
                  }}
                />
                <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  Store password reference only (no plain-text passwords)
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '10px 20px',
                  backgroundColor: submitting ? 'var(--color-hover)' : 'var(--color-primary)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.6 : 1
                }}
              >
                {submitting ? 'Saving...' : (editingAccount ? 'Update Account' : 'Save Account')}
              </button>
              <button
                type="button"
                onClick={handleCancelForm}
                disabled={submitting}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'var(--color-hover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  fontSize: '14px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.6 : 1
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Accounts List */}
      {!Array.isArray(accounts) || accounts.length === 0 ? (
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '48px',
          textAlign: 'center',
          color: 'var(--color-text-secondary)'
        }}>
          No channel accounts configured. Add one to get started.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {Array.isArray(accounts) && accounts.map(account => {
            const channel = channels.find(ch => ch.id === account.channel_id)
            return (
              <div
                key={account.id}
                className="marketing-account-card"
                style={{
                  backgroundColor: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                      {account.name || account.account_name}
                    </h4>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '500',
                      backgroundColor: account.oauth_connected ? 'rgba(76, 175, 80, 0.2)' : 'rgba(158, 158, 158, 0.2)',
                      color: account.oauth_connected ? '#66BB6A' : '#BDBDBD'
                    }}>
                      {account.oauth_connected ? '✓ Connected' : 'Manual'}
                    </span>
                    {account.status && (
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '500',
                        backgroundColor: account.status === 'active' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(158, 158, 158, 0.2)',
                        color: account.status === 'active' ? '#66BB6A' : '#BDBDBD'
                      }}>
                        {account.status}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                    <strong>{channel?.display_name || channel?.name || 'Unknown Channel'}</strong> • {account.login_email || account.account_email}
                  </div>
                  {account.credential_vault_ref && (
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                      🔐 Vault: {account.credential_vault_ref}
                    </div>
                  )}
                  {!account.oauth_connected && (
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px', fontStyle: 'italic' }}>
                      Manual posting required - OAuth not connected
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {/* Connect/Disconnect Google button for Google accounts */}
                  {isGoogleAccount(account, channel) && (
                    account.oauth_connected ? (
                      <button
                        onClick={() => handleDisconnectGoogle(account.id)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: 'rgba(239, 83, 80, 0.1)',
                          border: '1px solid #EF5350',
                          borderRadius: '8px',
                          color: '#EF5350',
                          fontSize: '14px',
                          cursor: 'pointer'
                        }}
                      >
                        Disconnect Google
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnectGoogle(account.id)}
                        disabled={connectingAccountId === account.id}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#4285F4',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: connectingAccountId === account.id ? 'wait' : 'pointer',
                          opacity: connectingAccountId === account.id ? 0.7 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {connectingAccountId === account.id ? 'Connecting...' : 'Connect Google'}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => handleEdit(account)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'var(--color-hover)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      color: 'var(--color-text-primary)',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(account.id)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'transparent',
                      border: '1px solid #EF5350',
                      borderRadius: '8px',
                      color: '#EF5350',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

