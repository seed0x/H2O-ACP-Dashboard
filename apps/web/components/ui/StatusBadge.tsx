import React from 'react'

interface StatusBadgeProps {
  status: string
  variant?: 'default' | 'priority'
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
