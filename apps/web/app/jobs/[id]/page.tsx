'use client'
import { useEffect, useState, useRef } from 'react'
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

// Helper function to get status color and icon
function getStatusInfo(status: string) {
  const statusMap: Record<string, { color: string; bgColor: string; icon: string }> = {
    'Completed': { color: '#4CAF50', bgColor: 'rgba(76, 175, 80, 0.1)', icon: '🟢' },
    'Scheduled': { color: '#FFA726', bgColor: 'rgba(255, 152, 0, 0.1)', icon: '🟡' },
    'In Progress': { color: '#2196F3', bgColor: 'rgba(33, 150, 243, 0.1)', icon: '🔵' },
    'On Hold': { color: '#FF9800', bgColor: 'rgba(255, 152, 0, 0.1)', icon: '🟠' },
    'New': { color: '#9E9E9E', bgColor: 'rgba(158, 158, 158, 0.1)', icon: '⚪' },
  }
  return statusMap[status] || { color: '#9E9E9E', bgColor: 'rgba(158, 158, 158, 0.1)', icon: '⚪' }
}

// Helper to format date with time
function formatDateTime(dateString: string | null | undefined): { date: string; time: string } {
  if (!dateString) return { date: '', time: '' }
  try {
    const date = new Date(dateString)
    return {
      date: date.toISOString().split('T')[0],
      time: date.toTimeString().slice(0, 5) // HH:MM
    }
  } catch {
    return { date: '', time: '' }
  }
}

// Helper to combine date and time into ISO string
function combineDateTime(date: string, time: string): string | null {
  if (!date) return null
  if (!time) {
    // If no time, use start of day
    return new Date(date + 'T00:00:00').toISOString()
  }
  return new Date(date + 'T' + time + ':00').toISOString()
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
  const [scheduledStartDate, setScheduledStartDate] = useState('')
  const [scheduledStartTime, setScheduledStartTime] = useState('')
  const [scheduledEndDate, setScheduledEndDate] = useState('')
  const [scheduledEndTime, setScheduledEndTime] = useState('')
  const [notes, setNotes] = useState('')
  const [warrantyStart, setWarrantyStart] = useState('')
  const [warrantyEnd, setWarrantyEnd] = useState('')
  const [warrantyNotes, setWarrantyNotes] = useState('')
  const [completionDate, setCompletionDate] = useState('')
  const [suggestedPortals, setSuggestedPortals] = useState<any[]>([])
  const [loadingPortals, setLoadingPortals] = useState(false)
  
  // UI state
  const [warrantyExpanded, setWarrantyExpanded] = useState(false)
  const [timelineExpanded, setTimelineExpanded] = useState(false)

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
      
      // Parse scheduled dates with times
      const startDT = formatDateTime(jobData.scheduled_start)
      setScheduledStartDate(startDT.date)
      setScheduledStartTime(startDT.time)
      
      const endDT = formatDateTime(jobData.scheduled_end)
      setScheduledEndDate(endDT.date)
      setScheduledEndTime(endDT.time)
      
      setNotes(jobData.notes || '')
      setWarrantyStart(jobData.warranty_start_date || '')
      setWarrantyEnd(jobData.warranty_end_date || '')
      setWarrantyNotes(jobData.warranty_notes || '')
      setCompletionDate(jobData.completion_date || '')
      
      // Auto-expand warranty if it has data
      if (jobData.warranty_start_date || jobData.warranty_end_date || jobData.warranty_notes) {
        setWarrantyExpanded(true)
      }
      
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
        } catch (err) {
          logError(err, 'loadBuilder')
        }
      }
      
      // Load audit
      await loadAudit()
      
      // Load suggested portals
      await loadSuggestedPortals()
    } catch (err: any) {
      logError(err, 'loadJob')
      showToast(handleApiError(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  async function loadSuggestedPortals() {
    if (!id) return
    const currentJob = job
    if (!currentJob) return
    try {
      setLoadingPortals(true)
      const headers = getAuthHeaders()
      const params: any = {
        applies_to: 'job',
        tenant_id: currentJob.tenant_id,
      }
      if (currentJob.city) params.city = currentJob.city
      if (currentJob.builder_id) params.builder_id = currentJob.builder_id
      if (currentJob.phase) params.phase = currentJob.phase.toLowerCase()
      
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
      
      // Combine date and time for scheduled dates
      const startDT = combineDateTime(scheduledStartDate, scheduledStartTime)
      if (startDT) {
        updateData.scheduled_start = startDT
      } else {
        updateData.scheduled_start = null
      }
      
      const endDT = combineDateTime(scheduledEndDate, scheduledEndTime)
      if (endDT) {
        updateData.scheduled_end = endDT
      } else {
        updateData.scheduled_end = null
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

  const statusInfo = getStatusInfo(status || job.status)
  const hasWarranty = warrantyStart || warrantyEnd || warrantyNotes
  const hasPortals = suggestedPortals.length > 0

  // Calculate duration in days
  const durationDays = scheduledStartDate && scheduledEndDate
    ? Math.ceil((new Date(scheduledEndDate).getTime() - new Date(scheduledStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : null

  // Group audit logs by date
  const groupedAudit = audit.reduce((acc, log) => {
    const date = new Date(log.changed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    if (!acc[date]) acc[date] = []
    acc[date].push(log)
    return acc
  }, {} as Record<string, AuditLog[]>)

  return (
    <div style={{ 
      padding: isMobile ? '16px' : '32px', 
      maxWidth: '1400px', 
      margin: '0 auto'
    }}>
      {/* Improved Header with Key Info */}
      <div className="bg-[var(--color-card)]/50 border border-white/[0.08] backdrop-blur-sm shadow-xl rounded-lg p-6 mb-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
              Job #{job.lot_number} - Lot {job.lot_number}
            </h1>
            <div style={{ fontSize: '16px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
              {job.address_line1}, {job.city}, {job.state} {job.zip}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--color-text-tertiary)' }}>
              Phase: {job.phase} {builder && `• ${builder.name}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button onClick={() => router.push('/jobs')} variant="secondary">← Back</Button>
            <Button onClick={saveJob} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Key Info Bar */}
        <div style={{
          display: 'flex',
          gap: '24px',
          flexWrap: 'wrap',
          padding: '16px',
          backgroundColor: 'var(--color-hover)',
          borderRadius: '8px',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>{statusInfo.icon}</span>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Status</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: statusInfo.color }}>
                {status || job.status}
              </div>
            </div>
          </div>
          
          {techName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>👤</span>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Technician</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                  {techName}
                </div>
              </div>
            </div>
          )}
          
          {scheduledStartDate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>📅</span>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Scheduled</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                  {new Date(scheduledStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {scheduledStartTime && ` • ${scheduledStartTime}`}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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

      {/* Main Content Layout - 60/40 Split with Sticky Sidebar */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : '3fr 2fr', 
        gap: '24px',
        marginBottom: '24px',
        alignItems: 'start'
      }}>
        {/* Main Column (60%) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Status & Assignment Section */}
          <div className="bg-[var(--color-card)]/50 border border-white/[0.08] backdrop-blur-sm shadow-xl rounded-lg p-6">
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: 'var(--color-text-primary)' }}>
              Status & Assignment
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                  Status
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>{statusInfo.icon}</span>
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
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                  Assigned Technician
                </label>
                <Input
                  value={techName}
                  onChange={(e) => setTechName(e.target.value)}
                  placeholder="Enter technician name"
                />
                {techName && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <Button 
                      variant="secondary" 
                      style={{ fontSize: '12px', padding: '4px 12px' }}
                      onClick={() => router.push(`/tech-schedule?tech=${encodeURIComponent(techName)}`)}
                    >
                      View Schedule
                    </Button>
                  </div>
                )}
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                  Owner/Assignee
                </label>
                <Input
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="Enter owner/assignee name"
                />
              </div>
            </div>
          </div>

          {/* Improved Scheduling Section */}
          <div className="bg-[var(--color-card)]/50 border border-white/[0.08] backdrop-blur-sm shadow-xl rounded-lg p-6">
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: 'var(--color-text-primary)' }}>
              Scheduling
            </h2>
            
            {/* Work Window - Combined Start/End */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '12px' }}>
                Work Window
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr auto 1fr',
                gap: '12px',
                alignItems: 'end'
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Start</div>
                  <Input
                    type="date"
                    value={scheduledStartDate}
                    onChange={(e) => setScheduledStartDate(e.target.value)}
                  />
                  <Input
                    type="time"
                    value={scheduledStartTime}
                    onChange={(e) => setScheduledStartTime(e.target.value)}
                    style={{ marginTop: '8px' }}
                  />
                </div>
                {!isMobile && (
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    paddingBottom: '8px'
                  }}>
                    <div style={{ fontSize: '20px', color: 'var(--color-text-secondary)' }}>→</div>
                    {durationDays && (
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                        {durationDays} {durationDays === 1 ? 'day' : 'days'}
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>End</div>
                  <Input
                    type="date"
                    value={scheduledEndDate}
                    onChange={(e) => setScheduledEndDate(e.target.value)}
                  />
                  <Input
                    type="time"
                    value={scheduledEndTime}
                    onChange={(e) => setScheduledEndTime(e.target.value)}
                    style={{ marginTop: '8px' }}
                  />
                </div>
              </div>
            </div>
            
            {/* Completion Date */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                Completion Date (Actual)
              </label>
              <Input
                type="date"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
                placeholder="Not completed yet"
              />
            </div>
          </div>

          {/* Collapsible Warranty Section */}
          <div className="bg-[var(--color-card)]/50 border border-white/[0.08] backdrop-blur-sm shadow-xl rounded-lg p-6">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: warrantyExpanded ? '20px' : '0' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                🔧 Warranty
              </h2>
              <Button
                variant="secondary"
                onClick={() => setWarrantyExpanded(!warrantyExpanded)}
                style={{ fontSize: '12px', padding: '4px 12px' }}
              >
                {warrantyExpanded ? '▲' : '▼'}
              </Button>
            </div>
            
            {warrantyExpanded ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {!hasWarranty ? (
                  <div style={{
                    padding: '24px',
                    textAlign: 'center',
                    backgroundColor: 'var(--color-hover)',
                    borderRadius: '8px',
                    border: '2px dashed var(--color-border)'
                  }}>
                    <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
                      ⚠️ No warranty information set
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const today = new Date().toISOString().split('T')[0]
                        const oneYearLater = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
                        setWarrantyStart(today)
                        setWarrantyEnd(oneYearLater)
                      }}
                    >
                      + Add Warranty Coverage
                    </Button>
                  </div>
                ) : (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                        Coverage Period
                      </label>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <Input
                          type="date"
                          value={warrantyStart}
                          onChange={(e) => setWarrantyStart(e.target.value)}
                        />
                        <span style={{ color: 'var(--color-text-secondary)' }}>→</span>
                        <Input
                          type="date"
                          value={warrantyEnd}
                          onChange={(e) => setWarrantyEnd(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                        Warranty Notes
                      </label>
                      <Textarea
                        value={warrantyNotes}
                        onChange={(e) => setWarrantyNotes(e.target.value)}
                        placeholder="Warranty information..."
                        rows={4}
                      />
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>

          {/* Improved Notes Section */}
          <div className="bg-[var(--color-card)]/50 border border-white/[0.08] backdrop-blur-sm shadow-xl rounded-lg p-6">
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
              📝 Notes & Updates
            </h2>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a note..."
              rows={8}
              style={{ minHeight: '120px' }}
            />
            {job.notes && job.notes.includes('Imported from Outlook') && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: 'var(--color-hover)',
                borderRadius: '6px',
                borderLeft: '3px solid var(--color-primary)'
              }}>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                  📌 Imported from Outlook: {builder?.name || 'Unknown'}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap' }}>
                  {job.notes}
                </div>
              </div>
            )}
          </div>

          {/* Improved Activity Timeline */}
          <div className="bg-[var(--color-card)]/50 border border-white/[0.08] backdrop-blur-sm shadow-xl rounded-lg p-6">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: timelineExpanded ? '20px' : '0' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                📊 Activity Timeline
              </h2>
              {audit.length > 0 && (
                <Button
                  variant="secondary"
                  onClick={() => setTimelineExpanded(!timelineExpanded)}
                  style={{ fontSize: '12px', padding: '4px 12px' }}
                >
                  {timelineExpanded ? '▲' : '▼'}
                </Button>
              )}
            </div>
            
            {timelineExpanded || audit.length === 0 ? (
              audit.length === 0 ? (
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '14px', textAlign: 'center', padding: '32px' }}>
                  No activity recorded
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {Object.entries(groupedAudit).map(([date, logs]) => (
                    <div key={date}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
                        {date}
                      </div>
                      {logs.map((log) => (
                        <div key={log.id} style={{
                          padding: '12px',
                          backgroundColor: 'var(--color-hover)',
                          borderRadius: '6px',
                          marginBottom: '8px',
                          borderLeft: '3px solid var(--color-primary)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '4px' }}>
                            <div style={{ fontWeight: '500', color: 'var(--color-text-primary)' }}>
                              {log.action} {log.field ? `(${log.field})` : ''}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                              {new Date(log.changed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
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
                  ))}
                </div>
              )
            ) : null}
          </div>
        </div>

        {/* Sidebar (40%) - Sticky Summary */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '24px',
          position: isMobile ? 'relative' : 'sticky',
          top: '24px',
          alignSelf: 'start',
          maxHeight: isMobile ? 'none' : 'calc(100vh - 48px)',
          overflowY: isMobile ? 'visible' : 'auto'
        }}>
          {/* Enhanced Builder Card */}
          {builder && (
            <div className="bg-[var(--color-card)]/50 border border-white/[0.08] backdrop-blur-sm shadow-xl rounded-lg p-6">
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: 'var(--color-text-primary)' }}>
                Builder
              </h2>
              
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '20px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                  🏗️ {builder.name}
                </div>
              </div>
              
              {contacts.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '12px' }}>
                    Contact
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {contacts.slice(0, 2).map(contact => (
                      <div key={contact.id} style={{ padding: '12px', backgroundColor: 'var(--color-hover)', borderRadius: '6px' }}>
                        <div style={{ fontWeight: '500', marginBottom: '4px' }}>{contact.name}</div>
                        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>{contact.role}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {contact.phone && (
                            <a href={`tel:${contact.phone}`} style={{ fontSize: '13px', color: 'var(--color-primary)' }}>
                              📞 {contact.phone}
                            </a>
                          )}
                          {contact.email && (
                            <a href={`mailto:${contact.email}`} style={{ fontSize: '13px', color: 'var(--color-primary)' }}>
                              ✉️ {contact.email}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Button variant="secondary" style={{ width: '100%', fontSize: '13px' }}>
                  💬 Message Builder
                </Button>
                <Button variant="secondary" style={{ width: '100%', fontSize: '13px' }}>
                  📋 View All Jobs
                </Button>
              </div>
            </div>
          )}

          {/* Suggested Portals - Only show if has portals */}
          {hasPortals && (
            <div className="bg-[var(--color-card)]/50 border border-white/[0.08] backdrop-blur-sm shadow-xl rounded-lg p-6">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                  🔗 Integration Portals
                </h2>
                <Button
                  variant="secondary"
                  onClick={() => router.push('/directory')}
                  style={{ fontSize: '12px', padding: '4px 12px' }}
                >
                  View All
                </Button>
              </div>
              {loadingPortals ? (
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '14px', textAlign: 'center', padding: '32px' }}>
                  Loading portals...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {suggestedPortals.slice(0, 3).map(portal => (
                    <div key={portal.id} style={{
                      padding: '12px',
                      backgroundColor: 'var(--color-hover)',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border)'
                    }}>
                      <div style={{ fontWeight: '500', marginBottom: '4px', color: 'var(--color-text-primary)' }}>
                        {portal.portal_definition.name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                        {portal.portal_definition.jurisdiction && `${portal.portal_definition.jurisdiction} • `}
                        <StatusBadge status={portal.portal_definition.category} variant="category" />
                      </div>
                      <Button
                        variant="primary"
                        onClick={() => window.open(portal.portal_definition.base_url, '_blank', 'noopener,noreferrer')}
                        style={{ width: '100%', fontSize: '12px', padding: '6px 12px' }}
                      >
                        Open Portal
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
