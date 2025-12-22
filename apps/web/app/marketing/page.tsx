'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageHeader } from '../../components/ui/PageHeader'
import { showToast } from '../../components/Toast'
import { API_BASE_URL } from '../../lib/config'

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
        <div>
          {activeTab === 'calendar' && <CalendarView />}
          {activeTab === 'posts' && <PostsView />}
          {activeTab === 'accounts' && <AccountsView />}
        </div>
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
  const [contentItems, setContentItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showNewPostModal, setShowNewPostModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
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
    owner: 'admin'
  })

  useEffect(() => {
    loadContentItems()
    loadChannelAccounts()
  }, [])

  async function loadChannelAccounts() {
    try {
      const token = localStorage.getItem('token')
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
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

  async function loadContentItems() {
    try {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams({ tenant_id: 'h2o' })
      if (statusFilter) params.append('status', statusFilter)
      if (search) params.append('search', search)
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const response = await fetch(`${API_BASE_URL}/marketing/content-items?${params}`, {
        headers,
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`Failed to load content items: ${response.statusText}`)
      }
      
      const data = await response.json()
      // Ensure data is always an array
      setContentItems(Array.isArray(data) ? data : [])
      setLoading(false)
    } catch (error) {
      console.error('Failed to load content items:', error)
      setContentItems([]) // Set to empty array on error
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
        owner: postForm.owner
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
      setPostForm({ title: '', base_caption: '', scheduled_for: '', channel_account_ids: [], status: 'Idea', owner: 'admin' })
      await loadContentItems()
    } catch (error: any) {
      console.error('Failed to create post:', error)
      setError(error.message || 'Failed to create post. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-secondary)' }}>
        Loading content items...
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
          onClick={() => { setStatusFilter(''); setSearch(''); loadContentItems(); }}
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
          onClick={() => { setStatusFilter('Needs Approval'); loadContentItems(); }}
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
            setSearch(`scheduled:${now.toISOString().split('T')[0]}-${future48h.toISOString().split('T')[0]}`);
            loadContentItems();
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
          onClick={() => { setStatusFilter('Draft'); setSearch('overdue'); loadContentItems(); }}
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
            <option value="">All Statuses</option>
            <option value="Idea">Idea</option>
            <option value="Draft">Draft</option>
            <option value="Needs Approval">Needs Approval</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Posted">Posted</option>
          </select>
          <button
            onClick={loadContentItems}
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
            Search
          </button>
        </div>
      </div>

      {/* Content Items Table */}
      {!Array.isArray(contentItems) || contentItems.length === 0 ? (
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '48px',
          textAlign: 'center',
          color: 'var(--color-text-secondary)'
        }}>
          No content items found. Create your first marketing content item to get started.
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
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Title</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Owner</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Created</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(contentItems) && contentItems.map((item, index) => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  style={{
                    borderBottom: index < contentItems.length - 1 ? '1px solid var(--color-border)' : 'none',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-hover)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <td style={{ padding: '16px', fontSize: '14px', color: 'var(--color-text-primary)' }}>{item.title}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      ...getStatusColor(item.status)
                    }}>
                      {item.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', color: 'var(--color-text-primary)' }}>{item.owner}</td>
                  <td style={{ padding: '16px', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setGenerateItem(item)
                      }}
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
                      Generate Posts
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Content Item Detail Modal */}
      {selectedItem && <ContentItemDetailModal item={selectedItem} channelAccounts={channelAccounts} onClose={() => setSelectedItem(null)} onUpdate={() => { loadContentItems(); setSelectedItem(null); }} />}
      
      {/* Generate Posts Modal (from row action) */}
      {generateItem && (
        <GeneratePostsModal
          contentItem={generateItem}
          channelAccounts={channelAccounts}
          onClose={() => setGenerateItem(null)}
          onSuccess={() => {
            setGenerateItem(null)
            loadContentItems()
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

function CalendarView() {
  const [calendarData, setCalendarData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Initialize view mode from localStorage or default to week on mobile
  const [viewMode, setViewMode] = useState<'week' | 'month'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('calendarViewMode')
      if (saved === 'week' || saved === 'month') return saved
      // Default to week view on mobile
      return window.innerWidth < 768 ? 'week' : 'month'
    }
    return 'month'
  })
  
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedPost, setSelectedPost] = useState<any>(null)
  const [channels, setChannels] = useState<any[]>([])
  const [showNewPostModal, setShowNewPostModal] = useState(false)
  const [channelAccounts, setChannelAccounts] = useState<any[]>([])
  const [postForm, setPostForm] = useState({
    title: '',
    base_caption: '',
    scheduled_for: '',
    channel_account_ids: [] as string[],
    status: 'Idea',
    owner: 'admin'
  })
  const [error, setError] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [topoffLoading, setTopoffLoading] = useState(false)
  
  // Save view mode preference
  const handleViewModeChange = (mode: 'week' | 'month') => {
    setViewMode(mode)
    localStorage.setItem('calendarViewMode', mode)
  }

  useEffect(() => {
    loadCalendar()
    loadChannels()
    loadChannelAccounts()
  }, [currentDate, viewMode])

  async function loadChannelAccounts() {
    try {
      const token = localStorage.getItem('token')
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
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

  async function loadChannels() {
    try {
      const token = localStorage.getItem('token')
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const response = await fetch(`${API_BASE_URL}/marketing/channels?tenant_id=h2o`, {
        headers,
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error(`Failed to load channels: ${response.statusText}`)
      }
      const data = await response.json()
      setChannels(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load channels:', error)
      setChannels([]) // Set to empty array on error
    }
  }

  async function loadCalendar() {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      let start: Date
      let end: Date

      if (viewMode === 'month') {
        // For month view, get the first and last day of the month
        start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
        // Include a few days before and after for proper week alignment
        const startDay = start.getDay()
        start.setDate(start.getDate() - startDay) // Start from Sunday of the week containing the 1st
        const endDay = end.getDay()
        end.setDate(end.getDate() + (6 - endDay)) // End on Saturday of the week containing the last day
      } else {
        // For week view, keep existing logic
        start = new Date(currentDate)
        start.setDate(start.getDate() - 7)
        end = new Date(currentDate)
        end.setDate(end.getDate() + 30)
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const params = new URLSearchParams({
        tenant_id: 'h2o',
        start_date: start.toISOString(),
        end_date: end.toISOString()
      })
      
      const response = await fetch(`${API_BASE_URL}/marketing/calendar?${params}`, {
        headers,
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error(`Failed to load calendar: ${response.statusText}`)
      }
      const data = await response.json()
      
      // Transform object format { "2024-12-18": [...] } to array format [{ date: "2024-12-18", instances: [...] }]
      let calendarArray: any[]
      if (Array.isArray(data)) {
        calendarArray = data
      } else if (data && typeof data === 'object') {
        // API returns object with date keys - transform to array
        calendarArray = Object.entries(data).map(([date, instances]) => ({
          date,
          instances: Array.isArray(instances) ? instances : []
        }))
      } else {
        calendarArray = []
      }
      
      setCalendarData(calendarArray)
      setLoading(false)
    } catch (error) {
      console.error('Failed to load calendar:', error)
      setCalendarData([]) // Set to empty array on error
      setLoading(false)
    }
  }

  const getWeekDays = () => {
    const days = []
    const start = new Date(currentDate)
    start.setDate(start.getDate() - start.getDay()) // Start of week
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(start)
      day.setDate(start.getDate() + i)
      days.push(day)
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
    const lastDate = lastDay.getDate()
    
    // Start from Sunday of the week containing the 1st
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDayOfWeek)
    
    // End on Saturday of the week containing the last day
    const endDayOfWeek = lastDay.getDay()
    const endDate = new Date(lastDay)
    endDate.setDate(endDate.getDate() + (6 - endDayOfWeek))
    
    // Generate all days in the month view (including padding days)
    const current = new Date(startDate)
    while (current <= endDate) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    
    return days
  }

  const getInstancesForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    const dayData = calendarData.find(d => d.date === dateStr)
    return dayData?.instances || []
  }

  async function handleTopoff() {
    setTopoffLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Not authenticated. Please log in again.')
      }

      const response = await fetch(`${API_BASE_URL}/marketing/scheduler/topoff?tenant_id=h2o&days=28`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to top off slots' }))
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      showToast(`Created ${result.instances_created} new slots, skipped ${result.instances_skipped} existing`, 'success')
      await loadCalendar()
    } catch (error: any) {
      console.error('Failed to top off slots:', error)
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
      const contentItemBody: any = {
        tenant_id: 'h2o',
        title: postForm.title.trim(),
        base_caption: postForm.base_caption.trim(),
        status: postForm.status,
        owner: postForm.owner
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
      setPostForm({ title: '', base_caption: '', scheduled_for: '', channel_account_ids: [], status: 'Idea', owner: 'admin' })
      setError('')
      await loadCalendar()
      showToast('Post created successfully', 'success')
    } catch (error: any) {
      console.error('Failed to create post:', error)
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

  return (
    <div>
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

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
          <button
            onClick={handleTopoff}
            disabled={topoffLoading}
            style={{
              padding: '10px 20px',
              backgroundColor: topoffLoading ? 'var(--color-hover)' : 'rgba(156, 39, 176, 0.8)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '500',
              cursor: topoffLoading ? 'not-allowed' : 'pointer',
              opacity: topoffLoading ? 0.6 : 1
            }}
            title="Generate planned slots for the next 28 days"
          >
            {topoffLoading ? 'Generating...' : '📅 Top off 28 days'}
          </button>
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--color-hover)',
            borderRadius: '8px',
            padding: '4px'
          }}>
          <button
            onClick={() => handleViewModeChange('week')}
            style={{
              padding: '6px 16px',
              backgroundColor: viewMode === 'week' ? 'var(--color-primary)' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: viewMode === 'week' ? '#ffffff' : 'var(--color-text-primary)',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Week
          </button>
          <button
            onClick={() => handleViewModeChange('month')}
            style={{
              padding: '6px 16px',
              backgroundColor: viewMode === 'month' ? 'var(--color-primary)' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: viewMode === 'month' ? '#ffffff' : 'var(--color-text-primary)',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Month
          </button>
        </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="marketing-calendar-grid" style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '1px',
          backgroundColor: 'var(--color-border)',
          minWidth: viewMode === 'month' ? '700px' : 'auto'
        }}>
          {/* Day Headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div
              key={day}
              style={{
                padding: '12px',
                backgroundColor: 'var(--color-hover)',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: '600',
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase'
              }}
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
            
            return (
              <div
                key={day.toISOString()}
                className="marketing-calendar-day-cell"
                style={{
                  backgroundColor: 'var(--color-card)',
                  minHeight: viewMode === 'month' ? '100px' : '120px',
                  padding: '12px',
                  position: 'relative',
                  opacity: isOtherMonth ? 0.4 : 1
                }}
              >
                <div style={{
                  fontSize: '14px',
                  fontWeight: isToday ? '700' : '500',
                  color: isToday ? 'var(--color-primary)' : (isOtherMonth ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)'),
                  marginBottom: '8px'
                }}>
                  {day.getDate()}
                </div>
                
                {instances.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {instances.slice(0, viewMode === 'month' ? 2 : 3).map((instance: any) => {
                      const contentItem = instance.content_item
                      const channelAccount = instance.channel_account
                      const accountName = channelAccount?.name || 'Unknown Account'
                      
                      return (
                        <div
                          key={instance.id}
                          className={viewMode === 'month' ? 'marketing-month-view-post' : ''}
                          onClick={() => setSelectedPost(instance)}
                          style={{
                            padding: viewMode === 'month' ? '6px' : '8px',
                            borderRadius: '6px',
                            fontSize: viewMode === 'month' ? '10px' : '11px',
                            backgroundColor: 'var(--color-hover)',
                            border: '1px solid var(--color-border)',
                            cursor: 'pointer'
                          }}
                          title={`${contentItem?.title || 'Untitled'} - ${accountName}`}
                        >
                          <div style={{
                            fontWeight: '600',
                            color: 'var(--color-text-primary)',
                            marginBottom: '4px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {contentItem?.title || 'Untitled'}
                          </div>
                          {viewMode === 'week' && (
                            <>
                              <div style={{
                                fontSize: '10px',
                                color: 'var(--color-text-secondary)',
                                marginBottom: '4px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                📍 {accountName}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                                <span style={{
                                  fontSize: '10px',
                                  color: 'var(--color-text-secondary)'
                                }}>
                                  👤 {contentItem?.owner || 'Unknown'}
                                </span>
                                <span style={{
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '9px',
                                  fontWeight: '500',
                                  ...getStatusColor(instance.status)
                                }}>
                                  {instance.status}
                                </span>
                              </div>
                            </>
                          )}
                          {viewMode === 'month' && (
                            <span style={{
                              padding: '2px 4px',
                              borderRadius: '4px',
                              fontSize: '8px',
                              fontWeight: '500',
                              ...getStatusColor(instance.status)
                            }}>
                              {instance.status}
                            </span>
                          )}
                        </div>
                      )
                    })}
                    {instances.length > (viewMode === 'month' ? 2 : 3) && (
                      <div style={{
                        fontSize: '10px',
                        color: 'var(--color-text-secondary)',
                        paddingLeft: '8px'
                      }}>
                        +{instances.length - (viewMode === 'month' ? 2 : 3)} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

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
                    setPostForm({ title: '', base_caption: '', scheduled_for: '', channel_account_ids: [], status: 'Idea', owner: 'admin' })
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
              {contentItem?.title || 'Untitled'}
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              {channelAccount?.name || 'Unknown Account'} • {instance.status}
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
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: 'var(--color-text-primary)' }}>Content</h4>
          <div style={{
            padding: '12px',
            backgroundColor: 'var(--color-hover)',
            borderRadius: '8px',
            fontSize: '14px',
            color: 'var(--color-text-primary)',
            whiteSpace: 'pre-wrap'
          }}>
            {instance.caption_override || contentItem?.base_caption || 'No content'}
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

function AccountsView() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [channels, setChannels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<any>(null)
  const [formError, setFormError] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    channel_id: '',
    account_name: '',
    account_email: '',
    credential_vault_ref: ''
  })

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
