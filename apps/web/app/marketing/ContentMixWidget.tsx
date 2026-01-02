'use client'
import { useState, useEffect } from 'react'
import { useTenant } from '../../contexts/TenantContext'
import { marketingApi, ContentMixSummary } from '../../lib/api/marketing'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { handleApiError } from '../../lib/error-handler'

export function ContentMixWidget() {
  const { currentTenant } = useTenant()
  // Support both tenants - when 'both' is selected, default to h2o
  const tenantId = currentTenant === 'both' ? 'h2o' : (currentTenant || 'h2o')
  
  const [summaries, setSummaries] = useState<ContentMixSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadContentMix()
  }, [tenantId])

  const loadContentMix = async () => {
    try {
      setLoading(true)
      const data = await marketingApi.getContentMixSummary(tenantId, 4)
      setSummaries(data)
    } catch (error) {
      handleApiError(error, 'Load content mix')
    } finally {
      setLoading(false)
    }
  }

  const getHealthVariant = (health: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (health) {
      case 'good': return 'success'
      case 'warning': return 'warning'
      case 'critical': return 'error'
      default: return 'default'
    }
  }

  const getHealthLabel = (health: string) => {
    switch (health) {
      case 'good': return 'Balanced'
      case 'warning': return 'Needs Attention'
      case 'critical': return 'Unbalanced'
      default: return health
    }
  }

  const ProgressBar = ({ actual, target, label }: { actual: number; target: number; label: string }) => {
    const percentage = target > 0 ? Math.min((actual / target) * 100, 100) : 0
    const isOver = actual > target
    
    return (
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{label}</span>
          <span style={{ 
            fontSize: '13px', 
            fontFamily: 'monospace',
            color: isOver ? '#f59e0b' : 'var(--color-text-secondary)'
          }}>
            {actual}/{target}
          </span>
        </div>
        <div style={{ 
          height: '6px', 
          backgroundColor: 'var(--color-border)', 
          borderRadius: '3px',
          overflow: 'hidden'
        }}>
          <div style={{ 
            height: '100%', 
            width: `${percentage}%`,
            backgroundColor: isOver ? '#f59e0b' : 'var(--color-primary)',
            borderRadius: '3px',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '24px'
      }}>
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          Loading content mix...
        </div>
      </div>
    )
  }

  if (summaries.length === 0) {
    return (
      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '24px'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-primary)' }}>
          Weekly Content Mix
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
          No channel accounts configured yet.
        </p>
      </div>
    )
  }

  return (
    <div style={{
      backgroundColor: 'var(--color-card)',
      border: '1px solid var(--color-border)',
      borderRadius: '12px',
      padding: '24px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          Weekly Content Mix
        </h3>
        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>This Week</span>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {summaries.map((summary) => (
          <div key={summary.channel_account_id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {summary.channel_account_name}
              </span>
              <StatusBadge 
                status={getHealthLabel(summary.overall_health)}
                variant={getHealthVariant(summary.overall_health)}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <ProgressBar 
                actual={summary.educational.actual} 
                target={summary.educational.target} 
                label="Educational"
              />
              <ProgressBar 
                actual={summary.authority.actual} 
                target={summary.authority.target} 
                label="Authority"
              />
              <ProgressBar 
                actual={summary.promo.actual} 
                target={summary.promo.target} 
                label="Promo"
              />
              <ProgressBar 
                actual={summary.local_relevance.actual} 
                target={summary.local_relevance.target} 
                label="Local"
              />
            </div>
            
            {summary.warnings.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                {summary.warnings.map((warning, idx) => (
                  <div key={idx} style={{ 
                    fontSize: '12px', 
                    color: '#f59e0b',
                    marginBottom: '4px'
                  }}>
                    {warning}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ContentMixWidget
