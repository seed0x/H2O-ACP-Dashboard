'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'

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
    <main className="p-6">
      <h1 className="text-xl font-bold">Service Calls (H2O)</h1>
      <div className="flex gap-2 mt-4 mb-4">
        <input placeholder="search" value={search} onChange={e=>setSearch(e.target.value)} className="border p-1" />
        <select value={builderId} onChange={e=>setBuilderId(e.target.value)} className="border p-1">
          <option value="">Any builder</option>
          {builders.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={status} onChange={e=>setStatus(e.target.value)} className="border p-1">
          <option value="">Any status</option>
          <option value="New">New</option>
          <option value="Scheduled">Scheduled</option>
          <option value="Dispatched">Dispatched</option>
          <option value="Completed">Completed</option>
          <option value="On Hold">On Hold</option>
        </select>
        <button onClick={searchNow} className="btn bg-gray-200 px-3">Search</button>
        <button onClick={create} className="btn bg-blue-600 text-white px-3">Create</button>
      </div>

      <ul>
        {scs.map(s => (
          <li key={s.id} className="border rounded p-2 mb-2">
            <a href={`/service-calls/${s.id}`} className="block">
              <div className="font-bold">{s.customer_name}</div>
              <div className="text-sm text-gray-600">{s.address_line1}, {s.city}</div>
              <div className="text-sm mt-1">Status: {s.status}</div>
            </a>
          </li>
        ))}
      </ul>
    </main>
  )
}
