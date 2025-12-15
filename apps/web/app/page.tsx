'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { API_URL } from '../lib/config'

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
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Current Tasks</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">{totalTasks}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">H2O Service Calls</div>
          <div className="text-3xl font-bold text-blue-600 mt-2">{tasks.serviceCalls.length}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">All County Jobs</div>
          <div className="text-3xl font-bold text-green-600 mt-2">{tasks.jobs.length}</div>
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
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        call.priority === 'High' ? 'bg-red-100 text-red-800' :
                        call.priority === 'Normal' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>{call.priority}</span>
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
