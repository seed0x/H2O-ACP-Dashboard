import { Skeleton } from './Skeleton'

interface TableSkeletonProps {
  rows?: number
  columns?: number
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div style={{ width: '100%' }}>
      {/* Header Row */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '16px',
        padding: '16px',
        borderBottom: '1px solid var(--color-border)'
      }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} height="20px" width="80%" />
        ))}
      </div>
      
      {/* Data Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: '16px',
            padding: '16px',
            borderBottom: '1px solid var(--color-border)'
          }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={`cell-${rowIndex}-${colIndex}`} 
              height="16px" 
              width={colIndex === 0 ? '90%' : '70%'}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
