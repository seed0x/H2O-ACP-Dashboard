'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { API_BASE_URL } from '../../../lib/config'
import { useMobile } from '../../../lib/useMobile'
import { PageHeader } from '../../../components/ui/PageHeader'
import { Button } from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Textarea } from '../../../components/ui/Textarea'
import { showToast } from '../../../components/Toast'
import { handleApiError, logError } from '../../../lib/error-handler'

interface Job {
  id: string
  tenant_id: string
  builder_id: string
  community: string
  lot_number: string
  plan?: string
  phase: string
  status: string
  address_line1: string
  city: string
  state: string
  zip: string
  scheduled_start?: string
  scheduled_end?: string
  notes?: string
  tech_name?: string
  assigned_to?: string
  warranty_start_date?: string
  warranty_end_date?: string
  warranty_notes?: string
  completion_date?: string
  created_at: string
  updated_at: string
}

interface Builder {
  id: string
  name: string
  notes?: string
}

interface BuilderContact {
  id: string
  name: string
  role: string
  phone?: string
  email?: string
  preferred_contact_method?: string
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

export default function JobDetail({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const router = useRouter()
  const isMobile = useMobile()
  const [job, setJob] = useState<Job | null>(null)
  const [builder, setBuilder] = useState<Builder | null>(null)
  const [contacts, setContacts] = useState<BuilderContact[]>([])
  const [audit, setAudit] = useState<AuditLog[]>([])
  const [id, setId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Form state
  const [status, setStatus] = useState('')
  const [techName, setTechName] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [scheduledStart, setScheduledStart] = useState('')
  const [scheduledEnd, setScheduledEnd] = useState('')
  const [notes, setNotes] = useState('')
  const [warrantyStart, setWarrantyStart] = useState('')
  const [warrantyEnd, setWarrantyEnd] = useState('')
  const [warrantyNotes, setWarrantyNotes] = useState('')
  const [completionDate, setCompletionDate] = useState('')

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
      
      // Load job
      const jobRes = await axios.get(`${API_BASE_URL}/jobs/${id}`, { headers, withCredentials: true })
      const jobData = jobRes.data
      setJob(jobData)
      
      // Set form state
      setStatus(jobData.status || '')
      setTechName(jobData.tech_name || '')
      setAssignedTo(jobData.assigned_to || '')
      setScheduledStart(jobData.scheduled_start ? jobData.scheduled_start.split('T')[0] : '')
      setScheduledEnd(jobData.scheduled_end ? jobData.scheduled_end.split('T')[0] : '')
      setNotes(jobData.notes || '')
      setWarrantyStart(jobData.warranty_start_date || '')
      setWarrantyEnd(jobData.warranty_end_date || '')
      setWarrantyNotes(jobData.warranty_notes || '')
      setCompletionDate(jobData.completion_date || '')
      
      // Load builder
      if (jobData.builder_id) {
        try {
          const builderRes = await axios.get(`${API_BASE_URL}/builders/${jobData.builder_id}`, { headers, withCredentials: true })
          setBuilder(builderRes.data)
          
      // Load builder contacts
      try {
        const contactsRes = await axios.get(`${API_BASE_URL}/builders/${jobData.builder_id}/contacts`, { headers, withCredentials: true })
        setContacts(Array.isArray(contactsRes.data) ? contactsRes.data : [])
      } catch (err) {
        logError(err, 'loadBuilderContacts')
        setContacts([])
      }
      
      // Load job-specific contacts
      try {
        const jobContactsRes = await axios.get(`${API_BASE_URL}/jobs/${id}/contacts`, { headers, withCredentials: true })
        // Job contacts are linked to builder contacts, so we'd need to fetch those details
        // For now, we'll just show builder contacts
      } catch (err) {
        logError(err, 'loadJobContacts')
      }
        } catch (err) {
          logError(err, 'loadBuilder')
        }
      }
      
      // Load audit
      await loadAudit()
    } catch (err: any) {
      logError(err, 'loadJob')
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
        params: { entity_type: 'job', entity_id: id },
        withCredentials: true
      })
      setAudit(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      logError(err, 'loadAudit')
      setAudit([])
    }
  }

  async function saveJob() {
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
        notes,
        tech_name: techName || null,
        assigned_to: assignedTo || null,
        warranty_start_date: warrantyStart || null,
        warranty_end_date: warrantyEnd || null,
        warranty_notes: warrantyNotes || null,
        completion_date: completionDate || null,
      }
      
      if (scheduledStart) {
        updateData.scheduled_start = new Date(scheduledStart).toISOString()
      }
      if (scheduledEnd) {
        updateData.scheduled_end = new Date(scheduledEnd).toISOString()
      }
      
      await axios.patch(`${API_BASE_URL}/jobs/${id}`, updateData, { headers, withCredentials: true })
      showToast('Job updated successfully', 'success')
      await loadData()
    } catch (err: any) {
      logError(err, 'saveJob')
      showToast(handleApiError(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ color: 'var(--color-text-secondary)' }}>Loading job...</div>
      </div>
    )
  }

  if (!job) {
    return (
      <div style={{ padding: '32px' }}>
        <div style={{ color: '#EF5350', marginBottom: '16px' }}>Job not found</div>
        <Button onClick={() => router.push('/jobs')}>Back to Jobs</Button>
      </div>
    )
  }

  const isOverdue = job.scheduled_end && new Date(job.scheduled_end) < new Date() && job.status !== 'Completed'
  const daysOverdue = isOverdue && job.scheduled_end 
    ? Math.floor((new Date().getTime() - new Date(job.scheduled_end).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <div style={{ 
      padding: isMobile ? '16px' : '32px', 
      maxWidth: '1400px', 
      margin: '0 auto'
    }}>
      <PageHeader
        title={`${job.community} - Lot ${job.lot_number}`}
        description={`Phase: ${job.phase} | ${job.address_line1}, ${job.city}, ${job.state} ${job.zip}`}
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button onClick={() => router.push('/jobs')} variant="secondary">Back</Button>
            <Button onClick={saveJob} disabled={saving}>
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
              Scheduled end date: {job.scheduled_end ? new Date(job.scheduled_end).toLocaleDateString() : 'Not set'}
            </div>
          </div>
        </div>
      )}

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: isMobile ? '16px' : '24px', 
        marginBottom: '24px'
      }}>
        {/* Status & Key Info */}
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: 'var(--color-text-primary)' }}>
            Status & Assignment
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
                  { value: 'In Progress', label: 'In Progress' },
                  { value: 'Completed', label: 'Completed' },
                  { value: 'On Hold', label: 'On Hold' }
                ]}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Tech Name
              </label>
              <Input
                value={techName}
                onChange={(e) => setTechName(e.target.value)}
                placeholder="Assigned technician"
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
              <div style={{ marginTop: '8px' }}>
                <StatusBadge status={job.status} />
              </div>
            </div>
            {job.assigned_to && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Current Owner
                </div>
                <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                  {job.assigned_to}
                </div>
              </div>
            )}
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
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Completion Date
              </label>
              <Input
                type="date"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
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
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '16px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                {builder.name}
              </div>
              {builder.notes && (
                <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                  {builder.notes}
                </div>
              )}
            </div>
            {contacts.length > 0 && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '12px', textTransform: 'uppercase' }}>
                  Contacts
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {contacts.map(contact => (
                    <div key={contact.id} style={{ padding: '12px', backgroundColor: 'var(--color-hover)', borderRadius: '6px' }}>
                      <div style={{ fontWeight: '500', marginBottom: '4px' }}>{contact.name}</div>
                      <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>{contact.role}</div>
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`} style={{ fontSize: '13px', color: 'var(--color-primary)', marginRight: '12px' }}>
                          📞 {contact.phone}
                        </a>
                      )}
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} style={{ fontSize: '13px', color: 'var(--color-primary)' }}>
                          ✉️ {contact.email}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Warranty Information */}
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: 'var(--color-text-primary)' }}>
            Warranty
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Warranty Start
              </label>
              <Input
                type="date"
                value={warrantyStart}
                onChange={(e) => setWarrantyStart(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Warranty End
              </label>
              <Input
                type="date"
                value={warrantyEnd}
                onChange={(e) => setWarrantyEnd(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Warranty Notes
              </label>
              <Textarea
                value={warrantyNotes}
                onChange={(e) => setWarrantyNotes(e.target.value)}
                placeholder="Warranty information..."
                rows={3}
              />
            </div>
          </div>
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
          placeholder="Job notes and updates..."
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
