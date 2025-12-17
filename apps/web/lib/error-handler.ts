/**
 * Centralized error handling utilities
 */

export interface ApiError {
  message: string
  status?: number
  code?: string
}

/**
 * Extract error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  
  if (typeof error === 'string') {
    return error
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }
  
  return 'An unexpected error occurred'
}

/**
 * Check if error is an API error with status code
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    ('status' in error || 'code' in error)
  )
}

/**
 * Handle API errors with appropriate user messages
 */
export function handleApiError(error: unknown): string {
  if (isApiError(error)) {
    // Handle specific status codes
    switch (error.status) {
      case 401:
        return 'Your session has expired. Please log in again.'
      case 403:
        return 'You do not have permission to perform this action.'
      case 404:
        return 'The requested resource was not found.'
      case 409:
        return 'This resource already exists or conflicts with existing data.'
      case 429:
        return 'Too many requests. Please try again later.'
      case 500:
        return 'A server error occurred. Please try again later.'
      default:
        return error.message || 'An error occurred. Please try again.'
    }
  }
  
  return getErrorMessage(error)
}

/**
 * Log error (in production, send to error tracking service)
 */
export function logError(error: unknown, context?: string) {
  const message = getErrorMessage(error)
  const errorInfo = {
    message,
    context,
    error: error instanceof Error ? {
      name: error.name,
      stack: error.stack,
    } : error,
    timestamp: new Date().toISOString(),
  }
  
  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', errorInfo)
  }
  
  // TODO: In production, send to error tracking service
  // Example: Sentry.captureException(error, { tags: { context } })
}

