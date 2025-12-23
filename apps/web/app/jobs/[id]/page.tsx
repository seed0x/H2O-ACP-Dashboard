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
import { TasksPanel } from '../../../components/ui/TasksPanel'
import { Card, CardHeader, CardSection } from '../../../components/ui/Card'
import { showToast } from '../../../components/Toast'
import { handleApiError, logError } from '../../../lib/error-handler'
import UilCalendarAlt from '@iconscout/react-unicons/icons/uil-calendar-alt'
import UilUser from '@iconscout/react-unicons/icons/uil-user'
import UilMapMarker from '@iconscout/react-unicons/icons/uil-map-marker'
import UilPhone from '@iconscout/react-unicons/icons/uil-phone'
import UilEnvelope from '@iconscout/react-unicons/icons/uil-envelope'
import UilExclamationTriangle from '@iconscout/react-unicons/icons/uil-exclamation-triangle'
import UilCheckCircle from '@iconscout/react-unicons/icons/uil-check-circle'
import UilBuilding from '@iconscout/react-unicons/icons/uil-building'
import UilFileAlt from '@iconscout/react-unicons/icons/uil-file-alt'
import UilClock from '@iconscout/react-unicons/icons/uil-clock'

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
  tasks?: Array<{
    id: string
    title: string
    description?: string
    status: string
    assigned_to?: string
    due_date?: string
    completed_at?: string
  }>
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

// Icon component wrapper for consistent sizing
function IconWrapper({ Icon, size = 20, color = 'var(--color-text-secondary)' }: { Icon: React.ComponentType<{ size?: number | string; color?: string }>, size?: number, color?: string }) {
  return <Icon size={size} color={color} />
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
  const [phase, setPhase] = useState('')
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
  const [tasks, setTasks] = useState<any[]>([])
  
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
      setPhase(jobData.phase || '')
      setTechName(jobData.tech_name || '')
      setAssignedTo(jobData.assigned_to || '')
      setTasks(jobData.tasks || [])
      
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
        phase,
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

  const currentStatus = status || job.status
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
      {/* Professional Header */}
      <PageHeader
        title={`Lot ${job.lot_number}`}
        description={`${job.address_line1}, ${job.city}, ${job.state} ${job.zip}`}
        breadcrumbs={[
          { label: 'Jobs', href: '/jobs' },
          { label: `Lot ${job.lot_number}` }
        ]}
        action={
          <>
            <Button onClick={() => router.push('/jobs')} variant="secondary">
              Back
            </Button>
            <Button onClick={saveJob} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        }
      />

      {/* Key Info Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <Card padding="sm">
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            Status
          </div>
          <StatusBadge status={currentStatus} />
        </Card>
        
        {techName && (
          <Card padding="sm">
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Technician
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconWrapper Icon={UilUser} size={18} />
              <span style={{ fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {techName}
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

        {builder && (
          <Card padding="sm">
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Builder
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconWrapper Icon={UilBuilding} size={18} />
              <span style={{ fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {builder.name}
              </span>
            </div>
          </Card>
        )}
      </div>

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
                Scheduled end date: {job.scheduled_end ? new Date(job.scheduled_end).toLocaleDateString() : 'Not set'}
              </div>
            </div>
          </div>
        </Card>
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
          <Card>
            <CardHeader title="Status & Assignment" />
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
                    { value: 'In Progress', label: 'In Progress' },
                    { value: 'Completed', label: 'Completed' },
                    { value: 'On Hold', label: 'On Hold' }
                  ]}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
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
                      size="sm"
                      onClick={() => router.push(`/tech-schedule?tech=${encodeURIComponent(techName)}`)}
                    >
                      View Schedule
                    </Button>
                  </div>
                )}
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                  Phase
                </label>
                <Select
                  value={phase}
                  onChange={(e) => setPhase(e.target.value)}
                  options={[
                    { value: 'Pre-Construction', label: 'Pre-Construction' },
                    { value: 'Rough-In', label: 'Rough-In' },
                    { value: 'Top Out', label: 'Top Out' },
                    { value: 'Post and Beam', label: 'Post and Beam' },
                    { value: 'Trim', label: 'Trim' },
                    { value: 'Final', label: 'Final' },
                    { value: 'Completed', label: 'Completed' }
                  ]}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                  Owner/Assignee
                </label>
                <Input
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="Enter owner/assignee name"
                />
              </div>
            </div>
          </Card>

          {/* Scheduling Section */}
          <Card>
            <CardHeader title="Scheduling" />
            <CardSection>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '12px' }}>
                Work Window
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr auto 1fr',
                gap: '12px',
                alignItems: 'end'
              }}>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Start</div>
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
                    <IconWrapper Icon={UilClock} size={20} />
                    {durationDays && (
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                        {durationDays} {durationDays === 1 ? 'day' : 'days'}
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>End</div>
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
            </CardSection>
            
            <CardSection>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                Completion Date (Actual)
              </label>
              <Input
                type="date"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
                placeholder="Not completed yet"
              />
            </CardSection>
          </Card>

          {/* Warranty Section */}
          <Card style={{
            borderColor: warrantyStart ? 'var(--color-success)' : undefined,
            borderWidth: warrantyStart ? '2px' : undefined,
            backgroundColor: warrantyStart ? 'var(--color-success-bg)' : undefined
          }}>
            <CardHeader 
              title="Warranty Period"
              action={warrantyStart && warrantyEnd && (
                <StatusBadge 
                  status={new Date(warrantyEnd) >= new Date() ? 'Active' : 'Expired'}
                  variant={new Date(warrantyEnd) >= new Date() ? 'success' : 'error'}
                />
              )}
            />

            {warrantyStart && warrantyEnd ? (
              <>
                <CardSection>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                        Start Date
                      </label>
                      <Input 
                        type="date" 
                        value={warrantyStart} 
                        onChange={(e) => setWarrantyStart(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                        End Date
                      </label>
                      <Input 
                        type="date" 
                        value={warrantyEnd} 
                        onChange={(e) => setWarrantyEnd(e.target.value)}
                      />
                    </div>
                  </div>
                </CardSection>
                
                {(() => {
                  const endDate = new Date(warrantyEnd)
                  const today = new Date()
                  const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                  const isActive = daysRemaining > 0
                  
                  return (
                    <CardSection>
                      <div style={{ 
                        padding: '12px', 
                        backgroundColor: isActive ? 'var(--color-success-bg)' : 'var(--color-error-bg)', 
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${isActive ? 'var(--color-success)' : 'var(--color-error)'}`
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <IconWrapper 
                            Icon={isActive ? UilCheckCircle : UilExclamationTriangle} 
                            size={18} 
                            color={isActive ? 'var(--color-success)' : 'var(--color-error)'}
                          />
                          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: isActive ? 'var(--color-success)' : 'var(--color-error)' }}>
                            {isActive ? `${daysRemaining} days remaining` : `Expired ${Math.abs(daysRemaining)} days ago`}
                          </div>
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                          Warranty expires {endDate.toLocaleDateString()}
                        </div>
                      </div>
                    </CardSection>
                  )
                })()}
                
                <CardSection>
                  <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                    Warranty Notes
                  </label>
                  <Textarea
                    value={warrantyNotes}
                    onChange={(e) => setWarrantyNotes(e.target.value)}
                    placeholder="Additional warranty information..."
                    rows={3}
                  />
                </CardSection>
              </>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '32px 24px', 
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--text-sm)'
              }}>
                <IconWrapper Icon={UilFileAlt} size={48} />
                <div style={{ fontWeight: 500, marginTop: '12px', marginBottom: '4px', color: 'var(--color-text-primary)' }}>
                  No warranty period set
                </div>
                <div style={{ fontSize: 'var(--text-xs)' }}>
                  Warranty will auto-start when job completes in Trim/Final phase
                </div>
              </div>
            )}
          </Card>

          {/* Notes Section */}
          <Card>
            <CardHeader title="Notes & Updates" />
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
                backgroundColor: 'var(--color-surface-elevated)',
                borderRadius: 'var(--radius-md)',
                borderLeft: '3px solid var(--color-primary)'
              }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                  Imported from Outlook: {builder?.name || 'Unknown'}
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap' }}>
                  {job.notes}
                </div>
              </div>
            )}
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader 
              title="Activity Timeline"
              action={audit.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setTimelineExpanded(!timelineExpanded)}
                >
                  {timelineExpanded ? '▲' : '▼'}
                </Button>
              )}
            />
            
            {timelineExpanded || audit.length === 0 ? (
              audit.length === 0 ? (
                <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: '32px' }}>
                  No activity recorded
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {Object.entries(groupedAudit).map(([date, logs]) => (
                    <div key={date}>
                      <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
                        {date}
                      </div>
                      {logs.map((log) => (
                        <div key={log.id} style={{
                          padding: '12px',
                          backgroundColor: 'var(--color-surface-elevated)',
                          borderRadius: 'var(--radius-md)',
                          marginBottom: '8px',
                          borderLeft: '3px solid var(--color-primary)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '4px' }}>
                            <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>
                              {log.action} {log.field ? `(${log.field})` : ''}
                            </div>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                              {new Date(log.changed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
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
                  ))}
                </div>
              )
            ) : null}
          </Card>
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
          {/* Builder Card */}
          {builder && (
            <Card>
              <CardHeader title="Builder" />
              <CardSection>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <IconWrapper Icon={UilBuilding} size={20} />
                  <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {builder.name}
                  </div>
                </div>
              </CardSection>
              
              {contacts.length > 0 && (
                <CardSection title="Contacts">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {contacts.slice(0, 2).map(contact => (
                      <div key={contact.id} style={{ padding: '12px', backgroundColor: 'var(--color-surface-elevated)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ fontWeight: 500, marginBottom: '4px', color: 'var(--color-text-primary)' }}>{contact.name}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>{contact.role}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {contact.phone && (
                            <a 
                              href={`tel:${contact.phone}`} 
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '6px',
                                fontSize: 'var(--text-xs)', 
                                color: 'var(--color-primary)',
                                textDecoration: 'none'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                              onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                            >
                              <IconWrapper Icon={UilPhone} size={14} color="var(--color-primary)" />
                              {contact.phone}
                            </a>
                          )}
                          {contact.email && (
                            <a 
                              href={`mailto:${contact.email}`} 
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '6px',
                                fontSize: 'var(--text-xs)', 
                                color: 'var(--color-primary)',
                                textDecoration: 'none'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                              onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                            >
                              <IconWrapper Icon={UilEnvelope} size={14} color="var(--color-primary)" />
                              {contact.email}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardSection>
              )}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                <Button variant="secondary" size="sm" style={{ width: '100%' }}>
                  Message Builder
                </Button>
                <Button variant="secondary" size="sm" style={{ width: '100%' }}>
                  View All Jobs
                </Button>
              </div>
            </Card>
          )}

          {/* Tasks Panel */}
          <TasksPanel 
            jobId={id} 
            tasks={tasks} 
            onUpdate={loadData}
          />

          {/* Suggested Portals - Only show if has portals */}
          {hasPortals && (
            <Card>
              <CardHeader 
                title="Integration Portals"
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
                      border: '1px solid var(--color-border)'
                    }}>
                      <div style={{ fontWeight: 500, marginBottom: '4px', color: 'var(--color-text-primary)' }}>
                        {portal.portal_definition.name}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                        {portal.portal_definition.jurisdiction && `${portal.portal_definition.jurisdiction} • `}
                        <StatusBadge status={portal.portal_definition.category} variant="category" />
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => window.open(portal.portal_definition.base_url, '_blank', 'noopener,noreferrer')}
                        style={{ width: '100%' }}
                      >
                        Open Portal
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
