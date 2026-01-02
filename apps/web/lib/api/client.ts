/**
 * Centralized API client for consistent API calls across the application
 * Handles authentication, error handling, and request configuration
 */
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios'
import { API_BASE_URL } from '../config'
import { handleApiError, logError } from '../error-handler'

/**
 * Get authentication headers from localStorage
 */
export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

/**
 * Create a configured axios instance with default settings
 */
function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // Request interceptor: Add auth token to all requests
  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )

  // Response interceptor: Handle errors consistently
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      // Handle 401 Unauthorized - redirect to login
      if (error.response?.status === 401) {
        localStorage.removeItem('token')
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
      return Promise.reject(error)
    }
  )

  return client
}

// Export the configured client
export const apiClient = createApiClient()

/**
 * Make an authenticated GET request
 */
export async function apiGet<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
  try {
    const response = await apiClient.get<T>(url, config)
    return response.data
  } catch (error) {
    logError(error, `GET ${url}`)
    throw error
  }
}

/**
 * Make an authenticated POST request
 */
export async function apiPost<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
  try {
    const response = await apiClient.post<T>(url, data, config)
    return response.data
  } catch (error) {
    logError(error, `POST ${url}`)
    throw error
  }
}

/**
 * Make an authenticated PATCH request
 */
export async function apiPatch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
  try {
    const response = await apiClient.patch<T>(url, data, config)
    return response.data
  } catch (error) {
    logError(error, `PATCH ${url}`)
    throw error
  }
}

/**
 * Make an authenticated PUT request
 */
export async function apiPut<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
  try {
    const response = await apiClient.put<T>(url, data, config)
    return response.data
  } catch (error) {
    logError(error, `PUT ${url}`)
    throw error
  }
}

/**
 * Make an authenticated DELETE request
 */
export async function apiDelete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
  try {
    const response = await apiClient.delete<T>(url, config)
    return response.data
  } catch (error) {
    logError(error, `DELETE ${url}`)
    throw error
  }
}

/**
 * Legacy function for backward compatibility
 * Use apiClient directly or the helper functions above instead
 */
export function createAuthAxios() {
  return apiClient
}

