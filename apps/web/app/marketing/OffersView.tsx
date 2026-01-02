'use client'
import { useState, useEffect } from 'react'
import { useTenant } from '../../contexts/TenantContext'
import { marketingApi, type Offer } from '../../lib/api/marketing'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { handleApiError, showSuccess } from '../../lib/error-handler'

export function OffersView() {
  const { currentTenant } = useTenant()
  // Marketing is h2o-specific
  const tenantId = 'h2o'
  
  const [offers, setOffers] = useState<Offer[]>([])
  const [activeOffers, setActiveOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    service_type: '',
    valid_from: '',
    valid_to: '',
    discount_type: 'percentage' as 'percentage' | 'fixed_amount' | 'free_service',
    discount_value: '',
    terms: '',
    is_active: true,
    coupon_code: '',
    website_url: ''
  })

  useEffect(() => {
    loadOffers()
    loadActiveOffers()
  }, [tenantId])

  const loadOffers = async () => {
    try {
      setLoading(true)
      const data = await marketingApi.listOffers(tenantId)
      setOffers(data)
    } catch (error) {
      handleApiError(error, 'Load offers')
    } finally {
      setLoading(false)
    }
  }

  const loadActiveOffers = async () => {
    try {
      const data = await marketingApi.listActiveOffers(tenantId)
      setActiveOffers(data)
    } catch (error) {
      handleApiError(error, 'Load active offers')
    }
  }

  const handleCreate = () => {
    setFormData({
      title: '',
      description: '',
      service_type: '',
      valid_from: '',
      valid_to: '',
      discount_type: 'percentage',
      discount_value: '',
      terms: '',
      is_active: true,
      coupon_code: '',
      website_url: ''
    })
    setEditingOffer(null)
    setShowCreateModal(true)
  }

  const handleEdit = (offer: Offer) => {
    setFormData({
      title: offer.title,
      description: offer.description || '',
      service_type: offer.service_type || '',
      valid_from: offer.valid_from,
      valid_to: offer.valid_to,
      discount_type: offer.discount_type,
      discount_value: offer.discount_value?.toString() || '',
      terms: offer.terms || '',
      is_active: offer.is_active,
      coupon_code: offer.coupon_code || '',
      website_url: offer.website_url || ''
    })
    setEditingOffer(offer)
    setShowCreateModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingOffer) {
        await marketingApi.updateOffer(editingOffer.id, {
          ...formData,
          discount_value: formData.discount_value ? parseFloat(formData.discount_value) : undefined
        })
        showSuccess('Offer updated successfully')
      } else {
        await marketingApi.createOffer({
          tenant_id: tenantId,
          ...formData,
          discount_value: formData.discount_value ? parseFloat(formData.discount_value) : undefined
        })
        showSuccess('Offer created successfully')
      }
      setShowCreateModal(false)
      loadOffers()
      loadActiveOffers()
    } catch (error) {
      handleApiError(error, editingOffer ? 'Update offer' : 'Create offer')
    }
  }

  const handleDelete = async (offerId: string) => {
    if (!confirm('Are you sure you want to delete this offer?')) return
    try {
      await marketingApi.deleteOffer(offerId)
      showSuccess('Offer deleted successfully')
      loadOffers()
      loadActiveOffers()
    } catch (error) {
      handleApiError(error, 'Delete offer')
    }
  }

  const formatDiscount = (offer: Offer) => {
    if (offer.discount_type === 'percentage') {
      return `${offer.discount_value}% off`
    } else if (offer.discount_type === 'fixed_amount') {
      return `$${offer.discount_value} off`
    } else {
      return 'Free Service'
    }
  }

  return (
    <div>
      {/* Active Offers Summary */}
      {activeOffers.length > 0 && (
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text-primary)' }}>
            Currently Active Offers ({activeOffers.length})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {activeOffers.map((offer) => (
              <div key={offer.id} style={{
                padding: '16px',
                backgroundColor: 'var(--color-hover)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-primary)' }}>
                  {offer.title}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                  {formatDiscount(offer)}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  Valid: {new Date(offer.valid_from).toLocaleDateString()} - {new Date(offer.valid_to).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <Button onClick={handleCreate}>+ New Offer</Button>
      </div>

      {/* Offers Table */}
      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '24px'
      }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            Loading offers...
          </div>
        ) : offers.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No offers found. Create your first offer to start managing promotions.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Title</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Discount</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Valid Dates</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((offer) => (
                  <tr key={offer.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px' }}>{offer.title}</td>
                    <td style={{ padding: '12px' }}>{formatDiscount(offer)}</td>
                    <td style={{ padding: '12px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                      {new Date(offer.valid_from).toLocaleDateString()} - {new Date(offer.valid_to).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <StatusBadge 
                        status={offer.is_active ? 'Active' : 'Inactive'}
                        variant={offer.is_active ? 'success' : 'default'}
                      />
                    </td>
                    <td style={{ padding: '12px', display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleEdit(offer)}
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
                      <button
                        onClick={() => handleDelete(offer.id)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: 'transparent',
                          border: '1px solid #EF5350',
                          borderRadius: '6px',
                          color: '#EF5350',
                          fontSize: '14px',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
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
            maxWidth: '700px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {editingOffer ? 'Edit Offer' : 'Create New Offer'}
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
                <Input
                  label="Title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Spring Plumbing Special"
                  required
                />
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--color-text-primary)' }}>
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Offer description..."
                    rows={3}
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
                <Input
                  label="Service Type (optional)"
                  value={formData.service_type}
                  onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                  placeholder="Water Heater, Drain Cleaning, etc."
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Input
                    label="Valid From"
                    type="date"
                    value={formData.valid_from}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                    required
                  />
                  <Input
                    label="Valid To"
                    type="date"
                    value={formData.valid_to}
                    onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
                    required
                  />
                </div>
                <Select
                  label="Discount Type"
                  value={formData.discount_type}
                  onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as any })}
                  options={[
                    { value: 'percentage', label: 'Percentage Off' },
                    { value: 'fixed_amount', label: 'Fixed Amount Off' },
                    { value: 'free_service', label: 'Free Service' }
                  ]}
                />
                {formData.discount_type !== 'free_service' && (
                  <Input
                    label="Discount Value"
                    type="number"
                    step="0.01"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                    placeholder={formData.discount_type === 'percentage' ? '10' : '50'}
                    required
                  />
                )}
                <Input
                  label="Coupon Code (optional)"
                  value={formData.coupon_code}
                  onChange={(e) => setFormData({ ...formData, coupon_code: e.target.value })}
                  placeholder="SPRING2024"
                />
                <Input
                  label="Website URL (optional)"
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  placeholder="https://..."
                  type="url"
                />
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--color-text-primary)' }}>
                    Terms & Conditions
                  </label>
                  <textarea
                    value={formData.terms}
                    onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                    placeholder="Terms and conditions..."
                    rows={3}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    style={{ cursor: 'pointer' }}
                  />
                  <label style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                    Active
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <Button type="button" onClick={() => setShowCreateModal(false)} variant="secondary">
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingOffer ? 'Update' : 'Create'} Offer
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

