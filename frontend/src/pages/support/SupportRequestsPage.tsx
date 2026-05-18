import { useState } from 'react'
import { Button, Card, Form, Input, message, Modal, Select, Space, Table, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supportRequestsService } from '../../services'
import { useAuthStore } from '../../store/authStore'
import { formatDateTime, isAdmin } from '../../utils'
import { SupportRequest } from '../../types'

const { Text } = Typography
const { TextArea } = Input

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
  const [form] = Form.useForm()

  const { data, isLoading } = useQuery({
    queryKey: ['support-requests'],
    queryFn: supportRequestsService.getAll,
  })

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
          <div style={{ color: '#64748b', fontSize: 12 }}>{record.content}</div>
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

      <Card>
        <Table dataSource={data || []} columns={columns} rowKey="request_id" loading={isLoading} />
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
