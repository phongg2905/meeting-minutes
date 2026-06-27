import { useState } from 'react'
import { Button, Card, DatePicker, Form, Input, message, Modal, Select, Space, Table, Tag, Typography } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { keepPreviousDataPlaceholder } from '../../utils/queryKeys'
import { supportRequestsService } from '../../services'
import { useAuthStore } from '../../store/authStore'
import { formatDateTime, isAdmin } from '../../utils'
import { TableRefreshIndicator, TableSkeleton } from '../../components/common'
import { SupportRequest } from '../../types'

const { Text } = Typography
const { TextArea } = Input
const { RangePicker } = DatePicker

const STATUS_COLORS: Record<string, string> = {
  open: 'warning',
  processing: 'processing',
  resolved: 'success',
  closed: 'default',
}

export default function SupportRequestsPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SupportRequest | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>()
  const [dateRange, setDateRange] = useState<any>(null)
  const [form] = Form.useForm()

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['support-requests', { page, search, statusFilter, dateRange }],
    queryFn: () => supportRequestsService.getAll({
      page,
      limit: 10,
      search: search || undefined,
      status: statusFilter,
      date_from: dateRange?.[0]?.format('YYYY-MM-DD'),
      date_to: dateRange?.[1]?.format('YYYY-MM-DD'),
    }),
    placeholderData: keepPreviousDataPlaceholder,
  })
  const hasExistingData = (data?.data?.length ?? 0) > 0

  const createMutation = useMutation({
    mutationFn: supportRequestsService.create,
    onSuccess: () => {
      message.success('Đã gửi yêu cầu hỗ trợ')
      queryClient.invalidateQueries({ queryKey: ['support-requests'] })
      setModalOpen(false)
      form.resetFields()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: any }) => supportRequestsService.update(id, values),
    onSuccess: () => {
      message.success('Đã cập nhật yêu cầu')
      queryClient.invalidateQueries({ queryKey: ['support-requests'] })
      setEditing(null)
      form.resetFields()
    },
  })

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openHandle = (record: SupportRequest) => {
    setEditing(record)
    form.setFieldsValue({ status: record.status, response: record.response })
  }

  const columns = [
    {
      title: 'Yêu cầu',
      key: 'title',
      render: (_: any, record: SupportRequest) => (
        <div>
          <Text strong>{record.title}</Text>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{record.content}</div>
        </div>
      ),
    },
    ...(isAdmin(user?.role_id) ? [{
      title: 'Người gửi',
      key: 'requester',
      render: (_: any, record: SupportRequest) => record.requester?.full_name || 'Không rõ',
    }] : []),
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: string) => <Tag color={STATUS_COLORS[status] || 'default'}>{status}</Tag>,
    },
    {
      title: 'Phản hồi',
      dataIndex: 'response',
      key: 'response',
      render: (value: string) => value || 'Chưa có',
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (value: string) => formatDateTime(value),
    },
    ...(isAdmin(user?.role_id) ? [{
      title: 'Thao tác',
      key: 'actions',
      width: 120,
      render: (_: any, record: SupportRequest) => (
        <Button size="small" onClick={() => openHandle(record)}>Xử lý</Button>
      ),
    }] : []),
  ]

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Hỗ trợ</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Tạo yêu cầu
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Tìm tiêu đề, nội dung, phản hồi..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            allowClear
          />
          <Select
            placeholder="Trạng thái"
            value={statusFilter}
            onChange={(value) => { setStatusFilter(value); setPage(1) }}
            allowClear
            options={[
              { value: 'open', label: 'open' },
              { value: 'processing', label: 'processing' },
              { value: 'resolved', label: 'resolved' },
              { value: 'closed', label: 'closed' },
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

      <Card>
        {isLoading && !hasExistingData ? (
          <TableSkeleton rows={5} columns={[{ width: '30%' }, { width: 120 }, { width: 130 }, { width: '20%' }, { width: 170 }]} />
        ) : (
          <>
            <TableRefreshIndicator visible={isFetching && hasExistingData} />
            <Table
              dataSource={data?.data || []}
              columns={columns}
              rowKey="request_id"
              pagination={{
                current: page,
                pageSize: 10,
                total: data?.total || 0,
                showTotal: (t) => `Tổng ${t} yêu cầu`,
                onChange: setPage,
                showSizeChanger: false,
              }}
            />
          </>
        )}
      </Card>

      <Modal title="Tạo yêu cầu ho tro" open={modalOpen} onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={(values) => createMutation.mutate(values)}>
          <Form.Item label="Tiêu đề" name="title" rules={[{ required: true, message: 'Nhập tiêu đề' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Nội dung" name="content" rules={[{ required: true, message: 'Nhập nội dung' }]}>
            <TextArea rows={5} />
          </Form.Item>
          <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending}>Gửi</Button>
          </Space>
        </Form>
      </Modal>

      <Modal title="Xử lý yêu cầu" open={!!editing} onCancel={() => setEditing(null)} footer={null}>
        <Form form={form} layout="vertical" onFinish={(values) => editing && updateMutation.mutate({ id: editing.request_id, values })}>
          <Form.Item label="Trạng thái" name="status" rules={[{ required: true }]}>
            <Select options={[
              { value: 'open', label: 'open' },
              { value: 'processing', label: 'processing' },
              { value: 'resolved', label: 'resolved' },
              { value: 'closed', label: 'closed' },
            ]} />
          </Form.Item>
          <Form.Item label="Phản hồi" name="response">
            <TextArea rows={5} />
          </Form.Item>
          <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setEditing(null)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>Lưu</Button>
          </Space>
        </Form>
      </Modal>
    </div>
  )
}
