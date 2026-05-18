import { Table, Card, Tag, Typography, Avatar } from 'antd'
import { AuditOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { activityLogsService } from '../../services'
import { formatDateTime } from '../../utils'

const { Text } = Typography

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'success',
  UPDATE: 'processing',
  DELETE: 'error',
  STATUS_CHANGE: 'warning',
  LOGIN: 'blue',
}

export default function ActivityLogsPage() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: activityLogsService.getAll,
    refetchInterval: 30000,
  })

  const columns = [
    {
      title: 'Người thực hiện',
      key: 'user',
      render: (_: any, record: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar size={30} style={{ background: '#1a56a0', fontSize: 12, flexShrink: 0 }}>
            {record.user?.full_name?.[0]?.toUpperCase()}
          </Avatar>
          <div>
            <Text strong style={{ fontSize: 13 }}>{record.user?.full_name}</Text>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{record.user?.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Hành động',
      dataIndex: 'action_name',
      key: 'action_name',
      width: 130,
      render: (a: string) => (
        <Tag color={ACTION_COLORS[a] || 'default'} style={{ fontWeight: 600 }}>{a}</Tag>
      ),
    },
    {
      title: 'Bảng dữ liệu',
      dataIndex: 'target_table',
      key: 'target_table',
      width: 160,
      render: (t: string) => t ? <Tag>{t}</Tag> : '—',
    },
    {
      title: 'Chi tiết',
      dataIndex: 'action_detail',
      key: 'action_detail',
      ellipsis: true,
      render: (d: string) => d || '—',
    },
    {
      title: 'Thời gian',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (d: string) => (
        <Text style={{ fontSize: 12 }}>{formatDateTime(d)}</Text>
      ),
    },
  ]

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: '#eff6ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AuditOutlined style={{ fontSize: 22, color: '#1a56a0' }} />
          </div>
          <div>
            <h1 className="page-title" style={{ marginBottom: 0 }}>Nhật ký hoạt động</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
              Theo dõi toàn bộ thao tác trong hệ thống (100 gần nhất)
            </p>
          </div>
        </div>
      </div>

      <Card style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        <Table
          dataSource={logs || []}
          columns={columns}
          rowKey="log_id"
          loading={isLoading}
          scroll={{ x: 700 }}
          pagination={{ pageSize: 20, showTotal: (t) => `Tổng ${t} bản ghi` }}
        />
      </Card>
    </div>
  )
}
