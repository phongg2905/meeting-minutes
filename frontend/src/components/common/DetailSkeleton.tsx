import { Card } from 'antd'
import SkeletonBox, { SkeletonBadge } from './Skeleton'

export default function DetailSkeleton() {
  return (
    <div>
      {/* Header card skeleton */}
      <Card
        style={{
          marginBottom: 16,
          borderRadius: 16,
          border: '1px solid var(--color-border-light)',
        }}
        bodyStyle={{ padding: '18px 20px' }}
      >
        {/* Tags row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <SkeletonBadge width={120} />
          <SkeletonBadge width={100} />
          <SkeletonBadge width={80} />
          <SkeletonBadge width={140} />
        </div>
        {/* Title */}
        <div className="skeleton-box" style={{ height: 22, width: '70%', marginBottom: 8, borderRadius: 4 }} aria-hidden="true" />
        {/* Metadata */}
        <div className="skeleton-box" style={{ height: 14, width: '50%', borderRadius: 4 }} aria-hidden="true" />
        {/* Action buttons row */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="skeleton-box skeleton-button"
              style={{ width: i === 2 ? 140 : 100, height: 36 }}
              aria-hidden="true"
            />
          ))}
        </div>
      </Card>

      {/* Content tabs skeleton */}
      <Card
        style={{
          borderRadius: 16,
          border: '1px solid var(--color-border-light)',
        }}
        bodyStyle={{ padding: 20 }}
      >
        {/* Tab headers */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 24, borderBottom: '1px solid var(--color-border-light)', paddingBottom: 12 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton-box" style={{ height: 14, width: `${80 + i * 20}px`, borderRadius: 4 }} aria-hidden="true" />
          ))}
        </div>
        {/* Content lines */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="skeleton-box"
            style={{
              height: 14,
              width: `${60 + Math.random() * 35}%`,
              marginBottom: 10,
              borderRadius: 4,
            }}
            aria-hidden="true"
          />
        ))}
      </Card>
    </div>
  )
}
