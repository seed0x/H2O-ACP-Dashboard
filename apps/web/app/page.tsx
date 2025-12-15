'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { API_URL } from '../lib/config'
import { Badge } from '../components/ui/Badge'

export default function Dashboard() {
  const [tasks, setTasks] = useState({ serviceCalls: [], jobs: [], loading: true })

  useEffect(() => {
    loadTasks()
  }, [])

  async function loadTasks() {
    try {
      const [serviceCalls, jobs] = await Promise.all([
        axios.get(`${API_URL}/service-calls?tenant_id=h2o&status=Open`, { withCredentials: true }),
        axios.get(`${API_URL}/jobs?tenant_id=all_county&status=In Progress`, { withCredentials: true })
      ])
      setTasks({ 
        serviceCalls: serviceCalls.data, 
        jobs: jobs.data, 
        loading: false 
      })
    } catch (err) {
      console.error('Failed to load tasks', err)
      setTasks({ serviceCalls: [], jobs: [], loading: false })
    }
  }

  if (tasks.loading) {
    return <main className="p-8"><div className="text-gray-600">Loading...</div></main>
  }

  const totalTasks = tasks.serviceCalls.length + tasks.jobs.length

  return (
    <main className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Operations Dashboard</h1>
        <p className="text-gray-600 mt-2">H2O Plumbing & All County Construction</p>
      </div>

      {/* Task Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-600">Current Tasks</div>
              <div className="text-3xl font-bold text-gray-900 mt-2">{totalTasks}</div>
            </div>
            <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-600">H2O Service Calls</div>
              <div className="text-3xl font-bold text-blue-600 mt-2">{tasks.serviceCalls.length}</div>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-600">All County Jobs</div>
              <div className="text-3xl font-bold text-green-600 mt-2">{tasks.jobs.length}</div>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* H2O Service Calls */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">H2O Service Calls (Open)</h2>
          <a href="/service-calls" className="text-blue-600 hover:text-blue-700 text-sm font-medium">View All →</a>
        </div>
        {tasks.serviceCalls.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
            No open service calls
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasks.serviceCalls.map((call: any) => (
                  <tr key={call.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/service-calls/${call.id}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{call.customer_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{call.address_line1}, {call.city}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{call.issue_description.substring(0, 50)}...</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={call.priority === 'High' ? 'danger' : call.priority === 'Normal' ? 'warning' : 'default'}>
                        {call.priority}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(call.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* All County Jobs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">All County Jobs (In Progress)</h2>
          <a href="/jobs" className="text-green-600 hover:text-green-700 text-sm font-medium">View All →</a>
        </div>
        {tasks.jobs.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
            No jobs in progress
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Community</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lot</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phase</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scheduled</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasks.jobs.map((job: any) => (
                  <tr key={job.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/jobs/${job.id}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{job.community}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{job.lot_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{job.phase}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{job.address_line1}, {job.city}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {job.scheduled_start ? new Date(job.scheduled_start).toLocaleDateString() : 'Not scheduled'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
