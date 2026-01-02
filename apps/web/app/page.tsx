'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { API_BASE_URL } from '../lib/config'
import { useMobile } from '../lib/useMobile'
import { handleApiError } from '../lib/error-handler'
import { StatSkeleton } from '../components/ui/Skeleton'
import { StatCard } from '../components/ui/StatCard'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { useTenant } from '../contexts/TenantContext'
import { TodaysSchedule } from '../components/TodaysSchedule'
import { Dataflow } from '../components/Dataflow'
import { TechPerformance } from '../components/TechPerformance'
import { ServiceCallsCalendar } from '../components/ServiceCallsCalendar'
import { IconWrapper } from '../components/ui/IconWrapper'
import UilExclamationTriangle from '@iconscout/react-unicons/icons/uil-exclamation-triangle'
import UilFileAlt from '@iconscout/react-unicons/icons/uil-file-alt'
import UilShoppingCart from '@iconscout/react-unicons/icons/uil-shopping-cart'
import UilEnvelopeSend from '@iconscout/react-unicons/icons/uil-envelope-send'
import UilPhoneAlt from '@iconscout/react-unicons/icons/uil-phone-alt'
import UilInvoice from '@iconscout/react-unicons/icons/uil-invoice'
import UilClipboardNotes from '@iconscout/react-unicons/icons/uil-clipboard-notes'

export default function Dashboard() {
  const router = useRouter()
  const isMobile = useMobile()
  const { currentTenant, isTenantSelected } = useTenant()
  const [stats, setStats] = useState({
    openTasks: 0,
    soldThisWeek: 0,
    totalOverdue: 0,
    pendingReviews: 0,
    marketingPosts: 0,
    pendingServiceCallTasks: 0
  })
  const [overdueItems, setOverdueItems] = useState<any[]>([])
  const [openTasks, setOpenTasks] = useState<any[]>([])
  const [bidFollowUps, setBidFollowUps] = useState<any[]>([])
  const [pendingServiceCallTasks, setPendingServiceCallTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [currentTenant])

  async function loadDashboard() {
    try {
      const token = localStorage.getItem('token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      
      let jobs: any[] = []
      let serviceCalls: any[] = []
      let bids: any[] = []
      let reviewRequests: any[] = []
      let overdueJobsData: any[] = []
      let overdueCallsData: any[] = []
      let overdueReviewsData: any[] = []
      let overdueTicketsData: any[] = []
      
      // Load jobs (All County)
      if (isTenantSelected('all_county')) {
        try {
          const res = await axios.get(`${API_BASE_URL}/jobs?tenant_id=all_county`, { headers, withCredentials: true })
          jobs = res.data || []
        } catch (e) { handleApiError(e, 'Load jobs') }
        
        try {
          const res = await axios.get(`${API_BASE_URL}/jobs/overdue?tenant_id=all_county`, { headers, withCredentials: true })
          overdueJobsData = res.data || []
        } catch (e) { handleApiError(e, 'Load overdue jobs') }
      }
      
      // Load service calls & reviews (H2O) - only today and next week
      if (isTenantSelected('h2o')) {
        try {
          // Filter to only show today and next week
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const nextWeekEnd = new Date(today)
          nextWeekEnd.setDate(today.getDate() + 7) // 7 days from today
          nextWeekEnd.setHours(23, 59, 59, 999)
          
          const res = await axios.get(`${API_BASE_URL}/service-calls?tenant_id=h2o&limit=1000`, { headers, withCredentials: true })
          const allCalls = res.data || []
          
          // Filter by date range
          serviceCalls = allCalls.filter((call: any) => {
            if (!call.scheduled_start) return false
            const callDate = new Date(call.scheduled_start)
            return callDate >= today && callDate <= nextWeekEnd
          })
        } catch (e) { handleApiError(e, 'Load service calls') }
        
        try {
          const res = await axios.get(`${API_BASE_URL}/service-calls/overdue?tenant_id=h2o`, { headers, withCredentials: true })
          overdueCallsData = res.data || []
        } catch (e) { handleApiError(e, 'Load overdue service calls') }
        
        try {
          const res = await axios.get(`${API_BASE_URL}/reviews/requests?tenant_id=h2o`, { headers, withCredentials: true })
          reviewRequests = res.data || []
        } catch (e) { handleApiError(e, 'Load review requests') }
        
        try {
          const res = await axios.get(`${API_BASE_URL}/reviews/requests/overdue?tenant_id=h2o`, { headers, withCredentials: true })
          overdueReviewsData = res.data || []
        } catch (e) { handleApiError(e, 'Load overdue review requests') }
        
        try {
          const res = await axios.get(`${API_BASE_URL}/recovery-tickets/overdue?tenant_id=h2o`, { headers, withCredentials: true })
          overdueTicketsData = res.data || []
        } catch (e) { handleApiError(e, 'Load overdue recovery tickets') }
      }
      
      // Load bids for "sold this week" and follow-ups
      try {
        const res = await axios.get(`${API_BASE_URL}/bids`, { 
          headers, 
          params: { limit: 100 },
          withCredentials: true 
        })
        bids = res.data || []
      } catch (e) { handleApiError(e, 'Load bids') }
      
      // Calculate sold this week (bids with status 'Won' updated this week)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const soldThisWeek = bids.filter((b: any) => 
        b.status === 'Won' && new Date(b.updated_at) >= weekAgo
      ).length
      
      // Find bids that need follow-up
      const now = new Date()
      const followUpBids: any[] = []
      
      for (const bid of bids) {
        // Overdue bids (due_date passed, not Won/Lost)
        if (bid.due_date && bid.status !== 'Won' && bid.status !== 'Lost') {
          const dueDate = new Date(bid.due_date)
          if (dueDate < now) {
            const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
            followUpBids.push({
              ...bid,
              followUpReason: 'overdue',
              daysOverdue,
              priority: 'high'
            })
            continue
          }
        }
        
        // Sent bids that haven't been updated in 7+ days (need follow-up)
        if (bid.status === 'Sent' && bid.sent_date) {
          const sentDate = new Date(bid.sent_date)
          const daysSinceSent = Math.floor((now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24))
          if (daysSinceSent >= 7) {
            followUpBids.push({
              ...bid,
              followUpReason: 'sent_no_response',
              daysSinceSent,
              priority: 'medium'
            })
            continue
          }
        }
        
        // Draft bids approaching due date (within 3 days)
        if (bid.status === 'Draft' && bid.due_date) {
          const dueDate = new Date(bid.due_date)
          const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          if (daysUntilDue >= 0 && daysUntilDue <= 3) {
            followUpBids.push({
              ...bid,
              followUpReason: 'approaching_due',
              daysUntilDue,
              priority: 'medium'
            })
            continue
          }
        }
      }
      
      // Sort by priority (high first) then by days
      followUpBids.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        if (priorityOrder[a.priority as keyof typeof priorityOrder] !== priorityOrder[b.priority as keyof typeof priorityOrder]) {
          return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]
        }
        const aDays = a.daysOverdue || a.daysSinceSent || a.daysUntilDue || 0
        const bDays = b.daysOverdue || b.daysSinceSent || b.daysUntilDue || 0
        return bDays - aDays
      })
      
      setBidFollowUps(followUpBids.slice(0, 5))
      
      // Open tasks = jobs not completed + service calls not completed
      const openJobTasks = jobs.filter((j: any) => j.status !== 'Completed')
      const openCallTasks = serviceCalls.filter((c: any) => c.status !== 'Completed')
      const allOpenTasks = [
        ...openJobTasks.map((j: any) => ({ ...j, type: 'job' })),
        ...openCallTasks.map((c: any) => ({ ...c, type: 'service_call' }))
      ].slice(0, 8)
      
      // Total overdue
      const totalOverdue = overdueJobsData.length + overdueCallsData.length + 
                          overdueReviewsData.length + overdueTicketsData.length
      
      // Combine all overdue items
      const allOverdue = [
        ...overdueJobsData.map((j: any) => ({ ...j, type: 'job' })),
        ...overdueCallsData.map((c: any) => ({ ...c, type: 'service_call' })),
        ...overdueReviewsData.map((r: any) => ({ ...r, type: 'review_request' })),
        ...overdueTicketsData.map((t: any) => ({ ...t, type: 'recovery_ticket' }))
      ].slice(0, 5)
      
      // Pending reviews = review requests not completed
      const pendingReviews = reviewRequests.filter((r: any) => 
        r.status !== 'completed' && r.status !== 'review_received'
      ).length
      
      // Load pending service call tasks
      try {
        const tasksRes = await axios.get(`${API_BASE_URL}/service-calls/tasks/pending?tenant_id=h2o`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          withCredentials: true
        })
        const tasks = Array.isArray(tasksRes.data) ? tasksRes.data : []
        setPendingServiceCallTasks(tasks)
      } catch (err) {
        handleApiError(err, 'Load pending tasks')
        setPendingServiceCallTasks([])
      }
      
      setStats({
        openTasks: openJobTasks.length + openCallTasks.length,
        soldThisWeek,
        totalOverdue,
        pendingReviews,
        marketingPosts: 0, // Marketing endpoint not active yet
        pendingServiceCallTasks: pendingServiceCallTasks.length
      })
      
      setOpenTasks(allOpenTasks)
      setOverdueItems(allOverdue)
      setLoading(false)
    } catch (err) {
      handleApiError(err, 'Load dashboard')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: isMobile ? '16px' : '32px', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ 
            width: '300px', 
            height: '36px', 
            backgroundColor: 'var(--color-surface-elevated)', 
            borderRadius: 'var(--radius-md)', 
            marginBottom: '8px', 
            animation: 'skeleton-pulse 1.5s ease-in-out infinite' 
          }} />
        </div>
        <StatSkeleton count={5} />
      </div>
    )
  }

  return (
    <div style={{ padding: isMobile ? '16px' : '32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <PageHeader
        title="Operations Dashboard"
        description="H2O Plumbing & All County Construction"
      />

      {/* Stats Grid - 6 key cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(6, 1fr)',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <StatCard
          title="Open Tasks"
          value={stats.openTasks}
          color="#60A5FA"
          href="/jobs"
        />
        <StatCard
          title="Sold This Week"
          value={stats.soldThisWeek}
          color="#4CAF50"
          href="/bids"
        />
        <StatCard
          title="Overdue"
          value={stats.totalOverdue}
          color={stats.totalOverdue > 0 ? '#EF5350' : '#9E9E9E'}
          href="/jobs?overdue=true"
          alert={stats.totalOverdue > 0}
        />
        <StatCard
          title="Pending Reviews"
          value={stats.pendingReviews}
          color="#FF9800"
          href="/reviews"
        />
        <StatCard
          title="Marketing Posts"
          value={stats.marketingPosts}
          color="#9C27B0"
          href="/marketing"
        />
      </div>

      {/* Pending Service Call Tasks - Critical for office staff */}
      {pendingServiceCallTasks.length > 0 && (
        <Card style={{
          marginBottom: '24px',
          borderColor: 'var(--color-error)',
          borderWidth: '2px'
        }}>
          <CardHeader 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-error)' }}>
                <IconWrapper Icon={UilExclamationTriangle} size={18} color="var(--color-error)" />
                <span>Pending Follow-up Tasks ({pendingServiceCallTasks.length})</span>
              </div>
            }
            action={
              <a 
                href="/service-calls" 
                style={{ 
                  fontSize: 'var(--text-sm)', 
                  color: 'var(--color-primary)', 
                  textDecoration: 'none',
                  fontWeight: 500
                }}
                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
              >
                View All →
              </a>
            }
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pendingServiceCallTasks.slice(0, 5).map((task: any) => {
              const taskTypeIcons: Record<string, React.ComponentType<{ size?: number | string; color?: string }>> = {
                'pull_permit': UilFileAlt,
                'order_parts': UilShoppingCart,
                'send_bid': UilEnvelopeSend,
                'call_back_schedule': UilPhoneAlt,
                'write_up_billing': UilInvoice,
                'other': UilClipboardNotes
              }
              const isOverdue = task.due_date && new Date(task.due_date) < new Date()
              
              return (
                <a
                  key={task.id}
                  href={`/service-calls/${task.service_call_id}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    padding: '16px',
                    backgroundColor: isOverdue ? 'rgba(239, 68, 68, 0.05)' : 'var(--color-surface-elevated)',
                    borderRadius: 'var(--radius-md)',
                    textDecoration: 'none',
                    borderLeft: `3px solid ${isOverdue ? 'var(--color-error)' : 'var(--color-primary)'}`,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(2px)'
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      marginBottom: '4px'
                    }}>
                      {(() => {
                        const Icon = taskTypeIcons[task.task_type] || UilClipboardNotes
                        return <Icon size={18} color="var(--color-text-primary)" />
                      })()}
                      <span style={{ 
                        fontWeight: 600, 
                        color: 'var(--color-text-primary)', 
                        fontSize: 'var(--text-base)'
                      }}>
                        {task.title}
                      </span>
                      {isOverdue && (
                        <span style={{
                          padding: '2px 8px',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          color: '#ef4444',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 600
                        }}>
                          OVERDUE
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <div style={{ 
                        fontSize: 'var(--text-sm)', 
                        color: 'var(--color-text-secondary)',
                        marginTop: '4px'
                      }}>
                        {task.description}
                      </div>
                    )}
                    <div style={{ 
                      display: 'flex', 
                      gap: '12px', 
                      marginTop: '8px',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--color-text-tertiary)'
                    }}>
                      {task.assigned_to && (
                        <span>Assigned to: <strong>{task.assigned_to}</strong></span>
                      )}
                      {task.due_date && (
                        <span style={{ color: isOverdue ? '#ef4444' : undefined }}>
                          Due: <strong>{new Date(task.due_date).toLocaleDateString()}</strong>
                        </span>
                      )}
                      <span>Created by: <strong>{task.created_by || 'Tech'}</strong></span>
                    </div>
                  </div>
                </a>
              )
            })}
            {pendingServiceCallTasks.length > 5 && (
              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <a
                  href="/service-calls"
                  style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-primary)',
                    textDecoration: 'none',
                    fontWeight: 500
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                >
                  View all {pendingServiceCallTasks.length} pending tasks →
                </a>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Today's Schedule */}
      <div style={{ marginBottom: '24px' }}>
        <TodaysSchedule />
      </div>

      {/* Dataflow - Dispatch Signals */}
      <div style={{ marginBottom: '24px' }}>
        <Dataflow />
      </div>

      {/* Service Calls Calendar */}
      {isTenantSelected('h2o') && (
        <div style={{ marginBottom: '24px' }}>
          <ServiceCallsCalendar />
        </div>
      )}

      {/* Tech Performance */}
      <div style={{ marginBottom: '24px' }}>
        <TechPerformance />
      </div>

      {/* Three Column Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
        gap: '24px',
        marginBottom: '24px'
      }}>
        {/* Left Column - Open Tasks */}
        <Card>
          <CardHeader 
            title="Open Tasks"
            action={
              <a 
                href="/jobs" 
                style={{ 
                  fontSize: 'var(--text-sm)', 
                  color: 'var(--color-primary)', 
                  textDecoration: 'none',
                  fontWeight: 500
                }}
                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
              >
                View All →
              </a>
            }
          />
          {openTasks.length === 0 ? (
            <div className="border-2 border-dashed border-[var(--color-border)] rounded-lg p-8 text-center">
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>No open tasks</p>
              <Button onClick={() => router.push('/jobs')} variant="primary" size="sm">
                Create New
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {openTasks.map((item: any) => (
                <a
                  key={item.id}
                  href={item.type === 'job' ? `/jobs/${item.id}` : `/service-calls/${item.id}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: 'var(--color-surface-elevated)',
                    borderRadius: 'var(--radius-md)',
                    textDecoration: 'none',
                    borderLeft: `3px solid ${item.type === 'job' ? 'var(--color-primary)' : 'var(--color-warning)'}`,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-hover)'
                    e.currentTarget.style.transform = 'translateX(2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-surface-elevated)'
                    e.currentTarget.style.transform = 'translateX(0)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', marginBottom: '2px' }}>
                      {item.type === 'job' ? (
                        <>{item.community || 'Unknown'} - Lot <span className="font-mono">{item.lot_number || 'N/A'}</span></>
                      ) : (item.customer_name || 'Unknown Customer')}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                      {item.type === 'job' ? 'Job' : 'Service Call'} • {item.status || 'Unknown'}
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 500,
                    backgroundColor: item.type === 'job' ? 'var(--color-primary-light)' : 'var(--color-warning-bg)',
                    color: item.type === 'job' ? 'var(--color-primary)' : 'var(--color-warning)'
                  }}>
                    {item.type === 'job' ? 'JOB' : 'CALL'}
                  </span>
                </a>
              ))}
            </div>
          )}
        </Card>

        {/* Middle Column - Bids Pipeline */}
        <Card style={{
          borderColor: bidFollowUps.length > 0 ? 'var(--color-primary)' : undefined,
          borderWidth: bidFollowUps.length > 0 ? '1px' : undefined
        }}>
          <CardHeader 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconWrapper Icon={UilFileAlt} size={16} />
                <span>Bids Pipeline</span>
              </div>
            }
            action={
              <a 
                href="/bids" 
                style={{ 
                  fontSize: 'var(--text-sm)', 
                  color: 'var(--color-primary)', 
                  textDecoration: 'none',
                  fontWeight: 500
                }}
                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
              >
                View All →
              </a>
            }
          />
          {bidFollowUps.length === 0 ? (
            <div className="border-2 border-dashed border-[var(--color-border)] rounded-lg p-8 text-center">
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>No bids need follow-up</p>
              <Button onClick={() => router.push('/bids')} variant="primary" size="sm">
                Create New Bid
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {bidFollowUps.map((bid: any) => {
                let reasonText = ''
                let reasonColor = 'var(--color-text-secondary)'
                let borderColor = 'var(--color-primary)'
                
                if (bid.followUpReason === 'overdue') {
                  reasonText = `${bid.daysOverdue} day${bid.daysOverdue !== 1 ? 's' : ''} overdue`
                  reasonColor = 'var(--color-error)'
                  borderColor = 'var(--color-error)'
                } else if (bid.followUpReason === 'sent_no_response') {
                  reasonText = `Sent ${bid.daysSinceSent} day${bid.daysSinceSent !== 1 ? 's' : ''} ago`
                  reasonColor = 'var(--color-warning)'
                  borderColor = 'var(--color-warning)'
                } else if (bid.followUpReason === 'approaching_due') {
                  reasonText = `Due in ${bid.daysUntilDue} day${bid.daysUntilDue !== 1 ? 's' : ''}`
                  reasonColor = 'var(--color-warning)'
                  borderColor = 'var(--color-warning)'
                }
                
                const isWon = bid.status === 'Won'
                
                return (
                  <a
                    key={bid.id}
                    href={`/bids/${bid.id}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '12px',
                      backgroundColor: 'var(--color-surface-elevated)',
                      borderRadius: 'var(--radius-md)',
                      textDecoration: 'none',
                      borderLeft: `3px solid ${isWon ? 'var(--color-success)' : borderColor}`,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateX(2px)'
                      e.currentTarget.style.boxShadow = 'var(--shadow-md)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateX(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <div style={{ fontWeight: 500, color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', marginBottom: '4px' }}>
                      {bid.project_name}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: reasonColor, marginBottom: '2px' }}>
                      {reasonText}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 500,
                        backgroundColor: bid.status === 'Sent' ? 'var(--color-success-bg)' : 'var(--color-neutral-bg)',
                        color: bid.status === 'Sent' ? 'var(--color-success)' : 'var(--color-neutral)'
                      }}>
                        {bid.status}
                      </span>
                      {bid.amount_cents && (
                        <span className="font-mono">• ${(bid.amount_cents / 100).toFixed(2)}</span>
                      )}
                    </div>
                  </a>
                )
              })}
            </div>
          )}
        </Card>

        {/* Right Column - Overdue Items */}
        <Card style={{
          borderColor: stats.totalOverdue > 0 ? 'var(--color-error)' : undefined,
          borderWidth: stats.totalOverdue > 0 ? '1px' : undefined
        }}>
          <CardHeader 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: stats.totalOverdue > 0 ? 'var(--color-error)' : undefined }}>
                {stats.totalOverdue > 0 && <IconWrapper Icon={UilExclamationTriangle} size={16} color="var(--color-error)" />}
                <span>Overdue Items</span>
              </div>
            }
          />
          {overdueItems.length === 0 ? (
            <div className="border-2 border-dashed border-[var(--color-border)] rounded-lg p-8 text-center">
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>No overdue items</p>
              <Button onClick={() => router.push('/jobs')} variant="secondary" size="sm">
                View All Tasks
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {overdueItems.map((item: any) => (
                <a
                  key={item.id}
                  href={
                    item.type === 'job' ? `/jobs/${item.id}` :
                    item.type === 'service_call' ? `/service-calls/${item.id}` :
                    item.type === 'review_request' ? `/review-requests/${item.id}` :
                    `/recovery-tickets/${item.id}`
                  }
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: 'var(--color-surface-elevated)',
                    borderRadius: 'var(--radius-md)',
                    textDecoration: 'none',
                    borderLeft: '3px solid var(--color-error)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-hover)'
                    e.currentTarget.style.transform = 'translateX(2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-surface-elevated)'
                    e.currentTarget.style.transform = 'translateX(0)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)', marginBottom: '2px' }}>
                      {item.type === 'job' ? (
                        <>{item.community || 'Unknown'} - Lot <span className="font-mono">{item.lot_number || 'N/A'}</span></>
                      ) : item.type === 'service_call' ? (item.customer_name || 'Unknown Customer') :
                       item.type === 'review_request' ? (item.customer_name || 'Unknown Customer') :
                       `Recovery: ${item.customer_name || 'Unknown Customer'}`}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)' }}>
                      {item.days_overdue || 0} days overdue
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

