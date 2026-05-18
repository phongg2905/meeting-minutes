import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { backupLogsService } from '../../services'
import { Button, Card, Popconfirm, Space, Table, Tag, Typography, message } from 'antd'
import { DatabaseOutlined, ReloadOutlined } from '@ant-design/icons'
import { formatDateTime } from '../../utils'

const { Text } = Typography

export default function BackupLogsPage() {
  const queryClient = useQueryClient()

  const { data: logs, isLoading } = useQuery({
    queryKey: ['backup-logs'],
    queryFn: backupLogsService.getAll,
  })

  const runBackupMutation = useMutation({
    mutationFn: backupLogsService.run,
    onSuccess: () => {
      message.success('Tạo backup thành công')
      queryClient.invalidateQueries({ queryKey: ['backup-logs'] })
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

  const columns = [
    {
      title: 'Loại thao tác',
      dataIndex: 'action_type',
      key: 'action_type',
      render: (value: string) => <Tag color={value === 'restore' ? 'orange' : 'blue'}>{value}</Tag>,
    },
    {
      title: 'Tệp',
      dataIndex: 'file_name',
      key: 'file_name',
      render: (value: string) => value || '—',
    },
    {
      title: 'Đường dẫn',
      dataIndex: 'file_path',
      key: 'file_path',
      ellipsis: true,
      render: (value: string) => value || '—',
    },
    {
      title: 'Người thực hiện',
      key: 'performer',
      render: (_: any, record: any) => record.performer?.full_name || '—',
    },
    {
      title: 'Thời gian',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (value: string) => <Text>{formatDateTime(value)}</Text>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: any, record: any) => (
        record.action_type === 'backup' ? (
          <Popconfirm
            title="Khôi phục từ bản backup này?"
            description="Dữ liệu hiện tại sẽ bị ghi đè bởi bản sao lưu đã chọn."
            onConfirm={() => restoreMutation.mutate(record.backup_id)}
            okText="Khôi phục"
            cancelText="Hủy"
          >
            <Button icon={<ReloadOutlined />} loading={restoreMutation.isPending}>
              Khôi phục
            </Button>
          </Popconfirm>
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

      <Card style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        <Table
          dataSource={logs || []}
          columns={columns}
          rowKey="backup_id"
          loading={isLoading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 900 }}
        />
      </Card>
    </div>
  )
}
