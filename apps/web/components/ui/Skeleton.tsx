'use client'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  className?: string
  style?: React.CSSProperties
}

export function Skeleton({ 
  width = '100%', 
  height = '20px',
  borderRadius = '6px',
  className = '',
  style = {}
}: SkeletonProps) {
  return (
    <div 
      className={`skeleton ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
        backgroundColor: 'var(--color-hover)',
        animation: 'skeleton-pulse 1.5s ease-in-out infinite',
        ...style
      }}
    />
  )
}

export function TextSkeleton({ lines = 1, width = '100%', spacing = '8px' }: { lines?: number; width?: string | number | (string | number)[]; spacing?: string | number }) {
  const getWidth = (index: number) => {
    if (Array.isArray(width)) return width[index] || width[width.length - 1]
    if (index === lines - 1 && lines > 1) return '60%'
    return width
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: typeof spacing === 'number' ? `${spacing}px` : spacing }}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} width={getWidth(index)} height="16px" />
      ))}
    </div>
  )
}

export function AvatarSkeleton({ size = 40 }: { size?: number }) {
  return <Skeleton width={size} height={size} borderRadius="50%" />
}

export function StatCardSkeleton() {
  return (
    <div style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '24px' }}>
      <Skeleton width="60%" height="14px" style={{ marginBottom: '12px' }} />
      <Skeleton width="40%" height="36px" />
    </div>
  )
}

export function StatsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
      {Array.from({ length: count }).map((_, i) => <StatCardSkeleton key={i} />)}
    </div>
  )
}

export function TableSkeleton({ rows = 5, columns = 4, showHeader = true }: { rows?: number; columns?: number; showHeader?: boolean }) {
  return (
    <div style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden' }}>
      {showHeader && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '16px', padding: '16px 20px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-hover)' }}>
          {Array.from({ length: columns }).map((_, i) => <Skeleton key={i} width="80%" height="14px" />)}
        </div>
      )}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '16px', padding: '16px 20px', borderBottom: rowIndex < rows - 1 ? '1px solid var(--color-border)' : 'none' }}>
          {Array.from({ length: columns }).map((_, colIndex) => <Skeleton key={colIndex} width={colIndex === 0 ? '90%' : '70%'} height="16px" />)}
        </div>
      ))}
    </div>
  )
}

export function ListItemSkeleton() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '12px' }}>
      <AvatarSkeleton size={48} />
      <div style={{ flex: 1 }}>
        <Skeleton width="60%" height="16px" style={{ marginBottom: '8px' }} />
        <Skeleton width="40%" height="14px" />
      </div>
      <Skeleton width="80px" height="32px" borderRadius="6px" />
    </div>
  )
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {Array.from({ length: count }).map((_, i) => <ListItemSkeleton key={i} />)}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <Skeleton width="40%" height="20px" />
        <Skeleton width="60px" height="24px" borderRadius="6px" />
      </div>
      <TextSkeleton lines={2} />
      <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
        <Skeleton width="80px" height="32px" borderRadius="6px" />
        <Skeleton width="80px" height="32px" borderRadius="6px" />
      </div>
    </div>
  )
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
      {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '32px' }}>
        <Skeleton width="200px" height="32px" style={{ marginBottom: '8px' }} />
        <Skeleton width="300px" height="16px" />
      </div>
      <div style={{ marginBottom: '32px' }}><StatsGridSkeleton count={4} /></div>
      <TableSkeleton rows={5} columns={4} />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '32px' }}>
        <Skeleton width="180px" height="28px" style={{ marginBottom: '8px' }} />
        <Skeleton width="250px" height="16px" />
      </div>
      <div style={{ marginBottom: '32px' }}><StatsGridSkeleton count={4} /></div>
      <div style={{ marginBottom: '32px' }}>
        <Skeleton width="150px" height="20px" style={{ marginBottom: '16px' }} />
        <CardGridSkeleton count={3} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        <div>
          <Skeleton width="120px" height="18px" style={{ marginBottom: '12px' }} />
          <ListSkeleton count={3} />
        </div>
        <div>
          <Skeleton width="120px" height="18px" style={{ marginBottom: '12px' }} />
          <ListSkeleton count={3} />
        </div>
      </div>
    </div>
  )
}

export function SkeletonStyles() {
  return (
    <style jsx global>{`
      @keyframes skeleton-pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
      }
    `}</style>
  )
}

