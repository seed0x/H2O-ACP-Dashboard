'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { API_BASE_URL } from '../lib/config'
import { Card, CardHeader } from './ui/Card'
import { handleApiError } from '../lib/error-handler'
import { useTenant } from '../contexts/TenantContext'

interface ServiceCall {
  id: string
  customer_name: string
  address_line1: string
  city: string
  scheduled_start: string | null
  scheduled_end: string | null
  status: string
  priority: string
  issue_description: string
  assigned_to: string | null
}

export function ServiceCallsCalendar() {
  const router = useRouter()
  const { currentTenant, isTenantSelected } = useTenant()
  const [serviceCalls, setServiceCalls] = useState<ServiceCall[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    if (isTenantSelected('h2o')) {
      loadServiceCalls()
    }
  }, [currentTenant, currentMonth])

  async function loadServiceCalls() {
    try {
      const token = localStorage.getItem('token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      
      // Get first and last day of current month
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth()
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      
      // Load service calls for the month
      const response = await axios.get(
        `${API_BASE_URL}/service-calls?tenant_id=h2o&limit=1000`,
        { headers, withCredentials: true }
      )
      
      const calls = Array.isArray(response.data) ? response.data : []
      // Filter calls for the current month
      const monthCalls = calls.filter((call: ServiceCall) => {
        if (!call.scheduled_start) return false
        const callDate = new Date(call.scheduled_start)
        return callDate >= firstDay && callDate <= lastDay
      })
      
      setServiceCalls(monthCalls)
      setLoading(false)
    } catch (error) {
      console.error('Failed to load service calls:', error)
      handleApiError(error, 'Loading service calls')
      setLoading(false)
    }
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const days = []
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  const getCallsForDate = (date: Date | null) => {
    if (!date) return []
    const dateStr = date.toISOString().split('T')[0]
    return serviceCalls.filter(call => {
      if (!call.scheduled_start) return false
      const callDate = new Date(call.scheduled_start).toISOString().split('T')[0]
      return callDate === dateStr
    })
  }

  const formatTime = (dateString: string | null) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    } catch {
      return ''
    }
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const days = getDaysInMonth(currentMonth)

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  if (!isTenantSelected('h2o')) {
    return null
  }

  if (loading) {
    return (
      <Card>
        <CardHeader title="Service Calls Calendar" />
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          Loading calendar...
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader 
        title="Service Calls Calendar"
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => navigateMonth('prev')}
              style={{
                padding: '6px 12px',
                backgroundColor: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                fontSize: 'var(--text-sm)'
              }}
            >
              ←
            </button>
            <span style={{ fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--color-text-primary)', minWidth: '180px', textAlign: 'center' }}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <button
              onClick={() => navigateMonth('next')}
              style={{
                padding: '6px 12px',
                backgroundColor: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                fontSize: 'var(--text-sm)'
              }}
            >
              →
            </button>
            <button
              onClick={() => setCurrentMonth(new Date())}
              style={{
                padding: '6px 12px',
                backgroundColor: 'var(--color-primary)',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
                fontSize: 'var(--text-sm)',
                fontWeight: 500
              }}
            >
              Today
            </button>
          </div>
        }
      />
      
      <div style={{ padding: '20px' }}>
        {/* Calendar Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '8px',
          marginBottom: '16px'
        }}>
          {/* Day Headers */}
          {dayNames.map(day => (
            <div
              key={day}
              style={{
                padding: '12px',
                textAlign: 'center',
                fontWeight: 600,
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              {day}
            </div>
          ))}
          
          {/* Calendar Days */}
          {days.map((date, idx) => {
            const callsForDay = getCallsForDate(date)
            const isToday = date && date.toDateString() === new Date().toDateString()
            const isCurrentMonth = date !== null
            
            return (
              <div
                key={idx}
                style={{
                  minHeight: '100px',
                  padding: '8px',
                  backgroundColor: isToday ? 'var(--color-surface-elevated)' : 'transparent',
                  border: `1px solid ${isToday ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: '6px',
                  cursor: date ? 'pointer' : 'default',
                  opacity: isCurrentMonth ? 1 : 0.3
                }}
                onClick={() => date && router.push(`/service-calls?date=${date.toISOString().split('T')[0]}`)}
                onMouseEnter={(e) => {
                  if (date) {
                    e.currentTarget.style.backgroundColor = 'var(--color-hover)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (date && !isToday) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  } else if (date && isToday) {
                    e.currentTarget.style.backgroundColor = 'var(--color-surface-elevated)'
                  }
                }}
              >
                {date && (
                  <>
                    <div style={{
                      fontWeight: isToday ? 700 : 500,
                      fontSize: 'var(--text-sm)',
                      color: isToday ? 'var(--color-primary)' : 'var(--color-text-primary)',
                      marginBottom: '4px'
                    }}>
                      {date.getDate()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {callsForDay.slice(0, 3).map(call => (
                        <div
                          key={call.id}
                          style={{
                            padding: '4px 6px',
                            backgroundColor: call.status === 'Completed' ? 'rgba(76, 175, 80, 0.2)' : call.priority === 'High' ? 'rgba(239, 83, 80, 0.2)' : 'rgba(96, 165, 250, 0.2)',
                            borderRadius: '4px',
                            fontSize: 'var(--text-xs)',
                            color: 'var(--color-text-primary)',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            borderLeft: `3px solid ${call.status === 'Completed' ? '#4CAF50' : call.priority === 'High' ? '#EF5350' : '#60A5FA'}`
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/service-calls/${call.id}`)
                          }}
                          title={`${formatTime(call.scheduled_start)} - ${call.customer_name}: ${call.issue_description}`}
                        >
                          <div style={{ fontWeight: 500 }}>{formatTime(call.scheduled_start)}</div>
                          <div style={{ fontSize: '10px', opacity: 0.8 }}>{call.customer_name}</div>
                        </div>
                      ))}
                      {callsForDay.length > 3 && (
                        <div style={{
                          fontSize: 'var(--text-xs)',
                          color: 'var(--color-text-secondary)',
                          padding: '2px 6px',
                          textAlign: 'center'
                        }}>
                          +{callsForDay.length - 3} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
        
        {/* Legend */}
        <div style={{
          display: 'flex',
          gap: '16px',
          padding: '12px',
          backgroundColor: 'var(--color-surface-elevated)',
          borderRadius: '6px',
          fontSize: 'var(--text-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#60A5FA', borderRadius: '2px' }} />
            <span style={{ color: 'var(--color-text-secondary)' }}>Normal Priority</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#EF5350', borderRadius: '2px' }} />
            <span style={{ color: 'var(--color-text-secondary)' }}>High Priority</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#4CAF50', borderRadius: '2px' }} />
            <span style={{ color: 'var(--color-text-secondary)' }}>Completed</span>
          </div>
        </div>
      </div>
    </Card>
  )
}

