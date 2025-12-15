'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'

export default function Builders() {
  const [builders, setBuilders] = useState([])
  const [name, setName] = useState('')

  useEffect(()=>{
    async function load(){
      const token = localStorage.getItem('token')
      const res = await axios.get('/api/builders', { headers: { Authorization: `Bearer ${token}` } })
      setBuilders(res.data)
    }
    load()
  }, [])

  async function create(){
    const token = localStorage.getItem('token')
    await axios.post('/api/builders', { name }, { headers: { Authorization: `Bearer ${token}` } })
    const res = await axios.get('/api/builders', { headers: { Authorization: `Bearer ${token}` } })
    setBuilders(res.data)
  }

  return (
    <main className="p-6">
      <h1 className="text-xl font-bold mb-4">Builders</h1>
      <div className="mb-4">
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="New builder name" className="border p-2 mr-2" />
        <button onClick={create} className="bg-blue-600 text-white px-3 py-1">Create</button>
      </div>

      <ul>
        {builders.map((b: any) => (
          <li key={b.id} className="border rounded p-2 mb-2">
            <div className="font-bold">{b.name}</div>
            <div className="text-sm text-gray-600">{b.notes}</div>
          </li>
        ))}
      </ul>
    </main>
  )
}
