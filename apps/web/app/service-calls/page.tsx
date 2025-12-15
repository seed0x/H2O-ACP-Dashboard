'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { API_URL } from '../../lib/config'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'

export default function ServiceCallsPage(){
  const [scs, setScs] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [builderId, setBuilderId] = useState('')
  const [status, setStatus] = useState('')
  const [builders, setBuilders] = useState<any[]>([])

  useEffect(()=>{
    const token = localStorage.getItem('token')
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    async function load(){
      const b = await axios.get('/api/builders')
      setBuilders(b.data)
      const res = await axios.get('/api/service-calls', { params: { tenant_id: 'h2o', search, builder_id: builderId || undefined, status: status || undefined } })
      setScs(res.data)
    }
    load()
  }, [])

  async function searchNow(){
    const res = await axios.get('/api/service-calls', { params: { tenant_id: 'h2o', search, builder_id: builderId || undefined, status: status || undefined } })
    setScs(res.data)
  }

  async function create(){
    try{
      const tok = localStorage.getItem('token')
      axios.defaults.headers.common['Authorization'] = `Bearer ${tok}`
      const body = {
        tenant_id: 'h2o',
        builder_id: builderId || builders[0]?.id,
        customer_name: 'Customer ' + Math.random().toString(36).slice(2,6),
        address_line1: 'temp address',
        city: 'City',
        zip: '98000',
        issue_description: 'No hot water',
        status: 'New'
      }
      await axios.post('/api/service-calls', body)
      await searchNow()
    } catch (err: any){
      alert(err?.response?.data?.detail || 'Failed to create')
    }
  }

  return (
    <main className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">H2O Service Calls</h1>
          <p className="text-gray-600 mt-1">Manage service and warranty calls</p>
        </div>
        <Button onClick={create}>+ New Service Call</Button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} />
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
              { value: 'New', label: 'New' },
              { value: 'Scheduled', label: 'Scheduled' },
              { value: 'Dispatched', label: 'Dispatched' },
              { value: 'Completed', label: 'Completed' },
              { value: 'On Hold', label: 'On Hold' }
            ]}
            value={status}
            onChange={e=>setStatus(e.target.value)}
          />
          <Button onClick={searchNow} variant="secondary">Search</Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow divide-y">
        {scs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No service calls found. Create your first service call to get started.</div>
        ) : (
          scs.map(s => (
            <div key={s.id} className="p-4 hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/service-calls/${s.id}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="font-semibold text-gray-900">{s.customer_name}</div>
                    {s.priority === 'High' && (
                      <Badge variant="danger">High Priority</Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{s.address_line1}, {s.city}</div>
                  <div className="text-sm text-gray-500 mt-1">{s.issue_description}</div>
                  {s.phone && (
                    <div className="text-sm text-gray-500 mt-1">📞 {s.phone}</div>
                  )}
                </div>
                <Badge variant={s.status === 'Completed' ? 'success' : s.status === 'Dispatched' ? 'warning' : s.status === 'New' ? 'danger' : 'default'}>
                  {s.status}
                </Badge>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  )
}
