'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../lib/config'
import { useMobile } from '../lib/useMobile'
import { Dataflow } from '../components/Dataflow'
import { handleApiError } from '../lib/error-handler'
import { StatSkeleton } from '../components/ui/Skeleton'
import { useTenant } from '../contexts/TenantContext'
import { TodaysSchedule } from '../components/TodaysSchedule'

export default function Dashboard() {
  const isMobile = useMobile()
  const { currentTenant, isTenantSelected } = useTenant()
  const [stats, setStats] = useState({
    activeJobs: 0,
    pendingServiceCalls: 0,
    totalBuilders: 0,
    completedThisWeek: 0,
    overdueJobs: 0,
    overdueServiceCalls: 0,
    overdueReviewRequests: 0,
    overdueRecoveryTickets: 0
  })
  const [recentJobs, setRecentJobs] = useState<any[]>([])
  const [recentCalls, setRecentCalls] = useState<any[]>([])
  const [overdueJobs, setOverdueJobs] = useState<any[]>([])
  const [overdueServiceCalls, setOverdueServiceCalls] = useState<any[]>([])
  const [overdueReviewRequests, setOverdueReviewRequests] = useState<any[]>([])
  const [overdueRecoveryTickets, setOverdueRecoveryTickets] = useState<any[]>([])
  const [todayJobs, setTodayJobs] = useState<any[]>([])
  const [todayServiceCalls, setTodayServiceCalls] = useState<any[]>([])
  const [thisWeekJobs, setThisWeekJobs] = useState<any[]>([])
  const [thisWeekServiceCalls, setThisWeekServiceCalls] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [currentTenant]) // Reload when tenant changes

  async function loadDashboard() {
    try {
      const token = localStorage.getItem('token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      
      // Load core data with error handling
      let jobs = { data: [] }
      let serviceCalls = { data: [] }
      let builders = { data: [] }
      
      // Load jobs (All County specific or filter by current tenant)
      if (isTenantSelected('all_county')) {
        try {
          const jobsParams = currentTenant === 'both' ? '' : `?tenant_id=all_county`
          jobs = await axios.get(`${API_BASE_URL}/jobs${jobsParams}`, { headers, withCredentials: true })
        } catch (error) {
          handleApiError(error, 'Loading jobs', loadDashboard)
        }
      }
      
      // Load service calls (H2O specific or filter by current tenant)
      if (isTenantSelected('h2o')) {
        try {
          const callsParams = currentTenant === 'both' ? '' : `?tenant_id=h2o`
          serviceCalls = await axios.get(`${API_BASE_URL}/service-calls${callsParams}`, { headers, withCredentials: true })
        } catch (error) {
          handleApiError(error, 'Loading service calls', loadDashboard)
        }
      }
      
      try {
        builders = await axios.get(`${API_BASE_URL}/builders`, { headers, withCredentials: true })
      } catch (error) {
        handleApiError(error, 'Loading builders', loadDashboard)
      }
      
      // Load overdue data with individual error handling
      let overdueJobsRes = { data: [] }
      let overdueCallsRes = { data: [] }
      let overdueRequestsRes = { data: [] }
      let overdueTicketsRes = { data: [] }
      
      // Load overdue jobs (All County) - always pass tenant_id
      if (isTenantSelected('all_county')) {
        try {
          overdueJobsRes = await axios.get(`${API_BASE_URL}/jobs/overdue?tenant_id=all_county`, { headers, withCredentials: true })
        } catch (error) {
          console.error('Failed to load overdue jobs:', error)
        }
      }
      
      // Load overdue service calls (H2O) - always pass tenant_id
      if (isTenantSelected('h2o')) {
        try {
          overdueCallsRes = await axios.get(`${API_BASE_URL}/service-calls/overdue?tenant_id=h2o`, { headers, withCredentials: true })
        } catch (error) {
          console.error('Failed to load overdue service calls:', error)
        }
        
        try {
          overdueRequestsRes = await axios.get(`${API_BASE_URL}/reviews/requests/overdue?tenant_id=h2o`, { headers, withCredentials: true })
        } catch (error) {
          console.error('Failed to load overdue review requests:', error)
        }
        
        try {
          overdueTicketsRes = await axios.get(`${API_BASE_URL}/recovery-tickets/overdue?tenant_id=h2o`, { headers, withCredentials: true })
        } catch (error) {
          console.error('Failed to load overdue recovery tickets:', error)
        }
      }

      const activeJobs = jobs.data.filter((j: any) => j.status !== 'Completed').length
      const pendingCalls = serviceCalls.data.filter((c: any) => c.status === 'New' || c.status === 'Scheduled').length
      
      setStats({
        activeJobs,
        pendingServiceCalls: pendingCalls,
        totalBuilders: builders.data.length,
        completedThisWeek: 0,
        overdueJobs: overdueJobsRes.data.length,
        overdueServiceCalls: overdueCallsRes.data.length,
        overdueReviewRequests: overdueRequestsRes.data.length,
        overdueRecoveryTickets: overdueTicketsRes.data.length
      })

      setRecentJobs(jobs.data.slice(0, 5))
      setRecentCalls(serviceCalls.data.slice(0, 5))
      setOverdueJobs(overdueJobsRes.data.slice(0, 5))
      setOverdueServiceCalls(overdueCallsRes.data.slice(0, 5))
      setOverdueReviewRequests(overdueRequestsRes.data.slice(0, 5))
      setOverdueRecoveryTickets(overdueTicketsRes.data.slice(0, 5))
      
      // Filter today's items
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      const todayJobsList = jobs.data.filter((j: any) => {
        if (!j.scheduled_start) return false
        const scheduled = new Date(j.scheduled_start)
        return scheduled >= today && scheduled < tomorrow
      })
      setTodayJobs(todayJobsList.slice(0, 5))
      
      const todayCallsList = serviceCalls.data.filter((c: any) => {
        if (!c.scheduled_start) return false
        const scheduled = new Date(c.scheduled_start)
        return scheduled >= today && scheduled < tomorrow
      })
      setTodayServiceCalls(todayCallsList.slice(0, 5))
      
      // Filter this week's items
      const weekEnd = new Date(today)
      weekEnd.setDate(weekEnd.getDate() + 7)
      
      const weekJobsList = jobs.data.filter((j: any) => {
        if (!j.scheduled_start) return false
        const scheduled = new Date(j.scheduled_start)
        return scheduled >= today && scheduled < weekEnd
      })
      setThisWeekJobs(weekJobsList.slice(0, 10))
      
      const weekCallsList = serviceCalls.data.filter((c: any) => {
        if (!c.scheduled_start) return false
        const scheduled = new Date(c.scheduled_start)
        return scheduled >= today && scheduled < weekEnd
      })
      setThisWeekServiceCalls(weekCallsList.slice(0, 10))
      
      setLoading(false)
    } catch (err) {
      console.error('Failed to load dashboard', err)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: isMobile ? '16px' : '32px' }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{ width: '300px', height: '40px', backgroundColor: 'var(--color-hover)', borderRadius: '8px', marginBottom: '12px', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
          <div style={{ width: '200px', height: '20px', backgroundColor: 'var(--color-hover)', borderRadius: '4px', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
        </div>
        <StatSkeleton count={4} />
      </div>
    )
  }

  return (
    <div style={{ 
      padding: isMobile ? '16px' : '32px'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          color: 'var(--color-text-primary)',
          marginBottom: '8px'
        }}>Operations Dashboard</h1>
        <p style={{
          fontSize: '14px',
          color: 'var(--color-text-secondary)'
        }}>H2O Plumbing & All County Construction</p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        <StatCard
          title="Active Jobs"
          value={stats.activeJobs}
          color="#60A5FA"
        />
        <StatCard
          title="Pending Service Calls"
          value={stats.pendingServiceCalls}
          color="#FF9800"
        />
        <StatCard
          title="Total Builders"
          value={stats.totalBuilders}
          color="#4CAF50"
        />
        <StatCard
          title="Completed This Week"
          value={stats.completedThisWeek}
          color="#2196F3"
        />
      </div>

      {/* Today's Schedule */}
      <div style={{ marginBottom: '32px' }}>
        <TodaysSchedule />
      </div>

      {/* Dataflow - Actionable Signals */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: 'var(--color-text-primary)',
            marginBottom: '8px'
          }}>
            Dataflow
          </h2>
          <p style={{
            fontSize: '14px',
            color: 'var(--color-text-secondary)'
          }}>
            Actionable items requiring attention
          </p>
        </div>
        <Dataflow />
      </div>

      {/* Overdue Alerts Section */}
      {(stats.overdueJobs > 0 || stats.overdueServiceCalls > 0 || stats.overdueReviewRequests > 0 || stats.overdueRecoveryTickets > 0) && (
        <div style={{
          backgroundColor: 'rgba(239, 83, 80, 0.1)',
          border: '1px solid #EF5350',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '32px'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#EF5350',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>⚠️</span> Overdue Items Requiring Attention
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '20px'
          }}>
            {stats.overdueJobs > 0 && (
              <div style={{ padding: '12px', backgroundColor: 'white', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#EF5350', marginBottom: '4px', textTransform: 'uppercase' }}>Overdue Jobs</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#EF5350' }}>{stats.overdueJobs}</div>
                <a href="/jobs?overdue=true" style={{ fontSize: '12px', color: '#EF5350', textDecoration: 'none' }}>View All →</a>
              </div>
            )}
            {stats.overdueServiceCalls > 0 && (
              <div style={{ padding: '12px', backgroundColor: 'white', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#EF5350', marginBottom: '4px', textTransform: 'uppercase' }}>Overdue Service Calls</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#EF5350' }}>{stats.overdueServiceCalls}</div>
                <a href="/service-calls?overdue=true" style={{ fontSize: '12px', color: '#EF5350', textDecoration: 'none' }}>View All →</a>
              </div>
            )}
            {stats.overdueReviewRequests > 0 && (
              <div style={{ padding: '12px', backgroundColor: 'white', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#EF5350', marginBottom: '4px', textTransform: 'uppercase' }}>Overdue Review Requests</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#EF5350' }}>{stats.overdueReviewRequests}</div>
                <a href="/reviews?overdue=true" style={{ fontSize: '12px', color: '#EF5350', textDecoration: 'none' }}>View All →</a>
              </div>
            )}
            {stats.overdueRecoveryTickets > 0 && (
              <div style={{ padding: '12px', backgroundColor: 'white', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#EF5350', marginBottom: '4px', textTransform: 'uppercase' }}>Overdue Recovery Tickets</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#EF5350' }}>{stats.overdueRecoveryTickets}</div>
                <a href="/reviews?tab=tickets&overdue=true" style={{ fontSize: '12px', color: '#EF5350', textDecoration: 'none' }}>View All →</a>
              </div>
            )}
          </div>
          
          {/* Show top overdue items */}
          {(overdueJobs.length > 0 || overdueServiceCalls.length > 0 || overdueReviewRequests.length > 0 || overdueRecoveryTickets.length > 0) && (
            <div style={{ marginTop: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#EF5350', marginBottom: '12px' }}>Top Overdue Items</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {overdueJobs.slice(0, 3).map((job: any) => (
                  <a
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    style={{
                      display: 'block',
                      padding: '12px',
                      backgroundColor: 'white',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      borderLeft: '3px solid #EF5350'
                    }}
                  >
                    <div style={{ fontWeight: '500', color: '#111827', marginBottom: '4px' }}>
                      {job.community} - Lot {job.lot_number} ({job.days_overdue} days overdue)
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Assigned to: {job.assigned_to || 'Unassigned'}</div>
                  </a>
                ))}
                {overdueServiceCalls.slice(0, 3).map((call: any) => (
                  <a
                    key={call.id}
                    href={`/service-calls/${call.id}`}
                    style={{
                      display: 'block',
                      padding: '12px',
                      backgroundColor: 'white',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      borderLeft: '3px solid #EF5350'
                    }}
                  >
                    <div style={{ fontWeight: '500', color: '#111827', marginBottom: '4px' }}>
                      {call.customer_name} ({call.days_overdue} days overdue)
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Assigned to: {call.assigned_to || 'Unassigned'}</div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Today's Focus */}
      {(todayJobs.length > 0 || todayServiceCalls.length > 0) && (
        <div style={{
          backgroundColor: 'rgba(96, 165, 250, 0.05)',
          border: '1px solid #60A5FA',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '32px'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#60A5FA',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>📅</span> Today's Focus
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {todayJobs.length > 0 && (
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--color-text-primary)' }}>
                  Jobs Scheduled Today ({todayJobs.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {todayJobs.map((job: any) => (
                    <a
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      style={{
                        display: 'block',
                        padding: '12px',
                        backgroundColor: 'white',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        borderLeft: '3px solid #60A5FA'
                      }}
                    >
                      <div style={{ fontWeight: '500', color: '#111827', marginBottom: '4px' }}>
                        {job.community} - Lot {job.lot_number}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {job.scheduled_start ? new Date(job.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No time set'}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
            {todayServiceCalls.length > 0 && (
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--color-text-primary)' }}>
                  Service Calls Scheduled Today ({todayServiceCalls.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {todayServiceCalls.map((call: any) => (
                    <a
                      key={call.id}
                      href={`/service-calls/${call.id}`}
                      style={{
                        display: 'block',
                        padding: '12px',
                        backgroundColor: 'white',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        borderLeft: '3px solid #60A5FA'
                      }}
                    >
                      <div style={{ fontWeight: '500', color: '#111827', marginBottom: '4px' }}>
                        {call.customer_name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {call.scheduled_start ? new Date(call.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No time set'}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* This Week */}
      {(thisWeekJobs.length > 0 || thisWeekServiceCalls.length > 0) && (
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '32px'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: 'var(--color-text-primary)',
            marginBottom: '20px'
          }}>
            This Week
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
            {thisWeekJobs.length > 0 && (
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
                  Upcoming Jobs ({thisWeekJobs.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {thisWeekJobs.map((job: any) => (
                    <a
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      style={{
                        display: 'block',
                        padding: '12px',
                        backgroundColor: 'var(--color-hover)',
                        borderRadius: '6px',
                        textDecoration: 'none'
                      }}
                    >
                      <div style={{ fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                        {job.community} - Lot {job.lot_number}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        {job.scheduled_start ? new Date(job.scheduled_start).toLocaleDateString() : 'No date set'}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
            {thisWeekServiceCalls.length > 0 && (
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
                  Upcoming Service Calls ({thisWeekServiceCalls.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {thisWeekServiceCalls.map((call: any) => (
                    <a
                      key={call.id}
                      href={`/service-calls/${call.id}`}
                      style={{
                        display: 'block',
                        padding: '12px',
                        backgroundColor: 'var(--color-hover)',
                        borderRadius: '6px',
                        textDecoration: 'none'
                      }}
                    >
                      <div style={{ fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                        {call.customer_name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        {call.scheduled_start ? new Date(call.scheduled_start).toLocaleDateString() : 'No date set'}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: isMobile ? '16px' : '24px'
      }}>
        {/* Recent Jobs */}
        <div style={{
          backgroundColor: 'var(--color-card)',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
          padding: '24px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: 'var(--color-text-primary)'
            }}>Recent Jobs</h2>
            <a href="/jobs" style={{
              fontSize: '14px',
              color: 'var(--color-primary)',
              textDecoration: 'none'
            }}>View All →</a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentJobs.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '32px',
                color: 'var(--color-text-secondary)'
              }}>No jobs found</div>
            ) : (
              recentJobs.map((job) => (
                <a
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  style={{
                    display: 'block',
                    padding: '16px',
                    backgroundColor: 'var(--color-hover)',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    textDecoration: 'none',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-hover)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <div style={{
                        fontWeight: '500',
                        color: 'var(--color-text-primary)',
                        marginBottom: '4px'
                      }}>{job.community} - Lot {job.lot_number}</div>
                      <div style={{
                        fontSize: '13px',
                        color: 'var(--color-text-secondary)'
                      }}>{job.address_line1}, {job.city}</div>
                    </div>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      ...getStatusStyle(job.status)
                    }}>
                      {job.status}
                    </span>
                  </div>
                </a>
              ))
            )}
          </div>
        </div>

        {/* Recent Service Calls */}
        <div style={{
          backgroundColor: 'var(--color-card)',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
          padding: '24px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: 'var(--color-text-primary)'
            }}>Recent Service Calls</h2>
            <a href="/service-calls" style={{
              fontSize: '14px',
              color: 'var(--color-primary)',
              textDecoration: 'none'
            }}>View All →</a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentCalls.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '32px',
                color: 'var(--color-text-secondary)'
              }}>No service calls found</div>
            ) : (
              recentCalls.map((call) => (
                <a
                  key={call.id}
                  href={`/service-calls/${call.id}`}
                  style={{
                    display: 'block',
                    padding: '16px',
                    backgroundColor: 'var(--color-hover)',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    textDecoration: 'none',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-hover)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontWeight: '500',
                        color: 'var(--color-text-primary)',
                        marginBottom: '4px'
                      }}>{call.customer_name}</div>
                      <div style={{
                        fontSize: '13px',
                        color: 'var(--color-text-secondary)'
                      }}>{call.issue_description?.substring(0, 50)}...</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '500',
                        ...getStatusStyle(call.status)
                      }}>
                        {call.status}
                      </span>
                      {call.priority === 'High' && (
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: 'rgba(244, 67, 54, 0.2)',
                          color: '#EF5350'
                        }}>
                          High Priority
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, color }: {
  title: string
  value: number
  color: string
}) {
  return (
    <div style={{
      backgroundColor: 'var(--color-card)',
      border: '1px solid var(--color-border)',
      borderRadius: '12px',
      padding: '24px',
      transition: 'all 0.2s',
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
      }}>{value}</div>
    </div>
  )
}

function getStatusStyle(status: string): React.CSSProperties {
  const statusStyles: Record<string, React.CSSProperties> = {
    'New': { backgroundColor: 'rgba(96, 165, 250, 0.15)', color: '#60A5FA' },
    'Scheduled': { backgroundColor: 'rgba(255, 152, 0, 0.15)', color: '#FFA726' },
    'In Progress': { backgroundColor: 'rgba(96, 165, 250, 0.2)', color: '#60A5FA' },
    'Dispatched': { backgroundColor: 'rgba(255, 152, 0, 0.15)', color: '#FFA726' },
    'Completed': { backgroundColor: 'rgba(76, 175, 80, 0.15)', color: '#66BB6A' },
    'On Hold': { backgroundColor: 'rgba(158, 158, 158, 0.15)', color: '#BDBDBD' },
  }
  return statusStyles[status] || { backgroundColor: 'rgba(158, 158, 158, 0.15)', color: '#BDBDBD' }
}
