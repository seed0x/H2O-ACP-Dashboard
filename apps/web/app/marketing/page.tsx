'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { showToast } from '../../components/Toast'
import { API_BASE_URL } from '../../lib/config'
import { useTenant, TENANT_CONFIG, getPageTenant } from '../../contexts/TenantContext'
import { marketingApi, oauthApi, type PostInstance, type ContentItem, type ChannelAccount, type MediaAsset, type LocalSEOTopic, type Offer, type MarketingChannel, type CreateContentItemRequest, type UpdateContentItemRequest, type UpdatePostInstanceRequest } from '../../lib/api/marketing'
import { PhotoUpload } from '../../components/marketing/PhotoUpload'
import { handleApiError, showSuccess } from '../../lib/error-handler'
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
  const { currentTenant } = useTenant()

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


export default function MarketingPage() {
  return (
    <Suspense fallback={<div style={{ padding: '32px' }}>Loading...</div>}>
      <MarketingContent />
    </Suspense>
  )
}

function PostsView() {
  const { currentTenant, getTenantName, getTenantColor, isTenantSelected } = useTenant()
  const [postInstances, setPostInstances] = useState<PostInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [contentStatusFilter, setContentStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showNewPostModal, setShowNewPostModal] = useState(false)
  const [selectedPost, setSelectedPost] = useState<PostInstance | null>(null)
  const [channelAccounts, setChannelAccounts] = useState<ChannelAccount[]>([])
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
      
      // Use current tenant (marketing is h2o-specific)
      const tenantId = currentTenant === 'both' ? getPageTenant('marketing') : currentTenant || getPageTenant('marketing')
      const response = await fetch(`${API_BASE_URL}/marketing/channel-accounts?tenant_id=${tenantId}`, {
        headers,
        credentials: 'include'
      })
      const data = await response.json()
      setChannelAccounts(Array.isArray(data) ? data : [])
    } catch (error) {
      handleApiError(error, 'Load channel accounts')
      setChannelAccounts([])
    }
  }

  async function loadPostInstances() {
    try {
      setLoading(true)
      
      const tenantId = currentTenant === 'both' ? getPageTenant('marketing') : currentTenant || getPageTenant('marketing')
      let data = await marketingApi.listPostInstances(tenantId, {
        status: statusFilter || undefined
      })
      
      if (!Array.isArray(data)) {
        data = []
      }
      
      // Filter by content item status if specified
      if (contentStatusFilter) {
        data = data.filter((pi) => pi.content_item?.status === contentStatusFilter)
      }
      
      // Filter by search term
      if (search) {
        const searchLower = search.toLowerCase()
        data = data.filter((pi) => 
          pi.content_item?.title?.toLowerCase().includes(searchLower) ||
          pi.content_item?.base_caption?.toLowerCase().includes(searchLower) ||
          pi.channel_account?.name?.toLowerCase().includes(searchLower)
        )
      }
      
      setPostInstances(data)
      setLoading(false)
    } catch (error) {
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
      const contentItemBody: CreateContentItemRequest = {
        tenant_id: currentTenant === 'both' ? getPageTenant('marketing') : currentTenant || getPageTenant('marketing'),
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

      const tenantId = currentTenant === 'both' ? getPageTenant('marketing') : currentTenant || getPageTenant('marketing')
      const instancesResponse = await fetch(`${API_BASE_URL}/marketing/post-instances/bulk?tenant_id=${tenantId}`, {
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
    } catch (error: unknown) {
      handleApiError(error, 'Create post')
      setError(error instanceof Error ? error.message : 'Failed to create post. Please try again.')
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


// CalendarView is now in CalendarView.tsx

function AccountsView() {
  const { currentTenant } = useTenant()
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
  const isGoogleAccount = (account: ChannelAccount, channel: MarketingChannel | undefined) => {
    const channelKey = channel?.key?.toLowerCase() || ''
    const channelName = channel?.display_name?.toLowerCase() || ''
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
    } catch (error: unknown) {
      handleApiError(error, 'Start Google OAuth')
      showToast(error instanceof Error ? error.message : 'Failed to connect Google. Make sure OAuth is configured.', 'error')
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
    } catch (error: unknown) {
      handleApiError(error, 'Disconnect Google')
      showToast(error instanceof Error ? error.message : 'Failed to disconnect', 'error')
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
      
      const tenantId = currentTenant === 'both' ? getPageTenant('marketing') : currentTenant || getPageTenant('marketing')
      const [accountsRes, channelsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/marketing/channel-accounts?tenant_id=${tenantId}`, { 
          headers,
          credentials: 'include' 
        }),
        fetch(`${API_BASE_URL}/marketing/channels?tenant_id=${tenantId}`, { 
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
      handleApiError(error, 'Load channel accounts')
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
        tenant_id: currentTenant === 'both' ? getPageTenant('marketing') : currentTenant || getPageTenant('marketing'),
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
    } catch (error: unknown) {
      handleApiError(error, 'Save channel account')
      const errorMessage = error instanceof Error ? error.message : 'Failed to save account. Please try again.'
      setFormError(errorMessage)
      showToast(errorMessage, 'error')
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
    } catch (error: unknown) {
      handleApiError(error, 'Delete channel account')
      showToast(error instanceof Error ? error.message : 'Failed to delete account', 'error')
    }
  }

  function handleEdit(account: ChannelAccount) {
    setEditingAccount(account)
    setFormData({
      channel_id: account.channel_id,
      account_name: account.name || '',
      account_email: '',
      credential_vault_ref: ''
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

function PostDetailModal({ post, channels, onClose, onUpdate }: { post: ContentItem, channels: MarketingChannel[], onClose: () => void, onUpdate: () => void }) {
  const [auditLogs, setAuditLogs] = useState<Array<{ id?: string; action: string; field?: string; old_value?: string; new_value?: string; changed_by?: string; changed_at?: string; user_name?: string; timestamp?: string; changes?: Record<string, { old: string; new: string }> }>>([])
  const [showAudit, setShowAudit] = useState(false)
  const [editForm, setEditForm] = useState({
    title: post.title || '',
    body_text: post.base_caption || '',
    scheduled_for: '',
    draft_due_date: post.draft_due_date && typeof post.draft_due_date === 'string' ? post.draft_due_date.slice(0, 16) : '',
    channel_ids: [] as string[],
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
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Not authenticated')
      }
      
      const updateData: UpdateContentItemRequest = {
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
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify(updateData)
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to update post' }))
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      onUpdate()
      showToast('Post updated successfully', 'success')
    } catch (error: unknown) {
      handleApiError(error, 'Update post')
      const errorMessage = error instanceof Error ? error.message : 'Failed to update post. Please try again.'
      setUpdateError(errorMessage)
      showToast(errorMessage, 'error')
    } finally {
      setUpdating(false)
    }
  }

  async function loadAuditTrail() {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        return
      }
      
      const response = await fetch(`${API_BASE_URL}/audit-logs?entity_type=content_item&entity_id=${post.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setAuditLogs(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      handleApiError(error, 'Load audit trail')
    }
  }

  useEffect(() => {
    if (showAudit) {
      loadAuditTrail()
    }
  }, [showAudit])

  const postChannels = 'No channel' // Channel association removed - posts are linked via post instances

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
      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
            Post Details
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '24px',
              color: 'var(--color-text-secondary)'
            }}
          >
            ×
          </button>
        </div>

        {updateError && (
          <div style={{
            padding: '12px',
            backgroundColor: 'rgba(239, 83, 80, 0.1)',
            border: '1px solid #EF5350',
            borderRadius: '8px',
            color: '#EF5350',
            fontSize: '14px',
            marginBottom: '16px'
          }}>
            {updateError}
          </div>
        )}

        <div style={{ display: 'grid', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)' }}>
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
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)' }}>
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
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)' }}>
                Status
              </label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value as ContentItem['status'] })}
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
                <option value="Draft">Draft</option>
                <option value="Review">Review</option>
                <option value="Approved">Approved</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Posted">Posted</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)' }}>
                Owner
              </label>
              <input
                value={editForm.owner}
                onChange={(e) => setEditForm({ ...editForm, owner: e.target.value })}
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
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
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
            {updating ? 'Updating...' : 'Update Post'}
          </button>
          <button
            onClick={() => setShowAudit(!showAudit)}
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
            {showAudit ? 'Hide' : 'Show'} Audit Trail
          </button>
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
            Close
          </button>
        </div>

        {showAudit && (
          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--color-border)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
              Audit Trail
            </h3>
            {auditLogs.length === 0 ? (
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                No audit logs found
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {auditLogs.map((log, idx: number) => (
                  <div key={idx} style={{
                    padding: '12px',
                    backgroundColor: 'var(--color-hover)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: 'var(--color-text-secondary)'
                  }}>
                    <div style={{ fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                      {log.action} by {log.user_name || 'Unknown'} on {new Date(log.timestamp).toLocaleString()}
                    </div>
                    {log.changes && (
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>
                        {JSON.stringify(log.changes, null, 2)}
                      </div>
                    )}
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
function ContentItemDetailModal({ item, channelAccounts, onClose, onUpdate }: { item: ContentItem, channelAccounts: ChannelAccount[], onClose: () => void, onUpdate: () => void }) {
  const { currentTenant } = useTenant()
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
      
      const tenantId = currentTenant === 'both' ? getPageTenant('marketing') : currentTenant || getPageTenant('marketing')
      const response = await fetch(`${API_BASE_URL}/marketing/post-instances?tenant_id=${tenantId}&content_item_id=${item.id}`, {
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
              {postInstances.map((instance: PostInstance) => {
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
function PostInstanceDetailModal({ instance, onClose, onUpdate }: { instance: PostInstance, onClose: () => void, onUpdate: () => void }) {
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
function EditPlannedSlotModal({ instance, contentItem, onClose, onSuccess }: { instance: PostInstance, contentItem: ContentItem | null, onClose: () => void, onSuccess: () => void }) {
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
        const postInstanceUpdate: UpdatePostInstanceRequest = {
          content_item_id: newItem.id,
          status: 'Draft',
          ...(isGBP && {
            ...(gbpPostType && { gbp_post_type: gbpPostType }),
            ...(gbpCtaType && { gbp_cta_type: gbpCtaType }),
            ...(gbpLocationTargeting && { gbp_location_targeting: gbpLocationTargeting })
          })
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
        const postInstanceUpdate: UpdatePostInstanceRequest = {
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
    } catch (error: unknown) {
      handleApiError(error, 'Add content to post')
      const errorMessage = error instanceof Error ? error.message : 'Failed to add content. Please try again.'
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
function MarkPostedModal({ instance, onClose, onSuccess }: { instance: PostInstance, onClose: () => void, onSuccess: () => void }) {
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
    } catch (error: unknown) {
      handleApiError(error, 'Mark post as posted')
      setError(error instanceof Error ? error.message : 'Failed to mark as posted. Please try again.')
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
function GeneratePostsModal({ contentItem, channelAccounts, onClose, onSuccess }: { contentItem: ContentItem, channelAccounts: ChannelAccount[], onClose: () => void, onSuccess: () => void }) {
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
    } catch (error: unknown) {
      handleApiError(error, 'Generate posts')
      setError(error instanceof Error ? error.message : 'Failed to generate posts. Please try again.')
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

