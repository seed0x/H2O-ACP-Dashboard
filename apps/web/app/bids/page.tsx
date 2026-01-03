'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { API_BASE_URL } from '../../lib/config'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { BidCard } from '../../components/ui/BidCard'
import { useMobile } from '../../lib/useMobile'
import { handleApiError } from '../../lib/error-handler'

interface Bid {
  id: string
  project_name: string
  status: string
  amount_cents?: number
  sent_date?: string
  due_date?: string
  builder_id?: string
  tenant_id: string
}

interface BidWithLineItems extends Bid {
  line_items?: Array<{
    id: string
    unit_price_cents?: number
    total_cents?: number
  }>
}

export default function BidsPage(){
  const router = useRouter()
  const isMobile = useMobile()
  const [bids, setBids] = useState<Bid[]>([])
  const [tenant, setTenant] = useState('all_county')
  const [search, setSearch] = useState('')
  const [builderId, setBuilderId] = useState('')
  const [status, setStatus] = useState('')
  const [builders, setBuilders] = useState<Array<{ id: string; name: string; tenant_id: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  
  // Pipeline data
  const [sentBids, setSentBids] = useState<Bid[]>([])
  const [draftingBids, setDraftingBids] = useState<BidWithLineItems[]>([])
  const [needsApprovalBids, setNeedsApprovalBids] = useState<BidWithLineItems[]>([])
  const [readyToSendBids, setReadyToSendBids] = useState<BidWithLineItems[]>([])
  const [pipelineLoading, setPipelineLoading] = useState(true)

  function getAuthHeaders() {
    const token = localStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }

  useEffect(()=>{
    async function load(){
      try {
        setLoading(true)
        const headers = getAuthHeaders()
        const b = await axios.get(`${API_BASE_URL}/builders`, { headers, withCredentials: true })
        setBuilders(Array.isArray(b.data) ? b.data : [])
        const res = await axios.get(`${API_BASE_URL}/bids`, { 
          headers,
          params: { tenant_id: tenant, search, builder_id: builderId || undefined, status: status || undefined }, 
          withCredentials: true 
        })
        setBids(Array.isArray(res.data) ? res.data : [])
      } catch (err: unknown) {
        handleApiError(err, 'Load bids')
        setBids([])
        setBuilders([])
      } finally {
        setLoading(false)
      }
    }
    load()
    loadPipeline()
  }, [tenant])

  async function loadPipeline() {
    try {
      setPipelineLoading(true)
      const headers = getAuthHeaders()
      
      // Load all draft bids
      const draftRes = await axios.get(`${API_BASE_URL}/bids`, {
        headers,
        params: { tenant_id: tenant, status: 'Draft', limit: 100 },
        withCredentials: true
      })
      const draftBids: Bid[] = Array.isArray(draftRes.data) ? draftRes.data : []
      
      // Load sent bids
      const sentRes = await axios.get(`${API_BASE_URL}/bids`, {
        headers,
        params: { tenant_id: tenant, status: 'Sent', limit: 50 },
        withCredentials: true
      })
      const sent: Bid[] = Array.isArray(sentRes.data) ? sentRes.data : []
      setSentBids(sent)
      
      // For each draft bid, check line items to determine status
      const drafting: BidWithLineItems[] = []
      const needsApproval: BidWithLineItems[] = []
      const readyToSend: BidWithLineItems[] = []
      
      for (const bid of draftBids) {
        // Skip if already sent
        if (bid.sent_date) continue
        
        try {
          // Load line items for this bid
          const itemsRes = await axios.get(`${API_BASE_URL}/bids/${bid.id}/line-items`, {
            headers,
            withCredentials: true
          })
          const lineItems = Array.isArray(itemsRes.data) ? itemsRes.data : []
          
          const bidWithItems: BidWithLineItems = { ...bid, line_items: lineItems }
          
          // Determine status
          const hasLineItems = lineItems.length > 0
          const hasAmount = !!bid.amount_cents
          const allItemsHavePrices = hasLineItems && lineItems.every(item => item.unit_price_cents != null)
          const someItemsMissingPrices = hasLineItems && lineItems.some(item => item.unit_price_cents == null)
          
          if (!hasLineItems && !hasAmount) {
            // No line items and no amount - still drafting
            drafting.push(bidWithItems)
          } else if (someItemsMissingPrices || (hasLineItems && !hasAmount)) {
            // Has line items but some missing prices, or has items but no total amount - needs approval
            needsApproval.push(bidWithItems)
          } else if (allItemsHavePrices || hasAmount) {
            // All items have prices or has amount - ready to send
            readyToSend.push(bidWithItems)
          } else {
            // Fallback to drafting
            drafting.push(bidWithItems)
          }
        } catch (err) {
          // If we can't load line items, assume still drafting
          drafting.push({ ...bid, line_items: [] })
        }
      }
      
      setDraftingBids(drafting)
      setNeedsApprovalBids(needsApproval)
      setReadyToSendBids(readyToSend)
    } catch (err: unknown) {
      handleApiError(err, 'Load pipeline')
      setSentBids([])
      setDraftingBids([])
      setNeedsApprovalBids([])
      setReadyToSendBids([])
    } finally {
      setPipelineLoading(false)
    }
  }

  async function searchNow(){
    try {
      setError('')
      const headers = getAuthHeaders()
      const res = await axios.get(`${API_BASE_URL}/bids`, { 
        headers,
        params: { tenant_id: tenant, search, builder_id: builderId || undefined, status: status || undefined }, 
        withCredentials: true 
      })
      setBids(Array.isArray(res.data) ? res.data : [])
      // Refresh pipeline when search changes
      await loadPipeline()
    } catch (err: unknown) {
      handleApiError(err, 'Search bids')
      setError(err instanceof Error ? err.message : 'Failed to search bids')
      setBids([])
    }
  }

  async function create(){
    try{
      setError('')
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Not authenticated. Please log in again.')
      }

      const body = {
        tenant_id: tenant,
        project_name: 'Project ' + Math.random().toString(36).slice(2,6),
        status: 'Draft',
        builder_id: builderId || builders[0]?.id
      }
      await axios.post(`${API_BASE_URL}/bids`, body, { 
        headers: { 'Authorization': `Bearer ${token}` },
        withCredentials: true 
      })
      await searchNow()
      await loadPipeline()
    } catch (err: unknown){
      handleApiError(err, 'Create bid')
      setError(err instanceof Error ? err.message : 'Failed to create bid')
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '32px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '400px',
          color: 'var(--color-text-secondary)'
        }}>
          Loading bids...
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: isMobile ? '16px' : '32px' }}>
      <PageHeader
        title="Bids"
        description="Manage project bids and proposals"
        action={<Button onClick={create}>+ New Bid</Button>}
      />

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: 'rgba(239, 83, 80, 0.1)',
          border: '1px solid #EF5350',
          borderRadius: '8px',
          color: '#EF5350',
          fontSize: '14px',
          marginBottom: '24px'
        }}>
          {error}
        </div>
      )}

      {/* Filters */}
      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px',
          marginBottom: '16px'
        }}>
          <Select
            options={[
              { value: 'all_county', label: 'All County' },
              { value: 'h2o', label: 'H2O' }
            ]}
            value={tenant}
            onChange={(e) => setTenant(e.target.value)}
          />
          <Input
            placeholder="Search bids..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            options={[
              { value: '', label: 'Any Builder' },
              ...builders.map(b => ({ value: b.id.toString(), label: b.name }))
            ]}
            value={builderId}
            onChange={(e) => setBuilderId(e.target.value)}
          />
          <Select
            options={[
              { value: '', label: 'Any Status' },
              { value: 'Draft', label: 'Draft' },
              { value: 'Sent', label: 'Sent' },
              { value: 'Won', label: 'Won' },
              { value: 'Lost', label: 'Lost' }
            ]}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
        </div>
        <Button onClick={searchNow} variant="secondary">Search</Button>
      </div>

      {/* Main Content with Side Panel */}
      <div style={{ display: 'flex', gap: '24px', position: 'relative' }}>
        {/* Main Bids List */}
        <div style={{ flex: 1 }}>
          {bids.length === 0 ? (
            <div style={{
              backgroundColor: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '48px',
              textAlign: 'center',
              color: 'var(--color-text-secondary)'
            }}>
              No bids found. Create your first bid to get started.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {bids.map(b => (
                <a
                  key={b.id}
                  href={`/bids/${b.id}`}
                  className={`
                    block bg-[var(--color-card)]/50 border border-white/[0.08] backdrop-blur-sm shadow-xl rounded-lg p-5 no-underline transition-all
                    ${b.status === 'Won' ? 'border-l-2 border-green-500 shadow-[2px_0_10px_rgba(34,197,94,0.15)]' : ''}
                    hover:border-[var(--color-primary)]/30 hover:shadow-2xl hover:-translate-y-0.5
                  `}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: 'var(--color-text-primary)',
                        marginBottom: '8px'
                      }}>
                        {b.project_name}
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: 'var(--color-text-secondary)',
                        marginBottom: '4px'
                      }}>
                        Tenant: {b.tenant_id}
                      </div>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Pipeline Side Panel */}
        <BidPipelinePanel
          sentBids={sentBids}
          draftingBids={draftingBids}
          needsApprovalBids={needsApprovalBids}
          readyToSendBids={readyToSendBids}
          loading={pipelineLoading}
          onRefresh={loadPipeline}
        />
      </div>
    </div>
  )
}

// Bid Pipeline Panel Component
function BidPipelinePanel({
  sentBids,
  draftingBids,
  needsApprovalBids,
  readyToSendBids,
  loading,
  onRefresh
}: {
  sentBids: Bid[]
  draftingBids: BidWithLineItems[]
  needsApprovalBids: BidWithLineItems[]
  readyToSendBids: BidWithLineItems[]
  loading: boolean
  onRefresh: () => void
}) {
  const router = useRouter()
  const isMobile = useMobile()
  const [isOpen, setIsOpen] = useState(!isMobile)

  if (isMobile) {
    return (
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-primary)',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          cursor: 'pointer',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px'
        }}
      >
        📊
      </button>
    )
  }

  return (
    <div className="w-80 bg-[var(--color-card)]/50 border border-white/[0.08] backdrop-blur-sm shadow-xl rounded-lg p-5 h-fit sticky top-5 max-h-[calc(100vh-40px)] overflow-y-auto">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] m-0 uppercase tracking-widest text-xs">
          Bid Pipeline
        </h3>
        <button
          onClick={onRefresh}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            padding: '4px',
            fontSize: '18px'
          }}
          title="Refresh pipeline"
        >
          🔄
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-secondary)' }}>
          Loading pipeline...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Sent Bids */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px'
            }}>
              <span style={{ fontSize: '16px' }}>📤</span>
              <h4 className="text-sm font-semibold text-[var(--color-text-primary)] m-0 uppercase tracking-widest text-xs">
                Sent ({sentBids.length})
              </h4>
            </div>
            {sentBids.length === 0 ? (
              <div className="border-2 border-dashed border-[var(--color-border)] rounded-lg p-8 text-center">
                <p className="text-[var(--color-text-secondary)] mb-4">No sent bids</p>
                <Button onClick={() => router.push('/bids')} variant="primary" size="sm">
                  Create New Bid
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {sentBids.slice(0, 5).map(bid => (
                  <BidCard
                    key={bid.id}
                    bid={bid}
                    statusColor={bid.status === 'Won' ? '#4CAF50' : '#FF9800'}
                    onClick={() => router.push(`/bids/${bid.id}`)}
                  />
                ))}
                {sentBids.length > 5 && (
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--color-text-secondary)',
                    padding: '8px',
                    textAlign: 'center'
                  }}>
                    +{sentBids.length - 5} more
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Ready to Send */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px'
            }}>
              <span style={{ fontSize: '16px' }}>✅</span>
              <h4 className="text-sm font-semibold text-[var(--color-text-primary)] m-0 uppercase tracking-widest text-xs">
                Ready to Send ({readyToSendBids.length})
              </h4>
            </div>
            {readyToSendBids.length === 0 ? (
              <div className="border-2 border-dashed border-[var(--color-border)] rounded-lg p-8 text-center">
                <p className="text-[var(--color-text-secondary)] mb-4">No bids ready</p>
                <Button onClick={() => router.push('/bids')} variant="primary" size="sm">
                  Create New Bid
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {readyToSendBids.map(bid => (
                  <BidCard
                    key={bid.id}
                    bid={bid}
                    statusColor="#60A5FA"
                    onClick={() => router.push(`/bids/${bid.id}`)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Needs Price Approval */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px'
            }}>
              <span style={{ fontSize: '16px' }}>⚠️</span>
              <h4 className="text-sm font-semibold text-[var(--color-text-primary)] m-0 uppercase tracking-widest text-xs">
                Needs Price Approval ({needsApprovalBids.length})
              </h4>
            </div>
            {needsApprovalBids.length === 0 ? (
              <div className="border-2 border-dashed border-[var(--color-border)] rounded-lg p-8 text-center">
                <p className="text-[var(--color-text-secondary)] mb-4">All prices set</p>
                <Button onClick={() => router.push('/bids')} variant="secondary" size="sm">
                  Create New Bid
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {needsApprovalBids.map(bid => (
                  <BidCard
                    key={bid.id}
                    bid={bid}
                    statusColor="#FF9800"
                    onClick={() => router.push(`/bids/${bid.id}`)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Drafting */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px'
            }}>
              <span style={{ fontSize: '16px' }}>📝</span>
              <h4 className="text-sm font-semibold text-[var(--color-text-primary)] m-0 uppercase tracking-widest text-xs">
                Drafting ({draftingBids.length})
              </h4>
            </div>
            {draftingBids.length === 0 ? (
              <div className="border-2 border-dashed border-[var(--color-border)] rounded-lg p-8 text-center">
                <p className="text-[var(--color-text-secondary)] mb-4">No drafts</p>
                <Button onClick={() => router.push('/bids')} variant="primary" size="sm">
                  Create New Bid
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {draftingBids.slice(0, 3).map(bid => (
                  <BidCard
                    key={bid.id}
                    bid={bid}
                    statusColor="#9E9E9E"
                    onClick={() => router.push(`/bids/${bid.id}`)}
                  />
                ))}
                {draftingBids.length > 3 && (
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--color-text-secondary)',
                    padding: '8px',
                    textAlign: 'center'
                  }}>
                    +{draftingBids.length - 3} more
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
