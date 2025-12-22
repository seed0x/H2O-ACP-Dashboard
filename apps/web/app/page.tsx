'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { API_BASE_URL } from '../lib/config'
import { useMobile } from '../lib/useMobile'
import { handleApiError } from '../lib/error-handler'
import { StatSkeleton } from '../components/ui/Skeleton'
import { useTenant } from '../contexts/TenantContext'
import { TodaysSchedule } from '../components/TodaysSchedule'
import { Dataflow } from '../components/Dataflow'

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
      
      // Load bids for "sold this week"
      try {
        const res = await axios.get(`${API_BASE_URL}/bids`, { headers, withCredentials: true })
        bids = res.data || []
      } catch (e) { console.error('Failed to load bids:', e) }
      
      // Calculate sold this week (bids with status 'Accepted' updated this week)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const soldThisWeek = bids.filter((b: any) => 
        b.status === 'Accepted' && new Date(b.updated_at) >= weekAgo
      ).length
      
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

      {/* Two Column Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: '24px'
      }}>
        {/* Left Column - Open Tasks */}
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)' }}>Open Tasks</h2>
            <a href="/jobs" style={{ fontSize: '13px', color: 'var(--color-primary)', textDecoration: 'none' }}>View All →</a>
          </div>
          {openTasks.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
              No open tasks
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
                      {item.type === 'job' ? `${item.community} - Lot ${item.lot_number}` : item.customer_name}
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

        {/* Right Column - Overdue Items */}
        <div style={{
          backgroundColor: stats.totalOverdue > 0 ? 'rgba(239, 83, 80, 0.05)' : 'var(--color-card)',
          border: `1px solid ${stats.totalOverdue > 0 ? '#EF5350' : 'var(--color-border)'}`,
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: stats.totalOverdue > 0 ? '#EF5350' : 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {stats.totalOverdue > 0 && <span>⚠️</span>} Overdue Items
            </h2>
          </div>
          {overdueItems.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
              ✓ No overdue items
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
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    borderLeft: '3px solid #EF5350'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '500', color: '#111827', fontSize: '14px', marginBottom: '2px' }}>
                      {item.type === 'job' ? `${item.community} - Lot ${item.lot_number}` :
                       item.type === 'service_call' ? item.customer_name :
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

function StatCard({ title, value, color, href, alert }: {
  title: string
  value: number
  color: string
  href?: string
  alert?: boolean
}) {
  const content = (
    <div style={{
      backgroundColor: alert ? 'rgba(239, 83, 80, 0.05)' : 'var(--color-card)',
      border: `1px solid ${alert ? '#EF5350' : 'var(--color-border)'}`,
      borderRadius: '12px',
      padding: '16px',
      transition: 'all 0.2s',
      cursor: href ? 'pointer' : 'default'
    }}>
      <div style={{
        fontSize: '11px',
        color: 'var(--color-text-secondary)',
        marginBottom: '8px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        fontWeight: '500'
      }}>{title}</div>
      <div style={{
        fontSize: '28px',
        fontWeight: '700',
        color: color
      }}>{value}</div>
    </div>
  )
  
  if (href) {
    return <a href={href} style={{ textDecoration: 'none' }}>{content}</a>
  }
  return content
}
