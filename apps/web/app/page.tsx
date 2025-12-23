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
import { useTenant } from '../contexts/TenantContext'
import { TodaysSchedule } from '../components/TodaysSchedule'
import { Dataflow } from '../components/Dataflow'
import { TechPerformance } from '../components/TechPerformance'

export default function Dashboard() {
  const router = useRouter()
  const isMobile = useMobile()
  const { currentTenant, isTenantSelected } = useTenant()
  const [stats, setStats] = useState({
    openTasks: 0,
    soldThisWeek: 0,
    totalOverdue: 0,
    pendingReviews: 0,
    marketingPosts: 0
  })
  const [overdueItems, setOverdueItems] = useState<any[]>([])
  const [openTasks, setOpenTasks] = useState<any[]>([])
  const [bidFollowUps, setBidFollowUps] = useState<any[]>([])
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
        } catch (e) { console.error('Failed to load jobs:', e) }
        
        try {
          const res = await axios.get(`${API_BASE_URL}/jobs/overdue?tenant_id=all_county`, { headers, withCredentials: true })
          overdueJobsData = res.data || []
        } catch (e) { console.error('Failed to load overdue jobs:', e) }
      }
      
      // Load service calls & reviews (H2O)
      if (isTenantSelected('h2o')) {
        try {
          const res = await axios.get(`${API_BASE_URL}/service-calls?tenant_id=h2o`, { headers, withCredentials: true })
          serviceCalls = res.data || []
        } catch (e) { console.error('Failed to load service calls:', e) }
        
        try {
          const res = await axios.get(`${API_BASE_URL}/service-calls/overdue?tenant_id=h2o`, { headers, withCredentials: true })
          overdueCallsData = res.data || []
        } catch (e) { console.error('Failed to load overdue calls:', e) }
        
        try {
          const res = await axios.get(`${API_BASE_URL}/reviews/requests?tenant_id=h2o`, { headers, withCredentials: true })
          reviewRequests = res.data || []
        } catch (e) { console.error('Failed to load review requests:', e) }
        
        try {
          const res = await axios.get(`${API_BASE_URL}/reviews/requests/overdue?tenant_id=h2o`, { headers, withCredentials: true })
          overdueReviewsData = res.data || []
        } catch (e) { console.error('Failed to load overdue reviews:', e) }
        
        try {
          const res = await axios.get(`${API_BASE_URL}/recovery-tickets/overdue?tenant_id=h2o`, { headers, withCredentials: true })
          overdueTicketsData = res.data || []
        } catch (e) { console.error('Failed to load overdue tickets:', e) }
      }
      
      // Load bids for "sold this week" and follow-ups
      try {
        const res = await axios.get(`${API_BASE_URL}/bids`, { 
          headers, 
          params: { limit: 100 },
          withCredentials: true 
        })
        bids = res.data || []
      } catch (e) { console.error('Failed to load bids:', e) }
      
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
      
      setStats({
        openTasks: openJobTasks.length + openCallTasks.length,
        soldThisWeek,
        totalOverdue,
        pendingReviews,
        marketingPosts: 0 // Marketing endpoint not active yet
      })
      
      setOpenTasks(allOpenTasks)
      setOverdueItems(allOverdue)
      setLoading(false)
    } catch (err) {
      console.error('Failed to load dashboard', err)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: isMobile ? '16px' : '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ width: '300px', height: '36px', backgroundColor: 'var(--color-hover)', borderRadius: '8px', marginBottom: '8px', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
        </div>
        <StatSkeleton count={5} />
      </div>
    )
  }

  return (
    <div style={{ padding: isMobile ? '16px' : '32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
          Operations Dashboard
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
          H2O Plumbing & All County Construction
        </p>
      </div>

      {/* Stats Grid - 5 key cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
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

      {/* Today's Schedule */}
      <div style={{ marginBottom: '24px' }}>
        <TodaysSchedule />
      </div>

      {/* Dataflow - Dispatch Signals */}
      <div style={{ marginBottom: '24px' }}>
        <Dataflow />
      </div>

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
        <div className="bg-[var(--color-card)]/50 border border-white/[0.08] backdrop-blur-sm shadow-xl rounded-lg p-5">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)] uppercase tracking-widest text-xs">Open Tasks</h2>
            <a href="/jobs" style={{ fontSize: '13px', color: 'var(--color-primary)', textDecoration: 'none' }}>View All →</a>
          </div>
          {openTasks.length === 0 ? (
            <div className="border-2 border-dashed border-[var(--color-border)] rounded-lg p-8 text-center">
              <p className="text-[var(--color-text-secondary)] mb-4">No open tasks</p>
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
                    backgroundColor: 'var(--color-hover)',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    borderLeft: `3px solid ${item.type === 'job' ? '#60A5FA' : '#FF9800'}`
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '500', color: 'var(--color-text-primary)', fontSize: '14px', marginBottom: '2px' }}>
                      {item.type === 'job' ? (
                        <>{item.community} - Lot <span className="font-mono">{item.lot_number}</span></>
                      ) : item.customer_name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      {item.type === 'job' ? 'Job' : 'Service Call'} • {item.status}
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '500',
                    backgroundColor: item.type === 'job' ? 'rgba(96, 165, 250, 0.15)' : 'rgba(255, 152, 0, 0.15)',
                    color: item.type === 'job' ? '#60A5FA' : '#FF9800'
                  }}>
                    {item.type === 'job' ? 'JOB' : 'CALL'}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Middle Column - Bids Pipeline */}
        <div className={`bg-[var(--color-card)]/50 border backdrop-blur-sm shadow-xl rounded-lg p-5 ${bidFollowUps.length > 0 ? 'border-blue-500/30' : 'border-white/[0.08]'}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)] uppercase tracking-widest text-xs flex items-center gap-2">
              📋 Bids Pipeline
            </h2>
            <a href="/bids" style={{ fontSize: '13px', color: 'var(--color-primary)', textDecoration: 'none' }}>View All →</a>
          </div>
          {bidFollowUps.length === 0 ? (
            <div className="border-2 border-dashed border-[var(--color-border)] rounded-lg p-8 text-center">
              <p className="text-[var(--color-text-secondary)] mb-4">No bids need follow-up</p>
              <Button onClick={() => router.push('/bids')} variant="primary" size="sm">
                Create New Bid
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:gap-2">
              {bidFollowUps.map((bid: any) => {
                let reasonText = ''
                let reasonColor = 'var(--color-text-secondary)'
                let borderColor = '#60A5FA'
                
                if (bid.followUpReason === 'overdue') {
                  reasonText = `${bid.daysOverdue} day${bid.daysOverdue !== 1 ? 's' : ''} overdue`
                  reasonColor = '#EF5350'
                  borderColor = '#EF5350'
                } else if (bid.followUpReason === 'sent_no_response') {
                  reasonText = `Sent ${bid.daysSinceSent} day${bid.daysSinceSent !== 1 ? 's' : ''} ago`
                  reasonColor = '#FF9800'
                  borderColor = '#FF9800'
                } else if (bid.followUpReason === 'approaching_due') {
                  reasonText = `Due in ${bid.daysUntilDue} day${bid.daysUntilDue !== 1 ? 's' : ''}`
                  reasonColor = '#FF9800'
                  borderColor = '#FF9800'
                }
                
                const isWon = bid.status === 'Won'
                
                return (
                  <a
                    key={bid.id}
                    href={`/bids/${bid.id}`}
                    className={`
                      flex flex-col p-3 bg-[var(--color-card)]/50 rounded-lg no-underline border-l-2 transition-all
                      ${isWon 
                        ? 'border-green-500 shadow-[2px_0_10px_rgba(34,197,94,0.15)]' 
                        : `border-[${borderColor}]`
                      }
                      hover:translate-x-1 hover:shadow-lg
                    `}
                    style={{
                      borderLeftColor: isWon ? undefined : borderColor
                    }}
                  >
                    <div style={{ fontWeight: '500', color: 'var(--color-text-primary)', fontSize: '14px', marginBottom: '4px' }}>
                      {bid.project_name}
                    </div>
                    <div style={{ fontSize: '12px', color: reasonColor, marginBottom: '2px' }}>
                      {reasonText}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '500',
                        backgroundColor: bid.status === 'Sent' ? 'rgba(76, 175, 80, 0.15)' : 'rgba(158, 158, 158, 0.15)',
                        color: bid.status === 'Sent' ? '#4CAF50' : '#9E9E9E'
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
        </div>

        {/* Right Column - Overdue Items */}
        <div className={`bg-[var(--color-card)]/50 border backdrop-blur-sm shadow-xl rounded-lg p-5 ${stats.totalOverdue > 0 ? 'border-red-500/30' : 'border-white/[0.08]'}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 className={`text-base font-semibold uppercase tracking-widest text-xs flex items-center gap-2 ${stats.totalOverdue > 0 ? 'text-red-500' : 'text-[var(--color-text-primary)]'}`}>
              {stats.totalOverdue > 0 && <span>⚠️</span>} Overdue Items
            </h2>
          </div>
          {overdueItems.length === 0 ? (
            <div className="border-2 border-dashed border-[var(--color-border)] rounded-lg p-8 text-center">
              <p className="text-[var(--color-text-secondary)] mb-4">No overdue items</p>
              <Button onClick={() => router.push('/jobs')} variant="secondary" size="sm">
                View All Tasks
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:gap-2">
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
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    borderLeft: '3px solid #EF5350'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '500', color: '#111827', fontSize: '14px', marginBottom: '2px' }}>
                      {item.type === 'job' ? (
                        <>{item.community} - Lot <span className="font-mono">{item.lot_number}</span></>
                      ) : item.type === 'service_call' ? item.customer_name :
                       item.type === 'review_request' ? item.customer_name :
                       `Recovery: ${item.customer_name}`}
                    </div>
                    <div style={{ fontSize: '12px', color: '#EF5350' }}>
                      {item.days_overdue} days overdue
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

