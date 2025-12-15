'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { API_URL } from '../../lib/config'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'

export default function JobsPage(){
  const [jobs, setJobs] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [community, setCommunity] = useState('')
  const [builderId, setBuilderId] = useState('')
  const [status, setStatus] = useState('')
  const [builders, setBuilders] = useState<any[]>([])

  useEffect(()=>{
    const token = localStorage.getItem('token')
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    async function load(){
      const b = await axios.get('/api/builders')
      setBuilders(b.data)
      const res = await axios.get('/api/jobs', { params: { tenant_id: 'all_county', search, community, builder_id: builderId || undefined, status: status || undefined } })
      setJobs(res.data)
    }
    load()
  }, [])

  async function searchNow(){
    const res = await axios.get('/api/jobs', { params: { tenant_id: 'all_county', search, community, builder_id: builderId || undefined, status: status || undefined } })
    setJobs(res.data)
  }

  async function create(){
    try{
      const tok = localStorage.getItem('token')
      axios.defaults.headers.common['Authorization'] = `Bearer ${tok}`
      const body = {
        tenant_id: 'all_county',
        builder_id: builderId || builders[0]?.id,
        community: community || 'Unknown',
        lot_number: Math.random().toString(36).slice(2,7),
        phase: 'rough',
        status: 'Pending',
        address_line1: 'temp address',
        city: 'City',
        zip: '98000'
      }
      await axios.post('/api/jobs', body)
      await searchNow()
    } catch (err: any){
      alert(err?.response?.data?.detail || 'Failed to create')
    }
  }

  return (
    <main className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All County Jobs</h1>
          <p className="text-gray-600 mt-1">Manage new construction projects</p>
        </div>
        <Button onClick={create}>+ New Job</Button>
      </div>
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Input placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} />
          <Input placeholder="Community" value={community} onChange={e=>setCommunity(e.target.value)} />
          <Select
            options={[
              { value: '', label: 'All Builders' },
              ...builders.map(b => ({ value: b.id, label: b.name }))
            ]}
            value={builderId}
            onChange={e=>setBuilderId(e.target.value)}
          />
          <Select
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'Pending', label: 'Pending' },
              { value: 'Scheduled', label: 'Scheduled' },
              { value: 'In Progress', label: 'In Progress' },
              { value: 'Completed', label: 'Completed' },
              { value: 'Hold', label: 'Hold' }
            ]}
            value={status}
            onChange={e=>setStatus(e.target.value)}
          />
          <Button onClick={searchNow} variant="secondary">Search</Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow divide-y">
        {jobs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No jobs found. Create your first job to get started.</div>
        ) : (
          jobs.map(j => (
            <div key={j.id} className="p-4 hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/jobs/${j.id}`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{j.community} - Lot {j.lot_number}</div>
                  <div className="text-sm text-gray-600 mt-1">{j.address_line1}, {j.city}</div>
                  <div className="text-sm text-gray-500 mt-1">Phase: {j.phase}</div>
                </div>
                <Badge variant={j.status === 'Completed' ? 'success' : j.status === 'In Progress' ? 'warning' : 'default'}>
                  {j.status}
                </Badge>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  )
}
