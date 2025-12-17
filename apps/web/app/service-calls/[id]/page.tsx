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
import { showToast } from '../../../components/Toast'
import { handleApiError, logError } from '../../../lib/error-handler'

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
  const [scheduledStart, setScheduledStart] = useState('')
  const [scheduledEnd, setScheduledEnd] = useState('')
  const [notes, setNotes] = useState('')

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
      setScheduledStart(scData.scheduled_start ? scData.scheduled_start.split('T')[0] : '')
      setScheduledEnd(scData.scheduled_end ? scData.scheduled_end.split('T')[0] : '')
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
    } catch (err: any) {
      logError(err, 'loadServiceCall')
      showToast(handleApiError(err), 'error')
    } finally {
      setLoading(false)
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
      
      const updateData: any = {
        status,
        priority,
        assigned_to: assignedTo || null,
        notes,
        scheduled_start: scheduledStart ? new Date(scheduledStart).toISOString() : null,
        scheduled_end: scheduledEnd ? new Date(scheduledEnd).toISOString() : null,
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
      <div style={{ padding: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ color: 'var(--color-text-secondary)' }}>Loading service call...</div>
      </div>
    )
  }

  if (!sc) {
    return (
      <div style={{ padding: '32px' }}>
        <div style={{ color: '#EF5350', marginBottom: '16px' }}>Service call not found</div>
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
        title={sc.customer_name}
        description={`${sc.address_line1}, ${sc.city}, ${sc.state} ${sc.zip}`}
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
        <div style={{
          padding: '16px',
          backgroundColor: 'rgba(239, 83, 80, 0.1)',
          border: '1px solid #EF5350',
          borderRadius: '8px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '24px' }}>⚠️</span>
          <div>
            <div style={{ fontWeight: '600', color: '#EF5350', marginBottom: '4px' }}>
              Overdue by {daysOverdue} day{daysOverdue !== 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: '14px', color: '#EF5350' }}>
              Scheduled end: {sc.scheduled_end ? new Date(sc.scheduled_end).toLocaleDateString() : 'Not set'}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* Status & Priority */}
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: 'var(--color-text-primary)' }}>
            Status & Priority
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
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
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Priority
              </label>
              <Select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                options={[
                  { value: 'Low', label: 'Low' },
                  { value: 'Medium', label: 'Medium' },
                  { value: 'High', label: 'High' },
                  { value: 'Emergency', label: 'Emergency' }
                ]}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Assigned To (Owner)
              </label>
              <Input
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Owner/assignee name"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Current Status
              </label>
              <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <StatusBadge status={sc.status} />
                <StatusBadge status={sc.priority} variant="priority" />
              </div>
            </div>
            {sc.assigned_to && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Current Owner
                </div>
                <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                  {sc.assigned_to}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Customer Information */}
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: 'var(--color-text-primary)' }}>
            Customer Information
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Name
              </div>
              <div style={{ fontSize: '16px', fontWeight: '500', color: 'var(--color-text-primary)' }}>
                {sc.customer_name}
              </div>
            </div>
            {sc.phone && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Phone
                </div>
                <a href={`tel:${sc.phone}`} style={{ fontSize: '16px', color: 'var(--color-primary)', textDecoration: 'none' }}>
                  📞 {sc.phone}
                </a>
              </div>
            )}
            {sc.email && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Email
                </div>
                <a href={`mailto:${sc.email}`} style={{ fontSize: '16px', color: 'var(--color-primary)', textDecoration: 'none' }}>
                  ✉️ {sc.email}
                </a>
              </div>
            )}
            <div>
              <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Address
              </div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                {sc.address_line1}<br />
                {sc.city}, {sc.state} {sc.zip}
              </div>
              <a 
                href={`https://www.google.com/maps/search/${encodeURIComponent(sc.address_line1 + ' ' + sc.city + ' ' + sc.state)}`}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '14px', color: 'var(--color-primary)', textDecoration: 'none' }}
              >
                🗺️ Open in Google Maps
              </a>
            </div>
          </div>
        </div>

        {/* Scheduling */}
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: 'var(--color-text-primary)' }}>
            Scheduling
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Scheduled Start
              </label>
              <Input
                type="date"
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Scheduled End
              </label>
              <Input
                type="date"
                value={scheduledEnd}
                onChange={(e) => setScheduledEnd(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Builder Information */}
        {builder && (
          <div style={{
            backgroundColor: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: 'var(--color-text-primary)' }}>
              Builder
            </h2>
            <div style={{ fontSize: '16px', fontWeight: '500', color: 'var(--color-text-primary)' }}>
              {builder.name}
            </div>
          </div>
        )}
      </div>

      {/* Issue Description */}
      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
          Issue Description
        </h2>
        <div style={{ 
          padding: '16px', 
          backgroundColor: 'var(--color-hover)', 
          borderRadius: '8px',
          fontSize: '14px',
          color: 'var(--color-text-primary)',
          whiteSpace: 'pre-wrap'
        }}>
          {sc.issue_description}
        </div>
      </div>

      {/* Notes Section */}
      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
          Notes
        </h2>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Service call notes and updates..."
          rows={6}
        />
      </div>

      {/* Timeline / Audit */}
      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '24px'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: 'var(--color-text-primary)' }}>
          Activity Timeline
        </h2>
        {audit.length === 0 ? (
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '14px', textAlign: 'center', padding: '32px' }}>
            No activity recorded
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {audit.map((log, index) => (
              <div key={log.id} style={{
                padding: '16px',
                backgroundColor: index % 2 === 0 ? 'transparent' : 'var(--color-hover)',
                borderRadius: '6px',
                borderLeft: '3px solid var(--color-primary)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '4px' }}>
                  <div style={{ fontWeight: '500', color: 'var(--color-text-primary)' }}>
                    {log.action} {log.field ? `(${log.field})` : ''}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    {new Date(log.changed_at).toLocaleString()}
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  by {log.changed_by}
                </div>
                {log.old_value && log.new_value && (
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px', fontStyle: 'italic' }}>
                    {log.old_value} → {log.new_value}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
