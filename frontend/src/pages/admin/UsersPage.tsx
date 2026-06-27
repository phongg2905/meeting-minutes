import { useState } from 'react'
import {
  Table, Button, Tag, Space, Popconfirm, message, Card, Modal,
  Form, Input, Select, Switch, Typography, Avatar, Tooltip
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, LockOutlined, UnlockOutlined, SearchOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersService, rolesService } from '../../services'
import { formatDateTime } from '../../utils'
import { User, Role } from '../../types'
import { TableRefreshIndicator, TableSkeleton } from '../../components/common'

const { Text } = Typography

export default function UsersPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<number>()
  const [statusFilter, setStatusFilter] = useState<string>()
  const [form] = Form.useForm()

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['users', { page, search, roleFilter, statusFilter }],
    queryFn: () => usersService.getAll({
      page,
      limit: 10,
      search: search || undefined,
      role_id: roleFilter,
      status: statusFilter,
    }),
  })
  const hasExistingData = (data?.data?.length ?? 0) > 0

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: rolesService.getAll,
  })

  const createMutation = useMutation({
    mutationFn: usersService.create,
    onSuccess: () => {
      message.success('Tạo người dùng thành công')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setModalOpen(false)
      form.resetFields()
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Lỗi tạo người dùng'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => usersService.update(id, data),
    onSuccess: () => {
      message.success('Cập nhật thành công')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setModalOpen(false)
      setEditingUser(null)
      form.resetFields()
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => usersService.updateStatus(id, status),
    onSuccess: () => {
      message.success('Cập nhật trạng thái thành công')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: usersService.remove,
    onSuccess: () => {
      message.success('Đã xóa người dùng')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: () => message.error('Không thể xóa người dùng này'),
  })

  const openCreate = () => {
    setEditingUser(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (user: User) => {
    setEditingUser(user)
    form.setFieldsValue({ ...user, password: undefined })
    setModalOpen(true)
  }

  const handleSubmit = (values: any) => {
    if (editingUser) {
      const { password, ...rest } = values
      updateMutation.mutate({ id: editingUser.user_id, data: rest })
    } else {
      createMutation.mutate(values)
    }
  }

  const columns = [
    {
      title: 'Người dùng',
      key: 'user',
      render: (_: any, record: User) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar style={{ background: '#1a56a0', flexShrink: 0 }}>
            {record.full_name?.[0]?.toUpperCase()}
          </Avatar>
          <div>
            <Text strong style={{ display: 'block' }}>{record.full_name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      render: (p: string) => p || '—',
    },
    {
      title: 'Vai trò',
      key: 'role',
      render: (_: any, record: User) => (
        <Tag color={record.role_id === 1 ? 'red' : 'blue'}>
          {record.role?.role_name}
        </Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (s: string, record: User) => (
        <Switch
          checked={s === 'active'}
          checkedChildren="Hoạt động"
          unCheckedChildren="Khóa"
          onChange={(checked) =>
            statusMutation.mutate({ id: record.user_id, status: checked ? 'active' : 'inactive' })
          }
          size="small"
        />
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (d: string) => formatDateTime(d),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: any, record: User) => (
        <Space>
          <Tooltip title="Chỉnh sửa">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Tooltip title={record.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa'}>
            <Button
              type="text" size="small"
              icon={record.status === 'active' ? <LockOutlined /> : <UnlockOutlined />}
              onClick={() => statusMutation.mutate({
                id: record.user_id,
                status: record.status === 'active' ? 'inactive' : 'active'
              })}
            />
          </Tooltip>
          <Tooltip title="Xóa">
            <Popconfirm
              title="Xóa người dùng này?"
              onConfirm={() => deleteMutation.mutate(record.user_id)}
              okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
            >
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">👥 Quản lý người dùng</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ borderRadius: 8 }}>
          Thêm người dùng
        </Button>
      </div>

      <Card style={{ marginBottom: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Tìm tên, email, số điện thoại..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            allowClear
          />
          <Select
            placeholder="Vai trò"
            value={roleFilter}
            onChange={(value) => { setRoleFilter(value); setPage(1) }}
            allowClear
            options={(roles || []).map((r: Role) => ({ value: r.role_id, label: r.role_name }))}
          />
          <Select
            placeholder="Trạng thái"
            value={statusFilter}
            onChange={(value) => { setStatusFilter(value); setPage(1) }}
            allowClear
            options={[
              { value: 'active', label: 'Hoạt động' },
              { value: 'inactive', label: 'Khóa' },
            ]}
          />
        </div>
      </Card>

      <Card style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        {isLoading && !hasExistingData ? (
          <TableSkeleton rows={5} columns={[{ width: 280 }, { width: 100 }, { width: 100 }, { width: 100 }, { width: 160 }, { width: 120 }]} />
        ) : (
          <>
            <TableRefreshIndicator visible={isFetching && hasExistingData} />
            <Table
              dataSource={data?.data || []}
              columns={columns}
              rowKey="user_id"
              scroll={{ x: 700 }}
              pagination={{
                current: page,
                pageSize: 10,
                total: data?.total || 0,
                showTotal: (t) => `Tổng ${t} người dùng`,
                onChange: setPage,
                showSizeChanger: false,
              }}
            />
          </>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingUser ? '✏️ Chỉnh sửa người dùng' : '➕ Thêm người dùng mới'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditingUser(null); form.resetFields() }}
        footer={null}
        width={520}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 16 }}
        >
          <Form.Item label="Họ và tên" name="full_name"
            rules={[{ required: true, message: 'Nhập họ tên' }]}>
            <Input placeholder="Nguyễn Văn A" />
          </Form.Item>
          <Form.Item label="Email" name="email"
            rules={[{ required: true, type: 'email', message: 'Email không hợp lệ' }]}>
            <Input placeholder="email@school.edu.vn" disabled={!!editingUser} />
          </Form.Item>
          {!editingUser && (
            <Form.Item label="Mật khẩu" name="password"
              rules={[{ required: true, min: 6, message: 'Mật khẩu ít nhất 6 ký tự' }]}>
              <Input.Password placeholder="Mật khẩu" />
            </Form.Item>
          )}
          <Form.Item label="Số điện thoại" name="phone">
            <Input placeholder="0900000000" />
          </Form.Item>
          <Form.Item label="Vai trò" name="role_id"
            rules={[{ required: true, message: 'Chọn vai trò' }]}>
            <Select
              options={(roles || []).map((r: Role) => ({ value: r.role_id, label: r.role_name }))}
              placeholder="Chọn vai trò"
            />
          </Form.Item>
          {editingUser && (
            <Form.Item label="Trạng thái" name="status">
              <Select options={[
                { value: 'active', label: 'Hoạt động' },
                { value: 'inactive', label: 'Khóa' },
              ]} />
            </Form.Item>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <Button onClick={() => { setModalOpen(false); setEditingUser(null); form.resetFields() }}>Hủy</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editingUser ? 'Lưu thay đổi' : 'Tạo người dùng'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
