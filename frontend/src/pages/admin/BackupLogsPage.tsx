import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { keepPreviousDataPlaceholder } from '../../utils/queryKeys'
import { backupLogsService } from '../../services'
import { Button, Card, Col, DatePicker, Input, Popconfirm, Row, Select, Space, Table, Tag, Tooltip, Typography, message } from 'antd'
import { DatabaseOutlined, ClockCircleOutlined, CalendarOutlined, DeleteOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { formatDateTime } from '../../utils'
import { TableRefreshIndicator, TableSkeleton } from '../../components/common'

const { Text } = Typography
const { RangePicker } = DatePicker

export default function BackupLogsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [actionType, setActionType] = useState<string>()
  const [dateRange, setDateRange] = useState<any>(null)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['backup-logs', { page, search, actionType, dateRange }],
    queryFn: () => backupLogsService.getAll({
      page,
      limit: 10,
      search: search || undefined,
      action_type: actionType,
      date_from: dateRange?.[0]?.format('YYYY-MM-DD'),
      date_to: dateRange?.[1]?.format('YYYY-MM-DD'),
    }),
    placeholderData: keepPreviousDataPlaceholder,
  })
  const hasExistingData = (data?.data?.length ?? 0) > 0

  const { data: statusData } = useQuery({
    queryKey: ['backup-logs-status'],
    queryFn: () => backupLogsService.getStatus(),
    refetchInterval: 60000,
  })

  const runBackupMutation = useMutation({
    mutationFn: backupLogsService.run,
    onSuccess: () => {
      message.success('Tạo backup thành công')
      queryClient.invalidateQueries({ queryKey: ['backup-logs'] })
      queryClient.invalidateQueries({ queryKey: ['backup-logs-status'] })
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Không thể tạo backup'),
  })

  const restoreMutation = useMutation({
    mutationFn: (backupId: number) => backupLogsService.restore(backupId),
    onSuccess: () => {
      message.success('Khôi phục dữ liệu thành công')
      queryClient.invalidateQueries({ queryKey: ['backup-logs'] })
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Không thể khôi phục dữ liệu'),
  })

  const deleteMutation = useMutation({
    mutationFn: (backupId: number) => backupLogsService.remove(backupId),
    onSuccess: () => {
      message.success('Xóa bản ghi backup thành công')
      queryClient.invalidateQueries({ queryKey: ['backup-logs'] })
      queryClient.invalidateQueries({ queryKey: ['backup-logs-status'] })
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Không thể xóa bản ghi backup'),
  })

  const columns = [
    {
      title: 'Loại thao tác',
      dataIndex: 'action_type',
      key: 'action_type',
      width: 140,
      render: (value: string) => (
        <Tag
          color={value === 'restore' ? 'orange' : 'blue'}
          style={{
            fontWeight: 600,
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {value}
        </Tag>
      ),
    },
    {
      title: 'Tệp',
      dataIndex: 'file_name',
      key: 'file_name',
      width: 200,
      ellipsis: { showTitle: false },
      render: (value: string) => value ? (
        <Text ellipsis={{ tooltip: value }} style={{ fontSize: 13 }}>{value}</Text>
      ) : '-',
    },
    {
      title: 'Đường dẫn',
      dataIndex: 'file_path',
      key: 'file_path',
      ellipsis: { showTitle: false },
      render: (value: string) => value ? (
        <Text ellipsis={{ tooltip: value }} style={{ fontSize: 13 }}>{value}</Text>
      ) : '-',
    },
    {
      title: 'Người thực hiện',
      key: 'performer',
      width: 160,
      ellipsis: { showTitle: false },
      render: (_: any, record: any) => (
        <Text ellipsis={{ tooltip: record.performer?.full_name }} style={{ fontSize: 13 }}>
          {record.performer?.full_name || '-'}
        </Text>
      ),
    },
    {
      title: 'Thời gian',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (value: string) => (
        <Text style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{formatDateTime(value)}</Text>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 120,
      render: (_: any, record: any) => (
        record.file_path ? (
          <Space>
            <Popconfirm
              title="Khôi phục từ bản ghi này?"
              description="Dữ liệu hiện tại sẽ bị ghi đè bởi bản sao lưu đã chọn."
              onConfirm={() => restoreMutation.mutate(record.backup_id)}
              okText="Khôi phục"
              cancelText="Hủy"
            >
              <Tooltip title="Khôi phục">
                <Button
                  icon={<ReloadOutlined />}
                  loading={restoreMutation.isPending}
                  aria-label="Khôi phục"
                />
              </Tooltip>
            </Popconfirm>
            <Popconfirm
              title="Xóa bản ghi này?"
              description="Nếu không còn bản ghi nào khác tham chiếu cùng file, file backup sẽ bị xóa khỏi ổ đĩa."
              onConfirm={() => deleteMutation.mutate(record.backup_id)}
              okText="Xóa"
              cancelText="Hủy"
            >
              <Tooltip title="Xóa">
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  loading={deleteMutation.isPending}
                  aria-label="Xóa"
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ) : null
      ),
    },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Lịch sử backup</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
            Tạo bản sao lưu JSON của dữ liệu hệ thống và khôi phục từ các bản backup đã có.
          </p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ['backup-logs'] })}>
            Tải lại
          </Button>
          <Button
            type="primary"
            icon={<DatabaseOutlined />}
            onClick={() => runBackupMutation.mutate()}
            loading={runBackupMutation.isPending}
          >
            Tạo backup
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24}>
          <Card style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={6}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: statusData?.lastManualBackupAt ? '#f0fdf4' : '#fff7ed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <DatabaseOutlined style={{ fontSize: 18, color: statusData?.lastManualBackupAt ? '#16a34a' : '#d97706' }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Backup thủ công gần nhất
                    </Text>
                    <Tooltip title={statusData?.lastManualBackupFileName || undefined}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginTop: 1 }}>
                        {statusData?.lastManualBackupAt
                          ? formatDateTime(statusData.lastManualBackupAt)
                          : 'Chưa có'}
                      </div>
                    </Tooltip>
                  </div>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: statusData?.lastAutoBackupAt ? '#f0f9ff' : '#f8fafc',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <ClockCircleOutlined style={{ fontSize: 18, color: statusData?.lastAutoBackupAt ? '#2563eb' : '#94a3b8' }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Backup tự động gần nhất
                    </Text>
                    <Tooltip title={statusData?.lastAutoBackupFileName || undefined}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginTop: 1 }}>
                        {statusData?.lastAutoBackupAt
                          ? formatDateTime(statusData.lastAutoBackupAt)
                          : 'Chưa có'}
                      </div>
                    </Tooltip>
                  </div>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: '#fef3c7',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <CalendarOutlined style={{ fontSize: 18, color: '#d97706' }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Lịch tự động tiếp theo</Text>
                    <div style={{ fontWeight: 600, fontSize: 13, marginTop: 1 }}>
                      {statusData?.nextBackupAt
                        ? formatDateTime(statusData.nextBackupAt)
                        : '—'}
                    </div>
                  </div>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: '#f0fdf4',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <DatabaseOutlined style={{ fontSize: 18, color: '#059669' }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Tổng / Lưu giữ</Text>
                    <div style={{ fontWeight: 600, fontSize: 13, marginTop: 1 }}>
                      {statusData?.totalBackups ?? 0} bản / {statusData?.retentionDays ?? '—'} ngày
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Tìm tệp, đường dẫn, người thực hiện..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            allowClear
          />
          <Select
            placeholder="Loại thao tác"
            value={actionType}
            onChange={(value) => { setActionType(value); setPage(1) }}
            allowClear
            options={[
              { value: 'backup', label: 'backup' },
              { value: 'restore', label: 'restore' },
            ]}
          />
          <RangePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            value={dateRange}
            onChange={(value) => { setDateRange(value); setPage(1) }}
          />
        </div>
      </Card>

      <Card style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        {isLoading && !hasExistingData ? (
          <TableSkeleton rows={5} columns={[{ width: 140 }, { width: 200 }, { width: '25%' }, { width: 160 }, { width: 150 }, { width: 120 }]} />
        ) : (
          <>
            <TableRefreshIndicator visible={isFetching && hasExistingData} />
            <Table
              dataSource={data?.data || []}
              columns={columns}
              rowKey="backup_id"
              pagination={{
                current: page,
                pageSize: 10,
                total: data?.total || 0,
                showTotal: (t) => `Tổng ${t} bản ghi`,
                onChange: setPage,
                showSizeChanger: false,
              }}
              scroll={{ x: 900 }}
            />
          </>
        )}
      </Card>
    </div>
  )
}
