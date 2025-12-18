'use client'
import React, { useState, useEffect } from 'react'
import { SignalCard, SignalAction } from './SignalCard'
import { useRouter } from 'next/navigation'
import { API_BASE_URL } from '../lib/config'

interface Signal {
  id: string
  type: 'reviews' | 'marketing' | 'dispatch'
  title: string
  count: number
  description: string
  owner?: string | null
  priority: 'high' | 'medium' | 'low'
  actions: Array<{
    label: string
    action: string
    params?: Record<string, any>
  }>
  icon?: string
  link?: string
}

export function Dataflow() {
  const router = useRouter()
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSignals()
    // Refresh every 30 seconds
    const interval = setInterval(loadSignals, 30000)
    return () => clearInterval(interval)
  }, [])

  async function loadSignals() {
    try {
      const token = localStorage.getItem('token')
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE_URL}/signals/all?tenant_id=h2o`, {
        headers,
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setSignals(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Failed to load signals:', error)
      setSignals([])
    } finally {
      setLoading(false)
    }
  }

  function handleAction(signal: Signal, action: Signal['actions'][0]) {
    switch (action.action) {
      case 'navigate':
        if (action.params?.path) {
          router.push(action.params.path)
        }
        break
      case 'open':
        if (signal.link) {
          window.open(signal.link, '_blank')
        }
        break
      default:
        console.log('Action not implemented:', action.action)
    }
  }

  function convertToSignalCard(signal: Signal): React.ReactNode {
    const cardActions: SignalAction[] = signal.actions.slice(0, 2).map(action => ({
      label: action.label,
      onClick: () => handleAction(signal, action),
      variant: action.label.toLowerCase().includes('view') || action.label.toLowerCase().includes('open') 
        ? 'secondary' 
        : 'primary'
    }))

    return (
      <SignalCard
        key={signal.id}
        title={signal.title}
        count={signal.count}
        description={signal.description}
        owner={signal.owner}
        priority={signal.priority}
        actions={cardActions}
        icon={signal.icon}
        onClick={signal.link ? () => router.push(signal.link!) : undefined}
      />
    )
  }

  const reviewsSignals = signals.filter(s => s.type === 'reviews')
  const marketingSignals = signals.filter(s => s.type === 'marketing')
  const dispatchSignals = signals.filter(s => s.type === 'dispatch')

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-secondary)' }}>
        Loading signals...
      </div>
    )
  }

  if (signals.length === 0) {
    return (
      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '48px',
        textAlign: 'center',
        color: 'var(--color-text-secondary)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
        <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
          All Clear
        </div>
        <div>No items require attention at this time.</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Reviews Signals */}
      {reviewsSignals.length > 0 && (
        <div>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: 'var(--color-text-primary)',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>📝</span> Reviews
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '16px'
          }}>
            {reviewsSignals.map(signal => convertToSignalCard(signal))}
          </div>
        </div>
      )}

      {/* Marketing Signals */}
      {marketingSignals.length > 0 && (
        <div>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: 'var(--color-text-primary)',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>📢</span> Marketing
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '16px'
          }}>
            {marketingSignals.map(signal => convertToSignalCard(signal))}
          </div>
        </div>
      )}

      {/* Dispatch Signals */}
      {dispatchSignals.length > 0 && (
        <div>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: 'var(--color-text-primary)',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>🚚</span> Dispatch
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '16px'
          }}>
            {dispatchSignals.map(signal => convertToSignalCard(signal))}
          </div>
        </div>
      )}
    </div>
  )
}


