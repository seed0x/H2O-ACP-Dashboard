import { Skeleton } from './Skeleton'

interface CardSkeletonProps {
  count?: number
  variant?: 'default' | 'compact'
}

export function CardSkeleton({ count = 3, variant = 'default' }: CardSkeletonProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '20px',
      width: '100%'
    }}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          style={{
            backgroundColor: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: variant === 'compact' ? '16px' : '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: variant === 'compact' ? '12px' : '16px'
          }}
        >
          {/* Title */}
          <Skeleton height="24px" width="70%" />
          
          {/* Content lines */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Skeleton height="16px" width="100%" />
            <Skeleton height="16px" width="85%" />
            {variant === 'default' && (
              <>
                <Skeleton height="16px" width="90%" />
                <Skeleton height="16px" width="60%" />
              </>
            )}
          </div>
          
          {/* Footer / Actions */}
          {variant === 'default' && (
            <div style={{ 
              display: 'flex', 
              gap: '8px', 
              marginTop: '8px',
              paddingTop: '16px',
              borderTop: '1px solid var(--color-border)'
            }}>
              <Skeleton height="32px" width="80px" />
              <Skeleton height="32px" width="100px" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
