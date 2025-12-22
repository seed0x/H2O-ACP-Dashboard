'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { API_BASE_URL } from '../../lib/config'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { showToast } from '../../components/Toast'
import { handleApiError, logError } from '../../lib/error-handler'

// Hardcoded tech user - change this to match your tech user's username
const TECH_USERNAME = 'tech'

interface ScheduleItem {
  id: string
  customer_name: string
  phone: string | null
  address_line1: string
  city: string
  scheduled_start: string | null
  status: string
  priority: string
  issue_description: string
}

export default function TechSchedulePage() {
  const router = useRouter()
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTodaysSchedule()
  }, [])

  async function loadTodaysSchedule() {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      const today = new Date().toISOString().split('T')[0]

      const response = await axios.get(
        `${API_BASE_URL}/service-calls?tenant_id=h2o&assigned_to=${TECH_USERNAME}&scheduled_date=${today}`,
        { headers, withCredentials: true }
      )
      
      const calls = Array.isArray(response.data) ? response.data : []
      setScheduleItems(calls)
    } catch (err: any) {
      logError(err, 'loadTechSchedule')
      const errorMsg = handleApiError(err)
      setError(errorMsg)
      showToast(errorMsg, 'error')
    } finally {
      setLoading(false)
    }
  }

  function formatTime(dateString: string | null): string {
    if (!dateString) return 'No time'
    try {
      const date = new Date(dateString)
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    } catch {
      return 'Invalid time'
    }
  }


  if (loading) {
    return (
      <div style={{ padding: '32px' }}>
        <PageHeader
          title={`Today's Schedule - ${TECH_USERNAME}`}
          description={new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
          action={<Button onClick={() => router.push('/')}>← Back</Button>}
        />
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '48px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '18px', color: 'var(--color-text-secondary)' }}>
            Loading today's schedule...
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '32px' }}>
        <PageHeader
          title={`Today's Schedule - ${TECH_USERNAME}`}
          action={<Button onClick={() => router.push('/')}>← Back</Button>}
        />
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <div style={{ color: '#ef4444', marginBottom: '16px' }}>Error: {error}</div>
          <Button onClick={loadTodaysSchedule}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader
        title={`Today's Schedule - ${TECH_USERNAME}`}
        description={`${new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })} • ${scheduleItems.length} ${scheduleItems.length === 1 ? 'appointment' : 'appointments'} scheduled`}
        action={<Button onClick={() => router.push('/')}>← Back to Dashboard</Button>}
      />

        {/* Schedule Items */}
        {scheduleItems.length === 0 ? (
          <div style={{
            backgroundColor: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '48px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '18px',
              color: 'var(--color-text-secondary)',
              marginBottom: '8px'
            }}>
              No appointments scheduled for today
            </div>
            <div style={{
              fontSize: '14px',
              color: 'var(--color-text-tertiary)'
            }}>
              All clear! 🎉
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {scheduleItems.map((item) => (
              <div
                key={item.id}
                onClick={() => router.push(`/service-calls/${item.id}`)}
                style={{
                  backgroundColor: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  ':hover': {
                    borderColor: 'var(--color-primary)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr auto',
                  gap: '20px',
                  alignItems: 'start'
                }}>
                  {/* Time */}
                  <div style={{
                    textAlign: 'center',
                    padding: '12px',
                    backgroundColor: 'var(--color-hover)',
                    borderRadius: '8px'
                  }}>
                    <div style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: 'var(--color-primary)'
                    }}>
                      {formatTime(item.scheduled_start)}
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: 'var(--color-text-primary)',
                      marginBottom: '8px'
                    }}>
                      {item.customer_name}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: 'var(--color-text-secondary)',
                      marginBottom: '4px'
                    }}>
                      📍 {item.address_line1}, {item.city}
                    </div>
                    {item.phone && (
                      <div style={{
                        fontSize: '14px',
                        color: 'var(--color-text-secondary)',
                        marginBottom: '8px'
                      }}>
                        📞 {item.phone}
                      </div>
                    )}
                    <div style={{
                      fontSize: '14px',
                      color: 'var(--color-text-tertiary)',
                      marginTop: '8px',
                      lineHeight: '1.5'
                    }}>
                      {item.issue_description}
                    </div>
                  </div>

                  {/* Status & Priority */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    alignItems: 'flex-end'
                  }}>
                    <StatusBadge status={item.status} />
                    <div style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      backgroundColor: item.priority === 'High' ? '#ef444420' : item.priority === 'Normal' ? '#f59e0b20' : '#10b98120',
                      color: item.priority === 'High' ? '#ef4444' : item.priority === 'Normal' ? '#f59e0b' : '#10b981'
                    }}>
                      {item.priority} Priority
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

