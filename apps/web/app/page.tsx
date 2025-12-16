'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../lib/config'

export default function Dashboard() {
  const [stats, setStats] = useState({
    activeJobs: 0,
    pendingServiceCalls: 0,
    totalBuilders: 0,
    completedThisWeek: 0
  })
  const [recentJobs, setRecentJobs] = useState<any[]>([])
  const [recentCalls, setRecentCalls] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      const [jobs, serviceCalls, builders] = await Promise.all([
        axios.get(`${API_BASE_URL}/jobs?tenant_id=all_county`, { withCredentials: true }),
        axios.get(`${API_BASE_URL}/service-calls?tenant_id=h2o`, { withCredentials: true }),
        axios.get(`${API_BASE_URL}/builders`, { withCredentials: true })
      ])

      const activeJobs = jobs.data.filter((j: any) => j.status !== 'Completed').length
      const pendingCalls = serviceCalls.data.filter((c: any) => c.status === 'New' || c.status === 'Scheduled').length
      
      setStats({
        activeJobs,
        pendingServiceCalls: pendingCalls,
        totalBuilders: builders.data.length,
        completedThisWeek: 0
      })

      setRecentJobs(jobs.data.slice(0, 5))
      setRecentCalls(serviceCalls.data.slice(0, 5))
      setLoading(false)
    } catch (err) {
      console.error('Failed to load dashboard', err)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ color: 'var(--color-text-secondary)' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px' }}>
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
          color="#7C5CFC"
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

      {/* Content Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '24px'
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
    'New': { backgroundColor: 'rgba(33, 150, 243, 0.2)', color: '#42A5F5' },
    'Scheduled': { backgroundColor: 'rgba(255, 152, 0, 0.2)', color: '#FFA726' },
    'In Progress': { backgroundColor: 'rgba(124, 92, 252, 0.2)', color: '#9B7FFF' },
    'Dispatched': { backgroundColor: 'rgba(255, 152, 0, 0.2)', color: '#FFA726' },
    'Completed': { backgroundColor: 'rgba(76, 175, 80, 0.2)', color: '#66BB6A' },
    'On Hold': { backgroundColor: 'rgba(158, 158, 158, 0.2)', color: '#BDBDBD' },
  }
  return statusStyles[status] || { backgroundColor: 'rgba(158, 158, 158, 0.2)', color: '#BDBDBD' }
}
