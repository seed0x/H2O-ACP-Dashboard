'use client'
import UilMapMarker from '@iconscout/react-unicons/icons/uil-map-marker'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { API_BASE_URL } from '../lib/config'
import { useTenant } from '../contexts/TenantContext'
import { handleApiError } from '../lib/error-handler'
import { TenantIndicator } from './TenantIndicator'

interface ScheduleItem {
  id: string | number
  type: 'job' | 'service_call'
  time: string
  title: string
  location: string
  status: string
  assignedTo: string
  tenant: 'all_county' | 'h2o'
  priority?: string
}

interface GroupedSchedule {
  [person: string]: ScheduleItem[]
}

export function TodaysSchedule() {
  const router = useRouter()
  const { currentTenant, isTenantSelected } = useTenant()
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTodaysSchedule()
  }, [currentTenant])

  async function loadTodaysSchedule() {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      // Use local date, not UTC - format as YYYY-MM-DD
      const now = new Date()
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

      const items: ScheduleItem[] = []

      // Load today's jobs (All County)
      if (isTenantSelected('all_county')) {
        try {
          const response = await axios.get(
            `${API_BASE_URL}/jobs?tenant_id=all_county&scheduled_date=${today}`,
            { headers, withCredentials: true }
          )
          
          const jobs = Array.isArray(response.data) ? response.data : []
          jobs.forEach((job: any) => {
            if (job.scheduled_start) {
              items.push({
                id: job.id,
                type: 'job',
                time: formatTime(job.scheduled_start),
                title: `${job.builder?.name || 'Unknown Builder'} - Lot ${job.lot_number || 'N/A'}`,
                location: job.address_line1 || 'No address',
                status: job.status || 'Unknown',
                assignedTo: String(job.tech_name || job.assigned_to || 'Unassigned'),
                tenant: 'all_county' as const,
                priority: job.priority
              })
            }
          })
        } catch (error) {
          handleApiError(error, 'Loading today\'s jobs')
        }
      }

      // Load today's service calls (H2O)
      if (isTenantSelected('h2o')) {
        try {
          const response = await axios.get(
            `${API_BASE_URL}/service-calls?tenant_id=h2o&scheduled_date=${today}`,
            { headers, withCredentials: true }
          )
          
          const calls = Array.isArray(response.data) ? response.data : []
          calls.forEach((call: any) => {
            if (call.scheduled_start) {
              items.push({
                id: call.id,
                type: 'service_call',
                time: formatTime(call.scheduled_start),
                title: String(call.customer_name || 'Unknown Customer'),
                location: `${call.address_line1 || 'No address'}${call.city ? ', ' + call.city : ''}`,
                status: call.status || 'Unknown',
                assignedTo: String(call.assigned_to || 'Unassigned'),
                tenant: 'h2o' as const,
                priority: call.priority
              })
            }
          })
        } catch (error) {
          handleApiError(error, 'Loading today\'s service calls')
        }
      }

      // Sort by time
      items.sort((a, b) => a.time.localeCompare(b.time))
      setScheduleItems(items)
    } catch (error) {
      console.error('Failed to load today\'s schedule:', error)
    } finally {
      setLoading(false)
    }
  }

  function formatTime(dateString: string): string {
    try {
      const date = new Date(dateString)
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    } catch {
      return 'Time N/A'
    }
  }

  function groupByPerson(items: ScheduleItem[]): GroupedSchedule {
    return items.reduce((acc, item) => {
      const person = item.assignedTo
      if (!acc[person]) {
        acc[person] = []
      }
      acc[person].push(item)
      return acc
    }, {} as GroupedSchedule)
  }

  function handleItemClick(item: ScheduleItem) {
    const path = item.type === 'job' ? `/jobs/${item.id}` : `/service-calls/${item.id}`
    router.push(path)
  }

  const groupedSchedule = groupByPerson(scheduleItems)
  const peopleWithTasks = Object.keys(groupedSchedule).filter(person => person !== 'Unassigned')
  const unassignedTasks = groupedSchedule['Unassigned'] || []

  if (loading) {
    return (
      <div style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px'
      }}>
        <h2 style={{
          fontSize: 'var(--text-lg)',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          marginBottom: '20px'
        }}>
          Today's Schedule
        </h2>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px' 
        }}>
          {[1, 2, 3].map(i => (
            <div 
              key={i}
              style={{
                height: '80px',
                backgroundColor: 'var(--color-surface-elevated)',
                borderRadius: 'var(--radius-md)',
                animation: 'skeleton-pulse 1.5s ease-in-out infinite'
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (scheduleItems.length === 0) {
    return (
      <div style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '48px',
        textAlign: 'center',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ 
          fontSize: 'var(--text-lg)', 
          fontWeight: 600, 
          color: 'var(--color-text-primary)', 
          marginBottom: '8px' 
        }}>
          No Schedule for Today
        </div>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          All clear! No jobs or service calls scheduled for today.
        </div>
      </div>
    )
  }

  return (
    <div style={{
      backgroundColor: 'var(--color-card)',
      border: '1px solid var(--color-border)',
      borderRadius: '12px',
      padding: '24px'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <h2 style={{
          fontSize: 'var(--text-lg)',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          margin: 0
        }}>
          Today's Schedule
        </h2>
        <div style={{ 
          fontSize: 'var(--text-sm)', 
          color: 'var(--color-text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>{scheduleItems.length} {scheduleItems.length === 1 ? 'item' : 'items'}</span>
          <span>•</span>
          <span>{peopleWithTasks.length} {peopleWithTasks.length === 1 ? 'person' : 'people'}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Assigned Tasks */}
        {peopleWithTasks.map(person => (
          <div key={person}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--color-border)'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {person.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{
                  fontSize: '15px',
                  fontWeight: '600',
                  color: 'var(--color-text-primary)'
                }}>
                  {person}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--color-text-secondary)'
                }}>
                  {groupedSchedule[person].length} {groupedSchedule[person].length === 1 ? 'task' : 'tasks'}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '40px' }}>
              {groupedSchedule[person].map(item => (
                <ScheduleItemCard key={`${item.type}-${item.id}`} item={item} onClick={() => handleItemClick(item)} />
              ))}
            </div>
          </div>
        ))}

        {/* Unassigned Tasks */}
        {unassignedTasks.length > 0 && (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--color-border)'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 83, 80, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#EF5350',
                fontSize: '18px'
              }}>
                <span style={{ color: 'var(--color-warning)' }}>!</span>
              </div>
              <div>
                <div style={{
                  fontSize: '15px',
                  fontWeight: '600',
                  color: 'var(--color-text-primary)'
                }}>
                  Unassigned
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#EF5350'
                }}>
                  Needs assignment
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '40px' }}>
              {unassignedTasks.map(item => (
                <ScheduleItemCard key={`${item.type}-${item.id}`} item={item} onClick={() => handleItemClick(item)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ScheduleItemCard({ item, onClick }: { item: ScheduleItem; onClick: () => void }) {
  const statusColors: Record<string, any> = {
    'Scheduled': { bg: 'rgba(96, 165, 250, 0.15)', color: '#60A5FA' },
    'In Progress': { bg: 'rgba(255, 152, 0, 0.15)', color: '#FFA726' },
    'Completed': { bg: 'rgba(76, 175, 80, 0.15)', color: '#66BB6A' },
    'New': { bg: 'rgba(158, 158, 158, 0.15)', color: '#BDBDBD' }
  }

  const statusStyle = statusColors[item.status] || statusColors['New']

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: 'var(--color-hover)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-primary)'
        e.currentTarget.style.transform = 'translateX(4px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border)'
        e.currentTarget.style.transform = 'translateX(0)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          <span style={{ 
            fontSize: '14px', 
            fontWeight: '600',
            color: 'var(--color-text-primary)'
          }}>
            {item.time}
          </span>
          <TenantIndicator tenant={item.tenant} variant="icon" size="sm" />
        </div>
        <span style={{
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '500',
          backgroundColor: statusStyle.bg,
          color: statusStyle.color,
          whiteSpace: 'nowrap'
        }}>
          {item.status}
        </span>
      </div>
      
      <div style={{
        fontSize: '14px',
        fontWeight: '500',
        color: 'var(--color-text-primary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {item.title}
      </div>
      
      <div style={{
        fontSize: '12px',
        color: 'var(--color-text-secondary)',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        <UilMapMarker size={14} color="var(--color-text-secondary)" />
        <span>{item.location}</span>
      </div>
    </div>
  )
}
