import { Card } from 'antd'
import SkeletonBox, { SkeletonTitle, SkeletonAvatar } from './Skeleton'

export default function CardSkeleton() {
  return (
    <Card
      style={{
        borderRadius: 16,
        border: '1px solid var(--color-border-light)',
      }}
      bodyStyle={{ padding: 18 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <SkeletonAvatar size={40} />
        <div style={{ flex: 1 }}>
          <SkeletonTitle width="50%" />
          <div className="skeleton-box" style={{ height: 12, width: '70%', borderRadius: 4 }} aria-hidden="true" />
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="skeleton-box"
          style={{ height: 12, width: `${70 + i * 10}%`, marginBottom: 8, borderRadius: 4 }}
          aria-hidden="true"
        />
      ))}
    </Card>
  )
}
