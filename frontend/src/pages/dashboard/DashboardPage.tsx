import { Row, Col, Card, Typography, Table, Tag, Spin, Empty, Button, Space } from 'antd'
import {
  FileTextOutlined, CheckCircleOutlined, EyeOutlined,
  RiseOutlined, PlusOutlined, ArrowRightOutlined, UserOutlined, ClockCircleOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { keepPreviousDataPlaceholder } from '../../utils/queryKeys'
import { useNavigate } from 'react-router-dom'
import { meetingMinutesService, activityLogsService } from '../../services'
import { useAuthStore } from '../../store/authStore'
import { formatDate, formatDateTime, STATUS_LABELS, STATUS_COLORS, isAdmin, canWriteMinutes } from '../../utils'
import { MeetingMinute } from '../../types'
import { StatCard, StatCardSkeleton, TableSkeleton, ListSkeleton } from '../../components/common'

const { Text, Title } = Typography

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const { data: dashboardData, isLoading, isError, refetch } = useQuery({
    queryKey: ['meeting-minutes', 'dashboard', user?.user_id],
    queryFn: meetingMinutesService.getDashboard,
    enabled: !!user?.user_id,
    placeholderData: keepPreviousDataPlaceholder,
  })

  const { data: logsData } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: () => activityLogsService.getAll({ page: 1, limit: 8 }),
    enabled: isAdmin(user?.role_id) && !!user?.user_id,
    placeholderData: keepPreviousDataPlaceholder,
  })
  const recentLogs = logsData?.data || []

  const stats = dashboardData?.stats || {
    total: 0,
    public: 0,
    private: 0,
    editing: 0,
  }
  const recentMinutes: MeetingMinute[] = dashboardData?.recentMinutes || []

  const columns = [
    {
      title: 'Mã biên bản',
      dataIndex: 'minute_code',
      key: 'minute_code',
      width: 130,
      render: (code: string, record: MeetingMinute) => (
        <span
          onClick={(e) => { e.stopPropagation(); navigate(`/meetings/${record.minute_id}`) }}
          style={{
            fontWeight: 700,
            fontSize: 12,
            color: 'var(--color-primary)',
            cursor: 'pointer',
            background: 'var(--color-primary-light)',
            padding: '2px 10px',
            borderRadius: 6,
            display: 'inline-block',
            whiteSpace: 'nowrap',
            fontFamily: 'monospace',
            letterSpacing: '0.3px',
          }}
        >
          {code}
        </span>
      ),
    },
    {
      title: <span style={{ paddingLeft: 20 }}>Tiêu đề</span>,
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string, record: MeetingMinute) => (
        <div
          onClick={() => navigate(`/meetings/${record.minute_id}`)}
          style={{ cursor: 'pointer', paddingLeft: 20 }}
        >
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text)', lineHeight: 1.4 }}>{title}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <FileTextOutlined style={{ fontSize: 10 }} />
              {record.class_name}
            </span>
            {record.minute_type?.type_name && (
              <>
                <span style={{ color: 'var(--color-border)' }}>·</span>
                <span>{record.minute_type.type_name}</span>
              </>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Ngày họp',
      dataIndex: 'meeting_date',
      key: 'meeting_date',
      width: 115,
      render: (d: string, record: MeetingMinute) => (
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
          <div>{formatDate(d)}</div>
          {record.start_time && (
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>
              {record.start_time?.substring(0, 5)}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 105,
      render: (s: string) => (
        <Tag
          color={STATUS_COLORS[s] || 'default'}
          style={{ borderRadius: 6, fontWeight: 600, fontSize: 11, border: 'none', padding: '2px 10px' }}
        >
          {STATUS_LABELS[s] || s}
        </Tag>
      ),
    },
  ]

  // Loading state: show skeleton for all sections
  if (isLoading) {
    return (
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>
          TỔNG QUAN
        </div>
        <div className="page-header">
          <div>
            <div className="skeleton-box" style={{ height: 28, width: 280, marginBottom: 8, borderRadius: 6 }} />
            <div className="skeleton-box" style={{ height: 14, width: 340, borderRadius: 4 }} />
          </div>
        </div>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Col xs={24} sm={12} lg={6} key={i}>
              <StatCardSkeleton />
            </Col>
          ))}
        </Row>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={isAdmin(user?.role_id) ? 15 : 24}>
            <TableSkeleton rows={5} />
          </Col>
          {isAdmin(user?.role_id) && (
            <Col xs={24} lg={9}>
              <Card style={{ borderRadius: 16, border: '1px solid var(--color-border-light)' }} bodyStyle={{ padding: 0 }}>
                <ListSkeleton rows={5} />
              </Card>
            </Col>
          )}
        </Row>
      </div>
    )
  }

  if (isError) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Tổng quan</h1>
        </div>
        <Card style={{ textAlign: 'center', padding: 48, borderRadius: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--color-danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28, color: 'var(--color-danger)' }}>!</div>
          <h3 style={{ color: 'var(--color-text)' }}>Không thể tải dữ liệu</h3>
          <p style={{ color: 'var(--color-text-secondary)' }}>Có lỗi xảy ra khi tải tổng quan.</p>
          <Button onClick={() => refetch()} style={{ borderRadius: 10, fontWeight: 600 }}>Thử lại</Button>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>
        TỔNG QUAN
      </div>
      <div className="page-header">
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 800, color: 'var(--color-text)' }}>
            Xin chào, {user?.full_name?.split(' ').pop() || 'Người dùng'}
          </Title>
          <Text style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginTop: 4, display: 'block' }}>
            Chào mừng bạn quay trở lại. Dưới đây là tổng quan hệ thống.
          </Text>
        </div>
        {canWriteMinutes(user?.role_id) && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/meetings/create')} size="large" style={{ borderRadius: 12, fontWeight: 700, height: 48, paddingInline: 24, fontSize: 15, boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)' }}>
            Tạo biên bản mới
          </Button>
        )}
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}><StatCard title="Tổng biên bản" value={stats.total} icon={<FileTextOutlined />} color="#2563EB" /></Col>
        <Col xs={24} sm={12} lg={6}><StatCard title="Đang chỉnh sửa" value={stats.editing} icon={<EyeOutlined />} color="#D97706" /></Col>
        <Col xs={24} sm={12} lg={6}><StatCard title="Công khai" value={stats.public} icon={<CheckCircleOutlined />} color="#16A34A" /></Col>
        <Col xs={24} sm={12} lg={6}><StatCard title="Nội bộ" value={stats.private} icon={<RiseOutlined />} color="#7C3AED" /></Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={isAdmin(user?.role_id) ? 15 : 24}>
          <Card title={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FileTextOutlined style={{ color: 'var(--color-primary)' }} /><span style={{ fontWeight: 700, fontSize: 15 }}>Biên bản gần đây</span></div>}
            extra={<Button type="link" onClick={() => navigate('/meetings')} style={{ fontSize: 13, fontWeight: 600 }}>Xem tất cả <ArrowRightOutlined /></Button>}
            bodyStyle={{ padding: 0 }}
          >
            {recentMinutes.length === 0 ? (
              <div style={{ padding: 32 }}><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span style={{ color: 'var(--color-text-secondary)' }}>Chưa có biên bản nào</span>}>
                {canWriteMinutes(user?.role_id) && <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/meetings/create')}>Tạo biên bản đầu tiên</Button>}
              </Empty></div>
            ) : (
              <Table dataSource={recentMinutes} columns={columns} rowKey="minute_id" pagination={false} size="middle" scroll={{ x: 600 }} locale={{ emptyText: <Empty description="Chưa có dữ liệu" /> }} />
            )}
          </Card>
        </Col>
        {isAdmin(user?.role_id) && (
          <Col xs={24} lg={9}>
            <Card title={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><RiseOutlined style={{ color: 'var(--color-primary)' }} /><span style={{ fontWeight: 700, fontSize: 15 }}>Hoạt động gần đây</span></div>} bodyStyle={{ padding: 0 }}>
              {recentLogs.length === 0 ? (
                <div style={{ padding: 32 }}><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có hoạt động" /></div>
              ) : (
                <div style={{ padding: '8px 0' }}>
                  {recentLogs.map((log: any, index: number) => (
                    <div key={log.log_id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 16px', borderBottom: index < recentLogs.length - 1 ? '1px solid var(--color-border-light)' : 'none', transition: 'background var(--transition-fast)' }}
                      className="activity-log-item"
                    >
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, marginTop: 2 }}>
                        <UserOutlined />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text strong style={{ fontSize: 12, color: 'var(--color-text)' }}>{log.user?.full_name}</Text>
                        <Text style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}> — {log.action_detail}</Text>
                        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <ClockCircleOutlined style={{ fontSize: 10 }} />{formatDateTime(log.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </Col>
        )}
      </Row>
    </div>
  )
}
