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

interface Bid {
  id: string
  tenant_id: string
  builder_id?: string
  project_name: string
  status: string
  due_date?: string
  sent_date?: string
  amount_cents?: number
  notes?: string
  created_at: string
  updated_at: string
}

interface BidLineItem {
  id: string
  category: string
  description: string
  qty?: number
  unit_price_cents?: number
  total_cents?: number
  notes?: string
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

export default function BidDetail({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const router = useRouter()
  const [bid, setBid] = useState<Bid | null>(null)
  const [lineItems, setLineItems] = useState<BidLineItem[]>([])
  const [builder, setBuilder] = useState<Builder | null>(null)
  const [audit, setAudit] = useState<AuditLog[]>([])
  const [id, setId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Form state
  const [status, setStatus] = useState('')
  const [projectName, setProjectName] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [sentDate, setSentDate] = useState('')
  const [amountCents, setAmountCents] = useState('')
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
      
      // Load bid
      const bidRes = await axios.get(`${API_BASE_URL}/bids/${id}`, { headers, withCredentials: true })
      const bidData = bidRes.data
      setBid(bidData)
      
      // Set form state
      setStatus(bidData.status || '')
      setProjectName(bidData.project_name || '')
      setDueDate(bidData.due_date || '')
      setSentDate(bidData.sent_date || '')
      setAmountCents(bidData.amount_cents ? (bidData.amount_cents / 100).toFixed(2) : '')
      setNotes(bidData.notes || '')
      
      // Load line items
      try {
        const itemsRes = await axios.get(`${API_BASE_URL}/bids/${id}/line-items`, { headers, withCredentials: true })
        setLineItems(Array.isArray(itemsRes.data) ? itemsRes.data : [])
      } catch (err) {
        logError(err, 'loadLineItems')
        setLineItems([])
      }
      
      // Load builder
      if (bidData.builder_id) {
        try {
          const builderRes = await axios.get(`${API_BASE_URL}/builders/${bidData.builder_id}`, { headers, withCredentials: true })
          setBuilder(builderRes.data)
        } catch (err) {
          logError(err, 'loadBuilder')
        }
      }
      
      // Load audit
      await loadAudit()
    } catch (err: any) {
      logError(err, 'loadBid')
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
        params: { entity_type: 'bid', entity_id: id },
        withCredentials: true
      })
      setAudit(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      logError(err, 'loadAudit')
      setAudit([])
    }
  }

  async function saveBid() {
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
        project_name: projectName,
        notes,
        due_date: dueDate || null,
        sent_date: sentDate || null,
        amount_cents: amountCents ? Math.round(parseFloat(amountCents) * 100) : null,
      }
      
      await axios.patch(`${API_BASE_URL}/bids/${id}`, updateData, { headers, withCredentials: true })
      showToast('Bid updated successfully', 'success')
      await loadData()
    } catch (err: any) {
      logError(err, 'saveBid')
      showToast(handleApiError(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ color: 'var(--color-text-secondary)' }}>Loading bid...</div>
      </div>
    )
  }

  if (!bid) {
    return (
      <div style={{ padding: '32px' }}>
        <div style={{ color: '#EF5350', marginBottom: '16px' }}>Bid not found</div>
        <Button onClick={() => router.push('/bids')}>Back to Bids</Button>
      </div>
    )
  }

  const isOverdue = bid.due_date && new Date(bid.due_date) < new Date() && bid.status !== 'Won' && bid.status !== 'Lost'
  const daysOverdue = isOverdue && bid.due_date 
    ? Math.floor((new Date().getTime() - new Date(bid.due_date).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const totalAmount = lineItems.reduce((sum, item) => sum + (item.total_cents || 0), 0) || bid.amount_cents || 0

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <PageHeader
        title={bid.project_name}
        description={`Tenant: ${bid.tenant_id}${builder ? ` | Builder: ${builder.name}` : ''}`}
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button onClick={() => router.push('/bids')} variant="secondary">Back</Button>
            <Button onClick={saveBid} disabled={saving}>
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
              Due date: {bid.due_date ? new Date(bid.due_date).toLocaleDateString() : 'Not set'}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* Status & Key Info */}
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: 'var(--color-text-primary)' }}>
            Status & Details
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Project Name
              </label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Project name"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Status
              </label>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: 'Draft', label: 'Draft' },
                  { value: 'Sent', label: 'Sent' },
                  { value: 'Won', label: 'Won' },
                  { value: 'Lost', label: 'Lost' }
                ]}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Current Status
              </label>
              <div style={{ marginTop: '8px' }}>
                <StatusBadge status={bid.status} />
              </div>
            </div>
          </div>
        </div>

        {/* Dates & Amount */}
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: 'var(--color-text-primary)' }}>
            Dates & Amount
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Due Date
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Sent Date
              </label>
              <Input
                type="date"
                value={sentDate}
                onChange={(e) => setSentDate(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Total Amount
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>$</span>
                <Input
                  type="number"
                  step="0.01"
                  value={amountCents}
                  onChange={(e) => setAmountCents(e.target.value)}
                  placeholder="0.00"
                  style={{ flex: 1 }}
                />
              </div>
              {lineItems.length > 0 && (
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                  Calculated from line items: ${(totalAmount / 100).toFixed(2)}
                </div>
              )}
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

      {/* Line Items */}
      {lineItems.length > 0 && (
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: 'var(--color-text-primary)' }}>
            Line Items
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Category</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Description</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Qty</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Unit Price</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px', fontSize: '14px', color: 'var(--color-text-primary)' }}>{item.category}</td>
                    <td style={{ padding: '12px', fontSize: '14px', color: 'var(--color-text-primary)' }}>{item.description}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', color: 'var(--color-text-primary)' }}>{item.qty || '-'}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                      {item.unit_price_cents ? `$${(item.unit_price_cents / 100).toFixed(2)}` : '-'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)' }}>
                      {item.total_cents ? `$${(item.total_cents / 100).toFixed(2)}` : '-'}
                    </td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid var(--color-border)' }}>
                  <td colSpan={4} style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                    Total:
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '16px', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                    ${(totalAmount / 100).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

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
          placeholder="Bid notes and updates..."
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
