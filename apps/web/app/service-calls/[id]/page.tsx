'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { API_BASE_URL } from '../../../lib/config'
import { PageHeader } from '../../../components/ui/PageHeader'
import { Button } from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Textarea } from '../../../components/ui/Textarea'
import { WorkflowStepper } from '../../../components/ui/WorkflowStepper'
import { Card, CardHeader, CardSection } from '../../../components/ui/Card'
import { showToast } from '../../../components/Toast'
import { handleApiError, logError } from '../../../lib/error-handler'
import UilCalendarAlt from '@iconscout/react-unicons/icons/uil-calendar-alt'
import UilUser from '@iconscout/react-unicons/icons/uil-user'
import UilMapMarker from '@iconscout/react-unicons/icons/uil-map-marker'
import UilPhone from '@iconscout/react-unicons/icons/uil-phone'
import UilEnvelope from '@iconscout/react-unicons/icons/uil-envelope'
import UilExclamationTriangle from '@iconscout/react-unicons/icons/uil-exclamation-triangle'
import UilClock from '@iconscout/react-unicons/icons/uil-clock'
import UilFileAlt from '@iconscout/react-unicons/icons/uil-file-alt'

// Icon component wrapper for consistent sizing
function IconWrapper({ Icon, size = 20, color = 'var(--color-text-secondary)' }: { Icon: React.ComponentType<{ size?: number | string; color?: string }>, size?: number, color?: string }) {
  return <Icon size={size} color={color} />
}

interface ServiceCall {
  id: string
  tenant_id: string
  builder_id?: string
  customer_name: string
  phone?: string
  email?: string
  address_line1: string
  city: string
  zip: string
  state: string
  issue_description: string
  status: string
  priority: string
  notes?: string
  assigned_to?: string
  scheduled_start?: string
  scheduled_end?: string
  created_at: string
  updated_at: string
}

interface Builder {
  id: string
  name: string
}

interface AuditLog {
  id: string
  action: string
  field?: string
  old_value?: string
  new_value?: string
  changed_by: string
  changed_at: string
}

export default function ServiceCallDetail({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const router = useRouter()
  const [sc, setSc] = useState<ServiceCall | null>(null)
  const [builder, setBuilder] = useState<Builder | null>(null)
  const [audit, setAudit] = useState<AuditLog[]>([])
  const [id, setId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Form state
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [scheduledStartDate, setScheduledStartDate] = useState('')
  const [scheduledStartTime, setScheduledStartTime] = useState('')
  const [scheduledEndDate, setScheduledEndDate] = useState('')
  const [scheduledEndTime, setScheduledEndTime] = useState('')
  const [notes, setNotes] = useState('')
  const [suggestedPortals, setSuggestedPortals] = useState<any[]>([])
  const [loadingPortals, setLoadingPortals] = useState(false)

  useEffect(() => {
    async function getParams() {
      const resolvedParams = params instanceof Promise ? await params : params
      setId(resolvedParams.id)
    }
    getParams()
  }, [params])

  function getAuthHeaders() {
    const token = localStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }

  useEffect(() => {
    if (!id) return
    loadData()
  }, [id])

  async function loadData() {
    try {
      setLoading(true)
      const headers = getAuthHeaders()
      
      // Load service call
      const scRes = await axios.get(`${API_BASE_URL}/service-calls/${id}`, { headers, withCredentials: true })
      const scData = scRes.data
      setSc(scData)
      
      // Set form state
      setStatus(scData.status || '')
      setPriority(scData.priority || '')
      setAssignedTo(scData.assigned_to || '')
      
      // Parse scheduled_start with time
      if (scData.scheduled_start) {
        const startDate = new Date(scData.scheduled_start)
        setScheduledStartDate(startDate.toISOString().split('T')[0])
        setScheduledStartTime(startDate.toTimeString().slice(0, 5)) // HH:MM
      } else {
        setScheduledStartDate('')
        setScheduledStartTime('')
      }
      
      // Parse scheduled_end with time
      if (scData.scheduled_end) {
        const endDate = new Date(scData.scheduled_end)
        setScheduledEndDate(endDate.toISOString().split('T')[0])
        setScheduledEndTime(endDate.toTimeString().slice(0, 5)) // HH:MM
      } else {
        setScheduledEndDate('')
        setScheduledEndTime('')
      }
      
      setNotes(scData.notes || '')
      
      // Load builder
      if (scData.builder_id) {
        try {
          const builderRes = await axios.get(`${API_BASE_URL}/builders/${scData.builder_id}`, { headers, withCredentials: true })
          setBuilder(builderRes.data)
        } catch (err) {
          logError(err, 'loadBuilder')
        }
      }
      
      // Load audit
      await loadAudit()
      
      // Load suggested portals
      await loadSuggestedPortals()
    } catch (err: any) {
      logError(err, 'loadServiceCall')
      showToast(handleApiError(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  async function loadSuggestedPortals() {
    if (!id) return
    const currentSc = sc
    if (!currentSc) return
    try {
      setLoadingPortals(true)
      const headers = getAuthHeaders()
      const params: any = {
        applies_to: 'service_call',
        tenant_id: currentSc.tenant_id,
      }
      if (currentSc.city) params.city = currentSc.city
      if (currentSc.builder_id) params.builder_id = currentSc.builder_id
      
      const response = await axios.get(`${API_BASE_URL}/directory/suggested-portals`, {
        headers,
        params,
        withCredentials: true
      })
      setSuggestedPortals(Array.isArray(response.data) ? response.data : [])
    } catch (err) {
      logError(err, 'loadSuggestedPortals')
      setSuggestedPortals([])
    } finally {
      setLoadingPortals(false)
    }
  }

  async function loadAudit() {
    if (!id) return
    try {
      const headers = getAuthHeaders()
      const res = await axios.get(`${API_BASE_URL}/audit`, {
        headers,
        params: { entity_type: 'service_call', entity_id: id },
        withCredentials: true
      })
      setAudit(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      logError(err, 'loadAudit')
      setAudit([])
    }
  }

  async function saveServiceCall() {
    if (!id) return
    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Not authenticated. Please log in again.')
      }
      const headers = { 'Authorization': `Bearer ${token}` }
      
      // Combine date and time for scheduled dates
      const combineDateTime = (date: string, time: string): string | null => {
        if (!date) return null
        if (!time) {
          // If no time, use start of day
          return new Date(date + 'T00:00:00').toISOString()
        }
        return new Date(date + 'T' + time + ':00').toISOString()
      }
      
      const updateData: any = {
        status,
        priority,
        assigned_to: assignedTo || null,
        notes,
        scheduled_start: combineDateTime(scheduledStartDate, scheduledStartTime),
        scheduled_end: combineDateTime(scheduledEndDate, scheduledEndTime),
      }
      
      await axios.patch(`${API_BASE_URL}/service-calls/${id}`, updateData, { headers, withCredentials: true })
      showToast('Service call updated successfully', 'success')
      await loadData()
    } catch (err: any) {
      logError(err, 'saveServiceCall')
      showToast(handleApiError(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
        <div 
          className="animate-spin rounded-full border-4 border-t-transparent"
          style={{
            width: '40px',
            height: '40px',
            borderColor: 'var(--color-border)',
            borderTopColor: 'var(--color-primary)',
            margin: '0 auto 16px'
          }}
        />
        <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
          Loading service call...
        </p>
      </div>
    )
  }

  if (!sc) {
    return (
      <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ 
          padding: '24px',
          backgroundColor: 'var(--color-error-bg)',
          border: '1px solid var(--color-error)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '16px'
        }}>
          <p style={{ color: 'var(--color-error)', fontSize: 'var(--text-base)', fontWeight: 500, marginBottom: '8px' }}>
            Service call not found
          </p>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            The service call you're looking for doesn't exist or may have been deleted.
          </p>
        </div>
        <Button onClick={() => router.push('/service-calls')}>Back to Service Calls</Button>
      </div>
    )
  }

  const isOverdue = sc.scheduled_end && new Date(sc.scheduled_end) < new Date() && sc.status !== 'Completed'
  const daysOverdue = isOverdue && sc.scheduled_end 
    ? Math.floor((new Date().getTime() - new Date(sc.scheduled_end).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <PageHeader
        title={sc.customer_name || 'Unknown Customer'}
        description={`${sc.address_line1 || ''}, ${sc.city || ''}, ${sc.state || ''} ${sc.zip || ''}`.replace(/^,\s*|,\s*$/g, '').replace(/\s{2,}/g, ' ') || 'No address provided'}
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button onClick={() => router.push('/service-calls')} variant="secondary">Back</Button>
            <Button onClick={saveServiceCall} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        }
      />

      {/* Overdue Alert */}
      {isOverdue && (
        <Card padding="md" className="mb-6" style={{ 
          backgroundColor: 'var(--color-error-bg)', 
          borderColor: 'var(--color-error)',
          borderWidth: '1px',
          borderStyle: 'solid'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <IconWrapper Icon={UilExclamationTriangle} size={24} color="var(--color-error)" />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--color-error)', marginBottom: '4px' }}>
                Overdue by {daysOverdue} day{daysOverdue !== 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-error)' }}>
                Scheduled end: {sc.scheduled_end ? new Date(sc.scheduled_end).toLocaleDateString() : 'Not set'}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Key Info Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <Card padding="sm">
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            Status
          </div>
          <StatusBadge status={status || sc.status} />
        </Card>
        
        <Card padding="sm">
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            Priority
          </div>
          <StatusBadge status={priority || sc.priority} variant="priority" />
        </Card>
        
        {assignedTo && (
          <Card padding="sm">
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Assigned To
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconWrapper Icon={UilUser} size={18} />
              <span style={{ fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {assignedTo}
              </span>
            </div>
          </Card>
        )}
        
        {scheduledStartDate && (
          <Card padding="sm">
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Scheduled
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconWrapper Icon={UilCalendarAlt} size={18} />
              <span style={{ fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {new Date(scheduledStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {scheduledStartTime && ` • ${scheduledStartTime}`}
              </span>
            </div>
          </Card>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* Status & Priority */}
        <Card>
          <CardHeader title="Status & Priority" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                Status
              </label>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: 'New', label: 'New' },
                  { value: 'Scheduled', label: 'Scheduled' },
                  { value: 'Dispatched', label: 'Dispatched' },
                  { value: 'In Progress', label: 'In Progress' },
                  { value: 'Completed', label: 'Completed' },
                  { value: 'On Hold', label: 'On Hold' }
                ]}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                Priority
              </label>
              <Select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                options={[
                  { value: 'Low', label: 'Low' },
                  { value: 'Normal', label: 'Normal' },
                  { value: 'High', label: 'High' },
                  { value: 'Emergency', label: 'Emergency' }
                ]}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                Assigned To (Owner)
              </label>
              <Input
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Owner/assignee name"
              />
            </div>
          </div>
        </Card>

        {/* Customer Information */}
        <Card>
          <CardHeader title="Customer Information" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Name
              </div>
              <div style={{ fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {sc.customer_name}
              </div>
            </div>
            {sc.phone && (
              <div>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Phone
                </div>
                <a 
                  href={`tel:${sc.phone}`} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    fontSize: 'var(--text-base)', 
                    color: 'var(--color-primary)', 
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                >
                  <IconWrapper Icon={UilPhone} size={16} color="var(--color-primary)" />
                  {sc.phone}
                </a>
              </div>
            )}
            {sc.email && (
              <div>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Email
                </div>
                <a 
                  href={`mailto:${sc.email}`} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    fontSize: 'var(--text-base)', 
                    color: 'var(--color-primary)', 
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                >
                  <IconWrapper Icon={UilEnvelope} size={16} color="var(--color-primary)" />
                  {sc.email}
                </a>
              </div>
            )}
            <div>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Address
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'start', gap: '6px' }}>
                <IconWrapper Icon={UilMapMarker} size={16} />
                <span>
                  {sc.address_line1}<br />
                  {sc.city}, {sc.state} {sc.zip}
                </span>
              </div>
              <a 
                href={`https://www.google.com/maps/search/${encodeURIComponent(sc.address_line1 + ' ' + sc.city + ' ' + sc.state)}`}
                target="_blank"
                rel="noreferrer"
                style={{ 
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: 'var(--text-sm)', 
                  color: 'var(--color-primary)', 
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
              >
                <IconWrapper Icon={UilMapMarker} size={14} color="var(--color-primary)" />
                Open in Google Maps
              </a>
            </div>
          </div>
        </Card>

        {/* Scheduling */}
        <Card>
          <CardHeader title="Scheduling" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <CardSection>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                Scheduled Start
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                <Input
                  type="date"
                  value={scheduledStartDate}
                  onChange={(e) => setScheduledStartDate(e.target.value)}
                />
                <Input
                  type="time"
                  value={scheduledStartTime}
                  onChange={(e) => setScheduledStartTime(e.target.value)}
                />
              </div>
            </CardSection>
            <CardSection>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                Scheduled End
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                <Input
                  type="date"
                  value={scheduledEndDate}
                  onChange={(e) => setScheduledEndDate(e.target.value)}
                />
                <Input
                  type="time"
                  value={scheduledEndTime}
                  onChange={(e) => setScheduledEndTime(e.target.value)}
                />
              </div>
            </CardSection>
          </div>
        </Card>

        {/* Builder Information */}
        {builder && (
          <Card>
            <CardHeader title="Builder" />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconWrapper Icon={UilFileAlt} size={18} />
              <div style={{ fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {builder.name}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Issue Description */}
      <Card className="mb-6">
        <CardHeader title="Issue Description" />
        <div style={{ 
          padding: '16px', 
          backgroundColor: 'var(--color-surface-elevated)', 
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-primary)',
          whiteSpace: 'pre-wrap',
          lineHeight: 1.6
        }}>
          {sc.issue_description}
        </div>
      </Card>

      {/* Notes Section */}
      <Card className="mb-6">
        <CardHeader title="Notes" />
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Service call notes and updates..."
          rows={6}
        />
      </Card>

      {/* Completion Workflow */}
      {(sc.status === 'In Progress' || sc.status === 'Completed') && (
        <div style={{ marginBottom: '24px' }}>
          <WorkflowStepper 
            serviceCallId={id}
            onComplete={() => {
              showToast('Workflow completed! Consider updating service call status.', 'success')
              loadData()
            }}
          />
        </div>
      )}

      {/* Suggested Portals */}
      {suggestedPortals.length > 0 && (
        <Card className="mb-6">
          <CardHeader 
            title="Suggested Portals"
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push('/directory')}
              >
                View All
              </Button>
            }
          />
          {loadingPortals ? (
            <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: '32px' }}>
              Loading portals...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {suggestedPortals.slice(0, 3).map(portal => (
                <div key={portal.id} style={{
                  padding: '12px',
                  backgroundColor: 'var(--color-surface-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, marginBottom: '4px', color: 'var(--color-text-primary)' }}>
                      {portal.portal_definition.name}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {portal.portal_definition.jurisdiction && <span>{portal.portal_definition.jurisdiction}</span>}
                      <StatusBadge status={portal.portal_definition.category} variant="category" />
                      {portal.login_identifier && <span>{portal.login_identifier}</span>}
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => window.open(portal.portal_definition.base_url, '_blank', 'noopener,noreferrer')}
                  >
                    Open
                  </Button>
                </div>
              ))}
              {suggestedPortals.length > 3 && (
                <div style={{ textAlign: 'center', marginTop: '8px' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => router.push('/directory')}
                  >
                    View all {suggestedPortals.length} matching portals
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Timeline / Audit */}
      <Card>
        <CardHeader title="Activity Timeline" />
        {audit.length === 0 ? (
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: '32px' }}>
            No activity recorded
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {audit.map((log) => (
              <div key={log.id} style={{
                padding: '12px',
                backgroundColor: 'var(--color-surface-elevated)',
                borderRadius: 'var(--radius-md)',
                borderLeft: '3px solid var(--color-primary)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '4px' }}>
                  <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>
                    {log.action} {log.field ? `(${log.field})` : ''}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                    {new Date(log.changed_at).toLocaleString()}
                  </div>
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                  by {log.changed_by}
                </div>
                {log.old_value && log.new_value && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: '8px', fontStyle: 'italic' }}>
                    {log.old_value} → {log.new_value}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
