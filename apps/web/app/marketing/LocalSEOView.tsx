'use client'
import { useState, useEffect } from 'react'
import { useTenant } from '../../contexts/TenantContext'
import { marketingApi, type LocalSEOTopic } from '../../lib/api/marketing'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { handleApiError, showSuccess } from '../../lib/error-handler'

const SERVICE_TYPES = [
  'Water Heater Repair', 'Water Heater Installation', 'Drain Cleaning', 'Sewer Line Repair',
  'Sewer Line Installation', 'Emergency Plumber', 'Leak Detection', 'Pipe Repair',
  'Pipe Installation', 'Water Line Repair', 'Fixture Installation', 'Garbage Disposal',
  'Sump Pump', 'Water Softener', 'Backflow Prevention'
]

const CITIES = [
  'Vancouver WA', 'Camas WA', 'Battle Ground WA', 'Washougal WA', 'Ridgefield WA',
  'La Center WA', 'Yacolt WA', 'Brush Prairie WA', 'Hockinson WA'
]

export function LocalSEOView() {
  const { currentTenant } = useTenant()
  // Marketing is h2o-specific
  const tenantId = 'h2o'
  
  const [topics, setTopics] = useState<LocalSEOTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [coverageGaps, setCoverageGaps] = useState({ not_started: 0, needs_update: 0, total_gaps: 0 })
  const [filters, setFilters] = useState({ status: '', service_type: '', city: '' })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTopic, setEditingTopic] = useState<LocalSEOTopic | null>(null)
  const [formData, setFormData] = useState({
    service_type: '',
    city: '',
    status: 'not_started',
    target_url: '',
    notes: ''
  })

  useEffect(() => {
    loadTopics()
    loadCoverageGaps()
  }, [tenantId, filters])

  const loadTopics = async () => {
    try {
      setLoading(true)
      const data = await marketingApi.listLocalSEOTopics(tenantId, {
        status: filters.status || undefined,
        service_type: filters.service_type || undefined,
        city: filters.city || undefined
      })
      setTopics(data)
    } catch (error) {
      handleApiError(error, 'Load local SEO topics')
    } finally {
      setLoading(false)
    }
  }

  const loadCoverageGaps = async () => {
    try {
      const gaps = await marketingApi.getCoverageGaps(tenantId)
      setCoverageGaps(gaps)
    } catch (error) {
      handleApiError(error, 'Load coverage gaps')
    }
  }

  const handleCreate = () => {
    setFormData({ service_type: '', city: '', status: 'not_started', target_url: '', notes: '' })
    setEditingTopic(null)
    setShowCreateModal(true)
  }

  const handleEdit = (topic: LocalSEOTopic) => {
    setFormData({
      service_type: topic.service_type,
      city: topic.city,
      status: topic.status,
      target_url: topic.target_url || '',
      notes: topic.notes || ''
    })
    setEditingTopic(topic)
    setShowCreateModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingTopic) {
        await marketingApi.updateLocalSEOTopic(editingTopic.id, {
          status: formData.status,
          target_url: formData.target_url || undefined,
          notes: formData.notes || undefined
        })
        showSuccess('Topic updated successfully')
      } else {
        await marketingApi.createLocalSEOTopic({
          tenant_id: tenantId,
          service_type: formData.service_type,
          city: formData.city,
          status: formData.status,
          target_url: formData.target_url || undefined,
          notes: formData.notes || undefined
        })
        showSuccess('Topic created successfully')
      }
      setShowCreateModal(false)
      loadTopics()
      loadCoverageGaps()
    } catch (error) {
      handleApiError(error, editingTopic ? 'Update topic' : 'Create topic')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'success'
      case 'in_progress': return 'info'
      case 'needs_update': return 'warning'
      default: return 'default'
    }
  }

  return (
    <div>
      {/* Coverage Gaps Summary */}
      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text-primary)' }}>
          Local SEO Coverage
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
          {coverageGaps.total_gaps} topics need attention
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {coverageGaps.not_started}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Not Started</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {coverageGaps.needs_update}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Needs Update</div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <Select
              label="Status"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'not_started', label: 'Not Started' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'published', label: 'Published' },
                { value: 'needs_update', label: 'Needs Update' }
              ]}
            />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <Input
              label="Service Type"
              value={filters.service_type}
              onChange={(e) => setFilters({ ...filters, service_type: e.target.value })}
              placeholder="Filter by service..."
            />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <Input
              label="City"
              value={filters.city}
              onChange={(e) => setFilters({ ...filters, city: e.target.value })}
              placeholder="Filter by city..."
            />
          </div>
          <Button onClick={handleCreate}>+ New Topic</Button>
        </div>
      </div>

      {/* Topics Table */}
      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '24px'
      }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            Loading topics...
          </div>
        ) : topics.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No topics found. Create your first topic to start tracking local SEO coverage.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Service Type</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>City</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Last Posted</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {topics.map((topic) => (
                  <tr key={topic.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px' }}>{topic.service_type}</td>
                    <td style={{ padding: '12px' }}>{topic.city}</td>
                    <td style={{ padding: '12px' }}>
                      <StatusBadge 
                        status={topic.status.replace('_', ' ')} 
                        variant={getStatusColor(topic.status) as any}
                      />
                    </td>
                    <td style={{ padding: '12px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                      {topic.last_posted_at ? new Date(topic.last_posted_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <button
                        onClick={() => handleEdit(topic)}
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
                    </td>
                  </tr>
                ))}
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
                {editingTopic ? 'Edit Topic' : 'Create New Topic'}
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
                {!editingTopic && (
                  <>
                    <Select
                      label="Service Type"
                      value={formData.service_type}
                      onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                      options={[
                        { value: '', label: 'Select service type...' },
                        ...SERVICE_TYPES.map(st => ({ value: st, label: st }))
                      ]}
                      required
                    />
                    <Select
                      label="City"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      options={[
                        { value: '', label: 'Select city...' },
                        ...CITIES.map(c => ({ value: c, label: c }))
                      ]}
                      required
                    />
                  </>
                )}
                <Select
                  label="Status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  options={[
                    { value: 'not_started', label: 'Not Started' },
                    { value: 'in_progress', label: 'In Progress' },
                    { value: 'published', label: 'Published' },
                    { value: 'needs_update', label: 'Needs Update' }
                  ]}
                />
                <Input
                  label="Target URL (Landing Page)"
                  value={formData.target_url}
                  onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
                  placeholder="https://..."
                />
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--color-text-primary)' }}>
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    rows={4}
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
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <Button type="button" onClick={() => setShowCreateModal(false)} variant="secondary">
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingTopic ? 'Update' : 'Create'} Topic
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
