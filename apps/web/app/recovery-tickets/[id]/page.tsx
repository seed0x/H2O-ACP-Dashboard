'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { reviewApi, RecoveryTicket } from '../../../lib/api/reviews'
import { PageHeader } from '../../../components/ui/PageHeader'
import { Button } from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Textarea } from '../../../components/ui/Textarea'
import { showToast } from '../../../components/Toast'
import { handleApiError, logError } from '../../../lib/error-handler'

export default function RecoveryTicketDetail({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const router = useRouter()
  const [ticket, setTicket] = useState<RecoveryTicket | null>(null)
  const [review, setReview] = useState<any>(null)
  const [id, setId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Form state
  const [status, setStatus] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [resolutionNotes, setResolutionNotes] = useState('')

  useEffect(() => {
    async function getParams() {
      const resolvedParams = params instanceof Promise ? await params : params
      setId(resolvedParams.id)
    }
    getParams()
  }, [params])

  useEffect(() => {
    if (!id) return
    loadData()
  }, [id])

  async function loadData() {
    try {
      setLoading(true)
      const ticketData = await reviewApi.getRecoveryTicket(id)
      setTicket(ticketData)
      
      // Set form state
      setStatus(ticketData.status || '')
      setAssignedTo(ticketData.assigned_to || '')
      setResolutionNotes(ticketData.resolution_notes || '')
      
      // Load review if available
      if (ticketData.review_id) {
        try {
          const reviewData = await reviewApi.getReview(ticketData.review_id)
          setReview(reviewData)
        } catch (err) {
          logError(err, 'loadReview')
        }
      }
    } catch (err: any) {
      logError(err, 'loadRecoveryTicket')
      showToast(handleApiError(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  async function saveTicket() {
    if (!id) return
    try {
      setSaving(true)
      await reviewApi.updateRecoveryTicket(id, {
        status,
        assigned_to: assignedTo || undefined,
        resolution_notes: resolutionNotes || undefined,
      })
      showToast('Recovery ticket updated successfully', 'success')
      await loadData()
    } catch (err: any) {
      logError(err, 'saveRecoveryTicket')
      showToast(handleApiError(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ color: 'var(--color-text-secondary)' }}>Loading recovery ticket...</div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div style={{ padding: '32px' }}>
        <div style={{ color: '#EF5350', marginBottom: '16px' }}>Recovery ticket not found</div>
        <Button onClick={() => router.push('/reviews')}>Back to Reviews</Button>
      </div>
    )
  }

  const isOverdue = ticket.status !== 'resolved' && ticket.status !== 'closed' && 
    new Date(ticket.created_at) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const daysOld = Math.floor((new Date().getTime() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <PageHeader
        title={`Recovery Ticket - ${ticket.customer_name}`}
        description={`Created: ${new Date(ticket.created_at).toLocaleDateString()}`}
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button onClick={() => router.push('/reviews')} variant="secondary">Back</Button>
            <Button onClick={saveTicket} disabled={saving}>
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
              Open for {daysOld} day{daysOld !== 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: '14px', color: '#EF5350' }}>
              This ticket needs attention and resolution.
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* Status & Assignment */}
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
                  { value: 'open', label: 'Open' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'resolved', label: 'Resolved' },
                  { value: 'closed', label: 'Closed' }
                ]}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Assigned To
              </label>
              <Input
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Owner name"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Current Status
              </label>
              <div style={{ marginTop: '8px' }}>
                <StatusBadge status={ticket.status} />
              </div>
            </div>
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
                {ticket.customer_name}
              </div>
            </div>
            {ticket.customer_email && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Email
                </div>
                <a href={`mailto:${ticket.customer_email}`} style={{ fontSize: '16px', color: 'var(--color-primary)', textDecoration: 'none' }}>
                  ✉️ {ticket.customer_email}
                </a>
              </div>
            )}
            {ticket.customer_phone && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Phone
                </div>
                <a href={`tel:${ticket.customer_phone}`} style={{ fontSize: '16px', color: 'var(--color-primary)', textDecoration: 'none' }}>
                  📞 {ticket.customer_phone}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Related Items */}
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: 'var(--color-text-primary)' }}>
            Related Items
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {review && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Review
                </div>
                <a 
                  href={`/reviews/${review.id}`}
                  style={{ fontSize: '14px', color: 'var(--color-primary)', textDecoration: 'none' }}
                >
                  View Review ({'⭐'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}) →
                </a>
              </div>
            )}
            {ticket.service_call_id && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Service Call
                </div>
                <a 
                  href={`/service-calls/${ticket.service_call_id}`}
                  style={{ fontSize: '14px', color: 'var(--color-primary)', textDecoration: 'none' }}
                >
                  View Service Call →
                </a>
              </div>
            )}
          </div>
        </div>
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
          {ticket.issue_description}
        </div>
      </div>

      {/* Resolution Notes */}
      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
          Resolution Notes
        </h2>
        <Textarea
          value={resolutionNotes}
          onChange={(e) => setResolutionNotes(e.target.value)}
          placeholder="Document how this issue was resolved..."
          rows={6}
        />
      </div>
    </div>
  )
}

