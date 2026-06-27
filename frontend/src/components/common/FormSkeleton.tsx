import { Card } from 'antd'
import SkeletonBox from './Skeleton'

interface FormSkeletonProps {
  fields?: number
}

export default function FormSkeleton({ fields = 6 }: FormSkeletonProps) {
  return (
    <Card
      style={{
        borderRadius: 16,
        border: '1px solid var(--color-border-light)',
      }}
      bodyStyle={{ padding: 24 }}
    >
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} style={{ marginBottom: 20 }}>
          {/* Label */}
          <div
            className="skeleton-box"
            style={{ height: 14, width: `${40 + Math.random() * 30}%`, marginBottom: 8, borderRadius: 4 }}
            aria-hidden="true"
          />
          {/* Input field */}
          <div
            className="skeleton-box skeleton-input"
            style={{ width: '100%' }}
            aria-hidden="true"
          />
        </div>
      ))}
      {/* Submit button */}
      <div
        className="skeleton-box skeleton-button"
        style={{ width: 160, marginTop: 8 }}
        aria-hidden="true"
      />
    </Card>
  )
}
