import { Button, Card, Input, message, Popconfirm, Space, Table, Tag, Tabs } from 'antd'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { keepPreviousDataPlaceholder } from '../../utils/queryKeys'
import { managerRoleRequestsService } from '../../services'
import { ManagerRoleRequest } from '../../types'
import { formatDateTime } from '../../utils'
import { TableRefreshIndicator, TableSkeleton } from '../../components/common'

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: 'Đang chờ duyệt', color: 'warning' },
  approved: { label: 'Đã duyệt', color: 'success' },
  rejected: { label: 'Từ chối', color: 'error' },
}

export default function ManagerRoleRequestsPage() {
  const queryClient = useQueryClient()
  const [responses, setResponses] = useState<Record<number, string>>({})

  const pendingQuery = useQuery({
    queryKey: ['manager-role-requests', 'pending'],
    queryFn: managerRoleRequestsService.getPending,
    placeholderData: keepPreviousDataPlaceholder,
  })
  const hasPendingData = (pendingQuery.data?.length ?? 0) > 0

  const historyQuery = useQuery({
    queryKey: ['manager-role-requests', 'history'],
    queryFn: managerRoleRequestsService.getHistory,
    placeholderData: keepPreviousDataPlaceholder,
  })
  const hasHistoryData = (historyQuery.data?.length ?? 0) > 0

  const reviewMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      managerRoleRequestsService.review(id, { status, response: responses[id] }),
    onSuccess: () => {
      message.success('Đã cập nhật yêu cầu')
      queryClient.invalidateQueries({ queryKey: ['manager-role-requests'] })
      setResponses({})
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Không thể xử lý yêu cầu'),
  })

  const pendingColumns = [
    {
      title: 'Người dùng',
      key: 'user',
      render: (_: any, record: ManagerRoleRequest) => (
        <div>
          <strong>{record.user?.full_name}</strong>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{record.user?.email}</div>
        </div>
      ),
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      key: 'reason',
      render: (value: string) => value || 'Không ghi lý do',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => <Tag color={statusMap[value]?.color || 'default'}>{statusMap[value]?.label || value}</Tag>,
    },
    {
      title: 'Thời gian gửi',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (value: string) => formatDateTime(value),
    },
    {
      title: 'Phản hồi',
      key: 'response',
      render: (_: any, record: ManagerRoleRequest) => (
        <Input
          placeholder="Ghi chú phản hồi"
          value={responses[record.request_id]}
          onChange={(event) => setResponses((prev) => ({ ...prev, [record.request_id]: event.target.value }))}
        />
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: any, record: ManagerRoleRequest) => (
        <Space>
          <Popconfirm
            title="Duyệt người dùng này làm quản lý?"
            onConfirm={() => reviewMutation.mutate({ id: record.request_id, status: 'approved' })}
          >
            <Button type="primary" size="small" loading={reviewMutation.isPending}>
              Duyệt
            </Button>
          </Popconfirm>
          <Popconfirm
            title="Từ chối yêu cầu này?"
            onConfirm={() => reviewMutation.mutate({ id: record.request_id, status: 'rejected' })}
          >
            <Button danger size="small" loading={reviewMutation.isPending}>
              Từ chối
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const historyColumns = [
    {
      title: 'Người dùng',
      key: 'user',
      render: (_: any, record: ManagerRoleRequest) => (
        <div>
          <strong>{record.user?.full_name}</strong>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{record.user?.email}</div>
        </div>
      ),
    },
    {
      title: 'Kết quả',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => <Tag color={statusMap[value]?.color || 'default'}>{statusMap[value]?.label || value}</Tag>,
    },
    {
      title: 'Phản hồi',
      dataIndex: 'response',
      key: 'response',
      render: (value: string) => value || 'Không có',
    },
    {
      title: 'Người duyệt',
      key: 'reviewer',
      render: (_: any, record: ManagerRoleRequest) => record.reviewer?.full_name || '-',
    },
    {
      title: 'Thời gian xử lý',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (value: string) => formatDateTime(value),
    },
  ]

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Yêu cầu làm quản lý</h1>
      </div>
      <Card>
        <Tabs
          items={[
            {
              key: 'pending',
              label: `Chờ duyệt (${pendingQuery.data?.length || 0})`,
              children: pendingQuery.isLoading && !hasPendingData ? (
                <TableSkeleton rows={4} columns={[{ width: 200 }, { width: 200 }, { width: 130 }, { width: 170 }, { width: 200 }, { width: 160 }]} />
              ) : (
                <>
                  <TableRefreshIndicator visible={pendingQuery.isFetching && hasPendingData} />
                  <Table<ManagerRoleRequest>
                    dataSource={pendingQuery.data || []}
                    columns={pendingColumns}
                    rowKey="request_id"
                    locale={{ emptyText: 'Không có yêu cầu chờ duyệt' }}
                    scroll={{ x: 1000 }}
                  />
                </>
              ),
            },
            {
              key: 'history',
              label: `Lịch sử duyệt (${historyQuery.data?.length || 0})`,
              children: historyQuery.isLoading && !hasHistoryData ? (
                <TableSkeleton rows={4} columns={[{ width: 200 }, { width: 130 }, { width: 150 }, { width: 160 }, { width: 170 }]} />
              ) : (
                <>
                  <TableRefreshIndicator visible={historyQuery.isFetching && hasHistoryData} />
                  <Table<ManagerRoleRequest>
                    dataSource={historyQuery.data || []}
                    columns={historyColumns}
                    rowKey="request_id"
                    locale={{ emptyText: 'Chưa có lịch sử duyệt' }}
                    scroll={{ x: 900 }}
                  />
                </>
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}
