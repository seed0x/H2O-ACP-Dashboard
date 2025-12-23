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
  const [builders, setBuilders] = useState<any[]>([])
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
      } catch (err: any) {
        console.error('Failed to load bids:', err)
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
    } catch (err: any) {
      console.error('Failed to load pipeline:', err)
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
    } catch (err: any) {
      console.error('Failed to search bids:', err)
      setError(handleApiError(err))
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
    } catch (err: any){
      console.error('Failed to create bid:', err)
      setError(handleApiError(err))
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
                  style={{
                    display: 'block',
                    backgroundColor: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px',
                    padding: '20px',
                    textDecoration: 'none',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-primary)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
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
    <div style={{
      width: '320px',
      backgroundColor: 'var(--color-card)',
      border: '1px solid var(--color-border)',
      borderRadius: '12px',
      padding: '20px',
      height: 'fit-content',
      position: 'sticky',
      top: '20px',
      maxHeight: 'calc(100vh - 40px)',
      overflowY: 'auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: 'var(--color-text-primary)',
          margin: 0
        }}>
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
              <h4 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--color-text-primary)',
                margin: 0
              }}>
                Sent ({sentBids.length})
              </h4>
            </div>
            {sentBids.length === 0 ? (
              <div style={{
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
                padding: '8px',
                fontStyle: 'italic'
              }}>
                No sent bids
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sentBids.slice(0, 5).map(bid => (
                  <button
                    key={bid.id}
                    onClick={() => router.push(`/bids/${bid.id}`)}
                    style={{
                      textAlign: 'left',
                      padding: '10px',
                      backgroundColor: 'var(--color-hover)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-primary)'
                      e.currentTarget.style.backgroundColor = 'rgba(96, 165, 250, 0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-border)'
                      e.currentTarget.style.backgroundColor = 'var(--color-hover)'
                    }}
                  >
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '500',
                      color: 'var(--color-text-primary)',
                      marginBottom: '4px'
                    }}>
                      {bid.project_name}
                    </div>
                    {bid.sent_date && (
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--color-text-secondary)'
                      }}>
                        Sent: {new Date(bid.sent_date).toLocaleDateString()}
                      </div>
                    )}
                  </button>
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
              <h4 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--color-text-primary)',
                margin: 0
              }}>
                Ready to Send ({readyToSendBids.length})
              </h4>
            </div>
            {readyToSendBids.length === 0 ? (
              <div style={{
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
                padding: '8px',
                fontStyle: 'italic'
              }}>
                No bids ready
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {readyToSendBids.map(bid => (
                  <button
                    key={bid.id}
                    onClick={() => router.push(`/bids/${bid.id}`)}
                    style={{
                      textAlign: 'left',
                      padding: '10px',
                      backgroundColor: 'rgba(76, 175, 80, 0.1)',
                      border: '1px solid rgba(76, 175, 80, 0.3)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#4CAF50'
                      e.currentTarget.style.backgroundColor = 'rgba(76, 175, 80, 0.2)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(76, 175, 80, 0.3)'
                      e.currentTarget.style.backgroundColor = 'rgba(76, 175, 80, 0.1)'
                    }}
                  >
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '500',
                      color: 'var(--color-text-primary)',
                      marginBottom: '4px'
                    }}>
                      {bid.project_name}
                    </div>
                    {bid.amount_cents && (
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--color-text-secondary)'
                      }}>
                        ${(bid.amount_cents / 100).toFixed(2)}
                      </div>
                    )}
                  </button>
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
              <h4 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--color-text-primary)',
                margin: 0
              }}>
                Needs Price Approval ({needsApprovalBids.length})
              </h4>
            </div>
            {needsApprovalBids.length === 0 ? (
              <div style={{
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
                padding: '8px',
                fontStyle: 'italic'
              }}>
                All prices set
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {needsApprovalBids.map(bid => (
                  <button
                    key={bid.id}
                    onClick={() => router.push(`/bids/${bid.id}`)}
                    style={{
                      textAlign: 'left',
                      padding: '10px',
                      backgroundColor: 'rgba(255, 152, 0, 0.1)',
                      border: '1px solid rgba(255, 152, 0, 0.3)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#FF9800'
                      e.currentTarget.style.backgroundColor = 'rgba(255, 152, 0, 0.2)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 152, 0, 0.3)'
                      e.currentTarget.style.backgroundColor = 'rgba(255, 152, 0, 0.1)'
                    }}
                  >
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '500',
                      color: 'var(--color-text-primary)',
                      marginBottom: '4px'
                    }}>
                      {bid.project_name}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: 'var(--color-text-secondary)'
                    }}>
                      Missing prices
                    </div>
                  </button>
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
              <h4 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--color-text-primary)',
                margin: 0
              }}>
                Drafting ({draftingBids.length})
              </h4>
            </div>
            {draftingBids.length === 0 ? (
              <div style={{
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
                padding: '8px',
                fontStyle: 'italic'
              }}>
                No drafts
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {draftingBids.slice(0, 3).map(bid => (
                  <button
                    key={bid.id}
                    onClick={() => router.push(`/bids/${bid.id}`)}
                    style={{
                      textAlign: 'left',
                      padding: '10px',
                      backgroundColor: 'var(--color-hover)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-primary)'
                      e.currentTarget.style.backgroundColor = 'rgba(96, 165, 250, 0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-border)'
                      e.currentTarget.style.backgroundColor = 'var(--color-hover)'
                    }}
                  >
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '500',
                      color: 'var(--color-text-primary)',
                      marginBottom: '4px'
                    }}>
                      {bid.project_name}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: 'var(--color-text-secondary)'
                    }}>
                      In progress
                    </div>
                  </button>
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
