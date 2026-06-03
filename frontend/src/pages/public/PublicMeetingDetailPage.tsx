import { useQuery } from '@tanstack/react-query'
import { publicMeetingMinutesService } from '../../services'
import { useNavigate, useParams } from 'react-router-dom'
import { Breadcrumb, Button, Card, Descriptions, Empty, Space, Spin, Tag, Typography } from 'antd'
import { ArrowLeftOutlined, PrinterOutlined } from '@ant-design/icons'
import { STATUS_COLORS, STATUS_LABELS, formatDate, formatTime } from '../../utils'

const { Text, Title } = Typography

export default function PublicMeetingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: minute, isLoading } = useQuery({
    queryKey: ['public-meeting', id],
    queryFn: () => publicMeetingMinutesService.getOne(Number(id)),
    enabled: !!id,
  })

  if (isLoading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
  if (!minute) return <Empty description="KhÃ´ng tÃ¬m tháº¥y biÃªn báº£n cÃ´ng khai" />

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px 20px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <Breadcrumb
          style={{ marginBottom: 16 }}
          items={[
            { title: 'Tra cá»©u cÃ´ng khai' },
            { title: minute.minute_code },
          ]}
        />

        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <Space wrap style={{ marginBottom: 8 }}>
                <Tag color="blue">{minute.minute_code}</Tag>
                <Tag color={STATUS_COLORS[minute.status]}>{STATUS_LABELS[minute.status] || minute.status}</Tag>
                <Tag color="purple">{minute.minute_type?.type_name}</Tag>
              </Space>
              <Title level={3} style={{ margin: '0 0 8px' }}>{minute.title}</Title>
              <Text type="secondary">
                Lá»›p {minute.class_name} - {formatDate(minute.meeting_date)}
              </Text>
            </div>
            <Space wrap>
              <Button icon={<PrinterOutlined />} onClick={() => window.open(`/public/meetings/${id}/print`, '_blank')}>
                Xuáº¥t PDF
              </Button>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/public/meetings')}>
                Quay láº¡i
              </Button>
            </Space>
          </div>
        </Card>

        <Card title="ThÃ´ng tin tÃ³m táº¯t" style={{ marginBottom: 16 }}>
          <Descriptions bordered column={{ xs: 1, md: 2, lg: 3 }} size="small">
            <Descriptions.Item label="MÃ£ biÃªn báº£n">{minute.minute_code}</Descriptions.Item>
            <Descriptions.Item label="Loáº¡i biÃªn báº£n">{minute.minute_type?.type_name}</Descriptions.Item>
            <Descriptions.Item label="TÃªn lá»›p">{minute.class_name}</Descriptions.Item>
            <Descriptions.Item label="NgÃ y há»p">{formatDate(minute.meeting_date)}</Descriptions.Item>
            <Descriptions.Item label="Giá» báº¯t Ä‘áº§u">{formatTime(minute.start_time)}</Descriptions.Item>
            <Descriptions.Item label="Giá» káº¿t thÃºc">{formatTime(minute.end_time)}</Descriptions.Item>
            <Descriptions.Item label="Äá»‹a Ä‘iá»ƒm">{minute.location || 'KhÃ´ng ghi'}</Descriptions.Item>
            <Descriptions.Item label="Chá»§ tá»a">{minute.host_name || 'KhÃ´ng ghi'}</Descriptions.Item>
            <Descriptions.Item label="ThÆ° kÃ½">{minute.secretary_name || 'KhÃ´ng ghi'}</Descriptions.Item>
          </Descriptions>
        </Card>

      </div>
    </div>
  )
}
