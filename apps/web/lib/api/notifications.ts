import axios from 'axios'
import { API_BASE_URL } from '../config'

export interface Notification {
  id: string
  user_id?: string
  tenant_id: string
  type: string
  title: string
  message: string
  entity_type?: string
  entity_id?: string
  read: boolean
  created_at: string
}

export interface NotificationCount {
  count: number
}

export const notificationApi = {
  list: async (read?: boolean, limit: number = 50, offset: number = 0): Promise<Notification[]> => {
    const token = localStorage.getItem('token')
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
    const params = new URLSearchParams()
    if (read !== undefined) params.append('read', String(read))
    params.append('limit', String(limit))
    params.append('offset', String(offset))
    
    const res = await axios.get(`${API_BASE_URL}/notifications?${params}`, {
      headers,
      withCredentials: true
    })
    return res.data
  },

  getUnreadCount: async (): Promise<number> => {
    const token = localStorage.getItem('token')
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
    const res = await axios.get(`${API_BASE_URL}/notifications/unread-count`, {
      headers,
      withCredentials: true
    })
    return res.data.count
  },

  markRead: async (notificationId: string): Promise<Notification> => {
    const token = localStorage.getItem('token')
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
    const res = await axios.post(`${API_BASE_URL}/notifications/${notificationId}/read`, {}, {
      headers,
      withCredentials: true
    })
    return res.data
  },

  markAllRead: async (): Promise<{ marked_read: number }> => {
    const token = localStorage.getItem('token')
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
    const res = await axios.post(`${API_BASE_URL}/notifications/read-all`, {}, {
      headers,
      withCredentials: true
    })
    return res.data
  }
}

