'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'

export default function BidDetail({ params }: { params: { id: string } }){
  const [bid, setBid] = useState<any>(null)
  const [notes, setNotes] = useState('')
  const [audit, setAudit] = useState<any[]>([])

  useEffect(()=>{
    async function load(){
      const token = localStorage.getItem('token')
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      const res = await axios.get(`/api/bids/${params.id}`)
      setBid(res.data)
      await loadAudit()
    }
    load()
  }, [])

  async function patch(){
    const token = localStorage.getItem('token')
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    await axios.patch(`/api/bids/${params.id}`, { notes })
    const res = await axios.get(`/api/bids/${params.id}`)
    setBid(res.data)
  }

  async function loadAudit(){
    const res = await axios.get('/api/audit', { params: { entity_type: 'bid', entity_id: params.id } })
    setAudit(res.data)
  }

  if(!bid) return <div className="p-6">Loading...</div>

  return (
    <main className="p-6">
      <h1 className="text-xl font-bold">Bid {bid.project_name}</h1>
      <div className="mt-2">Status: {bid.status}</div>
      <div className="mt-4">
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder={bid.notes || 'Notes'} className="border w-full p-2" />
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
