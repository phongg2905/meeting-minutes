import SkeletonBox, { SkeletonAvatar } from './Skeleton'

interface ListSkeletonProps {
  rows?: number
}

export default function ListSkeleton({ rows = 5 }: ListSkeletonProps) {
  return (
    <div style={{ padding: '4px 0' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            gap: 12,
            padding: '12px 16px',
            borderBottom: i < rows - 1 ? '1px solid var(--color-border-light)' : 'none',
            alignItems: 'flex-start',
            opacity: 1 - i * 0.08,
          }}
        >
          {/* Avatar/Icon */}
          <div
            className="skeleton-box"
            style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0 }}
            aria-hidden="true"
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* User name + action */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <div className="skeleton-box" style={{ height: 12, width: '30%', borderRadius: 4 }} aria-hidden="true" />
              <div className="skeleton-box" style={{ height: 12, width: '40%', borderRadius: 4 }} aria-hidden="true" />
            </div>
            {/* Timestamp */}
            <div className="skeleton-box" style={{ height: 11, width: '25%', borderRadius: 4 }} aria-hidden="true" />
          </div>
        </div>
      ))}
    </div>
  )
}
