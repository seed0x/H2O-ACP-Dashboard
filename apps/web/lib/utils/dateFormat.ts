/**
 * Date formatting utilities
 * Centralized date/time formatting functions for consistent display across the application
 */

/**
 * Formats a date string to a time string (e.g., "2:30 PM")
 * @param dateString - ISO date string or null
 * @returns Formatted time string or fallback message
 */
export function formatTime(dateString: string | null | undefined): string {
  if (!dateString) return 'No time'
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return 'Invalid time'
    }
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  } catch {
    return 'Invalid time'
  }
}

/**
 * Formats a date string to a date string (e.g., "01/15/2025")
 * @param dateString - ISO date string or null
 * @returns Formatted date string or fallback message
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'No date'
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return 'Invalid date'
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  } catch {
    return 'Invalid date'
  }
}

/**
 * Formats a date string to both date and time
 * @param dateString - ISO date string or null
 * @returns Object with date and time strings
 */
export function formatDateTime(dateString: string | null | undefined): { date: string; time: string } {
  if (!dateString) {
    return { date: 'No date', time: 'No time' }
  }
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return { date: 'Invalid date', time: 'Invalid time' }
    }
    return {
      date: date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    }
  } catch {
    return { date: 'Invalid date', time: 'Invalid time' }
  }
}

