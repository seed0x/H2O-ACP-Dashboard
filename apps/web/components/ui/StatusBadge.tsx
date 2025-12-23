import React from 'react'

interface StatusBadgeProps {
  status: string
  variant?: 'default' | 'priority' | 'category' | 'success' | 'error' | 'info' | 'warning'
  className?: string
}

export function StatusBadge({ status, variant = 'default', className = '' }: StatusBadgeProps) {
  const getStatusStyles = () => {
    // Variant-based styles (explicit variants take priority)
    if (variant === 'success') {
      return {
        bg: 'var(--color-success-bg)',
        text: 'var(--color-success)',
        border: 'var(--color-success)',
      }
    }
    if (variant === 'error') {
      return {
        bg: 'var(--color-error-bg)',
        text: 'var(--color-error)',
        border: 'var(--color-error)',
      }
    }
    if (variant === 'warning') {
      return {
        bg: 'var(--color-warning-bg)',
        text: 'var(--color-warning)',
        border: 'var(--color-warning)',
      }
    }
    if (variant === 'info') {
      return {
        bg: 'var(--color-info-bg)',
        text: 'var(--color-info)',
        border: 'var(--color-info)',
      }
    }

    // Priority variant
    if (variant === 'priority') {
      const priorityMap: Record<string, { bg: string; text: string; border: string }> = {
        'High': {
          bg: 'var(--color-error-bg)',
          text: 'var(--color-error)',
          border: 'var(--color-error)',
        },
        'Normal': {
          bg: 'var(--color-neutral-bg)',
          text: 'var(--color-neutral)',
          border: 'var(--color-neutral)',
        },
        'Low': {
          bg: 'var(--color-success-bg)',
          text: 'var(--color-success)',
          border: 'var(--color-success)',
        },
        'Emergency': {
          bg: 'var(--color-error-bg)',
          text: 'var(--color-error)',
          border: 'var(--color-error)',
        },
      }
      return priorityMap[status] || priorityMap['Normal']
    }

    // Category variant (marketing content categories)
    if (variant === 'category' || status.includes('_')) {
      const categoryMap: Record<string, { bg: string; text: string; border: string }> = {
        'ad_content': {
          bg: 'var(--color-info-bg)',
          text: 'var(--color-info)',
          border: 'var(--color-info)',
        },
        'team_post': {
          bg: 'var(--color-success-bg)',
          text: 'var(--color-success)',
          border: 'var(--color-success)',
        },
        'coupon': {
          bg: 'var(--color-warning-bg)',
          text: 'var(--color-warning)',
          border: 'var(--color-warning)',
        },
        'diy': {
          bg: 'var(--color-primary-light)',
          text: 'var(--color-primary)',
          border: 'var(--color-primary)',
        },
        'blog_post': {
          bg: 'var(--color-info-bg)',
          text: 'var(--color-info)',
          border: 'var(--color-info)',
        },
      }
      const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_')
      return categoryMap[normalizedStatus] || {
        bg: 'var(--color-neutral-bg)',
        text: 'var(--color-neutral)',
        border: 'var(--color-neutral)',
      }
    }

    // Default status mapping
    const statusMap: Record<string, { bg: string; text: string; border: string }> = {
      'New': {
        bg: 'var(--color-info-bg)',
        text: 'var(--color-info)',
        border: 'var(--color-info)',
      },
      'Scheduled': {
        bg: 'var(--color-warning-bg)',
        text: 'var(--color-warning)',
        border: 'var(--color-warning)',
      },
      'In Progress': {
        bg: 'var(--color-primary-light)',
        text: 'var(--color-primary)',
        border: 'var(--color-primary)',
      },
      'Dispatched': {
        bg: 'var(--color-warning-bg)',
        text: 'var(--color-warning)',
        border: 'var(--color-warning)',
      },
      'Completed': {
        bg: 'var(--color-success-bg)',
        text: 'var(--color-success)',
        border: 'var(--color-success)',
      },
      'On Hold': {
        bg: 'var(--color-neutral-bg)',
        text: 'var(--color-neutral)',
        border: 'var(--color-neutral)',
      },
      'Draft': {
        bg: 'var(--color-neutral-bg)',
        text: 'var(--color-neutral)',
        border: 'var(--color-neutral)',
      },
      'Sent': {
        bg: 'var(--color-info-bg)',
        text: 'var(--color-info)',
        border: 'var(--color-info)',
      },
      'Won': {
        bg: 'var(--color-success-bg)',
        text: 'var(--color-success)',
        border: 'var(--color-success)',
      },
      'Posted': {
        bg: 'var(--color-success-bg)',
        text: 'var(--color-success)',
        border: 'var(--color-success)',
      },
      'Lost': {
        bg: 'var(--color-neutral-bg)',
        text: 'var(--color-neutral)',
        border: 'var(--color-neutral)',
      },
      'Planned': {
        bg: 'var(--color-neutral-bg)',
        text: 'var(--color-neutral)',
        border: 'var(--color-neutral)',
      },
      'Active': {
        bg: 'var(--color-success-bg)',
        text: 'var(--color-success)',
        border: 'var(--color-success)',
      },
      'Expired': {
        bg: 'var(--color-error-bg)',
        text: 'var(--color-error)',
        border: 'var(--color-error)',
      },
    }
    
    return statusMap[status] || {
      bg: 'var(--color-neutral-bg)',
      text: 'var(--color-neutral)',
      border: 'var(--color-neutral)',
    }
  }

  const styles = getStatusStyles()

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${className}`}
      style={{
        backgroundColor: styles.bg,
        color: styles.text,
        borderColor: `${styles.border}40`, // 40 = 25% opacity in hex
        height: '24px',
      }}
    >
      {status}
    </span>
  )
}
