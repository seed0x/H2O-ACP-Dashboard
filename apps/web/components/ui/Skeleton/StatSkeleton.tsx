import { Skeleton } from './Skeleton'

interface StatSkeletonProps {
  count?: number
}

export function StatSkeleton({ count = 4 }: StatSkeletonProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px',
      width: '100%'
    }}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          {/* Label */}
          <Skeleton height="14px" width="60%" />
          
          {/* Value */}
          <Skeleton height="32px" width="40%" />
          
          {/* Optional trend indicator */}
          <Skeleton height="12px" width="30%" />
        </div>
      ))}
    </div>
  )
}
