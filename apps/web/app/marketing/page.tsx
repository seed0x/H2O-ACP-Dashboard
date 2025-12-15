'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageHeader } from '../../components/ui/PageHeader'

function MarketingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'posts'

  const tabs = [
    { id: 'posts', label: 'Posts' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'accounts', label: 'Accounts' }
  ]

  const setActiveTab = (tabId: string) => {
    router.push(`/marketing?tab=${tabId}`)
  }

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader
        title="Marketing Content Calendar"
        description="Plan and track marketing posts across all channels"
      />

      {/* Tabs */}
      <div style={{
        borderBottom: '1px solid var(--color-border)',
        marginBottom: '32px'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 24px',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                fontWeight: activeTab === tab.id ? '600' : '500',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = 'var(--color-text-primary)'
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = 'var(--color-text-secondary)'
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'posts' && <PostsView />}
        {activeTab === 'calendar' && <CalendarView />}
        {activeTab === 'accounts' && <AccountsView />}
      </div>
    </div>
  )
}

export default function MarketingPage() {
  return (
    <Suspense fallback={<div style={{ padding: '32px' }}>Loading...</div>}>
      <MarketingContent />
    </Suspense>
  )
}

function PostsView() {
  return (
    <div style={{
      backgroundColor: 'var(--color-card)',
      border: '1px solid var(--color-border)',
      borderRadius: '12px',
      padding: '48px',
      textAlign: 'center',
      color: 'var(--color-text-secondary)'
    }}>
      Posts list view - Coming next
    </div>
  )
}

function CalendarView() {
  return (
    <div style={{
      backgroundColor: 'var(--color-card)',
      border: '1px solid var(--color-border)',
      borderRadius: '12px',
      padding: '48px',
      textAlign: 'center',
      color: 'var(--color-text-secondary)'
    }}>
      Calendar view - Coming next
    </div>
  )
}

function AccountsView() {
  return (
    <div style={{
      backgroundColor: 'var(--color-card)',
      border: '1px solid var(--color-border)',
      borderRadius: '12px',
      padding: '48px',
      textAlign: 'center',
      color: 'var(--color-text-secondary)'
    }}>
      Accounts view - Coming next
    </div>
  )
}
