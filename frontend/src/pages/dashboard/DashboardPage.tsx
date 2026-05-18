import { Row, Col, Card, Typography, Table, Tag, Spin, Empty } from 'antd'
import {
  FileTextOutlined, CheckCircleOutlined, EyeOutlined,
  RiseOutlined, CalendarOutlined
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { meetingMinutesService, activityLogsService } from '../../services'
import { useAuthStore } from '../../store/authStore'
import { formatDate, formatDateTime, STATUS_LABELS, STATUS_COLORS, isAdmin } from '../../utils'
import { MeetingMinute } from '../../types'

const { Text } = Typography

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const { data: minutesData, isLoading } = useQuery({
    queryKey: ['meeting-minutes', 'dashboard', user?.user_id],
    queryFn: () => meetingMinutesService.getAll({ limit: 100 }),
  })

  const { data: logsData } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: () => activityLogsService.getAll(),
    enabled: isAdmin(user?.role_id),
  })

  const minutes: MeetingMinute[] = minutesData?.data || []
  const stats = {
    total: minutes.length,
    public: minutes.filter(m => m.is_public).length,
    private: minutes.filter(m => !m.is_public).length,
    editing: minutes.filter(m => m.status === 'draft').length,
  }

  const recentMinutes = minutes.slice(0, 5)
  const statCards = [
    { title: 'Tổng biên bản', value: stats.total, icon: <FileTextOutlined />, color: '#1a56a0', bg: '#eff6ff' },
    { title: 'Công khai', value: stats.public, icon: <CheckCircleOutlined />, color: '#16a34a', bg: '#f0fdf4' },
    { title: 'Nội bộ', value: stats.private, icon: <EyeOutlined />, color: '#d97706', bg: '#fffbeb' },
    { title: 'Đang chỉnh sửa', value: stats.editing, icon: <CalendarOutlined />, color: '#7c3aed', bg: '#f5f3ff' },
  ]

  const columns = [
    {
      title: 'Mã biên bản',
      dataIndex: 'minute_code',
      key: 'minute_code',
      render: (code: string, record: MeetingMinute) => (
        <a onClick={() => navigate(`/meetings/${record.minute_id}`)} style={{ fontWeight: 600, color: '#1a56a0' }}>
          {code}
        </a>
      ),
    },
    { title: 'Tiêu đề', dataIndex: 'title', key: 'title', ellipsis: true },
    { title: 'Lớp', dataIndex: 'class_name', key: 'class_name', width: 100 },
    { title: 'Ngày họp', dataIndex: 'meeting_date', key: 'meeting_date', width: 110, render: (d: string) => formatDate(d) },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (s: string) => <Tag color={STATUS_COLORS[s]}>{STATUS_LABELS[s] || s}</Tag>,
    },
    {
      title: 'Công khai',
      dataIndex: 'is_public',
      key: 'is_public',
      width: 100,
      render: (value: boolean) => <Tag color={value ? 'success' : 'default'}>{value ? 'Có' : 'Không'}</Tag>,
    },
  ]

  if (isLoading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tổng quan</h1>
          <Text type="secondary">Xin chào, <strong>{user?.full_name}</strong></Text>
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statCards.map((card) => (
          <Col xs={24} sm={12} lg={6} key={card.title}>
            <Card className="stat-card" style={{ background: card.bg }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 13 }}>{card.title}</Text>
                  <div style={{ fontSize: 32, fontWeight: 800, color: card.color, lineHeight: 1.2, marginTop: 4 }}>
                    {card.value}
                  </div>
                </div>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: card.color, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22,
                }}>
                  {card.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={isAdmin(user?.role_id) ? 14 : 24}>
          <Card
            title={<span style={{ fontWeight: 700 }}>Biên bản gần đây</span>}
            extra={<a onClick={() => navigate('/meetings')}>Xem tat ca</a>}
            style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}
          >
            {recentMinutes.length === 0 ? (
              <Empty description="Chưa có biên bản nao" />
            ) : (
              <Table
                dataSource={recentMinutes}
                columns={columns}
                rowKey="minute_id"
                pagination={false}
                size="small"
                scroll={{ x: 700 }}
              />
            )}
          </Card>
        </Col>

        {isAdmin(user?.role_id) && (
          <Col xs={24} lg={10}>
            <Card title={<span style={{ fontWeight: 700 }}>Hoat dong gan day</span>} style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
              {(logsData || []).slice(0, 8).map((log: any) => (
                <div key={log.log_id} style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  padding: '8px 0', borderBottom: '1px solid #f1f5f9',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: '#eff6ff', color: '#1a56a0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, flexShrink: 0,
                  }}>
                    <RiseOutlined />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text strong style={{ fontSize: 12 }}>{log.user?.full_name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}> - {log.action_detail}</Text>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                      {formatDateTime(log.created_at)}
                    </div>
                  </div>
                </div>
              ))}
              {!logsData?.length && <Empty description="Chưa có hoat dong" />}
            </Card>
          </Col>
        )}
      </Row>
    </div>
  )
}
