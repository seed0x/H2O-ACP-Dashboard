import axios from 'axios'
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
  status: 'pending' | 'sent' | 'completed' | 'expired'
  sent_at?: string
  completed_at?: string
  expires_at?: string
  reminder_sent: boolean
  created_at: string
  updated_at: string
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
    const res = await axios.post(`${API_BASE_URL}/reviews/requests`, data)
    return res.data
  },

  listRequests: async (tenantId: string, status?: string, serviceCallId?: string): Promise<ReviewRequest[]> => {
    const params = new URLSearchParams({ tenant_id: tenantId })
    if (status) params.append('status', status)
    if (serviceCallId) params.append('service_call_id', serviceCallId)
    const res = await axios.get(`${API_BASE_URL}/reviews/requests?${params}`)
    return res.data
  },

  getRequest: async (requestId: string): Promise<ReviewRequest> => {
    const res = await axios.get(`${API_BASE_URL}/reviews/requests/${requestId}`)
    return res.data
  },

  updateRequest: async (requestId: string, data: Partial<ReviewRequest>): Promise<ReviewRequest> => {
    const res = await axios.patch(`${API_BASE_URL}/reviews/requests/${requestId}`, data)
    return res.data
  },

  sendRequest: async (requestId: string): Promise<ReviewRequest> => {
    const res = await axios.post(`${API_BASE_URL}/reviews/requests/${requestId}/send`)
    return res.data
  },

  // Reviews
  listReviews: async (tenantId?: string, isPublic?: boolean): Promise<Review[]> => {
    const params = new URLSearchParams()
    if (tenantId) params.append('tenant_id', tenantId)
    if (isPublic !== undefined) params.append('is_public', String(isPublic))
    const res = await axios.get(`${API_BASE_URL}/reviews?${params}`)
    return res.data
  },

  getReview: async (reviewId: string): Promise<Review> => {
    const res = await axios.get(`${API_BASE_URL}/reviews/${reviewId}`)
    return res.data
  },

  updateReview: async (reviewId: string, data: { is_public?: boolean }): Promise<Review> => {
    const res = await axios.patch(`${API_BASE_URL}/reviews/${reviewId}`, data)
    return res.data
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
    const res = await axios.post(`${API_BASE_URL}/recovery-tickets`, data)
    return res.data
  },

  listRecoveryTickets: async (tenantId: string, status?: string): Promise<RecoveryTicket[]> => {
    const params = new URLSearchParams({ tenant_id: tenantId })
    if (status) params.append('status', status)
    const res = await axios.get(`${API_BASE_URL}/recovery-tickets?${params}`)
    return res.data
  },

  getRecoveryTicket: async (ticketId: string): Promise<RecoveryTicket> => {
    const res = await axios.get(`${API_BASE_URL}/recovery-tickets/${ticketId}`)
    return res.data
  },

  updateRecoveryTicket: async (ticketId: string, data: {
    status?: string
    assigned_to?: string
    resolution_notes?: string
  }): Promise<RecoveryTicket> => {
    const res = await axios.patch(`${API_BASE_URL}/recovery-tickets/${ticketId}`, data)
    return res.data
  },
}

// Public API (no auth required)
export const publicReviewApi = {
  submitReview: async (data: PublicReviewCreate): Promise<Review> => {
    const res = await axios.post(`${API_BASE_URL}/public/reviews`, data)
    return res.data
  },

  getPublicReviews: async (): Promise<Review[]> => {
    const res = await axios.get(`${API_BASE_URL}/public/reviews`)
    return res.data
  },
}

