'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../lib/config'

export default function BidsPage(){
  const [bids, setBids] = useState<any[]>([])
  const [tenant, setTenant] = useState('all_county')
  const [search, setSearch] = useState('')
  const [builderId, setBuilderId] = useState('')
  const [status, setStatus] = useState('')
  const [builders, setBuilders] = useState<any[]>([])

  useEffect(()=>{
    const token = localStorage.getItem('token')
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    async function load(){
      const b = await axios.get(`${API_BASE_URL}/builders`, { withCredentials: true })
      setBuilders(b.data)
      const res = await axios.get(`${API_BASE_URL}/bids`, { params: { tenant_id: tenant, search, builder_id: builderId || undefined, status: status || undefined }, withCredentials: true })
      setBids(res.data)
    }
    load()
  }, [])

  async function searchNow(){
    const res = await axios.get(`${API_BASE_URL}/bids`, { params: { tenant_id: tenant, search, builder_id: builderId || undefined, status: status || undefined }, withCredentials: true })
    setBids(res.data)
  }

  async function create(){
    try{
      const tok = localStorage.getItem('token')
      axios.defaults.headers.common['Authorization'] = `Bearer ${tok}`
      const body = {
        tenant_id: tenant,
        project_name: 'Project ' + Math.random().toString(36).slice(2,6),
        status: 'Draft',
        builder_id: builderId || builders[0]?.id
      }
      await axios.post(`${API_BASE_URL}/bids`, body, { withCredentials: true })
      await searchNow()
    } catch (err: any){
      alert(err?.response?.data?.detail || 'Failed to create')
    }
  }

  return (
    <main className="p-6">
      <h1 className="text-xl font-bold">Bids</h1>
      <div className="flex gap-2 mt-4 mb-4">
        <select value={tenant} onChange={e=>setTenant(e.target.value)} className="border p-1">
          <option value="all_county">All County</option>
          <option value="h2o">H2O</option>
        </select>
        <input placeholder="search" value={search} onChange={e=>setSearch(e.target.value)} className="border p-1" />
        <select value={builderId} onChange={e=>setBuilderId(e.target.value)} className="border p-1">
          <option value="">Any builder</option>
          {builders.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={status} onChange={e=>setStatus(e.target.value)} className="border p-1">
          <option value="">Any status</option>
          <option value="Draft">Draft</option>
          <option value="Sent">Sent</option>
          <option value="Won">Won</option>
          <option value="Lost">Lost</option>
        </select>
        <button onClick={searchNow} className="btn bg-gray-200 px-3">Search</button>
        <button onClick={create} className="btn bg-blue-600 text-white px-3">Create</button>
      </div>

      <ul>
        {bids.map(b => (
          <li key={b.id} className="border rounded p-2 mb-2">
            <a href={`/bids/${b.id}`} className="block">
              <div className="font-bold">{b.project_name}</div>
              <div className="text-sm text-gray-600">Status: {b.status}</div>
              <div className="text-sm text-gray-600">Tenant: {b.tenant_id}</div>
            </a>
          </li>
        ))}
      </ul>
    </main>
  )
}
