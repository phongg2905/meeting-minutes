import { useQuery } from '@tanstack/react-query'
import { keepPreviousDataPlaceholder } from '../../utils/queryKeys'
import { publicMeetingMinutesService } from '../../services'
import { useNavigate, useParams } from 'react-router-dom'
import { Breadcrumb, Button, Card, Descriptions, Empty, Space, Spin, Tag, Typography } from 'antd'
import { ArrowLeftOutlined, HomeOutlined } from '@ant-design/icons'
import { STATUS_COLORS, STATUS_LABELS, formatDate, formatTime } from '../../utils'
import { DetailSkeleton } from '../../components/common'

const { Text, Title } = Typography

export default function PublicMeetingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: minute, isLoading } = useQuery({
    queryKey: ['public-meeting', id],
    queryFn: () => publicMeetingMinutesService.getOne(Number(id)),
    enabled: !!id,
    placeholderData: keepPreviousDataPlaceholder,
  })

if (isLoading) return <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '24px 20px' }}><div style={{ maxWidth: 1000, margin: '0 auto' }}><DetailSkeleton /></div></div>
  if (!minute) return <Empty description="Không tìm thấy biên bản công khai" />

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '24px 20px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <Breadcrumb
          style={{ marginBottom: 16 }}
          items={[
            { href: '/public/meetings', title: <HomeOutlined style={{ color: 'var(--color-text-secondary)' }} /> },
            { title: minute.minute_code },
          ]}
        />

        <Card
          style={{
            marginBottom: 16,
            borderRadius: 16,
            border: '1px solid var(--color-border-light)',
          }}
          bodyStyle={{ padding: '18px 20px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <Space wrap style={{ marginBottom: 8 }}>
                <Tag color="blue" style={{ borderRadius: 6, fontWeight: 700 }}>{minute.minute_code}</Tag>
                <Tag color={STATUS_COLORS[minute.status] || 'default'} style={{ borderRadius: 6 }}>
                  {STATUS_LABELS[minute.status] || minute.status}
                </Tag>
                <Tag color="purple" style={{ borderRadius: 6 }}>{minute.minute_type?.type_name}</Tag>
              </Space>
              <Title level={3} style={{ margin: '0 0 8px', color: 'var(--color-text)' }}>{minute.title}</Title>
              <Text style={{ color: 'var(--color-text-secondary)' }}>
                Lớp {minute.class_name} — {formatDate(minute.meeting_date)}
              </Text>
            </div>
            <Space wrap>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/public/meetings')}
                style={{ borderRadius: 10 }}
              >
                Quay lại
              </Button>
            </Space>
          </div>
        </Card>

        <Card
          title={<span style={{ fontWeight: 700, fontSize: 15 }}>Thông tin tóm tắt</span>}
          style={{
            borderRadius: 16,
            border: '1px solid var(--color-border-light)',
          }}
        >
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
