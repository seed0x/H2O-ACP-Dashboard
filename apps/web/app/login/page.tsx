'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { API_BASE_URL } from '../../lib/config'

// Helper function to check if user is a tech user and get redirect path
function getRedirectPath(token: string): string {
  try {
    const parts = token.split('.')
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]))
      const username = payload.username || null
      // Tech users (max) go to tech schedule
      if (username === 'max') {
        return '/tech-schedule'
      }
    }
  } catch (error) {
    // Non-critical error - just return default path
    if (error instanceof Error) {
      // Silently fail for token parsing errors
    }
  }
  return '/'
}

export default function Login() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      router.push(getRedirectPath(token))
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
        // Redirect tech users to tech schedule, others to dashboard
        const redirectPath = getRedirectPath(res.data.access_token)
        window.location.href = redirectPath
      } else {
        // Fallback redirect
        window.location.href = '/'
      }
    } catch (err: unknown) {
      logError(err, 'login')
      if (err && typeof err === 'object' && 'response' in err) {
        // API responded with error
        setError(err.response?.data?.detail || err.response?.data?.message || `Login failed: ${err.response.status}`)
      } else if (err.request) {
        // Request made but no response (network error)
        setError(`Cannot connect to API server. Please check your connection.`)
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
            <div style={{ marginBottom: '20px', position: 'relative' }}>
              <input 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="Password" 
                type={showPassword ? 'text' : 'password'}
                required
                style={{
                  width: '100%',
                  padding: '12px 40px 12px 16px',
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
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
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
