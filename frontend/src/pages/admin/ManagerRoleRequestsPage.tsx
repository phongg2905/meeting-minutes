import { Button, Card, Input, message, Popconfirm, Space, Table, Tag } from 'antd'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { managerRoleRequestsService } from '../../services'
import { ManagerRoleRequest } from '../../types'
import { formatDateTime } from '../../utils'

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: 'Đang chờ duyệt', color: 'warning' },
  approved: { label: 'Đã duyệt', color: 'success' },
  rejected: { label: 'Từ chối', color: 'error' },
}

export default function ManagerRoleRequestsPage() {
  const queryClient = useQueryClient()
  const [responses, setResponses] = useState<Record<number, string>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['manager-role-requests'],
    queryFn: managerRoleRequestsService.getAll,
  })

  const reviewMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      managerRoleRequestsService.review(id, { status, response: responses[id] }),
    onSuccess: () => {
      message.success('Đã cập nhật yêu cầu')
      queryClient.invalidateQueries({ queryKey: ['manager-role-requests'] })
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Không thể xử lý yêu cầu'),
  })

  const columns = [
    {
      title: 'Người dùng',
      key: 'user',
      render: (_: any, record: ManagerRoleRequest) => (
        <div>
          <strong>{record.user?.full_name}</strong>
          <div style={{ color: '#64748b', fontSize: 12 }}>{record.user?.email}</div>
        </div>
      ),
    },
    { title: 'Lý do', dataIndex: 'reason', key: 'reason', render: (value: string) => value || 'Không ghi lý do' },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => <Tag color={statusMap[value]?.color || 'default'}>{statusMap[value]?.label || value}</Tag>,
    },
    { title: 'Thời gian gửi', dataIndex: 'created_at', key: 'created_at', render: (value: string) => formatDateTime(value) },
    {
      title: 'Phản hồi',
      key: 'response',
      render: (_: any, record: ManagerRoleRequest) => record.status === 'pending' ? (
        <Input
          placeholder="Ghi chú phản hồi"
          value={responses[record.request_id]}
          onChange={(event) => setResponses((prev) => ({ ...prev, [record.request_id]: event.target.value }))}
        />
      ) : record.response || 'Không có',
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: any, record: ManagerRoleRequest) => record.status === 'pending' ? (
        <Space>
          <Popconfirm title="Duyệt người dùng này làm quản lý?" onConfirm={() => reviewMutation.mutate({ id: record.request_id, status: 'approved' })}>
            <Button type="primary" size="small">Duyệt</Button>
          </Popconfirm>
          <Popconfirm title="Từ chối yêu cầu này?" onConfirm={() => reviewMutation.mutate({ id: record.request_id, status: 'rejected' })}>
            <Button danger size="small">Từ chối</Button>
          </Popconfirm>
        </Space>
      ) : null,
    },
  ]

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Yêu cầu làm quản lý</h1>
      </div>
      <Card>
        <Table<ManagerRoleRequest>
          dataSource={data || []}
          columns={columns}
          rowKey="request_id"
          loading={isLoading}
          scroll={{ x: 1000 }}
        />
      </Card>
    </div>
  )
}
