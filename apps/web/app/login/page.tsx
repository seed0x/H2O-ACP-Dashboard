'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { API_BASE_URL } from '../../lib/config'

export default function Login() {
  const router = useRouter()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      router.push('/')
    }
  }, [router])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      const res = await axios.post(`${API_BASE_URL}/login`, 
        { username, password },
        { withCredentials: true }
      )
      
      // Store token in localStorage for Authorization headers
      if (res.data.access_token) {
        localStorage.setItem('token', res.data.access_token)
      }
      
      // Redirect on success (cookie is automatically set by server)
      window.location.href = '/'
    } catch (err: any) {
      console.error('Login error:', err)
      if (err.response) {
        // API responded with error
        setError(err.response?.data?.detail || err.response?.data?.message || `Login failed: ${err.response.status}`)
      } else if (err.request) {
        // Request made but no response (network error)
        setError('Cannot connect to API. Is the API server running on http://localhost:8000?')
      } else {
        // Something else
        setError(err.message || 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: 'var(--color-bg)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '32px'
      }}>
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '16px',
          padding: '32px'
        }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: 'var(--color-text-primary)',
            marginBottom: '8px'
          }}>Login</h1>
          <p style={{
            fontSize: '14px',
            color: 'var(--color-text-secondary)',
            marginBottom: '24px'
          }}>Sign in to your account</p>
          
          <form onSubmit={submit}>
            <div style={{ marginBottom: '16px' }}>
              <input 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                placeholder="Username" 
                type="text" 
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: 'var(--color-hover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(96, 165, 250, 0.1)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <input 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="Password" 
                type="password" 
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: 'var(--color-hover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(96, 165, 250, 0.1)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
            </div>
            {error && (
              <div style={{
                padding: '12px',
                backgroundColor: 'rgba(239, 83, 80, 0.1)',
                border: '1px solid #EF5350',
                borderRadius: '8px',
                color: '#EF5350',
                fontSize: '14px',
                marginBottom: '16px'
              }}>
                {error}
              </div>
            )}
            <button 
              disabled={loading} 
              type="submit"
              style={{
                width: '100%',
                padding: '12px 24px',
                backgroundColor: loading ? 'var(--color-hover)' : 'var(--color-primary)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary)'
                }
              }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
