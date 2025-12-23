'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { API_BASE_URL } from '../../../lib/config'
import { PageHeader } from '../../../components/ui/PageHeader'
import { Button } from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { Input } from '../../../components/ui/Input'
import { Textarea } from '../../../components/ui/Textarea'
import { Card, CardHeader, CardSection } from '../../../components/ui/Card'
import { showToast } from '../../../components/Toast'
import { handleApiError, logError } from '../../../lib/error-handler'
import UilUser from '@iconscout/react-unicons/icons/uil-user'
import UilPhone from '@iconscout/react-unicons/icons/uil-phone'
import UilEnvelope from '@iconscout/react-unicons/icons/uil-envelope'
import UilMapMarker from '@iconscout/react-unicons/icons/uil-map-marker'
import UilFileAlt from '@iconscout/react-unicons/icons/uil-file-alt'
import UilCalendarAlt from '@iconscout/react-unicons/icons/uil-calendar-alt'
import { useTenant } from '../../../contexts/TenantContext'

// Icon component wrapper
function IconWrapper({ Icon, size = 20, color = 'var(--color-text-secondary)' }: { Icon: React.ComponentType<{ size?: number | string; color?: string }>, size?: number, color?: string }) {
  return <Icon size={size} color={color} />
}

interface Customer {
  id: string
  tenant_id: string
  name: string
  phone?: string
  email?: string
  address_line1?: string
  city?: string
  state?: string
  zip?: string
  notes?: string
  tags?: string[]
  created_at: string
  updated_at: string
  service_calls?: ServiceCall[]
}

interface ServiceCall {
  id: string
  customer_name: string
  issue_description: string
  status: string
  priority: string
  scheduled_start?: string
  scheduled_end?: string
  created_at: string
}

export default function CustomerDetail({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const router = useRouter()
  const { currentTenant } = useTenant()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [serviceCalls, setServiceCalls] = useState<ServiceCall[]>([])
  const [id, setId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [stats, setStats] = useState<any>(null)

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

  async function loadStats(customerId: string) {
    if (!customerId || !currentTenant) return
    try {
      const headers = getAuthHeaders()
      const statsRes = await axios.get(
        `${API_BASE_URL}/customers/${customerId}/stats?tenant_id=${currentTenant === 'both' ? 'h2o' : currentTenant || 'h2o'}`,
        { headers, withCredentials: true }
      )
      if (statsRes.data) {
        setStats(statsRes.data)
      }
    } catch (err) {
      // Non-critical - stats are optional, just log error
      console.error('Failed to load customer stats:', err)
      setStats(null)
    }
  }

  function addTag() {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
      setTagInput('')
    }
  }

  function removeTag(tagToRemove: string) {
    setTags(tags.filter(t => t !== tagToRemove))
  }

  async function loadData() {
    try {
      setLoading(true)
      const headers = getAuthHeaders()
      
      // Load customer with service calls
      const customerRes = await axios.get(
        `${API_BASE_URL}/customers/${id}?include_service_calls=true`,
        { headers, withCredentials: true }
      )
      const customerData = customerRes.data
      setCustomer(customerData)
      
      // Set form state
      setName(customerData.name || '')
      setPhone(customerData.phone || '')
      setEmail(customerData.email || '')
      setAddressLine1(customerData.address_line1 || '')
      setCity(customerData.city || '')
      setState(customerData.state || '')
      setZip(customerData.zip || '')
      setNotes(customerData.notes || '')
      setTags(customerData.tags || [])
      
      // Set service calls
      setServiceCalls(customerData.service_calls || [])
      
      // Load stats
      await loadStats(customerData.id)
    } catch (err: any) {
      logError(err, 'loadCustomer')
      showToast(handleApiError(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  async function saveCustomer() {
    if (!id) return
    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Not authenticated. Please log in again.')
      }
      const headers = { 'Authorization': `Bearer ${token}` }
      
      const updateData: any = {
        name,
        phone: phone || null,
        email: email || null,
        address_line1: addressLine1 || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
        notes: notes || null,
        tags: tags.length > 0 ? tags : null,
      }
      
      await axios.patch(`${API_BASE_URL}/customers/${id}`, updateData, { headers, withCredentials: true })
      showToast('Customer updated successfully', 'success')
      await loadData()
    } catch (err: any) {
      logError(err, 'saveCustomer')
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
          Loading customer...
        </p>
      </div>
    )
  }

  if (!customer) {
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
            Customer not found
          </p>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            The customer you're looking for doesn't exist or may have been deleted.
          </p>
        </div>
        <Button onClick={() => router.push('/customers')}>Back to Customers</Button>
      </div>
    )
  }

  const fullAddress = [addressLine1, city, state, zip].filter(Boolean).join(', ')

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <PageHeader
        title={customer.name || 'Unknown Customer'}
        description={fullAddress || 'No address provided'}
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button onClick={() => router.push('/customers')} variant="secondary">Back</Button>
            <Button onClick={saveCustomer} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* Contact Information */}
        <Card>
          <CardHeader title="Contact Information" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Customer name"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                Phone
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                Address
              </label>
              <Input
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                placeholder="Street address"
                style={{ marginBottom: '8px' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px' }}>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                />
                <Input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                />
                <Input
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="ZIP"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader title="Tags" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag()
                  }
                }}
                placeholder="Add a tag (e.g., VIP, Warranty, Commercial)"
                style={{ flex: 1 }}
              />
              <Button onClick={addTag} variant="secondary" size="sm">Add</Button>
            </div>
            {tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 12px',
                      backgroundColor: 'var(--color-primary)',
                      color: '#ffffff',
                      borderRadius: 'var(--radius-full)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 500
                    }}
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ffffff',
                        cursor: 'pointer',
                        padding: 0,
                        marginLeft: '4px',
                        fontSize: '16px',
                        lineHeight: 1,
                        opacity: 0.8
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader title="Notes" />
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes about this customer..."
            rows={12}
          />
        </Card>
      </div>

      {/* Statistics */}
      {stats && (
        <Card style={{ marginBottom: '24px' }}>
          <CardHeader title="Customer Statistics" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Total Service Calls
              </div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {stats.total_service_calls || 0}
              </div>
            </div>
            {stats.first_service_call_date && (
              <div>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Customer Since
                </div>
                <div style={{ fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  {new Date(stats.customer_since || stats.first_service_call_date).toLocaleDateString()}
                </div>
              </div>
            )}
            {stats.last_service_call_date && (
              <div>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Last Service Call
                </div>
                <div style={{ fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  {new Date(stats.last_service_call_date).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
          {stats.status_breakdown && Object.keys(stats.status_breakdown).length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '12px' }}>
                Status Breakdown
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {Object.entries(stats.status_breakdown).map(([status, count]: [string, any]) => (
                  <span
                    key={status}
                    style={{
                      padding: '4px 12px',
                      backgroundColor: 'var(--color-surface-elevated)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 500,
                      color: 'var(--color-text-primary)'
                    }}
                  >
                    {status}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Service Calls History */}
      <Card>
        <CardHeader 
          title={`Service Calls History (${serviceCalls.length})`}
          action={
            <Button 
              variant="primary" 
              size="sm"
              onClick={() => router.push(`/service-calls/new?customer_id=${id}`)}
            >
              + New Service Call
            </Button>
          }
        />
        {serviceCalls.length === 0 ? (
          <div className="border-2 border-dashed border-[var(--color-border)] rounded-lg p-8 text-center">
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
              No service calls for this customer yet
            </p>
            <Button 
              variant="primary" 
              size="sm"
              onClick={() => router.push(`/service-calls/new?customer_id=${id}`)}
            >
              Create First Service Call
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {serviceCalls.map((sc) => (
              <a
                key={sc.id}
                href={`/service-calls/${sc.id}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px',
                  backgroundColor: 'var(--color-surface-elevated)',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  borderLeft: '3px solid var(--color-primary)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-hover)'
                  e.currentTarget.style.transform = 'translateX(2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-surface-elevated)'
                  e.currentTarget.style.transform = 'translateX(0)'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <StatusBadge status={sc.status} />
                    <StatusBadge status={sc.priority} variant="priority" />
                    {sc.scheduled_start && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                        <IconWrapper Icon={UilCalendarAlt} size={14} />
                        {new Date(sc.scheduled_start).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div style={{ fontWeight: 500, color: 'var(--color-text-primary)', fontSize: 'var(--text-base)', marginBottom: '4px' }}>
                    {sc.issue_description}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                    Created {new Date(sc.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ marginLeft: '16px' }}>
                  <IconWrapper Icon={UilFileAlt} size={20} color="var(--color-primary)" />
                </div>
              </a>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

