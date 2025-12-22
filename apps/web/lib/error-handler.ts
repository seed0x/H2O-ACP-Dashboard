import { showToast } from '../components/Toast'

export interface ApiError {
  message: string
  status?: number
  detail?: string
  code?: string
}

export function getErrorMessage(error: any): string {
  const detail = error.response?.data?.detail
  
  // Handle Pydantic validation errors (array of {type, loc, msg, input, ctx})
  if (Array.isArray(detail)) {
    return detail.map((e: any) => e.msg || 'Validation error').join(', ')
  }
  
  // Handle object detail (sometimes Pydantic returns object)
  if (detail && typeof detail === 'object') {
    return detail.msg || detail.message || JSON.stringify(detail)
  }
  
  if (typeof detail === 'string') return detail
  if (error.response?.data?.message) return error.response.data.message
  if (error.detail) return typeof error.detail === 'string' ? error.detail : 'Validation error'
  if (error.message) return error.message
  if (typeof error === 'string') return error
  return 'An unexpected error occurred'
}

function getStatusCode(error: any): number | undefined {
  if (error.response?.status) return error.response.status
  if (error.status) return error.status
  return undefined
}

function isNetworkError(error: any): boolean {
  if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') return true
  if (error.request && !error.response) return true
  if (error.name === 'TypeError' && error.message?.includes('fetch')) return true
  return false
}

// Overloaded: When called with just error, returns a string message (backward compatible)
// When called with context, shows a toast notification
export function handleApiError(error: any): string
export function handleApiError(error: any, context: string, retryFn?: () => void): void
export function handleApiError(error: any, context?: string, retryFn?: () => void): string | void {
  // If called with just error, return the message string (backward compatibility)
  if (context === undefined) {
    return getErrorMessage(error)
  }
  
  // Otherwise, show toast notification
  console.error(`API Error [${context}]:`, {
    message: error.message,
    response: error.response?.data,
    status: getStatusCode(error),
    code: error.code
  })
  
  if (isNetworkError(error)) {
    showToast({
      title: 'Connection Failed',
      message: 'Unable to connect to the server. Check your internet connection.',
      type: 'error',
      action: retryFn ? { label: 'Retry', onClick: retryFn } : undefined
    })
    return
  }
  
  const status = getStatusCode(error)
  const detail = getErrorMessage(error)
  
  switch (status) {
    case 401:
      showToast({ title: 'Session Expired', message: 'Please log in again to continue.', type: 'error' })
      setTimeout(() => { localStorage.removeItem('token'); window.location.href = '/login' }, 2000)
      return
    case 403:
      showToast({ title: 'Access Denied', message: "You don't have permission to perform this action.", type: 'error' })
      return
    case 404:
      showToast({ title: 'Not Found', message: detail || 'The requested resource was not found.', type: 'error' })
      return
    case 422:
      showToast({ title: 'Validation Error', message: detail || 'Please check your input and try again.', type: 'warning' })
      return
    case 429:
      showToast({ title: 'Too Many Requests', message: 'Please wait a moment before trying again.', type: 'warning', action: retryFn ? { label: 'Retry', onClick: retryFn } : undefined })
      return
    case 500: case 502: case 503: case 504:
      showToast({ title: 'Server Error', message: 'Something went wrong on our end. Please try again later.', type: 'error', action: retryFn ? { label: 'Retry', onClick: retryFn } : undefined })
      return
    default:
      showToast({ title: `Failed: ${context}`, message: detail, type: 'error', action: retryFn ? { label: 'Retry', onClick: retryFn } : undefined })
  }
}

export function showSuccess(title: string, message?: string): void {
  showToast({ title, message, type: 'success' })
}

export function showError(title: string, message?: string): void {
  showToast({ title, message, type: 'error' })
}

export function showWarning(title: string, message?: string): void {
  showToast({ title, message, type: 'warning' })
}

export function showInfo(title: string, message?: string): void {
  showToast({ title, message, type: 'info' })
}

export function logError(error: unknown, context?: string): void {
  const message = error instanceof Error ? error.message : String(error)
  const errorInfo = {
    message,
    context,
    error: error instanceof Error ? { name: error.name, stack: error.stack } : error,
    timestamp: new Date().toISOString(),
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', errorInfo)
  }
}

