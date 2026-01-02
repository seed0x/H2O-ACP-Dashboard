'use client'
import { useState, useEffect } from 'react'
import { useTenant } from '../../contexts/TenantContext'
import { marketingApi, SeasonalEvent } from '../../lib/api/marketing'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { handleApiError, showSuccess } from '../../lib/error-handler'

const EVENT_TYPES = [
  { value: 'freeze', label: 'Freeze Warning' },
  { value: 'heat_wave', label: 'Heat Wave' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'city_event', label: 'City Event' }
]

export function SeasonalEventsView() {
  const { currentTenant } = useTenant()
  // Support both tenants - when 'both' is selected, default to h2o
  const tenantId = currentTenant === 'both' ? 'h2o' : (currentTenant || 'h2o')
  
  const [events, setEvents] = useState<SeasonalEvent[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<SeasonalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<SeasonalEvent | null>(null)
  const [formData, setFormData] = useState({
    event_type: 'holiday',
    name: '',
    start_date: '',
    end_date: '',
    city: '',
    content_suggestions: '',
    is_recurring: false
  })

  useEffect(() => {
    loadEvents()
    loadUpcomingEvents()
  }, [tenantId])

  const loadEvents = async () => {
    try {
      setLoading(true)
      const data = await marketingApi.listSeasonalEvents(tenantId)
      setEvents(data)
    } catch (error) {
      handleApiError(error, 'Load seasonal events')
    } finally {
      setLoading(false)
    }
  }

  const loadUpcomingEvents = async () => {
    try {
      const data = await marketingApi.getUpcomingEvents(tenantId, 30)
      setUpcomingEvents(data)
    } catch (error) {
      handleApiError(error, 'Load upcoming events')
    }
  }

  const isEventActive = (event: SeasonalEvent) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(event.start_date)
    const end = new Date(event.end_date)
    return today >= start && today <= end
  }

  const handleCreate = () => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    setFormData({
      event_type: 'holiday',
      name: '',
      start_date: today.toISOString().split('T')[0],
      end_date: tomorrow.toISOString().split('T')[0],
      city: '',
      content_suggestions: '',
      is_recurring: false
    })
    setEditingEvent(null)
    setShowCreateModal(true)
  }

  const handleEdit = (event: SeasonalEvent) => {
    setFormData({
      event_type: event.event_type,
      name: event.name,
      start_date: event.start_date,
      end_date: event.end_date,
      city: event.city || '',
      content_suggestions: event.content_suggestions || '',
      is_recurring: event.is_recurring
    })
    setEditingEvent(event)
    setShowCreateModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingEvent) {
        await marketingApi.updateSeasonalEvent(editingEvent.id, formData)
        showSuccess('Event updated successfully')
      } else {
        await marketingApi.createSeasonalEvent({
          tenant_id: tenantId,
          ...formData
        })
        showSuccess('Event created successfully')
      }
      setShowCreateModal(false)
      loadEvents()
      loadUpcomingEvents()
    } catch (error) {
      handleApiError(error, editingEvent ? 'Update event' : 'Create event')
    }
  }

  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return
    try {
      await marketingApi.deleteSeasonalEvent(eventId)
      showSuccess('Event deleted successfully')
      loadEvents()
      loadUpcomingEvents()
    } catch (error) {
      handleApiError(error, 'Delete event')
    }
  }

  const getEventTypeLabel = (type: string) => {
    return EVENT_TYPES.find(t => t.value === type)?.label || type
  }

  return (
    <div>
      {/* Upcoming Events Summary */}
      {upcomingEvents.length > 0 && (
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text-primary)' }}>
            Upcoming Events (Next 30 Days)
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {upcomingEvents.map((event) => {
              const isActive = isEventActive(event)
              return (
                <div key={event.id} style={{
                  padding: '8px 12px',
                  backgroundColor: isActive ? 'rgba(16, 185, 129, 0.1)' : 'var(--color-hover)',
                  border: isActive ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--color-border)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: isActive ? '#10b981' : 'var(--color-text-primary)'
                }}>
                  {event.name}
                  {isActive && <span style={{ marginLeft: '8px', fontSize: '12px' }}>(Active)</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <Button onClick={handleCreate}>+ New Event</Button>
      </div>

      {/* Events Table */}
      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '24px'
      }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            Loading events...
          </div>
        ) : events.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No events found. Create your first event to start planning seasonal content.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Name</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Type</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Dates</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>City</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => {
                  const isActive = isEventActive(event)
                  return (
                    <tr key={event.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{event.name}</div>
                        {event.is_recurring && (
                          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Recurring</div>
                        )}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>{getEventTypeLabel(event.event_type)}</td>
                      <td style={{ padding: '12px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                        {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>{event.city || '-'}</td>
                      <td style={{ padding: '12px' }}>
                        <StatusBadge 
                          status={isActive ? 'Active' : 'Upcoming'}
                          variant={isActive ? 'success' : 'default'}
                        />
                      </td>
                      <td style={{ padding: '12px', display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleEdit(event)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: 'var(--color-hover)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '6px',
                            color: 'var(--color-text-primary)',
                            fontSize: '14px',
                            cursor: 'pointer'
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(event.id)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: 'transparent',
                            border: '1px solid #EF5350',
                            borderRadius: '6px',
                            color: '#EF5350',
                            fontSize: '14px',
                            cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  padding: '8px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontSize: '20px'
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Select
                  label="Event Type"
                  value={formData.event_type}
                  onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                  options={EVENT_TYPES.map(t => ({ value: t.value, label: t.label }))}
                  required
                />
                <Input
                  label="Event Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Vancouver Freeze Warning 2026"
                  required
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Input
                    label="Start Date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                  <Input
                    label="End Date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
                <Input
                  label="City (optional)"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Target specific city"
                />
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--color-text-primary)' }}>
                    Content Suggestions
                  </label>
                  <textarea
                    value={formData.content_suggestions}
                    onChange={(e) => setFormData({ ...formData, content_suggestions: e.target.value })}
                    placeholder="Ideas for posts during this event..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      backgroundColor: 'var(--color-hover)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      color: 'var(--color-text-primary)',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_recurring}
                    onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                    style={{ cursor: 'pointer' }}
                  />
                  <label style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                    Recurring annually
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <Button type="button" onClick={() => setShowCreateModal(false)} variant="secondary">
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingEvent ? 'Update' : 'Create'} Event
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default SeasonalEventsView
