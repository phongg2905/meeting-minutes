import { Card } from 'antd'

export default function StatCardSkeleton() {
  return (
    <Card
      className="stat-card"
      bodyStyle={{ padding: '18px 20px' }}
    >
      <div className="skeleton-stat-card">
        <div className="skeleton-stat-left">
          <div className="skeleton-box" style={{ height: 12, width: 100, marginBottom: 8 }} aria-hidden="true" />
          <div className="skeleton-box skeleton-stat-value" aria-hidden="true" />
        </div>
        <div
          className="skeleton-box skeleton-icon-box"
          aria-hidden="true"
        />
      </div>
    </Card>
  )
}
