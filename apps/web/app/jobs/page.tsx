'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'

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
    <main className="p-6">
      <h1 className="text-xl font-bold">Jobs (All County)</h1>
      <div className="flex gap-2 mt-4 mb-4">
        <input placeholder="search" value={search} onChange={e=>setSearch(e.target.value)} className="border p-1" />
        <input placeholder="community" value={community} onChange={e=>setCommunity(e.target.value)} className="border p-1" />
        <select value={builderId} onChange={e=>setBuilderId(e.target.value)} className="border p-1">
          <option value="">Any builder</option>
          {builders.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={status} onChange={e=>setStatus(e.target.value)} className="border p-1">
          <option value="">Any status</option>
          <option value="Pending">Pending</option>
          <option value="Scheduled">Scheduled</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Hold">Hold</option>
        </select>
        <button onClick={searchNow} className="btn bg-gray-200 px-3">Search</button>
        <button onClick={create} className="btn bg-blue-600 text-white px-3">Create</button>
      </div>

      <ul>
        {jobs.map(j => (
          <li key={j.id} className="border rounded p-2 mb-2">
            <a href={`/jobs/${j.id}`} className="block">
              <div className="font-bold">{j.community} - Lot {j.lot_number} ({j.phase})</div>
              <div className="text-sm text-gray-600">{j.address_line1}, {j.city}</div>
              <div className="text-sm mt-1">Status: {j.status}</div>
            </a>
          </li>
        ))}
      </ul>
    </main>
  )
}
