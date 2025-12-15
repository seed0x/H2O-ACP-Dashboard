'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'

export default function ServiceCallDetail({ params }: { params: { id: string } }){
  const [sc, setSc] = useState<any>(null)
  const [notes, setNotes] = useState('')
  const [audit, setAudit] = useState<any[]>([])

  useEffect(()=>{
    async function load(){
      const token = localStorage.getItem('token')
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      const res = await axios.get(`/api/service-calls/${params.id}`)
      setSc(res.data)
      await loadAudit()
    }
    load()
  }, [])

  async function patch(){
    const token = localStorage.getItem('token')
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    await axios.patch(`/api/service-calls/${params.id}`, { notes })
    const res = await axios.get(`/api/service-calls/${params.id}`)
    setSc(res.data)
  }

  async function loadAudit(){
    const res = await axios.get('/api/audit', { params: { entity_type: 'service_call', entity_id: params.id } })
    setAudit(res.data)
  }

  if(!sc) return <div className="p-6">Loading...</div>

  return (
    <main className="p-6">
      <h1 className="text-xl font-bold">Service Call {sc.customer_name}</h1>
      <div className="mt-2">Issue: {sc.issue_description}</div>
      <div className="mt-2">Status: {sc.status}</div>
      <div className="mt-4">
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder={sc.notes || 'Notes'} className="border w-full p-2" />
        <button onClick={patch} className="mt-2 bg-blue-600 text-white px-3 py-1">Save</button>
      </div>
      <div className="mt-4">
        <h2 className="font-bold">Contact</h2>
        {sc.phone && <a href={`tel:${sc.phone}`} className="block text-blue-600">Call: {sc.phone}</a>}
        {sc.email && <a href={`mailto:${sc.email}`} className="block text-blue-600">Email: {sc.email}</a>}
        <a href={`https://www.google.com/maps/search/${encodeURIComponent(sc.address_line1 + ' ' + sc.city)}`} target="_blank" rel="noreferrer" className="block text-blue-600">Open in Google Maps</a>
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
