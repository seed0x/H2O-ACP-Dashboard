interface SkeletonProps {
  width?: string
  height?: string
  className?: string
  style?: React.CSSProperties
}

export function Skeleton({ 
  width = '100%', 
  height = '20px',
  className = '',
  style = {}
}: SkeletonProps) {
  return (
    <div
      className={className}
      style={{
        width,
        height,
        backgroundColor: 'var(--color-surface-elevated)',
        borderRadius: 'var(--radius-sm)',
        animation: 'skeleton-pulse 1.5s ease-in-out infinite',
        ...style
      }}
    />
  )
}
