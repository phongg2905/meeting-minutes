import { useState } from 'react'
import { Form, Input, Button, Card, Typography, Alert, Space, Modal, message } from 'antd'
import { UserOutlined, LockOutlined, LoginOutlined, SearchOutlined, MailOutlined } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authService } from '../../services'
import { useAuthStore } from '../../store/authStore'

const { Title, Text } = Typography

export default function LoginPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { login } = useAuthStore()
  const [form] = Form.useForm()
  const [registerForm] = Form.useForm()
  const [forgotForm] = Form.useForm()
  const [registerOpen, setRegisterOpen] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [resetStep, setResetStep] = useState(false)

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authService.login(email, password),
    onSuccess: (data) => {
      queryClient.clear()
      login(data.access_token, data.user)
      navigate('/dashboard')
    },
  })

  const registerMutation = useMutation({
    mutationFn: (values: any) => {
      const { confirm, ...payload } = values
      return authService.register(payload)
    },
    onSuccess: () => {
      message.success('Đăng ký thành công. Bạn có thể đăng nhập ngay.')
      setRegisterOpen(false)
      registerForm.resetFields()
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Không thể đăng ký'),
  })

  const forgotMutation = useMutation({
    mutationFn: (email: string) => authService.forgotPassword(email),
    onSuccess: () => {
      message.success('Nếu email hợp lệ, mã xác nhận đã được gửi đến hộp thư.')
      setResetStep(true)
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Không thể gửi mã xác nhận'),
  })

  const resetMutation = useMutation({
    mutationFn: authService.resetPassword,
    onSuccess: () => {
      message.success('Đặt lại mật khẩu thành công')
      setForgotOpen(false)
      setResetStep(false)
      forgotForm.resetFields()
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Mã xác nhận không hợp lệ'),
  })

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(145deg, #0f2644 0%, #1c4f93 55%, #2563eb 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ width: '100%', maxWidth: 980, position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) minmax(360px, 440px)', gap: 24, alignItems: 'stretch' }}>
          <div style={{ color: '#fff', padding: '40px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ width: 84, height: 84, borderRadius: 24, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28, fontSize: 34, fontWeight: 800 }}>
              BB
            </div>
            <Title level={1} style={{ color: '#fff', margin: 0, fontWeight: 800, fontSize: 48, lineHeight: 1.08 }}>
              Quản Lý<br />Biên Bản Họp
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.76)', fontSize: 18, marginTop: 18, maxWidth: 460, lineHeight: 1.7 }}>
              Hệ thống hỗ trợ quản lý, tra cứu và theo dõi biên bản họp lớp một cách rõ ràng và tập trung.
            </Text>
            <Space size={12} style={{ marginTop: 28, flexWrap: 'wrap' }}>
              <Link to="/public/meetings">
                <Button icon={<SearchOutlined />} size="large" style={{ borderRadius: 999, height: 46, paddingInline: 20, fontWeight: 600 }}>
                  Tra cứu công khai
                </Button>
              </Link>
            </Space>
          </div>

          <Card style={{ borderRadius: 28, boxShadow: '0 24px 80px rgba(5, 24, 53, 0.32)', border: '1px solid rgba(255,255,255,0.5)' }} bodyStyle={{ padding: 36 }}>
            <div style={{ marginBottom: 28 }}>
              <Title level={2} style={{ margin: 0, color: '#0f2644', fontWeight: 800, fontSize: 34 }}>
                Đăng nhập
              </Title>
              <Text style={{ color: '#64748b', fontSize: 15 }}>
                Nhập thông tin tài khoản để truy cập hệ thống.
              </Text>
            </div>

            {loginMutation.isError && (
              <Alert
                message={(loginMutation.error as any)?.response?.data?.message || 'Email hoặc mật khẩu không đúng'}
                type="error"
                showIcon
                style={{ marginBottom: 20, borderRadius: 12 }}
              />
            )}

            <Form form={form} layout="vertical" onFinish={(values) => loginMutation.mutate(values)} size="large">
              <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Vui lòng nhập email' }, { type: 'email', message: 'Email không hợp lệ' }]} style={{ marginBottom: 20 }}>
                <Input prefix={<UserOutlined style={{ color: '#94a3b8' }} />} placeholder="Nhập địa chỉ email" style={{ borderRadius: 14, height: 52 }} />
              </Form.Item>
              <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]} style={{ marginBottom: 14 }}>
                <Input.Password prefix={<LockOutlined style={{ color: '#94a3b8' }} />} placeholder="Nhập mật khẩu" style={{ borderRadius: 14, height: 52 }} />
              </Form.Item>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 22 }}>
                <Button type="link" style={{ padding: 0 }} onClick={() => setRegisterOpen(true)}>Tạo tài khoản</Button>
                <Button type="link" style={{ padding: 0 }} onClick={() => { setForgotOpen(true); setResetStep(false) }}>Quên mật khẩu?</Button>
              </div>

              <Button type="primary" htmlType="submit" block loading={loginMutation.isPending} icon={<LoginOutlined />} style={{ height: 52, borderRadius: 16, fontSize: 17, fontWeight: 700 }}>
                Đăng nhập
              </Button>
            </Form>
          </Card>
        </div>
      </div>

      <Modal title="Tạo tài khoản moi" open={registerOpen} onCancel={() => setRegisterOpen(false)} footer={null}>
        <Form form={registerForm} layout="vertical" onFinish={(values) => registerMutation.mutate(values)}>
          <Form.Item name="full_name" label="Họ và tên" rules={[{ required: true, message: 'Nhập họ tên' }]}>
            <Input prefix={<UserOutlined />} />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Email không hợp lệ' }]}>
            <Input prefix={<MailOutlined />} />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại" rules={[{ required: true, pattern: /^\d{10,11}$/, message: 'Số điện thoại không hợp lệ' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, min: 6, message: 'Mật khẩu it nhat 6 ky tu' }]}>
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>
          <Form.Item name="confirm" label="Nhập lại mật khẩu" dependencies={['password']} rules={[
            { required: true, message: 'Nhập lại mật khẩu' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) return Promise.resolve()
                return Promise.reject(new Error('Mật khẩu nhap lai khong khop'))
              },
            }),
          ]}>
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={registerMutation.isPending}>Đăng ký</Button>
        </Form>
      </Modal>

      <Modal title="Quen mat khau" open={forgotOpen} onCancel={() => setForgotOpen(false)} footer={null}>
        <Form form={forgotForm} layout="vertical" onFinish={(values) => {
          if (!resetStep) forgotMutation.mutate(values.email)
          else resetMutation.mutate(values)
        }}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Email không hợp lệ' }]}>
            <Input prefix={<MailOutlined />} disabled={resetStep} />
          </Form.Item>
          {resetStep && (
            <>
              <Form.Item name="code" label="Mã xác nhận" rules={[{ required: true, message: 'Nhập mã xác nhận' }]}>
                <Input maxLength={6} />
              </Form.Item>
              <Form.Item name="newPassword" label="Mật khẩu moi" rules={[{ required: true, min: 6, message: 'Mật khẩu it nhat 6 ky tu' }]}>
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>
            </>
          )}
          <Button type="primary" htmlType="submit" block loading={forgotMutation.isPending || resetMutation.isPending}>
            {resetStep ? 'Đặt lại mật khẩu' : 'Gửi mã xác nhận'}
          </Button>
        </Form>
      </Modal>
    </div>
  )
}
