'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { API_BASE_URL } from '../../lib/config'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
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

export default function UsersPage() {
  const router = useRouter()
  const isMobile = useMobile()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    role: 'user',
    tenant_id: 'h2o',
    is_active: true
  })

  useEffect(() => {
    loadUsers()
  }, [])

  function getAuthHeaders() {
    const token = localStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }

  async function loadUsers() {
    try {
      setLoading(true)
      const headers = getAuthHeaders()
      const params: Record<string, string> = {}
      if (roleFilter) params.role = roleFilter

      const response = await axios.get(`${API_BASE_URL}/users`, {
        headers,
        params,
        withCredentials: true
      })
      setUsers(Array.isArray(response.data) ? response.data : [])
    } catch (err: unknown) {
      logError(err, 'loadUsers')
      if (err && typeof err === 'object' && 'response' in err && typeof err.response === 'object' && err.response && 'status' in err.response && err.response.status === 403) {
        showToast('Only admins can view users', 'error')
        router.push('/')
      } else {
        handleApiError(err, 'Load users')
      }
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setFormData({
      username: '',
      email: '',
      full_name: '',
      password: '',
      role: 'user',
      tenant_id: 'h2o',
      is_active: true
    })
    setError('')
    setShowAddForm(false)
    setEditingUser(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Not authenticated. Please log in again.')
      }
      const headers = { 'Authorization': `Bearer ${token}` }

      if (editingUser) {
        // Update existing user
        const updateData: {
          email?: string | null
          full_name?: string | null
          role?: string
          tenant_id?: string | null
          is_active?: boolean
          password?: string
        } = {
          email: formData.email || null,
          full_name: formData.full_name || null,
          role: formData.role,
          tenant_id: formData.tenant_id || null,
          is_active: formData.is_active
        }
        // Only include password if provided
        if (formData.password) {
          updateData.password = formData.password
        }

        await axios.patch(`${API_BASE_URL}/users/${editingUser.id}`, updateData, {
          headers,
          withCredentials: true
        })
        showToast('User updated successfully', 'success')
      } else {
        // Create new user
        if (!formData.password) {
          setError('Password is required for new users')
          setSubmitting(false)
          return
        }

        await axios.post(`${API_BASE_URL}/users`, formData, {
          headers,
          withCredentials: true
        })
        showToast('User created successfully', 'success')
      }

      resetForm()
      await loadUsers()
    } catch (err: unknown) {
      logError(err, 'handleSubmit')
      let errorMsg = 'Failed to save user'
      if (err && typeof err === 'object') {
        if ('response' in err && typeof err.response === 'object' && err.response && 'data' in err.response && typeof err.response.data === 'object' && err.response.data && 'detail' in err.response.data) {
          errorMsg = String(err.response.data.detail)
        } else if ('message' in err && typeof err.message === 'string') {
          errorMsg = err.message
        }
      }
      setError(errorMsg)
      showToast(errorMsg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(user: User) {
    if (!confirm(`Are you sure you want to delete user "${user.username}"? This action cannot be undone.`)) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Not authenticated')
      }
      const headers = { 'Authorization': `Bearer ${token}` }

      await axios.delete(`${API_BASE_URL}/users/${user.id}`, {
        headers,
        withCredentials: true
      })
      showToast('User deleted successfully', 'success')
      await loadUsers()
    } catch (err: unknown) {
      logError(err, 'handleDelete')
      handleApiError(err, 'Delete user')
    }
  }

  function handleEdit(user: User) {
    setEditingUser(user)
    setFormData({
      username: user.username,
      email: user.email || '',
      full_name: user.full_name || '',
      password: '', // Don't pre-fill password
      role: user.role,
      tenant_id: user.tenant_id || 'h2o',
      is_active: user.is_active
    })
    setShowAddForm(true)
  }

  const filteredUsers = users.filter(user => {
    if (search && !user.username.toLowerCase().includes(search.toLowerCase()) &&
        !(user.email && user.email.toLowerCase().includes(search.toLowerCase())) &&
        !(user.full_name && user.full_name.toLowerCase().includes(search.toLowerCase()))) {
      return false
    }
    if (roleFilter && user.role !== roleFilter) {
      return false
    }
    return true
  })

  function getRoleColor(role: string) {
    const colors: Record<string, { bg: string; color: string }> = {
      admin: { bg: 'rgba(239, 83, 80, 0.15)', color: '#EF5350' },
      user: { bg: 'rgba(96, 165, 250, 0.15)', color: '#60A5FA' },
      viewer: { bg: 'rgba(158, 158, 158, 0.15)', color: '#9E9E9E' }
    }
    return colors[role] || colors.user
  }

  if (loading) {
    return (
      <div style={{ padding: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ color: 'var(--color-text-secondary)' }}>Loading users...</div>
      </div>
    )
  }

  return (
    <div style={{ padding: isMobile ? '16px' : '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <PageHeader
        title="User Management"
        description="Manage system users, roles, and permissions"
        action={
          <Button onClick={() => { resetForm(); setShowAddForm(true) }}>
            + New User
          </Button>
        }
      />

      {/* Add/Edit Form */}
      {showAddForm && (
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: 'var(--color-text-primary)',
            marginBottom: '20px'
          }}>
            {editingUser ? 'Edit User' : 'Create New User'}
          </h3>

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

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                  Username {!editingUser && '*'}
                </label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Enter username"
                  required={!editingUser}
                  disabled={!!editingUser}
                />
                {editingUser && (
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                    Username cannot be changed
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                  Email
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@example.com"
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
                  Password {!editingUser && '*'}
                </label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? "Leave blank to keep current" : "Enter password"}
                  required={!editingUser}
                />
                {!editingUser && (
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                    Min 8 chars, uppercase, lowercase, number
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                  Role *
                </label>
                <Select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  options={[
                    { value: 'admin', label: 'Admin' },
                    { value: 'user', label: 'User' },
                    { value: 'viewer', label: 'Viewer' }
                  ]}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                  Tenant ID
                </label>
                <Input
                  value={formData.tenant_id}
                  onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
                  placeholder="h2o"
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="is_active" style={{ fontSize: '14px', color: 'var(--color-text-primary)', cursor: 'pointer' }}>
                  Active
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
              </Button>
              <Button type="button" variant="secondary" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by username, email, or name..."
          />
        </div>
        <div style={{ minWidth: '150px' }}>
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={[
              { value: '', label: 'All Roles' },
              { value: 'admin', label: 'Admin' },
              { value: 'user', label: 'User' },
              { value: 'viewer', label: 'Viewer' }
            ]}
          />
        </div>
      </div>

      {/* Users Table */}
      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        {filteredUsers.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            {users.length === 0 ? 'No users found' : 'No users match your filters'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-hover)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Username</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Full Name</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Email</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Role</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Last Login</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const roleStyle = getRoleColor(user.role)
                  return (
                    <tr key={user.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                        {user.username}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                        {user.full_name || '-'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                        {user.email || '-'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: roleStyle.bg,
                          color: roleStyle.color
                        }}>
                          {user.role}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: user.is_active ? 'rgba(76, 175, 80, 0.15)' : 'rgba(158, 158, 158, 0.15)',
                          color: user.is_active ? '#4CAF50' : '#9E9E9E'
                        }}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                        {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleEdit(user)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(user)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

