'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageHeader } from '../../components/ui/PageHeader'

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
  }
`

function MarketingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'posts'

  const tabs = [
    { id: 'posts', label: 'Posts' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'accounts', label: 'Accounts' },
    { id: 'scoreboard', label: 'Scoreboard' }
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
          {activeTab === 'posts' && <PostsView />}
          {activeTab === 'calendar' && <CalendarView />}
          {activeTab === 'accounts' && <AccountsView />}
          {activeTab === 'scoreboard' && <ScoreboardView />}
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
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showNewPostModal, setShowNewPostModal] = useState(false)
  const [selectedPost, setSelectedPost] = useState<any>(null)
  const [channels, setChannels] = useState<any[]>([])
  const [postForm, setPostForm] = useState({
    title: '',
    body_text: '',
    scheduled_for: '',
    channel_ids: [] as string[],
    status: 'Draft',
    owner: 'admin'
  })

  useEffect(() => {
    loadPosts()
    loadChannels()
  }, [])

  async function loadChannels() {
    try {
      const response = await fetch('/api/marketing/channels?tenant_id=h2o', {
        credentials: 'include'
      })
      const data = await response.json()
      setChannels(data)
    } catch (error) {
      console.error('Failed to load channels:', error)
    }
  }

  async function loadPosts() {
    try {
      const params = new URLSearchParams({ tenant_id: 'h2o' })
      if (statusFilter) params.append('status', statusFilter)
      if (search) params.append('search', search)
      
      const response = await fetch(`/api/marketing/content-posts?${params}`, {
        credentials: 'include'
      })
      const data = await response.json()
      setPosts(data)
      setLoading(false)
    } catch (error) {
      console.error('Failed to load posts:', error)
      setLoading(false)
    }
  }

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault()
    try {
      const response = await fetch('/api/marketing/content-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...postForm, tenant_id: 'h2o' })
      })
      if (response.ok) {
        setShowNewPostModal(false)
        setPostForm({ title: '', body_text: '', scheduled_for: '', channel_ids: [], status: 'Draft', owner: 'admin' })
        loadPosts()
      }
    } catch (error) {
      console.error('Failed to create post:', error)
    }
  }

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
                    value={postForm.body_text}
                    onChange={(e) => setPostForm({ ...postForm, body_text: e.target.value })}
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
                    Channels
                  </label>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {channels.map(ch => (
                      <label key={ch.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={postForm.channel_ids.includes(ch.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPostForm({ ...postForm, channel_ids: [...postForm.channel_ids, ch.id] })
                            } else {
                              setPostForm({ ...postForm, channel_ids: postForm.channel_ids.filter(id => id !== ch.id) })
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>{ch.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  type="submit"
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
                  Create Post
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
          onClick={() => { setStatusFilter(''); setSearch(''); loadPosts(); }}
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
          onClick={() => { setStatusFilter('Needs_Approval'); loadPosts(); }}
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
            loadPosts();
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
          onClick={() => { setStatusFilter('Draft'); setSearch('overdue'); loadPosts(); }}
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
            <option value="Needs_Approval">Needs Approval</option>
            <option value="Approved">Approved</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Posted">Posted</option>
          </select>
          <button
            onClick={loadPosts}
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

      {/* Posts Table */}
      {posts.length === 0 ? (
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '48px',
          textAlign: 'center',
          color: 'var(--color-text-secondary)'
        }}>
          No posts found. Create your first marketing post to get started.
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
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Scheduled</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Owner</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post, index) => (
                <tr
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  style={{
                    borderBottom: index < posts.length - 1 ? '1px solid var(--color-border)' : 'none',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-hover)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <td style={{ padding: '16px', fontSize: '14px', color: 'var(--color-text-primary)' }}>{post.title}</td>
                  <td style={{ padding: '16px', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                    {post.scheduled_for ? new Date(post.scheduled_for).toLocaleDateString() : '-'}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      ...getStatusColor(post.status)
                    }}>
                      {post.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', color: 'var(--color-text-primary)' }}>{post.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Post Detail Modal */}
      {selectedPost && <PostDetailModal post={selectedPost} channels={channels} onClose={() => setSelectedPost(null)} onUpdate={() => { loadPosts(); setSelectedPost(null); }} />}
    </div>
  )
}

function getStatusColor(status: string) {
  const colors: Record<string, any> = {
    'Idea': { backgroundColor: 'rgba(158, 158, 158, 0.15)', color: '#BDBDBD' },
    'Draft': { backgroundColor: 'rgba(96, 165, 250, 0.15)', color: '#60A5FA' },
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
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedPost, setSelectedPost] = useState<any>(null)
  const [channels, setChannels] = useState<any[]>([])

  useEffect(() => {
    loadCalendar()
    loadChannels()
  }, [currentDate])

  async function loadChannels() {
    try {
      const response = await fetch('/api/marketing/channels?tenant_id=h2o', {
        credentials: 'include'
      })
      const data = await response.json()
      setChannels(data)
    } catch (error) {
      console.error('Failed to load channels:', error)
    }
  }

  async function loadCalendar() {
    try {
      const start = new Date(currentDate)
      start.setDate(start.getDate() - 7)
      const end = new Date(currentDate)
      end.setDate(end.getDate() + 30)

      const params = new URLSearchParams({
        tenant_id: 'h2o',
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0]
      })
      
      const response = await fetch(`/api/marketing/calendar?${params}`, {
        credentials: 'include'
      })
      const data = await response.json()
      setCalendarData(data)
      setLoading(false)
    } catch (error) {
      console.error('Failed to load calendar:', error)
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

  const getPostsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    const dayData = calendarData.find(d => d.date === dateStr)
    return dayData?.posts || []
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-secondary)' }}>
        Loading calendar...
      </div>
    )
  }

  const weekDays = getWeekDays()

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
              newDate.setDate(newDate.getDate() - 7)
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
            ← Previous
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
              newDate.setDate(newDate.getDate() + 7)
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
            Next →
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

        <div style={{
          display: 'flex',
          backgroundColor: 'var(--color-hover)',
          borderRadius: '8px',
          padding: '4px'
        }}>
          <button
            onClick={() => setViewMode('week')}
            style={{
              padding: '6px 16px',
              backgroundColor: viewMode === 'week' ? 'var(--color-primary)' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: viewMode === 'week' ? '#ffffff' : 'var(--color-text-primary)',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Week
          </button>
          <button
            onClick={() => setViewMode('month')}
            style={{
              padding: '6px 16px',
              backgroundColor: viewMode === 'month' ? 'var(--color-primary)' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: viewMode === 'month' ? '#ffffff' : 'var(--color-text-primary)',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Month
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '1px',
          backgroundColor: 'var(--color-border)'
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
          {weekDays.map(day => {
            const posts = getPostsForDate(day)
            const isToday = day.toDateString() === new Date().toDateString()
            
            return (
              <div
                key={day.toISOString()}
                style={{
                  backgroundColor: 'var(--color-card)',
                  minHeight: '120px',
                  padding: '12px',
                  position: 'relative'
                }}
              >
                <div style={{
                  fontSize: '14px',
                  fontWeight: isToday ? '700' : '500',
                  color: isToday ? 'var(--color-primary)' : 'var(--color-text-primary)',
                  marginBottom: '8px'
                }}>
                  {day.getDate()}
                </div>
                
                {posts.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {posts.slice(0, 3).map((post: any) => {
                      const postChannels = post.channel_ids?.map((cid: string) => 
                        channels.find(ch => ch.id === cid)?.name
                      ).filter(Boolean).join(', ') || 'No channel'
                      
                      return (
                        <div
                          key={post.id}
                          onClick={() => setSelectedPost(post)}
                          style={{
                            padding: '8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            backgroundColor: 'var(--color-hover)',
                            border: '1px solid var(--color-border)',
                            cursor: 'pointer'
                          }}
                          title={`${post.title} - ${post.owner}`}
                        >
                          <div style={{
                            fontWeight: '600',
                            color: 'var(--color-text-primary)',
                            marginBottom: '4px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {post.title}
                          </div>
                          <div style={{
                            fontSize: '10px',
                            color: 'var(--color-text-secondary)',
                            marginBottom: '4px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            📍 {postChannels}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                            <span style={{
                              fontSize: '10px',
                              color: 'var(--color-text-secondary)'
                            }}>
                              👤 {post.owner}
                            </span>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '9px',
                              fontWeight: '500',
                              ...getStatusColor(post.status)
                            }}>
                              {post.status}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                    {posts.length > 3 && (
                      <div style={{
                        fontSize: '10px',
                        color: 'var(--color-text-secondary)',
                        paddingLeft: '8px'
                      }}>
                        +{posts.length - 3} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Post Detail Modal */}
      {selectedPost && <PostDetailModal post={selectedPost} channels={channels} onClose={() => setSelectedPost(null)} onUpdate={() => { loadCalendar(); setSelectedPost(null); }} />}
    </div>
  )
}

function PostDetailModal({ post, channels, onClose, onUpdate }: { post: any, channels: any[], onClose: () => void, onUpdate: () => void }) {
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [showAudit, setShowAudit] = useState(false)
  const [editForm, setEditForm] = useState({
    title: post.title || '',
    body_text: post.body_text || '',
    scheduled_for: post.scheduled_for ? post.scheduled_for.slice(0, 16) : '',
    draft_due_date: post.draft_due_date ? post.draft_due_date.slice(0, 16) : '',
    channel_ids: post.channel_ids || [],
    status: post.status || 'Draft',
    owner: post.owner || 'admin',
    reviewer: post.reviewer || '',
    tags: post.tags || [],
    target_city: post.target_city || '',
    cta_type: post.cta_type || 'None',
    cta_url: post.cta_url || ''
  })

  async function handleUpdate() {
    try {
      const response = await fetch(`/api/marketing/content-posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editForm)
      })
      if (response.ok) {
        onUpdate()
      }
    } catch (error) {
      console.error('Failed to update post:', error)
    }
  }

  async function handleMarkPosted() {
    try {
      const response = await fetch(`/api/marketing/content-posts/${post.id}/mark-posted`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tenant_id: 'h2o' })
      })
      if (response.ok) {
        onUpdate()
      }
    } catch (error) {
      console.error('Failed to mark as posted:', error)
    }
  }

  async function handleMarkFailed() {
    const reason = prompt('Why did this post fail?')
    if (!reason) return
    try {
      const response = await fetch(`/api/marketing/content-posts/${post.id}/mark-failed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tenant_id: 'h2o', error_message: reason })
      })
      if (response.ok) {
        onUpdate()
      }
    } catch (error) {
      console.error('Failed to mark as failed:', error)
    }
  }

  const postChannels = post.channel_ids?.map((cid: string) => 
    channels.find(ch => ch.id === cid)?.name
  ).filter(Boolean).join(', ') || 'No channel'

  async function loadAuditTrail() {
    try {
      const response = await fetch(`/api/marketing/audit-trail/${post.id}?entity_type=content_post`, {
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
              {channels.map(ch => (
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
                  <span style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>{ch.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
          <button
            onClick={handleUpdate}
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
            Save Changes
          </button>
          {post.status === 'Scheduled' && (
            <>
              <button
                onClick={handleMarkPosted}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'rgba(76, 175, 80, 0.2)',
                  border: '1px solid #66BB6A',
                  borderRadius: '8px',
                  color: '#66BB6A',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                ✓ Mark Posted
              </button>
              <button
                onClick={handleMarkFailed}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'rgba(244, 67, 54, 0.2)',
                  border: '1px solid #EF5350',
                  borderRadius: '8px',
                  color: '#EF5350',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                × Mark Failed
              </button>
            </>
          )}
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

function ScoreboardView() {
  const [scoreboard, setScoreboard] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()))

  useEffect(() => {
    loadScoreboard()
  }, [weekStart])

  function getWeekStart(date: Date) {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
    return new Date(d.setDate(diff))
  }

  function getWeekEnd(start: Date) {
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return end
  }

  async function loadScoreboard() {
    try {
      const end = getWeekEnd(weekStart)
      const params = new URLSearchParams({
        tenant_id: 'h2o',
        week_start: weekStart.toISOString(),
        week_end: end.toISOString()
      })
      
      const response = await fetch(`/api/marketing/scoreboard?${params}`, {
        credentials: 'include'
      })
      const data = await response.json()
      setScoreboard(data)
      setLoading(false)
    } catch (error) {
      console.error('Failed to load scoreboard:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-secondary)' }}>
        Loading scoreboard...
      </div>
    )
  }

  const weekEnd = getWeekEnd(weekStart)

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
            Weekly Scoreboard
          </h2>
          <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            {weekStart.toLocaleDateString()} - {weekEnd.toLocaleDateString()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => {
              const newStart = new Date(weekStart)
              newStart.setDate(newStart.getDate() - 7)
              setWeekStart(newStart)
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
            ← Previous
          </button>
          <button
            onClick={() => setWeekStart(getWeekStart(new Date()))}
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
            This Week
          </button>
          <button
            onClick={() => {
              const newStart = new Date(weekStart)
              newStart.setDate(newStart.getDate() + 7)
              setWeekStart(newStart)
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
            Next →
          </button>
        </div>
      </div>

      {/* Scoreboard Grid */}
      {scoreboard.length === 0 ? (
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '48px',
          textAlign: 'center',
          color: 'var(--color-text-secondary)'
        }}>
          No activity this week
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {scoreboard.map(owner => {
            const completionRate = owner.planned > 0 ? Math.round((owner.posted / owner.planned) * 100) : 0
            const hasIssues = owner.overdue_drafts > 0 || owner.missed > 0 || owner.failed > 0
            
            return (
              <div
                key={owner.owner}
                style={{
                  backgroundColor: 'var(--color-card)',
                  border: hasIssues ? '2px solid #EF5350' : '1px solid var(--color-border)',
                  borderRadius: '12px',
                  padding: '20px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                      {owner.owner}
                    </h3>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                      {completionRate}% completion rate
                    </div>
                  </div>
                  {hasIssues && (
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      backgroundColor: 'rgba(244, 67, 54, 0.2)',
                      color: '#EF5350'
                    }}>
                      ⚠️ ISSUES
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                  <div style={{
                    padding: '12px',
                    backgroundColor: 'var(--color-hover)',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                      {owner.planned}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                      Planned
                    </div>
                  </div>

                  <div style={{
                    padding: '12px',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#66BB6A' }}>
                      {owner.posted}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                      ✓ Posted
                    </div>
                  </div>

                  {owner.overdue_drafts > 0 && (
                    <div style={{
                      padding: '12px',
                      backgroundColor: 'rgba(244, 67, 54, 0.1)',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#EF5350' }}>
                        {owner.overdue_drafts}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                        🔥 Overdue
                      </div>
                    </div>
                  )}

                  {owner.missed > 0 && (
                    <div style={{
                      padding: '12px',
                      backgroundColor: 'rgba(255, 152, 0, 0.1)',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#FFA726' }}>
                        {owner.missed}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                        ⏰ Missed
                      </div>
                    </div>
                  )}

                  {owner.failed > 0 && (
                    <div style={{
                      padding: '12px',
                      backgroundColor: 'rgba(244, 67, 54, 0.1)',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#EF5350' }}>
                        {owner.failed}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                        ❌ Failed
                      </div>
                    </div>
                  )}

                  {owner.canceled > 0 && (
                    <div style={{
                      padding: '12px',
                      backgroundColor: 'var(--color-hover)',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-text-secondary)' }}>
                        {owner.canceled}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                        Canceled
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AccountsView() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [channels, setChannels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
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
      const [accountsRes, channelsRes] = await Promise.all([
        fetch('/api/marketing/channel-accounts?tenant_id=h2o', { credentials: 'include' }),
        fetch('/api/marketing/channels?tenant_id=h2o', { credentials: 'include' })
      ])
      const accountsData = await accountsRes.json()
      const channelsData = await channelsRes.json()
      setAccounts(accountsData)
      setChannels(channelsData)
      setLoading(false)
    } catch (error) {
      console.error('Failed to load accounts:', error)
      setLoading(false)
    }
  }

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault()
    try {
      const response = await fetch('/api/marketing/channel-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...formData, tenant_id: 'h2o' })
      })
      if (response.ok) {
        setShowAddForm(false)
        setFormData({ channel_id: '', account_name: '', account_email: '', credential_vault_ref: '' })
        loadData()
      }
    } catch (error) {
      console.error('Failed to add account:', error)
    }
  }

  async function handleDelete(accountId: string) {
    if (!confirm('Delete this channel account?')) return
    try {
      await fetch(`/api/marketing/channel-accounts/${accountId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      loadData()
    } catch (error) {
      console.error('Failed to delete account:', error)
    }
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

      {/* Add Account Form */}
      {showAddForm && (
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
            Add Channel Account
          </h3>
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
                  {channels.map(ch => (
                    <option key={ch.id} value={ch.id}>{ch.name}</option>
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
                Save Account
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
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
      )}

      {/* Accounts List */}
      {accounts.length === 0 ? (
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
          {accounts.map(account => {
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
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                    {account.account_name}
                  </h4>
                  <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                    {channel?.name} • {account.account_email}
                  </div>
                  {account.credential_vault_ref && (
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      Vault: {account.credential_vault_ref}
                    </div>
                  )}
                  <div style={{ marginTop: '8px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '500',
                      backgroundColor: account.oauth_connected ? 'rgba(76, 175, 80, 0.2)' : 'rgba(158, 158, 158, 0.2)',
                      color: account.oauth_connected ? '#66BB6A' : '#BDBDBD'
                    }}>
                      {account.oauth_connected ? '✓ Auto-post ready' : 'Manual post only'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(account.id)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-text-secondary)',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Delete
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
