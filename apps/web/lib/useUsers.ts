'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { API_BASE_URL } from './config'

export interface AssignableUser {
  username: string
  full_name: string | null
  role: string
}

/**
 * Hook to fetch users that can be assigned to tasks/jobs
 * Caches users to avoid repeated API calls within the same session
 */
export function useUsers(tenantId?: string) {
  const [users, setUsers] = useState<AssignableUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true)
      setError(null)
      
      try {
        const token = localStorage.getItem('token')
        const headers: Record<string, string> = {}
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
        
        const params = new URLSearchParams()
        if (tenantId) {
          params.append('tenant_id', tenantId)
        }
        
        const url = `${API_BASE_URL}/users/assignable${params.toString() ? '?' + params.toString() : ''}`
        const response = await axios.get(url, { 
          headers,
          withCredentials: true
        })
        
        setUsers(Array.isArray(response.data) ? response.data : [])
      } catch (err) {
        console.error('Failed to fetch assignable users:', err)
        setError('Failed to load users')
        setUsers([])
      } finally {
        setLoading(false)
      }
    }
    
    fetchUsers()
  }, [tenantId])

  // Helper to get display name (full_name or username)
  const getDisplayName = (user: AssignableUser) => {
    return user.full_name || user.username
  }

  // Convert to Select options format
  const userOptions = users.map(user => ({
    value: user.username,
    label: user.full_name ? `${user.full_name} (${user.username})` : user.username
  }))

  return {
    users,
    loading,
    error,
    getDisplayName,
    userOptions
  }
}

