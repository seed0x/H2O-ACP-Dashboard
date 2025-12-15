'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { API_URL } from '../lib/config'

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
        axios.get(`${API_URL}/jobs?tenant_id=all_county`, { withCredentials: true }),
        axios.get(`${API_URL}/service-calls?tenant_id=h2o`, { withCredentials: true }),
        axios.get(`${API_URL}/builders`, { withCredentials: true })
      ])

      const activeJobs = jobs.data.filter((j: any) => j.status !== 'Completed').length
      const pendingCalls = serviceCalls.data.filter((c: any) => c.status === 'New' || c.status === 'Scheduled').length
      
      setStats({
        activeJobs,
        pendingServiceCalls: pendingCalls,
        totalBuilders: builders.data.length,
        completedThisWeek: 0 // TODO: calculate based on completion_date
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
      <div className="flex items-center justify-center h-screen">
        <div className="text-dark-muted">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-dark-text">Operations Dashboard</h1>
        <p className="text-dark-muted mt-1">H2O Plumbing & All County Construction</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Active Jobs"
          value={stats.activeJobs}
          icon="🏗️"
          change="+12%"
          color="blue"
        />
        <StatCard
          title="Pending Service Calls"
          value={stats.pendingServiceCalls}
          icon="🔧"
          change="+5%"
          color="yellow"
        />
        <StatCard
          title="Total Builders"
          value={stats.totalBuilders}
          icon="👷"
          change="+2"
          color="green"
        />
        <StatCard
          title="Completed This Week"
          value={stats.completedThisWeek}
          icon="✅"
          change="+8"
          color="purple"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Jobs */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-dark-text">Recent Jobs</h2>
            <a href="/jobs" className="text-sm text-primary hover:text-primary-hover">View All →</a>
          </div>
          <div className="space-y-3">
            {recentJobs.length === 0 ? (
              <div className="text-center py-8 text-dark-muted">No jobs found</div>
            ) : (
              recentJobs.map((job) => (
                <a
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="block p-4 bg-dark-panel hover:bg-dark-hover rounded-lg border border-dark-border transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-dark-text">{job.community} - Lot {job.lot_number}</div>
                      <div className="text-sm text-dark-muted mt-1">{job.address_line1}, {job.city}</div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                  </div>
                </a>
              ))
            )}
          </div>
        </div>

        {/* Recent Service Calls */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-dark-text">Recent Service Calls</h2>
            <a href="/service-calls" className="text-sm text-primary hover:text-primary-hover">View All →</a>
          </div>
          <div className="space-y-3">
            {recentCalls.length === 0 ? (
              <div className="text-center py-8 text-dark-muted">No service calls found</div>
            ) : (
              recentCalls.map((call) => (
                <a
                  key={call.id}
                  href={`/service-calls/${call.id}`}
                  className="block p-4 bg-dark-panel hover:bg-dark-hover rounded-lg border border-dark-border transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-dark-text">{call.customer_name}</div>
                      <div className="text-sm text-dark-muted mt-1">{call.issue_description?.substring(0, 50)}...</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-1 text-xs rounded ${getStatusColor(call.status)}`}>
                        {call.status}
                      </span>
                      {call.priority === 'High' && (
                        <span className="px-2 py-1 text-xs rounded bg-red-500/20 text-red-400">
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

interface StatCardProps {
  title: string
  value: number
  icon: string
  change: string
  color: 'blue' | 'yellow' | 'green' | 'purple'
}

function StatCard({ title, value, icon, change, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
    green: 'bg-green-500/10 text-green-400',
    purple: 'bg-purple-500/10 text-purple-400',
  }

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg p-6 hover:border-dark-hover transition-colors">
      <div className="flex items-center justify-between mb-4">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs text-dark-muted">{change}</span>
      </div>
      <div className="text-3xl font-bold text-dark-text mb-1">{value}</div>
      <div className="text-sm text-dark-muted">{title}</div>
    </div>
  )
}

function getStatusColor(status: string): string {
  const statusMap: Record<string, string> = {
    'New': 'bg-blue-500/20 text-blue-400',
    'Scheduled': 'bg-yellow-500/20 text-yellow-400',
    'In Progress': 'bg-purple-500/20 text-purple-400',
    'Dispatched': 'bg-orange-500/20 text-orange-400',
    'Completed': 'bg-green-500/20 text-green-400',
    'On Hold': 'bg-gray-500/20 text-gray-400',
  }
  return statusMap[status] || 'bg-gray-500/20 text-gray-400'
}
