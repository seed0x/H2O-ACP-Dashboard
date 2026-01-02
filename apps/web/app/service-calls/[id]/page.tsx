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
import UilCreditCard from '@iconscout/react-unicons/icons/uil-credit-card'
import UilInvoice from '@iconscout/react-unicons/icons/uil-invoice'
import UilUsersAlt from '@iconscout/react-unicons/icons/uil-users-alt'
import UilClipboardNotes from '@iconscout/react-unicons/icons/uil-clipboard-notes'
import UilCheckCircle from '@iconscout/react-unicons/icons/uil-check-circle'
import UilShoppingCart from '@iconscout/react-unicons/icons/uil-shopping-cart'
import UilEnvelopeSend from '@iconscout/react-unicons/icons/uil-envelope-send'
import UilPhoneAlt from '@iconscout/react-unicons/icons/uil-phone-alt'
import UilCheck from '@iconscout/react-unicons/icons/uil-check'

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
  additional_techs?: string
  scheduled_start?: string
  scheduled_end?: string
  payment_status?: string
  payment_method?: string
  payment_amount?: number
  payment_date?: string
  billing_writeup_status?: string
  billing_writeup_assigned_to?: string
  paperwork_turned_in?: boolean
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
  const [additionalTechs, setAdditionalTechs] = useState('')
  const [scheduledStartDate, setScheduledStartDate] = useState('')
  const [scheduledStartTime, setScheduledStartTime] = useState('')
  const [scheduledEndDate, setScheduledEndDate] = useState('')
  const [scheduledEndTime, setScheduledEndTime] = useState('')
  const [notes, setNotes] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [billingWriteupStatus, setBillingWriteupStatus] = useState('')
  const [billingWriteupAssignedTo, setBillingWriteupAssignedTo] = useState('')
  const [paperworkTurnedIn, setPaperworkTurnedIn] = useState(false)
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
      setAdditionalTechs(scData.additional_techs || '')
      
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
      setPaymentStatus(scData.payment_status || '')
      setPaymentMethod(scData.payment_method || '')
      setPaymentAmount(scData.payment_amount?.toString() || '')
      setPaymentDate(scData.payment_date || '')
      setBillingWriteupStatus(scData.billing_writeup_status || '')
      setBillingWriteupAssignedTo(scData.billing_writeup_assigned_to || '')
      setPaperworkTurnedIn(scData.paperwork_turned_in || false)
      
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
        additional_techs: additionalTechs || null,
        notes,
        scheduled_start: combineDateTime(scheduledStartDate, scheduledStartTime),
        scheduled_end: combineDateTime(scheduledEndDate, scheduledEndTime),
        payment_status: paymentStatus || null,
        payment_method: paymentMethod || null,
        payment_amount: paymentAmount ? parseFloat(paymentAmount) : null,
        payment_date: paymentDate || null,
        billing_writeup_status: billingWriteupStatus || null,
        billing_writeup_assigned_to: billingWriteupAssignedTo || null,
        paperwork_turned_in: paperworkTurnedIn,
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
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
              <a
                href={`/customers?search=${encodeURIComponent(sc.customer_name)}`}
                style={{ 
                  fontSize: 'var(--text-base)', 
                  fontWeight: 500, 
                  color: 'var(--color-primary)',
                  textDecoration: 'none'
                }}
                onClick={(e) => {
                  e.preventDefault()
                  router.push(`/customers?search=${encodeURIComponent(sc.customer_name)}`)
                }}
                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
              >
                {sc.customer_name}
              </a>
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

      {/* Payment & Billing Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* Payment Tracking */}
        <Card>
          <CardHeader 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UilCreditCard size={18} color="var(--color-text-primary)" />
                Payment Tracking
              </div>
            }
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                Payment Status
              </label>
              <Select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                options={[
                  { value: '', label: 'Not Set' },
                  { value: 'Unpaid', label: 'Unpaid' },
                  { value: 'Partial', label: 'Partial' },
                  { value: 'Paid', label: 'Paid' },
                  { value: 'Pending', label: 'Pending' }
                ]}
              />
            </div>
            {paymentStatus && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                    Payment Method
                  </label>
                  <Select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    options={[
                      { value: '', label: 'Select method' },
                      { value: 'Cash', label: 'Cash' },
                      { value: 'Check', label: 'Check' },
                      { value: 'Card', label: 'Card' },
                      { value: 'Invoice', label: 'Invoice' },
                      { value: 'Other', label: 'Other' }
                    ]}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                    Payment Amount ($)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                    Payment Date
                  </label>
                  <Input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Billing Write-up */}
        <Card>
          <CardHeader 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UilInvoice size={18} color="var(--color-text-primary)" />
                Billing Write-up
              </div>
            }
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                Write-up Status
              </label>
              <Select
                value={billingWriteupStatus}
                onChange={(e) => setBillingWriteupStatus(e.target.value)}
                options={[
                  { value: '', label: 'Not Set' },
                  { value: 'Needs Write-up', label: 'Needs Write-up' },
                  { value: 'In Progress', label: 'In Progress' },
                  { value: 'Written Up', label: 'Written Up' }
                ]}
              />
            </div>
            {billingWriteupStatus && (
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                  Assigned To
                </label>
                <Input
                  value={billingWriteupAssignedTo}
                  onChange={(e) => setBillingWriteupAssignedTo(e.target.value)}
                  placeholder="Who's writing it up?"
                />
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Tech Assignments & Paperwork */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* Tech Assignments */}
        <Card>
          <CardHeader 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UilUsersAlt size={18} color="var(--color-text-primary)" />
                Tech Assignments
              </div>
            }
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                Primary Tech
              </label>
              <Input
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Primary tech name"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                Additional Techs (comma-separated)
              </label>
              <Input
                value={additionalTechs}
                onChange={(e) => setAdditionalTechs(e.target.value)}
                placeholder="e.g., shawn, mikeal"
              />
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                Separate multiple techs with commas
              </div>
            </div>
          </div>
        </Card>

        {/* Paperwork Status */}
        <Card>
          <CardHeader title="📄 Paperwork Status" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={paperworkTurnedIn}
                  onChange={(e) => setPaperworkTurnedIn(e.target.checked)}
                  style={{
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer',
                    accentColor: 'var(--color-primary)'
                  }}
                />
                <span style={{ fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  Paperwork Turned In
                </span>
              </label>
              {paperworkTurnedIn && (
                <div style={{ 
                  marginTop: '12px', 
                  padding: '12px', 
                  backgroundColor: 'rgba(34, 197, 94, 0.1)', 
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-primary)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <UilCheckCircle size={16} color="rgb(34, 197, 94)" />
                    Paperwork has been turned in
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Notes Section - Improved */}
      <Card className="mb-6">
        <CardHeader 
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UilClipboardNotes size={18} color="var(--color-text-primary)" />
              Notes & Updates
            </div>
          }
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes, updates, or important information about this service call..."
            rows={8}
            style={{
              fontFamily: 'inherit',
              fontSize: 'var(--text-sm)',
              lineHeight: 1.6,
              resize: 'vertical'
            }}
          />
          {notes && (
            <div style={{ 
              padding: '12px', 
              backgroundColor: 'var(--color-surface-elevated)', 
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>💡</span>
              <span>Your notes are saved automatically when you click "Save Changes"</span>
            </div>
          )}
        </div>
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

      {/* Service Call Tasks/Check-offs */}
      <ServiceCallTasksSection serviceCallId={id} />

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

// Service Call Tasks Section Component
function ServiceCallTasksSection({ serviceCallId }: { serviceCallId: string }) {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  // Form state
  const [taskType, setTaskType] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [dueDate, setDueDate] = useState('')

  useEffect(() => {
    loadTasks()
  }, [serviceCallId])

  async function loadTasks() {
    try {
      const token = localStorage.getItem('token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      const response = await axios.get(
        `${API_BASE_URL}/service-calls/${serviceCallId}/tasks`,
        { headers, withCredentials: true }
      )
      setTasks(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      logError(error, 'loadServiceCallTasks')
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateTask() {
    if (!taskType || !taskTitle) {
      showToast('Please select a task type and enter a title', 'error')
      return
    }

    try {
      setSubmitting(true)
      const token = localStorage.getItem('token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      
      await axios.post(
        `${API_BASE_URL}/service-calls/${serviceCallId}/tasks`,
        {
          tenant_id: 'h2o',
          task_type: taskType,
          title: taskTitle,
          description: taskDescription || null,
          assigned_to: assignedTo || null,
          due_date: dueDate || null,
          status: 'pending'
        },
        { headers, withCredentials: true }
      )
      
      showToast('Task created! Office staff will be notified.', 'success')
      setShowAddForm(false)
      setTaskType('')
      setTaskTitle('')
      setTaskDescription('')
      setAssignedTo('')
      setDueDate('')
      await loadTasks()
    } catch (error: any) {
      logError(error, 'createServiceCallTask')
      showToast(handleApiError(error), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCompleteTask(taskId: string) {
    try {
      const token = localStorage.getItem('token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      
      await axios.patch(
        `${API_BASE_URL}/service-calls/tasks/${taskId}`,
        { status: 'completed' },
        { headers, withCredentials: true }
      )
      
      showToast('Task marked as completed', 'success')
      await loadTasks()
    } catch (error: any) {
      logError(error, 'completeServiceCallTask')
      showToast(handleApiError(error), 'error')
    }
  }

  const taskTypeOptions = [
    { value: 'pull_permit', label: 'Pull Permit', icon: UilFileAlt },
    { value: 'order_parts', label: 'Order Parts', icon: UilShoppingCart },
    { value: 'send_bid', label: 'Send Bid', icon: UilEnvelopeSend },
    { value: 'call_back_schedule', label: 'Call Back to Schedule', icon: UilPhoneAlt },
    { value: 'write_up_billing', label: 'Write Up Billing', icon: UilInvoice },
    { value: 'other', label: 'Other', icon: UilClipboardNotes }
  ]

  const officeStaff = ['sandi', 'skylee']

  const pendingTasks = tasks.filter(t => t.status === 'pending')
  const completedTasks = tasks.filter(t => t.status === 'completed')

  return (
    <Card className="mb-6">
      <CardHeader 
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UilClipboardNotes size={18} color="var(--color-text-primary)" />
            Follow-up Tasks for Office Staff
          </div>
        }
        action={
          !showAddForm && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddForm(true)}
            >
              + Add Task
            </Button>
          )
        }
      />

      {showAddForm && (
        <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: 'var(--color-surface-elevated)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                Task Type *
              </label>
              <Select
                value={taskType}
                onChange={(e) => {
                  setTaskType(e.target.value)
                  const option = taskTypeOptions.find(opt => opt.value === e.target.value)
                  if (option && !taskTitle) {
                    setTaskTitle(option.label)
                  }
                }}
                options={[
                  { value: '', label: 'Select task type...' }, 
                  ...taskTypeOptions.map(opt => ({ value: opt.value, label: opt.label }))
                ]}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                Title *
              </label>
              <Input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g., Pull permit for kitchen remodel"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                Description
              </label>
              <Textarea
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Additional details..."
                rows={3}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                  Assign To
                </label>
                <Select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  options={[
                    { value: '', label: 'Anyone' },
                    ...officeStaff.map(staff => ({ value: staff, label: staff.charAt(0).toUpperCase() + staff.slice(1) }))
                  ]}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                  Due Date
                </label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowAddForm(false)
                  setTaskType('')
                  setTaskTitle('')
                  setTaskDescription('')
                  setAssignedTo('')
                  setDueDate('')
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateTask}
                disabled={submitting || !taskType || !taskTitle}
              >
                {submitting ? 'Creating...' : 'Create Task'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-secondary)' }}>
          Loading tasks...
        </div>
      ) : (
        <>
          {pendingTasks.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '12px' }}>
                Pending ({pendingTasks.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pendingTasks.map((task) => {
                  const isOverdue = task.due_date && new Date(task.due_date) < new Date()
                  return (
                    <div
                      key={task.id}
                      style={{
                        padding: '12px',
                        backgroundColor: isOverdue ? 'rgba(239, 68, 68, 0.05)' : 'var(--color-surface-elevated)',
                        border: `1px solid ${isOverdue ? '#ef4444' : 'var(--color-border)'}`,
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'start',
                        gap: '12px'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          marginBottom: '4px'
                        }}>
                          <span style={{ fontSize: '16px' }}>
                            {(() => {
                              const option = taskTypeOptions.find(opt => opt.value === task.task_type)
                              const Icon = option?.icon || UilClipboardNotes
                              return <Icon size={16} color="var(--color-text-primary)" />
                            })()}
                          </span>
                          <span style={{ 
                            fontSize: '14px', 
                            fontWeight: 600, 
                            color: 'var(--color-text-primary)'
                          }}>
                            {task.title}
                          </span>
                          {isOverdue && (
                            <span style={{
                              padding: '2px 6px',
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              color: '#ef4444',
                              borderRadius: '4px',
                              fontSize: '9px',
                              fontWeight: 600
                            }}>
                              OVERDUE
                            </span>
                          )}
                        </div>
                        {task.description && (
                          <div style={{ 
                            fontSize: '12px', 
                            color: 'var(--color-text-secondary)',
                            marginTop: '4px'
                          }}>
                            {task.description}
                          </div>
                        )}
                        <div style={{ 
                          display: 'flex', 
                          gap: '12px', 
                          marginTop: '6px',
                          fontSize: '11px',
                          color: 'var(--color-text-tertiary)'
                        }}>
                          {task.assigned_to && (
                            <span>Assigned to: <strong>{task.assigned_to}</strong></span>
                          )}
                          {task.due_date && (
                            <span style={{ color: isOverdue ? '#ef4444' : undefined }}>
                              Due: <strong>{new Date(task.due_date).toLocaleDateString()}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleCompleteTask(task.id)}
                      >
                        Mark Done
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          
          {completedTasks.length > 0 && (
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
                Completed ({completedTasks.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      padding: '12px',
                      backgroundColor: 'rgba(34, 197, 94, 0.05)',
                      border: '1px solid rgba(34, 197, 94, 0.2)',
                      borderRadius: '6px',
                      opacity: 0.7
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px'
                    }}>
                      <UilCheckCircle size={16} color="rgb(34, 197, 94)" />
                      <span style={{ 
                        fontSize: '14px', 
                        fontWeight: 500, 
                        color: 'var(--color-text-primary)',
                        textDecoration: 'line-through'
                      }}>
                        {task.title}
                      </span>
                      {task.completed_by && (
                        <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginLeft: 'auto' }}>
                          by {task.completed_by}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {tasks.length === 0 && (
            <div style={{ 
              padding: '20px', 
              backgroundColor: 'var(--color-surface-elevated)', 
              borderRadius: '8px',
              textAlign: 'center',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--text-sm)'
            }}>
              No follow-up tasks yet. Add one above if office staff needs to do something.
            </div>
          )}
        </>
      )}
    </Card>
  )
}
