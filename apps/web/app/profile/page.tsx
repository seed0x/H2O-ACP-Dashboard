'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { API_BASE_URL } from '../../lib/config'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { showToast } from '../../components/Toast'
import { handleApiError, logError } from '../../lib/error-handler'
import { useMobile } from '../../lib/useMobile'

interface User {
  id: string
  username: string
  email: string | null
  full_name: string | null
  role: string
  is_active: boolean
  tenant_id: string | null
  created_at: string
  updated_at: string
  last_login: string | null
}

export default function ProfilePage() {
  const router = useRouter()
  const isMobile = useMobile()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  })

  useEffect(() => {
    // Get user ID from token
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const parts = token.split('.')
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]))
          setUserId(payload.user_id)
        }
      } catch (error) {
        console.error('Failed to parse token:', error)
      }
    }
  }, [])

  useEffect(() => {
    if (userId) {
      loadUser()
    }
  }, [userId])

  function getAuthHeaders() {
    const token = localStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }

  async function loadUser() {
    if (!userId) return
    try {
      setLoading(true)
      const headers = getAuthHeaders()
      const response = await axios.get(`${API_BASE_URL}/users/${userId}`, {
        headers,
        withCredentials: true
      })
      const userData = response.data
      setUser(userData)
      setFormData({
        email: userData.email || '',
        full_name: userData.full_name || '',
        current_password: '',
        new_password: '',
        confirm_password: ''
      })
    } catch (err: any) {
      logError(err, 'loadUser')
      if (err.response?.status === 403) {
        showToast('Not authorized to view this profile', 'error')
        router.push('/')
      } else {
        showToast(handleApiError(err), 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const token = localStorage.getItem('token')
      if (!token || !userId) {
        throw new Error('Not authenticated')
      }
      const headers = { 'Authorization': `Bearer ${token}` }

      const updateData: any = {
        email: formData.email || null,
        full_name: formData.full_name || null
      }

      await axios.patch(`${API_BASE_URL}/users/${userId}`, updateData, {
        headers,
        withCredentials: true
      })
      showToast('Profile updated successfully', 'success')
      await loadUser()
    } catch (err: any) {
      logError(err, 'handleUpdateProfile')
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to update profile'
      setError(errorMsg)
      showToast(errorMsg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!formData.current_password) {
      setError('Current password is required')
      return
    }

    if (!formData.new_password) {
      setError('New password is required')
      return
    }

    if (formData.new_password !== formData.confirm_password) {
      setError('New passwords do not match')
      return
    }

    if (formData.new_password.length < 8) {
      setError('New password must be at least 8 characters')
      return
    }

    setSubmitting(true)

    try {
      const token = localStorage.getItem('token')
      if (!token || !userId) {
        throw new Error('Not authenticated')
      }
      const headers = { 'Authorization': `Bearer ${token}` }

      // Verify current password by attempting login
      try {
        await axios.post(`${API_BASE_URL}/login`, {
          username: user?.username,
          password: formData.current_password
        }, { withCredentials: true })
      } catch (loginErr: any) {
        if (loginErr.response?.status === 401) {
          setError('Current password is incorrect')
          setSubmitting(false)
          return
        }
        throw loginErr
      }

      // Update password
      await axios.patch(`${API_BASE_URL}/users/${userId}`, {
        password: formData.new_password
      }, {
        headers,
        withCredentials: true
      })

      showToast('Password changed successfully', 'success')
      setFormData({
        ...formData,
        current_password: '',
        new_password: '',
        confirm_password: ''
      })
    } catch (err: any) {
      logError(err, 'handleChangePassword')
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to change password'
      setError(errorMsg)
      showToast(errorMsg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLogout() {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        const headers = { 'Authorization': `Bearer ${token}` }
        await axios.post(`${API_BASE_URL}/logout`, {}, {
          headers,
          withCredentials: true
        })
      }
    } catch (err) {
      // Ignore logout errors
      console.error('Logout error:', err)
    } finally {
      // Clear local storage
      localStorage.removeItem('token')
      // Redirect to login
      window.location.href = '/login'
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ color: 'var(--color-text-secondary)' }}>Loading profile...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ padding: '32px' }}>
        <div style={{ color: '#EF5350', marginBottom: '16px' }}>User not found</div>
        <Button onClick={() => router.push('/')}>Back to Dashboard</Button>
      </div>
    )
  }

  return (
    <div style={{ padding: isMobile ? '16px' : '32px', maxWidth: '800px', margin: '0 auto' }}>
      <PageHeader
        title="My Profile"
        description="Manage your account settings and preferences"
      />

      {/* Profile Information Card */}
      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: 'var(--color-text-primary)',
          marginBottom: '20px'
        }}>
          Profile Information
        </h2>

        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: 'rgba(239, 83, 80, 0.1)',
            border: '1px solid #EF5350',
            borderRadius: '8px',
            color: '#EF5350',
            fontSize: '14px',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleUpdateProfile}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                Username
              </label>
              <Input
                value={user.username}
                disabled
                style={{ backgroundColor: 'var(--color-hover)', opacity: 0.7 }}
              />
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                Username cannot be changed
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                Email
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                Full Name
              </label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                Role
              </label>
              <Input
                value={user.role}
                disabled
                style={{ backgroundColor: 'var(--color-hover)', opacity: 0.7 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>

      {/* Change Password Card */}
      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: 'var(--color-text-primary)',
          marginBottom: '20px'
        }}>
          Change Password
        </h2>

        <form onSubmit={handleChangePassword}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                Current Password *
              </label>
              <Input
                type="password"
                value={formData.current_password}
                onChange={(e) => setFormData({ ...formData, current_password: e.target.value })}
                placeholder="Enter current password"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                New Password *
              </label>
              <Input
                type="password"
                value={formData.new_password}
                onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                placeholder="Enter new password"
                required
              />
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                Min 8 chars, uppercase, lowercase, number
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                Confirm New Password *
              </label>
              <Input
                type="password"
                value={formData.confirm_password}
                onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                placeholder="Confirm new password"
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </form>
      </div>

      {/* Account Information Card */}
      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: 'var(--color-text-primary)',
          marginBottom: '20px'
        }}>
          Account Information
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Account Status</span>
            <span style={{
              fontSize: '14px',
              fontWeight: '500',
              color: user.is_active ? '#4CAF50' : '#9E9E9E'
            }}>
              {user.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Tenant ID</span>
            <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)' }}>
              {user.tenant_id || 'All Tenants'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Member Since</span>
            <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)' }}>
              {new Date(user.created_at).toLocaleDateString()}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
            <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Last Login</span>
            <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)' }}>
              {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
            </span>
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '24px'
      }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: 'var(--color-text-primary)',
          marginBottom: '12px'
        }}>
          Session
        </h2>
        <p style={{
          fontSize: '14px',
          color: 'var(--color-text-secondary)',
          marginBottom: '20px'
        }}>
          Sign out of your account. You will need to log in again to access the system.
        </p>
        <Button variant="danger" onClick={handleLogout}>
          Log Out
        </Button>
      </div>
    </div>
  )
}

