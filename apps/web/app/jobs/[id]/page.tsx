'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../../lib/config'

export default function JobDetail({ params }: { params: { id: string } }){
  const [job, setJob] = useState<any>(null)
  const [notes, setNotes] = useState('')
  const [audit, setAudit] = useState<any[]>([])

  useEffect(()=>{
    async function load(){
      const token = localStorage.getItem('token')
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      const res = await axios.get(`${API_BASE_URL}/jobs/${params.id}`, { withCredentials: true })
      setJob(res.data)
      await loadAudit()
    }
    load()
  }, [])

  async function patch(){
    const token = localStorage.getItem('token')
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    await axios.patch(`${API_BASE_URL}/jobs/${params.id}`, { notes }, { withCredentials: true })
    const res = await axios.get(`${API_BASE_URL}/jobs/${params.id}`, { withCredentials: true })
    setJob(res.data)
  }

  async function loadAudit(){
    const res = await axios.get(`${API_BASE_URL}/audit`, { params: { entity_type: 'job', entity_id: params.id }, withCredentials: true })
    setAudit(res.data)
  }

  if(!job) return <div className="p-6">Loading...</div>

  return (
    <main className="p-6">
      <h1 className="text-xl font-bold">Job {job.community} Lot {job.lot_number}</h1>
      <div className="mt-2">Phase: {job.phase}</div>
      <div className="mt-2">Status: {job.status}</div>
      <div className="mt-4">
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder={job.notes || 'Notes'} className="border w-full p-2" />
        <button onClick={patch} className="mt-2 bg-blue-600 text-white px-3 py-1">Save</button>
      </div>
      <div className="mt-4">
        <h2 className="font-bold">Audit</h2>
        <ul>
          {audit.map(a=> <li key={a.id} className="text-sm text-gray-700">{a.changed_at} {a.action} {a.field || ''}</li>)}
        </ul>
      </div>
    </main>
  )
}
