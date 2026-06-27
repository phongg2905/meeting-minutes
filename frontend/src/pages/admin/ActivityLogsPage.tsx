import { useState } from 'react'
import { Table, Card, Tag, Typography, Avatar, Row, Col, Input, Select, DatePicker } from 'antd'
import { AuditOutlined, SearchOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { activityLogsService } from '../../services'
import { formatDateTime } from '../../utils'

const { Text } = Typography
const { RangePicker } = DatePicker

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'success',
  UPDATE: 'processing',
  DELETE: 'error',
  STATUS_CHANGE: 'warning',
  LOGIN: 'blue',
  LOGOUT: 'default',
  REGISTER: 'cyan',
  PASSWORD_RESET: 'orange',
  PASSWORD_CHANGE: 'orange',
  EMAIL_VERIFIED: 'purple',
  REGISTER_OTP_RESENT: 'purple',
  SEED: 'geekblue',
}

export default function ActivityLogsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [actionName, setActionName] = useState<string>()
  const [targetTable, setTargetTable] = useState<string>()
  const [dateRange, setDateRange] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['activity-logs', { page, search, actionName, targetTable, dateRange }],
    queryFn: () => activityLogsService.getAll({
      page,
      limit: 20,
      search: search || undefined,
      action_name: actionName,
      target_table: targetTable,
      date_from: dateRange?.[0]?.format('YYYY-MM-DD'),
      date_to: dateRange?.[1]?.format('YYYY-MM-DD'),
    }),
    refetchInterval: 30000,
  })

  const columns = [
    {
      title: 'Người thực hiện',
      key: 'user',
      width: 220,
      render: (_: any, record: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar size={30} style={{ background: '#1a56a0', fontSize: 12, flexShrink: 0 }}>
            {record.user?.full_name?.[0]?.toUpperCase()}
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <Text strong style={{ fontSize: 13 }} ellipsis={{ tooltip: record.user?.full_name }}>
              {record.user?.full_name}
            </Text>
            <div style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {record.user?.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Hành động',
      dataIndex: 'action_name',
      key: 'action_name',
      width: 160,
      render: (a: string) => (
        <Tag
          color={ACTION_COLORS[a] || 'default'}
          style={{
            fontWeight: 600,
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'inline-block',
            verticalAlign: 'middle',
          }}
        >
          {a}
        </Tag>
      ),
    },
    {
      title: 'Bảng',
      dataIndex: 'target_table',
      key: 'target_table',
      width: 160,
      render: (t: string) => t ? (
        <Tag style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t}</Tag>
      ) : '—',
    },
    {
      title: 'Chi tiết',
      dataIndex: 'action_detail',
      key: 'action_detail',
      ellipsis: { showTitle: false },
      render: (d: string) => d ? (
        <Text ellipsis={{ tooltip: d }} style={{ fontSize: 13 }}>
          {d}
        </Text>
      ) : '—',
    },
    {
      title: 'Thời gian',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (d: string) => (
        <Text style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{formatDateTime(d)}</Text>
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
              Theo dõi thao tác trong hệ thống
            </p>
          </div>
        </div>
      </div>

      <Card style={{ marginBottom: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={8}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Tìm người dùng, hành động, chi tiết..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              allowClear
            />
          </Col>
          <Col xs={24} md={5}>
            <Select
              placeholder="Hành động"
              value={actionName}
              onChange={(value) => { setActionName(value); setPage(1) }}
              allowClear
              style={{ width: '100%' }}
              options={Object.keys(ACTION_COLORS).map((value) => ({ value, label: value }))}
            />
          </Col>
          <Col xs={24} md={5}>
            <Input
              placeholder="Bảng dữ liệu"
              value={targetTable}
              onChange={(e) => { setTargetTable(e.target.value || undefined); setPage(1) }}
              allowClear
            />
          </Col>
          <Col xs={24} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              value={dateRange}
              onChange={(value) => { setDateRange(value); setPage(1) }}
            />
          </Col>
        </Row>
      </Card>

      <Card style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        <Table
          dataSource={data?.data || []}
          columns={columns}
          rowKey="log_id"
          loading={isLoading}
          scroll={{ x: 900 }}
          pagination={{
            current: page,
            pageSize: 20,
            total: data?.total || 0,
            showTotal: (t) => `Tổng ${t} bản ghi`,
            onChange: setPage,
            showSizeChanger: false,
          }}
        />
      </Card>
    </div>
  )
}
