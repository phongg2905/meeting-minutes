import { Card, Col, Descriptions, Row, Statistic, Tag } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { keepPreviousDataPlaceholder } from '../../utils/queryKeys'
import { healthService } from '../../services'
import { formatDateTime } from '../../utils'

export default function SystemHealthPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['health'],
    queryFn: healthService.get,
    refetchInterval: 30000,
    placeholderData: keepPreviousDataPlaceholder,
  })

  if (isLoading) return <div style={{ padding: 24 }}><Row gutter={[16, 16]}>{Array.from({ length: 4 }).map((_, i) => (<Col xs={24} md={6} key={i}><Card bodyStyle={{ padding: 20 }}><div className="skeleton-box" style={{ height: 12, width: '60%', marginBottom: 12, borderRadius: 4 }} /><div className="skeleton-box" style={{ height: 28, width: '40%', borderRadius: 6 }} /></Card></Col>))}</Row><Card bodyStyle={{ padding: 20 }} style={{ marginTop: 16 }}><div className="skeleton-box" style={{ height: 12, width: '30%', marginBottom: 16, borderRadius: 4 }} /><div className="skeleton-box" style={{ height: 14, width: '50%', borderRadius: 4 }} /></Card></div>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Giám sát hệ thống</h1>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={6}><Card><Statistic title="Người dùng" value={data?.users || 0} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Biên bản" value={data?.minutes || 0} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Hỗ trợ đang mở" value={data?.open_support_requests || 0} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Log lỗi" value={data?.logged_errors || 0} /></Card></Col>
      </Row>

      <Card>
        <Descriptions bordered column={1}>
          <Descriptions.Item label="Trạng thái"><Tag color="success">{data?.status}</Tag></Descriptions.Item>
          <Descriptions.Item label="Database"><Tag color="success">{data?.database}</Tag></Descriptions.Item>
          <Descriptions.Item label="Kiểm tra lúc">{formatDateTime(data?.checked_at)}</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  )
}
