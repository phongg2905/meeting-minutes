import { Skeleton, Card, Row, Col } from 'antd'

interface LoadingSkeletonProps {
  type?: 'table' | 'card' | 'stats' | 'detail'
  count?: number
}

function TableSkeleton() {
  return (
    <Card style={{ borderRadius: 16 }}>
      <Skeleton active paragraph={{ rows: 1 }} style={{ marginBottom: 16 }} />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton
          key={i}
          active
          paragraph={{ rows: 1 }}
          title={false}
          style={{ marginBottom: 12, opacity: 1 - i * 0.15 }}
        />
      ))}
    </Card>
  )
}

function CardSkeleton() {
  return (
    <Card style={{ borderRadius: 16 }}>
      <Skeleton active avatar paragraph={{ rows: 2 }} />
    </Card>
  )
}

function StatsSkeleton() {
  return (
    <Row gutter={[16, 16]}>
      {Array.from({ length: 4 }).map((_, i) => (
        <Col xs={24} sm={12} lg={6} key={i}>
          <Card style={{ borderRadius: 16 }}>
            <Skeleton active paragraph={{ rows: 1 }} title={{ width: '60%' }} />
          </Card>
        </Col>
      ))}
    </Row>
  )
}

function DetailSkeleton() {
  return (
    <div>
      <Skeleton active avatar paragraph={{ rows: 1 }} style={{ marginBottom: 16 }} />
      <Card style={{ borderRadius: 16 }}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </Card>
    </div>
  )
}

export default function LoadingSkeleton({ type = 'table', count = 1 }: LoadingSkeletonProps) {
  if (type === 'stats') return <StatsSkeleton />
  if (type === 'card') {
    return (
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: `repeat(${Math.min(count, 3)}, 1fr)` }}>
        {Array.from({ length: count }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    )
  }
  if (type === 'detail') return <DetailSkeleton />

  return <TableSkeleton />
}
