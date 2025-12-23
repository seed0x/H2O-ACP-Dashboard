import React from 'react'

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

interface BidCardProps {
  bid: Bid
  statusColor: string  // For left border (e.g., '#EF5350', '#FF9800', '#60A5FA')
  onClick: () => void
}

export function BidCard({ bid, statusColor, onClick }: BidCardProps) {
  return (
    <button
      onClick={onClick}
      className="text-left w-full p-3 bg-[var(--color-card)]/50 rounded-lg cursor-pointer transition-all hover:bg-[var(--color-hover)] hover:shadow-lg border-l-4"
      style={{
        borderLeftColor: statusColor,
        minHeight: '44px'
      }}
    >
      <div className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">
        {bid.project_name}
      </div>
      {bid.amount_cents !== undefined && bid.amount_cents !== null && (
        <div className="text-xs font-mono text-[var(--color-text-secondary)]">
          ${(bid.amount_cents / 100).toFixed(2)}
        </div>
      )}
    </button>
  )
}

