import React from 'react'

interface StatusBadgeProps {
  status: string
  variant?: 'default' | 'priority' | 'category'
}

export function StatusBadge({ status, variant = 'default' }: StatusBadgeProps) {
  const getStyle = () => {
    if (variant === 'priority') {
      const priorityStyles: Record<string, React.CSSProperties> = {
        'High': { backgroundColor: 'rgba(244, 67, 54, 0.2)', color: '#EF5350' },
        'Normal': { backgroundColor: 'rgba(158, 158, 158, 0.2)', color: '#BDBDBD' },
        'Low': { backgroundColor: 'rgba(76, 175, 80, 0.2)', color: '#66BB6A' },
      }
      return priorityStyles[status] || priorityStyles['Normal']
    }
    
    if (variant === 'category') {
      const categoryStyles: Record<string, React.CSSProperties> = {
        'permit': { backgroundColor: 'rgba(156, 39, 176, 0.15)', color: '#9C27B0' },
        'inspection': { backgroundColor: 'rgba(255, 152, 0, 0.15)', color: '#FF9800' },
        'utility': { backgroundColor: 'rgba(33, 150, 243, 0.15)', color: '#2196F3' },
        'vendor': { backgroundColor: 'rgba(76, 175, 80, 0.15)', color: '#4CAF50' },
        'builder': { backgroundColor: 'rgba(96, 165, 250, 0.15)', color: '#60A5FA' },
        'warranty': { backgroundColor: 'rgba(244, 67, 54, 0.15)', color: '#EF5350' },
        'finance': { backgroundColor: 'rgba(255, 193, 7, 0.15)', color: '#FFC107' },
        'other': { backgroundColor: 'rgba(158, 158, 158, 0.15)', color: '#9E9E9E' },
      }
      return categoryStyles[status.toLowerCase()] || categoryStyles['other']
    }

    const statusStyles: Record<string, React.CSSProperties> = {
      'New': { backgroundColor: 'rgba(96, 165, 250, 0.15)', color: '#60A5FA' },
      'Scheduled': { backgroundColor: 'rgba(255, 152, 0, 0.15)', color: '#FFA726' },
      'In Progress': { backgroundColor: 'rgba(96, 165, 250, 0.2)', color: '#60A5FA' },
      'Dispatched': { backgroundColor: 'rgba(255, 152, 0, 0.15)', color: '#FFA726' },
      'Completed': { backgroundColor: 'rgba(76, 175, 80, 0.15)', color: '#66BB6A' },
      'On Hold': { backgroundColor: 'rgba(158, 158, 158, 0.15)', color: '#BDBDBD' },
      'Draft': { backgroundColor: 'rgba(96, 165, 250, 0.15)', color: '#60A5FA' },
      'Sent': { backgroundColor: 'rgba(96, 165, 250, 0.2)', color: '#60A5FA' },
      'Won': { backgroundColor: 'rgba(76, 175, 80, 0.15)', color: '#66BB6A' },
      'Lost': { backgroundColor: 'rgba(158, 158, 158, 0.15)', color: '#BDBDBD' },
    }
    return statusStyles[status] || { backgroundColor: 'rgba(158, 158, 158, 0.2)', color: '#BDBDBD' }
  }

  return (
    <span style={{
      padding: '4px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '500',
      display: 'inline-block',
      ...getStyle()
    }}>
      {status}
    </span>
  )
}
