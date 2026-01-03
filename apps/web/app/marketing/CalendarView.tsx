'use client'

import { useState, useEffect } from 'react'
import { marketingApi } from '../../lib/api/marketing'
import { showToast } from '../../components/Toast'
import { handleApiError, logError } from '../../lib/error-handler'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Select } from '../../components/ui/Select'
import { StatusBadge } from '../../components/ui/StatusBadge'

interface PostInstance {
  id: string
  scheduled_for: string
  status: string
  content_item_id: string | null
  content_item?: {
    id: string
    title: string
    base_caption: string
    media_assets?: Array<{ file_url: string; file_type: string }>
  }
  channel_account?: {
    id: string
    name: string
  }
  suggested_category?: string
}

export function CalendarView() {
  const [instances, setInstances] = useState<PostInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedInstance, setSelectedInstance] = useState<PostInstance | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])
  
  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formCaption, setFormCaption] = useState('')
  const [formAccountId, setFormAccountId] = useState('')
  const [formScheduledDate, setFormScheduledDate] = useState('')
  const [formScheduledTime, setFormScheduledTime] = useState('09:00')
  const [submitting, setSubmitting] = useState(false)

  // Current month view
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    loadData()
  }, [currentMonth])

  async function loadData() {
    try {
      setLoading(true)
      const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
      
      const [calendarData, accountsData] = await Promise.all([
        marketingApi.getCalendar('h2o', start, end),
        marketingApi.listChannelAccounts('h2o')
      ])
      
      // Flatten calendar data
      const allInstances: PostInstance[] = []
      Object.entries(calendarData || {}).forEach(([date, dayInstances]) => {
        if (Array.isArray(dayInstances)) {
          dayInstances.forEach((inst: any) => {
            allInstances.push({
              ...inst,
              scheduled_for: date
            })
          })
        }
      })
      
      setInstances(allInstances)
      setAccounts(accountsData)
    } catch (error) {
      logError(error, 'loadCalendar')
      handleApiError(error, 'Load calendar')
      setInstances([])
    } finally {
      setLoading(false)
    }
  }

  // Get days in current month (Mon-Fri only)
  const getMonthDays = () => {
    const days: Date[] = []
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    // Start from Monday of week containing 1st
    const start = new Date(firstDay)
    const dayOfWeek = start.getDay()
    if (dayOfWeek === 0) start.setDate(1) // Sunday -> Monday
    else if (dayOfWeek > 1) start.setDate(1 - (dayOfWeek - 1)) // Back to Monday
    
    // End at Friday of week containing last day
    const end = new Date(lastDay)
    const endDayOfWeek = end.getDay()
    if (endDayOfWeek === 0) end.setDate(end.getDate() - 2) // Sunday -> Friday
    else if (endDayOfWeek === 6) end.setDate(end.getDate() - 1) // Saturday -> Friday
    
    const current = new Date(start)
    while (current <= end) {
      const dow = current.getDay()
      if (dow >= 1 && dow <= 5) days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    
    return days
  }

  const getInstancesForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return instances.filter(inst => {
      const instDate = inst.scheduled_for?.split('T')[0]
      return instDate === dateStr
    })
  }

  const handleDateClick = (date: Date, instance?: PostInstance) => {
    if (instance) {
      // Clicked on existing post - show details
      setSelectedInstance(instance)
      setSelectedDate(null)
    } else {
      // Clicked on empty date - show add form
      setSelectedDate(date)
      setSelectedInstance(null)
      setFormScheduledDate(date.toISOString().split('T')[0])
      setFormScheduledTime('09:00')
      setFormTitle('')
      setFormCaption('')
      setFormAccountId('')
      setShowAddModal(true)
    }
  }

  const handleFillEmptySlot = (instance: PostInstance) => {
    setSelectedInstance(instance)
    setSelectedDate(new Date(instance.scheduled_for))
    setFormScheduledDate(instance.scheduled_for.split('T')[0])
    const scheduledTime = new Date(instance.scheduled_for)
    setFormScheduledTime(`${String(scheduledTime.getHours()).padStart(2, '0')}:${String(scheduledTime.getMinutes()).padStart(2, '0')}`)
    setFormTitle('')
    setFormCaption('')
    setFormAccountId(instance.channel_account?.id || '')
    setShowAddModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim() || !formCaption.trim() || !formAccountId) {
      showToast('Please fill in all required fields', 'error')
      return
    }

    setSubmitting(true)
    try {
      // Create content item
      const contentItem = await marketingApi.createContentItem({
        tenant_id: 'h2o',
        title: formTitle.trim(),
        base_caption: formCaption.trim(),
        status: 'Draft',
        owner: 'admin'
      })

      // Create post instance
      const scheduledDateTime = new Date(`${formScheduledDate}T${formScheduledTime}`)
      
      if (selectedInstance) {
        // Update existing empty slot
        await marketingApi.updatePostInstance(selectedInstance.id, {
          content_item_id: contentItem.id,
          scheduled_for: scheduledDateTime.toISOString(),
          status: 'Draft'
        })
      } else {
        // Create new post instance
        await marketingApi.createPostInstances('h2o', {
          content_item_id: contentItem.id,
          channel_account_ids: [formAccountId],
          scheduled_for: scheduledDateTime.toISOString()
        })
      }

      showToast('Post created successfully', 'success')
      setShowAddModal(false)
      await loadData()
    } catch (error) {
      handleApiError(error, 'Create post')
      showToast('Failed to create post', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleTopoff = async () => {
    try {
      const result = await marketingApi.topoffScheduler('h2o', 28)
      showToast(`Created ${result.instances_created} planned slots`, 'success')
      await loadData()
    } catch (error) {
      handleApiError(error, 'Top off scheduler')
      showToast('Failed to generate slots', 'error')
    }
  }

  const monthDays = getMonthDays()
  const emptySlots = instances.filter(inst => !inst.content_item_id)
  const filledSlots = instances.filter(inst => inst.content_item_id)

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-secondary)' }}>
        Loading calendar...
      </div>
    )
  }

  return (
    <div>
      {/* Header Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <Card>
          <div style={{ padding: '20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Empty Slots</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--color-primary)' }}>{emptySlots.length}</div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Scheduled Posts</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#10B981' }}>{filledSlots.length}</div>
          </div>
        </Card>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => {
              const prev = new Date(currentMonth)
              prev.setMonth(prev.getMonth() - 1)
              setCurrentMonth(prev)
            }}
            style={{ padding: '8px 16px', backgroundColor: 'var(--color-hover)', border: '1px solid var(--color-border)', borderRadius: '8px', cursor: 'pointer' }}
          >
            ← Prev
          </button>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', minWidth: '200px', textAlign: 'center' }}>
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <button
            onClick={() => {
              const next = new Date(currentMonth)
              next.setMonth(next.getMonth() + 1)
              setCurrentMonth(next)
            }}
            style={{ padding: '8px 16px', backgroundColor: 'var(--color-hover)', border: '1px solid var(--color-border)', borderRadius: '8px', cursor: 'pointer' }}
          >
            Next →
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            style={{ padding: '8px 16px', backgroundColor: 'var(--color-hover)', border: '1px solid var(--color-border)', borderRadius: '8px', cursor: 'pointer' }}
          >
            Today
          </button>
        </div>
        <Button onClick={handleTopoff} variant="primary">
          Generate 28 Days of Slots
        </Button>
      </div>

      {/* Calendar Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1px', backgroundColor: 'var(--color-border)', border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden' }}>
        {/* Headers */}
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
          <div key={day} style={{ padding: '12px', backgroundColor: 'var(--color-card)', textAlign: 'center', fontWeight: '600', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            {day}
          </div>
        ))}

        {/* Days */}
        {monthDays.map(day => {
          const dayInstances = getInstancesForDate(day)
          const isToday = day.toDateString() === new Date().toDateString()
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
          
          return (
            <div
              key={day.toISOString()}
              onClick={() => handleDateClick(day)}
              style={{
                minHeight: '120px',
                padding: '8px',
                backgroundColor: 'var(--color-card)',
                cursor: 'pointer',
                border: isToday ? '2px solid var(--color-primary)' : 'none',
                opacity: isCurrentMonth ? 1 : 0.4
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: isToday ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>
                {day.getDate()}
              </div>
              
              {dayInstances.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                  Click to add
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {dayInstances.slice(0, 3).map(inst => {
                    const isEmpty = !inst.content_item_id
                    return (
                      <div
                        key={inst.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (isEmpty) {
                            handleFillEmptySlot(inst)
                          } else {
                            setSelectedInstance(inst)
                          }
                        }}
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          backgroundColor: isEmpty ? 'rgba(147, 51, 234, 0.2)' : 'var(--color-hover)',
                          border: isEmpty ? '1px dashed rgba(147, 51, 234, 0.5)' : '1px solid var(--color-border)',
                          cursor: 'pointer'
                        }}
                      >
                        {isEmpty ? (
                          <div>
                            <div style={{ fontWeight: '600', color: '#A78BFA' }}>Empty Slot</div>
                            <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>
                              {inst.channel_account?.name || 'Unknown'}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {inst.content_item?.title || 'Untitled'}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>
                              {inst.channel_account?.name || 'Unknown'}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {dayInstances.length > 3 && (
                    <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                      +{dayInstances.length - 3} more
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <Card style={{ width: '90%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                  {selectedInstance ? 'Fill Empty Slot' : 'Create New Post'}
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontSize: '24px' }}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Title *</label>
                    <Input
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g., $250 Off Water Heater Installation"
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Content *</label>
                    <Textarea
                      value={formCaption}
                      onChange={(e) => setFormCaption(e.target.value)}
                      placeholder="Write your post content here..."
                      rows={4}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Account *</label>
                    <Select
                      value={formAccountId}
                      onChange={(e) => setFormAccountId(e.target.value)}
                      options={[
                        { value: '', label: 'Select account...' },
                        ...accounts.map(acc => ({ value: acc.id, label: acc.name }))
                      ]}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Date *</label>
                      <Input
                        type="date"
                        value={formScheduledDate}
                        onChange={(e) => setFormScheduledDate(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Time *</label>
                      <Input
                        type="time"
                        value={formScheduledTime}
                        onChange={(e) => setFormScheduledTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <Button type="submit" variant="primary" disabled={submitting}>
                      {submitting ? 'Creating...' : 'Create Post'}
                    </Button>
                    <Button type="button" onClick={() => setShowAddModal(false)} variant="secondary">
                      Cancel
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* View Post Modal */}
      {selectedInstance && !showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <Card style={{ width: '90%', maxWidth: '500px' }}>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                  {selectedInstance.content_item?.title || 'Post Details'}
                </h2>
                <button
                  onClick={() => setSelectedInstance(null)}
                  style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontSize: '24px' }}
                >
                  ×
                </button>
              </div>

              {selectedInstance.content_item ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Content</div>
                    <div style={{ fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                      {selectedInstance.content_item.base_caption}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Account</div>
                    <div style={{ fontSize: '14px' }}>{selectedInstance.channel_account?.name || 'Unknown'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Scheduled</div>
                    <div style={{ fontSize: '14px' }}>
                      {new Date(selectedInstance.scheduled_for).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <StatusBadge status={selectedInstance.status} />
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ marginBottom: '16px' }}>This is an empty slot. Click below to add content.</p>
                  <Button onClick={() => handleFillEmptySlot(selectedInstance)} variant="primary">
                    Add Content to This Slot
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

