import { Button, Card, Form, Input, message, Table, Tag, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { keepPreviousDataPlaceholder } from '../../utils/queryKeys'
import { managerRoleRequestsService } from '../../services'
import { ManagerRoleRequest } from '../../types'
import { formatDateTime, isMinuteManager } from '../../utils'
import { useAuthStore } from '../../store/authStore'
import { TableRefreshIndicator, TableSkeleton } from '../../components/common'

const { TextArea } = Input
const { Text } = Typography

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: 'Đang chờ duyệt', color: 'warning' },
  approved: { label: 'Đã duyệt', color: 'success' },
  rejected: { label: 'Từ chối', color: 'error' },
}

export default function ManagerRoleRequestPage() {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const alreadyManager = isMinuteManager(user?.role_id)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['manager-role-requests'],
    queryFn: managerRoleRequestsService.getAll,
    placeholderData: keepPreviousDataPlaceholder,
  })
  const hasExistingData = (data?.length ?? 0) > 0

  const createMutation = useMutation({
    mutationFn: managerRoleRequestsService.create,
    onSuccess: () => {
      message.success('Đã gửi yêu cầu làm quản lý')
      form.resetFields()
      queryClient.invalidateQueries({ queryKey: ['manager-role-requests'] })
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Không thể gửi yêu cầu'),
  })

  const columns = [
    {
      title: 'Thời gian gửi',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (value: string) => formatDateTime(value),
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
      title: 'Phản hồi',
      dataIndex: 'response',
      key: 'response',
      render: (value: string) => value || 'Chưa có',
    },
  ]

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Đăng ký làm quản lý biên bản</h1>
      </div>

      <Card style={{ marginBottom: 16 }}>
        {alreadyManager ? (
          <Text>Bạn đã có quyền quản lý biên bản.</Text>
        ) : (
          <Form form={form} layout="vertical" onFinish={(values) => createMutation.mutate(values)}>
            <Form.Item label="Lý do đăng ký" name="reason">
              <TextArea rows={4} placeholder="Nhập lý do hoặc trách nhiệm được phân công" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
              Gửi yêu cầu
            </Button>
          </Form>
        )}
      </Card>

      <Card>
        {isLoading && !hasExistingData ? (
          <TableSkeleton rows={4} columns={[{ width: 170 }, { width: '30%' }, { width: 130 }, { width: 150 }]} />
        ) : (
          <>
            <TableRefreshIndicator visible={isFetching && hasExistingData} />
            <Table<ManagerRoleRequest>
              dataSource={data || []}
              columns={columns}
              rowKey="request_id"
            />
          </>
        )}
      </Card>
    </div>
  )
}
