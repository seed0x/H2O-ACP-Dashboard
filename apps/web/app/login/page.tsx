'use client'
import { useState } from 'react'
import axios from 'axios'
import { API_URL } from '../../lib/config'

export default function Login() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      const res = await axios.post(`${API_URL}/login`, 
        { password },
        { withCredentials: true }
      )
      
      // Redirect on success (cookie is automatically set by server)
      window.location.href = '/'
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="p-8">
      <form onSubmit={submit} className="max-w-md">
        <h1 className="text-xl font-bold">Login</h1>
        <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" className="border p-2 mt-4 w-full" required />
        {error && <div className="text-red-600 mt-2">{error}</div>}
        <button disabled={loading} className="bg-blue-600 text-white px-4 py-2 mt-2 disabled:opacity-50">
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </main>
  )
}
