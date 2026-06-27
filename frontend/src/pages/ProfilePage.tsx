import { useState } from 'react'
import { Card, Form, Input, Button, Avatar, Typography, Row, Col, Divider, message, Tag } from 'antd'
import { UserOutlined, LockOutlined, SaveOutlined } from '@ant-design/icons'
import { useMutation } from '@tanstack/react-query'
import { authService, usersService } from '../services'
import { useAuthStore } from '../store/authStore'
import { formatDateTime } from '../utils'

const { Title, Text } = Typography

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const [profileForm] = Form.useForm()
  const [pwdForm] = Form.useForm()
  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info')

  const updateMutation = useMutation({
    mutationFn: (data: any) => usersService.updateMe(data),
    onSuccess: (data) => {
      setUser(data)
      message.success('Cập nhật thông tin thành công')
    },
    onError: () => message.error('Có lỗi xảy ra'),
  })

  const changePwdMutation = useMutation({
    mutationFn: ({ oldPassword, newPassword }: any) =>
      authService.changePassword(oldPassword, newPassword),
    onSuccess: () => {
      message.success('Đổi mật khẩu thành công')
      pwdForm.resetFields()
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.message || 'Mật khẩu cũ không đúng'),
  })

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Thông tin cá nhân</h1>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card style={{ textAlign: 'center', borderRadius: 12, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
            <Avatar
              size={96}
              style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))', fontSize: 36, marginBottom: 16 }}
            >
              {user?.full_name?.[0]?.toUpperCase()}
            </Avatar>
            <Title level={4} style={{ margin: '0 0 4px' }}>{user?.full_name}</Title>
            <Text type="secondary" style={{ fontSize: 13 }}>{user?.email}</Text>
            <div style={{ marginTop: 12 }}>
              <Tag color={user?.role_id === 1 ? 'red' : 'blue'} style={{ fontSize: 13 }}>
                {user?.role?.role_name}
              </Tag>
            </div>
            <Divider />
            <div style={{ textAlign: 'left', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 2 }}>
              <div>Điện thoại: {user?.phone || 'Chưa cập nhật'}</div>
              <div>Tham gia: {formatDateTime(user?.created_at)}</div>
              <div>Trạng thái: <Tag color="success">Hoạt động</Tag></div>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={16}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <Button
              type={activeTab === 'info' ? 'primary' : 'default'}
              onClick={() => setActiveTab('info')}
              icon={<UserOutlined />}
              style={{ borderRadius: 8 }}
            >
              Thông tin
            </Button>
            <Button
              type={activeTab === 'password' ? 'primary' : 'default'}
              onClick={() => setActiveTab('password')}
              icon={<LockOutlined />}
              style={{ borderRadius: 8 }}
            >
              Đổi mật khẩu
            </Button>
          </div>

          {activeTab === 'info' && (
            <Card style={{ borderRadius: 12, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
              <Title level={5} style={{ marginBottom: 20 }}>Cập nhật thông tin</Title>
              <Form
                form={profileForm}
                layout="vertical"
                initialValues={{ full_name: user?.full_name, phone: user?.phone }}
                onFinish={updateMutation.mutate}
              >
                <Form.Item label="Họ và tên" name="full_name" rules={[{ required: true, message: 'Nhập họ tên' }]}>
                  <Input placeholder="Họ và tên" size="large" style={{ borderRadius: 8 }} />
                </Form.Item>
                <Form.Item label="Email">
                  <Input value={user?.email} disabled size="large" style={{ borderRadius: 8 }} />
                </Form.Item>
                <Form.Item label="Số điện thoại" name="phone">
                  <Input placeholder="0900000000" size="large" style={{ borderRadius: 8 }} />
                </Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={updateMutation.isPending}
                  size="large"
                  style={{ borderRadius: 8, fontWeight: 600 }}
                >
                  Lưu thay đổi
                </Button>
              </Form>
            </Card>
          )}

          {activeTab === 'password' && (
            <Card style={{ borderRadius: 12, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
              <Title level={5} style={{ marginBottom: 20 }}>Đổi mật khẩu</Title>
              <Form form={pwdForm} layout="vertical" onFinish={changePwdMutation.mutate}>
                <Form.Item label="Mật khẩu hiện tại" name="oldPassword" rules={[{ required: true, message: 'Nhập mật khẩu hiện tại' }]}>
                  <Input.Password size="large" style={{ borderRadius: 8 }} placeholder="Mật khẩu hiện tại" />
                </Form.Item>
                <Form.Item label="Mật khẩu mới" name="newPassword" rules={[{ required: true, min: 6, message: 'Mật khẩu ít nhất 6 ký tự' }]}>
                  <Input.Password size="large" style={{ borderRadius: 8 }} placeholder="Mật khẩu mới" />
                </Form.Item>
                <Form.Item
                  label="Xác nhận mật khẩu mới"
                  name="confirmPassword"
                  dependencies={['newPassword']}
                  rules={[
                    { required: true, message: 'Xác nhận mật khẩu' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
                        return Promise.reject(new Error('Mật khẩu xác nhận không khớp'))
                      },
                    }),
                  ]}
                >
                  <Input.Password size="large" style={{ borderRadius: 8 }} placeholder="Xác nhận mật khẩu mới" />
                </Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<LockOutlined />}
                  loading={changePwdMutation.isPending}
                  size="large"
                  style={{ borderRadius: 8, fontWeight: 600 }}
                  danger
                >
                  Đổi mật khẩu
                </Button>
              </Form>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  )
}
