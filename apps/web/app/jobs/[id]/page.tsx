'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../../../lib/config'

export default function JobDetail({ params }: { params: Promise<{ id: string }> | { id: string } }){
  const [job, setJob] = useState<any>(null)
  const [notes, setNotes] = useState('')
  const [audit, setAudit] = useState<any[]>([])
  const [id, setId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [saving, setSaving] = useState(false)

  useEffect(()=>{
    async function getParams(){
      const resolvedParams = params instanceof Promise ? await params : params
      setId(resolvedParams.id)
    }
    getParams()
  }, [params])

  function getAuthHeaders() {
    const token = localStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }

  useEffect(()=>{
    if (!id) return
    async function load(){
      try {
        setLoading(true)
        setError('')
        const headers = getAuthHeaders()
        const res = await axios.get(`${API_BASE_URL}/jobs/${id}`, { headers, withCredentials: true })
        setJob(res.data)
        setNotes(res.data.notes || '')
        await loadAudit()
      } catch (err: any) {
        console.error('Failed to load job:', err)
        setError(err.response?.data?.detail || 'Failed to load job')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function patch(){
    if (!id) return
    try {
      setSaving(true)
      setError('')
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Not authenticated. Please log in again.')
      }
      const headers = { 'Authorization': `Bearer ${token}` }
      await axios.patch(`${API_BASE_URL}/jobs/${id}`, { notes }, { headers, withCredentials: true })
      const res = await axios.get(`${API_BASE_URL}/jobs/${id}`, { headers, withCredentials: true })
      setJob(res.data)
    } catch (err: any) {
      console.error('Failed to save job:', err)
      setError(err.response?.data?.detail || err.message || 'Failed to save job')
    } finally {
      setSaving(false)
    }
  }

  async function loadAudit(){
    if (!id) return
    try {
      const headers = getAuthHeaders()
      const res = await axios.get(`${API_BASE_URL}/audit`, { 
        headers,
        params: { entity_type: 'job', entity_id: id }, 
        withCredentials: true 
      })
      setAudit(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error('Failed to load audit:', err)
      setAudit([])
    }
  }

  if(loading) return <div style={{ padding: '32px', color: 'var(--color-text-secondary)' }}>Loading...</div>
  if(error && !job) return <div style={{ padding: '32px', color: '#EF5350' }}>Error: {error}</div>
  if(!job) return <div style={{ padding: '32px', color: 'var(--color-text-secondary)' }}>Job not found</div>

  return (
    <main className="p-6">
      <h1 className="text-xl font-bold">Job {job.community} Lot {job.lot_number}</h1>
      <div className="mt-2">Phase: {job.phase}</div>
      <div className="mt-2">Status: {job.status}</div>
      <div className="mt-4">
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder={job.notes || 'Notes'} className="border w-full p-2" />
        <button 
          onClick={patch} 
          disabled={saving}
          style={{
            marginTop: '8px',
            padding: '8px 16px',
            backgroundColor: saving ? 'var(--color-hover)' : 'var(--color-primary)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1
          }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: 'rgba(239, 83, 80, 0.1)',
          border: '1px solid #EF5350',
          borderRadius: '8px',
          color: '#EF5350',
          marginTop: '16px',
          marginBottom: '16px'
        }}>
          {error}
        </div>
      )}
      <div className="mt-4">
        <h2 className="font-bold">Audit</h2>
        {Array.isArray(audit) && audit.length > 0 ? (
          <ul>
            {audit.map(a=> <li key={a.id} className="text-sm text-gray-700">{a.changed_at} {a.action} {a.field || ''}</li>)}
          </ul>
        ) : (
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>No audit history</div>
        )}
      </div>
    </main>
  )
}
