import { Card, Col, Descriptions, Row, Spin, Statistic, Tag } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { healthService } from '../../services'
import { formatDateTime } from '../../utils'

export default function SystemHealthPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['health'],
    queryFn: healthService.get,
    refetchInterval: 30000,
  })

  if (isLoading) return <Spin />

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Giam sat he thong</h1>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={6}><Card><Statistic title="Người dùng" value={data?.users || 0} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Biên bản" value={data?.minutes || 0} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Hỗ trợ dang mo" value={data?.open_support_requests || 0} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Log loi" value={data?.logged_errors || 0} /></Card></Col>
      </Row>

      <Card>
        <Descriptions bordered column={1}>
          <Descriptions.Item label="Trạng thái"><Tag color="success">{data?.status}</Tag></Descriptions.Item>
          <Descriptions.Item label="Database"><Tag color="success">{data?.database}</Tag></Descriptions.Item>
          <Descriptions.Item label="Kiem tra luc">{formatDateTime(data?.checked_at)}</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  )
}
