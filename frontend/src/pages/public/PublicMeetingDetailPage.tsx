import { useQuery } from '@tanstack/react-query'
import { publicMeetingMinutesService } from '../../services'
import { useNavigate, useParams } from 'react-router-dom'
import { Breadcrumb, Button, Card, Descriptions, Empty, Space, Spin, Tag, Typography } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
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
  if (!minute) return <Empty description="Không tìm thấy biên bản công khai" />

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px 20px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <Breadcrumb
          style={{ marginBottom: 16 }}
          items={[
            { title: 'Tra cứu công khai' },
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
                Lớp {minute.class_name} - {formatDate(minute.meeting_date)}
              </Text>
            </div>
            <Space wrap>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/public/meetings')}>
                Quay lại
              </Button>
            </Space>
          </div>
        </Card>

        <Card title="Thông tin tóm tắt" style={{ marginBottom: 16 }}>
          <Descriptions bordered column={{ xs: 1, md: 2, lg: 3 }} size="small">
            <Descriptions.Item label="Mã biên bản">{minute.minute_code}</Descriptions.Item>
            <Descriptions.Item label="Loại biên bản">{minute.minute_type?.type_name}</Descriptions.Item>
            <Descriptions.Item label="Tên lớp">{minute.class_name}</Descriptions.Item>
            <Descriptions.Item label="Ngày họp">{formatDate(minute.meeting_date)}</Descriptions.Item>
            <Descriptions.Item label="Giờ bắt đầu">{formatTime(minute.start_time)}</Descriptions.Item>
            <Descriptions.Item label="Giờ kết thúc">{formatTime(minute.end_time)}</Descriptions.Item>
            <Descriptions.Item label="Địa điểm">{minute.location || 'Không ghi'}</Descriptions.Item>
            <Descriptions.Item label="Chủ tọa">{minute.host_name || 'Không ghi'}</Descriptions.Item>
            <Descriptions.Item label="Thư ký">{minute.secretary_name || 'Không ghi'}</Descriptions.Item>
          </Descriptions>
        </Card>

      </div>
    </div>
  )
}
