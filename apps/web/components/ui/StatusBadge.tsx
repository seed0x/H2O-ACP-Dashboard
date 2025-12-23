import React from 'react'

interface StatusBadgeProps {
  status: string
  variant?: 'default' | 'priority' | 'category' | 'success' | 'error' | 'info'
  className?: string
}

export function StatusBadge({ status, variant = 'default', className = '' }: StatusBadgeProps) {
  const getCategoryClasses = () => {
    // Marketing content categories
    if (variant === 'category' || status.includes('_')) {
      const categoryMap: Record<string, string> = {
        'ad_content': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        'team_post': 'bg-green-500/20 text-green-400 border-green-500/30',
        'coupon': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        'diy': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        'blog_post': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      }
      const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_')
      return categoryMap[normalizedStatus] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }

    if (variant === 'priority') {
      const priorityMap: Record<string, string> = {
        'High': 'bg-red-500/20 text-red-400 border-red-500/30',
        'Normal': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
        'Low': 'bg-green-500/20 text-green-400 border-green-500/30',
      }
      return priorityMap[status] || priorityMap['Normal']
    }

    // Variant-based styles
    if (variant === 'success') {
      return 'bg-green-500/20 text-green-400 border-green-500/30'
    }
    if (variant === 'error') {
      return 'bg-red-500/20 text-red-400 border-red-500/30'
    }
    if (variant === 'info') {
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    }

    // Default status styles
    const statusMap: Record<string, string> = {
      'New': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'Scheduled': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'In Progress': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'Dispatched': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'Completed': 'bg-green-500/20 text-green-400 border-green-500/30',
      'On Hold': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      'Draft': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'Sent': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'Won': 'bg-green-500/20 text-green-400 border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.15)]',
      'Posted': 'bg-green-500/20 text-green-400 border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.15)]',
      'Lost': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      'Planned': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      'Active': 'bg-green-500/20 text-green-400 border-green-500/30',
      'Expired': 'bg-red-500/20 text-red-400 border-red-500/30',
    }
    return statusMap[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }

  const hasGlow = status === 'Won' || status === 'Posted'

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium border ${getCategoryClasses()} ${hasGlow ? 'shadow-[0_0_10px_rgba(34,197,94,0.15)]' : ''} ${className}`}>
      {status}
    </span>
  )
}
