'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { API_BASE_URL } from '../../lib/config'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { WorkflowStepper } from '../../components/ui/WorkflowStepper'
import { Card } from '../../components/ui/Card'
import { Select } from '../../components/ui/Select'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { showToast } from '../../components/Toast'
import { handleApiError, logError } from '../../lib/error-handler'
import { formatTime } from '../../lib/utils/dateFormat'
import { ServiceCallCheckoffs } from '../../components/ServiceCallCheckoffs'
import UilCheckCircle from '@iconscout/react-unicons/icons/uil-check-circle'
import UilCreditCard from '@iconscout/react-unicons/icons/uil-credit-card'
import UilClipboardNotes from '@iconscout/react-unicons/icons/uil-clipboard-notes'
import UilMapMarker from '@iconscout/react-unicons/icons/uil-map-marker'
import UilPhone from '@iconscout/react-unicons/icons/uil-phone'
import UilFileAlt from '@iconscout/react-unicons/icons/uil-file-alt'
import UilShoppingCart from '@iconscout/react-unicons/icons/uil-shopping-cart'
import UilEnvelopeSend from '@iconscout/react-unicons/icons/uil-envelope-send'
import UilPhoneAlt from '@iconscout/react-unicons/icons/uil-phone-alt'
import UilInvoice from '@iconscout/react-unicons/icons/uil-invoice'
import UilUser from '@iconscout/react-unicons/icons/uil-user'
import UilCalendarAlt from '@iconscout/react-unicons/icons/uil-calendar-alt'
import UilPlusCircle from '@iconscout/react-unicons/icons/uil-plus-circle'
import UilTimesCircle from '@iconscout/react-unicons/icons/uil-times-circle'
import UilCheck from '@iconscout/react-unicons/icons/uil-check'

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
  payment_status?: string
  billing_writeup_status?: string
  paperwork_turned_in?: boolean
}

export default function TechSchedulePage() {
  const router = useRouter()
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [techUsername, setTechUsername] = useState<string>('')
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null)
  const isInitialLoad = useRef(true)

  // Get username from JWT token
  useEffect(() => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        const parts = token.split('.')
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]))
          const username = payload.username || 'tech'
          setTechUsername(username)
        } else {
          setTechUsername('tech') // Fallback
        }
      } else {
        setTechUsername('tech') // Fallback
      }
    } catch (error) {
      logError(error, 'Parse token for username')
      setTechUsername('tech') // Fallback
    }
  }, [])

  useEffect(() => {
    if (!techUsername) return // Wait for username to be loaded
    
    let pollInterval: NodeJS.Timeout | null = null
    
    // Initial load
    loadTodaysSchedule(false)
    
    // Set up polling to refresh every 30 seconds (silent refresh)
    pollInterval = setInterval(() => {
      loadTodaysSchedule(true) // silent = true to avoid loading spinner
    }, 30000) // 30 seconds
    
    // Refresh when page becomes visible (user switches back to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadTodaysSchedule(true) // silent refresh when tab becomes visible
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Cleanup
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [techUsername])

  async function loadTodaysSchedule(silent = false) {
    // Don't show loading spinner on silent refreshes (polling)
    if (!silent) {
      setLoading(true)
    }
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      const today = new Date().toISOString().split('T')[0]

      if (!techUsername) {
        setError('Unable to determine user. Please log in again.')
        setLoading(false)
        return
      }

      const response = await axios.get(
        `${API_BASE_URL}/service-calls?tenant_id=h2o&assigned_to=${techUsername}&scheduled_date=${today}`,
        { headers, withCredentials: true }
      )
      
      const calls = Array.isArray(response.data) ? response.data : []
      const previousCount = scheduleItems.length
      
      // Check if new items were added before updating state
      const hasNewItems = !isInitialLoad.current && previousCount > 0 && calls.length > previousCount
      const newCount = hasNewItems ? calls.length - previousCount : 0
      
      setScheduleItems(calls)
      isInitialLoad.current = false
      
      // Show toast if new items were added (but not on initial load)
      if (hasNewItems && !silent) {
        showToast(`📅 ${newCount} new ${newCount === 1 ? 'appointment' : 'appointments'} added to your schedule!`, 'success')
      }
    } catch (err: any) {
      logError(err, 'loadTechSchedule')
      const errorMsg = handleApiError(err)
      // Only show error on manual refresh, not on polling
      if (!silent) {
        setError(errorMsg)
        showToast(errorMsg, 'error')
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }


  if (loading) {
    return (
      <div style={{ padding: '32px' }}>
        <PageHeader
          title={`Today's Schedule${techUsername ? ` - ${techUsername}` : ''}`}
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
          title={`Today's Schedule${techUsername ? ` - ${techUsername}` : ''}`}
          action={<Button onClick={() => router.push('/')}>← Back</Button>}
        />
        <div style={{
          backgroundColor: 'var(--color-error-bg)',
          border: '1px solid var(--color-error)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px'
        }}>
          <div style={{ 
            color: 'var(--color-error)', 
            fontSize: 'var(--text-base)', 
            fontWeight: 500,
            marginBottom: '16px' 
          }}>
            Error: {error}
          </div>
          <Button onClick={() => loadTodaysSchedule()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader
        title={`Today's Schedule${techUsername ? ` - ${techUsername}` : ''}`}
        description={`${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • ${scheduleItems.length} ${scheduleItems.length === 1 ? 'appointment' : 'appointments'} scheduled`}
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button 
              onClick={() => loadTodaysSchedule()}
              variant="secondary"
            >
              Refresh
            </Button>
            <Button onClick={() => router.push('/')}>← Back to Dashboard</Button>
          </div>
        }
      />

      {/* Schedule Items */}
      {scheduleItems.length === 0 ? (
          <Card>
            <div style={{ padding: '48px', textAlign: 'center' }}>
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
                All clear!
              </div>
            </div>
          </Card>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {scheduleItems.map((item) => (
              <Card
                key={item.id}
                style={{
                  cursor: 'default',
                  transition: 'all 0.2s'
                }}
              >
                <div
                  onClick={() => {
                    // Toggle workflow expansion, or navigate if not starting workflow
                    if (item.status === 'Scheduled' || item.status === 'In Progress') {
                      setExpandedCallId(expandedCallId === item.id ? null : item.id)
                    } else {
                      router.push(`/service-calls/${item.id}`)
                    }
                  }}
                  style={{
                    cursor: 'pointer'
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
                      backgroundColor: item.status === 'Completed' 
                        ? 'rgba(34, 197, 94, 0.1)' 
                        : item.status === 'In Progress'
                        ? 'rgba(59, 130, 246, 0.1)'
                        : 'var(--color-hover)',
                      borderRadius: '8px',
                      border: item.status === 'Completed' 
                        ? '1px solid rgba(34, 197, 94, 0.3)' 
                        : item.status === 'In Progress'
                        ? '1px solid rgba(59, 130, 246, 0.3)'
                        : '1px solid var(--color-border)',
                      minWidth: '80px'
                    }}>
                      <div style={{
                        fontSize: '20px',
                        fontWeight: '700',
                        color: item.status === 'Completed' 
                          ? 'rgb(34, 197, 94)' 
                          : item.status === 'In Progress'
                          ? 'rgb(59, 130, 246)'
                          : 'var(--color-primary)'
                      }}>
                        {formatTime(item.scheduled_start)}
                      </div>
                      {item.status === 'Completed' && (
                        <div style={{
                          fontSize: '10px',
                          color: 'rgb(34, 197, 94)',
                          marginTop: '4px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}>
                          <UilCheckCircle size={12} color="rgb(34, 197, 94)" />
                          Done
                        </div>
                      )}
                    </div>

                    {/* Customer Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: 'var(--color-text-primary)',
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'wrap'
                      }}>
                        <span>{item.customer_name}</span>
                        {/* Quick status indicators */}
                        {item.paperwork_turned_in && (
                          <span style={{
                            padding: '2px 8px',
                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                            color: 'rgb(34, 197, 94)',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <UilCheckCircle size={12} color="rgb(34, 197, 94)" />
                            Paperwork
                          </span>
                        )}
                        {item.payment_status === 'Paid' && (
                          <span style={{
                            padding: '2px 8px',
                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                            color: 'rgb(34, 197, 94)',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <UilCreditCard size={12} color="rgb(34, 197, 94)" />
                            Paid
                          </span>
                        )}
                        {item.billing_writeup_status === 'Needs Write-up' && (
                          <span style={{
                            padding: '2px 8px',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <UilFileAlt size={12} color="#ef4444" />
                            Needs Write-up
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: 'var(--color-text-secondary)',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <UilMapMarker size={16} color="var(--color-text-secondary)" />
                        <span>{item.address_line1}, {item.city}</span>
                      </div>
                      {item.phone && (
                        <div style={{
                          fontSize: '14px',
                          color: 'var(--color-text-secondary)',
                          marginBottom: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <UilPhone size={16} color="var(--color-text-secondary)" />
                          <a 
                            href={`tel:${item.phone}`}
                            style={{ 
                              color: 'var(--color-primary)', 
                              textDecoration: 'none' 
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                          >
                            {item.phone}
                          </a>
                        </div>
                      )}
                      <div style={{
                        fontSize: '14px',
                        color: 'var(--color-text-tertiary)',
                        marginTop: '8px',
                        lineHeight: '1.5',
                        padding: '8px 12px',
                        backgroundColor: 'var(--color-surface-elevated)',
                        borderRadius: '6px'
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
                      {(item.status === 'Scheduled' || item.status === 'In Progress') && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpandedCallId(expandedCallId === item.id ? null : item.id)
                          }}
                        >
                          {expandedCallId === item.id ? 'Hide Workflow' : 'Start Workflow'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Workflow & Check-offs Section */}
                {expandedCallId === item.id && (item.status === 'Scheduled' || item.status === 'In Progress') && (
                  <div 
                    style={{
                      marginTop: '24px',
                      paddingTop: '24px',
                      borderTop: '1px solid var(--color-border)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <WorkflowStepper 
                      serviceCallId={item.id}
                      onComplete={() => {
                        showToast('Workflow completed!', 'success')
                        loadTodaysSchedule(true) // Refresh schedule silently
                      }}
                    />
                    <ServiceCallCheckoffs serviceCallId={item.id} customerName={item.customer_name} />
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
    </div>
  )
}

