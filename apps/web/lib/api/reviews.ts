import { apiGet, apiPost, apiPatch } from './client'
import { API_BASE_URL } from '../config'

export interface ReviewRequest {
  id: string
  tenant_id: string
  service_call_id?: string
  job_id?: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  token: string
  status: 'pending' | 'sent' | 'completed' | 'expired' | 'lost'
  sent_at?: string
  completed_at?: string
  expires_at?: string
  reminder_sent: boolean
  created_at: string
  updated_at: string
}

export interface ReviewStats {
  total_requests: number
  pending: number
  sent: number
  completed: number  // "got"
  lost: number
  conversion_rate: number
  average_rating: number
}

export interface Review {
  id: string
  review_request_id: string
  rating: number
  comment?: string
  customer_name: string
  customer_email?: string
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface RecoveryTicket {
  id: string
  tenant_id: string
  review_id: string
  service_call_id?: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  issue_description: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  assigned_to?: string
  resolution_notes?: string
  created_at: string
  updated_at: string
}

export interface ReviewRequestCreate {
  tenant_id: string
  service_call_id?: string
  job_id?: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
}

export interface PublicReviewCreate {
  token: string
  rating: number
  comment?: string
  customer_name: string
  customer_email?: string
}

// Internal API (requires auth)
export const reviewApi = {
  // Review Requests
  createRequest: async (data: ReviewRequestCreate): Promise<ReviewRequest> => {
    return await apiPost<ReviewRequest>('/reviews/requests', data)
  },

  listRequests: async (tenantId: string, status?: string, serviceCallId?: string): Promise<ReviewRequest[]> => {
    const params = new URLSearchParams({ tenant_id: tenantId })
    if (status) params.append('status', status)
    if (serviceCallId) params.append('service_call_id', serviceCallId)
    return await apiGet<ReviewRequest[]>(`/reviews/requests?${params}`)
  },

  getRequest: async (requestId: string): Promise<ReviewRequest> => {
    return await apiGet<ReviewRequest>(`/reviews/requests/${requestId}`)
  },

  updateRequest: async (requestId: string, data: Partial<ReviewRequest>): Promise<ReviewRequest> => {
    return await apiPatch<ReviewRequest>(`/reviews/requests/${requestId}`, data)
  },

  sendRequest: async (requestId: string): Promise<ReviewRequest> => {
    return await apiPost<ReviewRequest>(`/reviews/requests/${requestId}/send`, {})
  },

  markRequestAsLost: async (requestId: string): Promise<ReviewRequest> => {
    return await apiPost<ReviewRequest>(`/reviews/requests/${requestId}/mark-lost`, {})
  },

  getStats: async (tenantId: string): Promise<ReviewStats> => {
    const params = new URLSearchParams({ tenant_id: tenantId })
    return await apiGet<ReviewStats>(`/reviews/stats?${params}`)
  },

  // Reviews
  listReviews: async (tenantId?: string, isPublic?: boolean): Promise<Review[]> => {
    const params = new URLSearchParams()
    if (tenantId) params.append('tenant_id', tenantId)
    if (isPublic !== undefined) params.append('is_public', String(isPublic))
    return await apiGet<Review[]>(`/reviews?${params}`)
  },

  getReview: async (reviewId: string): Promise<Review> => {
    return await apiGet<Review>(`/reviews/${reviewId}`)
  },

  updateReview: async (reviewId: string, data: { is_public?: boolean }): Promise<Review> => {
    return await apiPatch<Review>(`/reviews/${reviewId}`, data)
  },

  // Recovery Tickets
  createRecoveryTicket: async (data: {
    tenant_id: string
    review_id: string
    service_call_id?: string
    customer_name: string
    customer_email?: string
    customer_phone?: string
    issue_description: string
  }): Promise<RecoveryTicket> => {
    return await apiPost<RecoveryTicket>('/recovery-tickets', data)
  },

  listRecoveryTickets: async (tenantId: string, status?: string): Promise<RecoveryTicket[]> => {
    const params = new URLSearchParams({ tenant_id: tenantId })
    if (status) params.append('status', status)
    return await apiGet<RecoveryTicket[]>(`/recovery-tickets?${params}`)
  },

  getRecoveryTicket: async (ticketId: string): Promise<RecoveryTicket> => {
    return await apiGet<RecoveryTicket>(`/recovery-tickets/${ticketId}`)
  },

  updateRecoveryTicket: async (ticketId: string, data: {
    status?: string
    assigned_to?: string
    resolution_notes?: string
  }): Promise<RecoveryTicket> => {
    return await apiPatch<RecoveryTicket>(`/recovery-tickets/${ticketId}`, data)
  },
}

// Public API (no auth required)
export const publicReviewApi = {
  submitReview: async (data: PublicReviewCreate): Promise<Review> => {
    // Public endpoint doesn't need auth, use axios directly without auth headers
    const axios = (await import('axios')).default
    const res = await axios.post(`${API_BASE_URL}/public/reviews`, data)
    return res.data
  },

  getPublicReviews: async (): Promise<Review[]> => {
    // Public endpoint doesn't need auth, use axios directly without auth headers
    const axios = (await import('axios')).default
    const res = await axios.get(`${API_BASE_URL}/public/reviews`)
    return res.data
  },
}

