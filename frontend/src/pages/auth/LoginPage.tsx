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
  const [otpStep, setOtpStep] = useState(false)
  const [otpEmail, setOtpEmail] = useState('')
  const [otpValue, setOtpValue] = useState('')

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
    onSuccess: (data) => {
      setOtpEmail(data.email)
      setOtpStep(true)
      message.success('Mã xác nhận đã được gửi đến email của bạn!')
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Không thể đăng ký'),
  })

  const verifyOtpMutation = useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) =>
      authService.verifyRegistrationOtp(email, code),
    onSuccess: () => {
      message.success('Xác thực email thành công! Bạn có thể đăng nhập ngay.')
      setRegisterOpen(false)
      setOtpStep(false)
      setOtpEmail('')
      setOtpValue('')
      registerForm.resetFields()
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Mã xác nhận không hợp lệ'),
  })

  const resendOtpMutation = useMutation({
    mutationFn: (email: string) => authService.resendRegistrationOtp(email),
    onSuccess: () => message.success('Mã xác nhận mới đã được gửi đến email của bạn!'),
    onError: (err: any) => message.error(err?.response?.data?.message || 'Không thể gửi lại mã'),
  })

  const forgotMutation = useMutation({
    mutationFn: (email: string) => authService.forgotPassword(email),
    onSuccess: () => {
      message.success('Mã xác nhận đã được gửi đến hộp thư.')
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
        background: 'linear-gradient(145deg, #0B1220 0%, #1a2a4a 55%, #2563EB 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative background elements */}
      <div style={{
        position: 'absolute', top: '-20%', right: '-10%', width: 400, height: 400,
        borderRadius: '50%', background: 'rgba(37, 99, 235, 0.1)',
        filter: 'blur(60px)',
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', left: '-5%', width: 300, height: 300,
        borderRadius: '50%', background: 'rgba(124, 58, 237, 0.08)',
        filter: 'blur(60px)',
      }} />

      <div style={{ width: '100%', maxWidth: 980, position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(360px, 440px)', gap: 24, alignItems: 'stretch' }}>
          {/* Left Panel - Branding */}
          <div style={{
            color: '#fff',
            padding: '40px 24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 28,
              fontSize: 28,
              fontWeight: 800,
              color: '#fff',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}>
              BB
            </div>
            <Title level={1} style={{
              color: '#fff', margin: 0, fontWeight: 800,
              fontSize: 44, lineHeight: 1.08, letterSpacing: '-0.5px',
            }}>
              Quản Lý<br />
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>Biên Bản Họp</span>
            </Title>
            <Text style={{
              color: 'rgba(255,255,255,0.65)',
              fontSize: 17,
              marginTop: 20,
              maxWidth: 420,
              lineHeight: 1.7,
            }}>
              Hệ thống hỗ trợ quản lý, tra cứu và theo dõi biên bản họp lớp
              một cách khoa học, minh bạch và tập trung.
            </Text>

            {/* Workflow illustration */}
            <div style={{
              marginTop: 32,
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}>
              {['Tạo', 'Duyệt', 'Lưu', 'Tra cứu'].map((step, i) => (
                <div key={step} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <div style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.8)',
                  }}>
                    {step}
                  </div>
                  {i < 3 && (
                    <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>→</div>
                  )}
                </div>
              ))}
            </div>

            <Space size={12} style={{ marginTop: 32, flexWrap: 'wrap' }}>
              <Link to="/public/meetings">
                <Button
                  icon={<SearchOutlined />}
                  size="large"
                  style={{
                    borderRadius: 999,
                    height: 46,
                    paddingInline: 24,
                    fontWeight: 700,
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff',
                    background: 'rgba(255,255,255,0.08)',
                  }}
                  className="public-search-btn"
                >
                  Tra cứu công khai
                </Button>
              </Link>
            </Space>
          </div>

          {/* Right Panel - Login Card */}
          <Card
            style={{
              borderRadius: 28,
              boxShadow: '0 24px 80px rgba(5, 24, 53, 0.32)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
            bodyStyle={{ padding: 36 }}
          >
            <div style={{ marginBottom: 28 }}>
              <Title level={2} style={{ margin: 0, color: 'var(--color-text)', fontWeight: 800, fontSize: 32 }}>
                Đăng nhập
              </Title>
              <Text style={{ color: 'var(--color-text-secondary)', fontSize: 15, marginTop: 6, display: 'block' }}>
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

            <Form
              form={form}
              layout="vertical"
              onFinish={(values) => loginMutation.mutate(values)}
              size="large"
            >
              <Form.Item
                name="email"
                label={<span style={{ fontWeight: 600, fontSize: 14 }}>Email</span>}
                rules={[{ required: true, message: 'Vui lòng nhập email' }]}
                style={{ marginBottom: 20 }}
              >
                <Input
                  prefix={<UserOutlined style={{ color: 'var(--color-text-tertiary)' }} />}
                  placeholder="Nhập địa chỉ email"
                  style={{ borderRadius: 14, height: 52 }}
                />
              </Form.Item>
              <Form.Item
                name="password"
                label={<span style={{ fontWeight: 600, fontSize: 14 }}>Mật khẩu</span>}
                rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
                style={{ marginBottom: 14 }}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: 'var(--color-text-tertiary)' }} />}
                  placeholder="Nhập mật khẩu"
                  style={{ borderRadius: 14, height: 52 }}
                />
              </Form.Item>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 22 }}>
                <Button
                  type="link"
                  style={{ padding: 0, fontWeight: 600 }}
                  onClick={() => setRegisterOpen(true)}
                >
                  Tạo tài khoản
                </Button>
                <Button
                  type="link"
                  style={{ padding: 0, fontWeight: 600 }}
                  onClick={() => { setForgotOpen(true); setResetStep(false) }}
                >
                  Quên mật khẩu?
                </Button>
              </div>

              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loginMutation.isPending}
                icon={<LoginOutlined />}
                style={{
                  height: 52,
                  borderRadius: 16,
                  fontSize: 17,
                  fontWeight: 700,
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                }}
              >
                Đăng nhập
              </Button>
            </Form>
          </Card>
        </div>
      </div>

      {/* Register Modal */}
      <Modal
        title={otpStep ? 'Xác thực email' : 'Tạo tài khoản mới'}
        open={registerOpen}
        onCancel={() => { setRegisterOpen(false); setOtpStep(false); setOtpEmail(''); setOtpValue('') }}
        footer={null}
        destroyOnClose
        width={480}
        style={{ borderRadius: 24 }}
      >
        {!otpStep ? (
          <Form form={registerForm} layout="vertical" onFinish={(values) => registerMutation.mutate(values)}>
            <Form.Item name="full_name" label="Họ và tên" rules={[{ required: true, message: 'Nhập họ tên' }]}>
              <Input prefix={<UserOutlined />} placeholder="Nguyễn Văn A" style={{ borderRadius: 12 }} />
            </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Email không hợp lệ' }]}>
              <Input prefix={<MailOutlined />} placeholder="email@school.edu.vn" style={{ borderRadius: 12 }} />
            </Form.Item>
            <Form.Item name="phone" label="Số điện thoại" rules={[{ required: true, pattern: /^\d{10,11}$/, message: 'Số điện thoại không hợp lệ' }]}>
              <Input placeholder="0900000000" style={{ borderRadius: 12 }} />
            </Form.Item>
            <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, min: 6, message: 'Mật khẩu ít nhất 6 ký tự' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" style={{ borderRadius: 12 }} />
            </Form.Item>
            <Form.Item name="confirm" label="Nhập lại mật khẩu" dependencies={['password']} rules={[
              { required: true, message: 'Nhập lại mật khẩu' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve()
                  return Promise.reject(new Error('Mật khẩu nhập lại không khớp'))
                },
              }),
            ]}>
              <Input.Password prefix={<LockOutlined />} placeholder="Nhập lại mật khẩu" style={{ borderRadius: 12 }} />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={registerMutation.isPending}
              style={{ height: 48, borderRadius: 14, fontWeight: 700, fontSize: 16 }}
            >
              Đăng ký
            </Button>
          </Form>
        ) : (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <Typography.Text style={{ display: 'block', marginBottom: 24, color: 'var(--color-text-secondary)', fontSize: 15 }}>
              Mã xác nhận đã được gửi đến <strong>{otpEmail}</strong>
            </Typography.Text>
            <Input.OTP
              length={6}
              size="large"
              style={{ marginBottom: 24 }}
              value={otpValue}
              onChange={(value) => {
                setOtpValue(value)
                if (value.length === 6) {
                  verifyOtpMutation.mutate({ email: otpEmail, code: value })
                }
              }}
            />
            <Button
              type="primary"
              block
              loading={verifyOtpMutation.isPending}
              disabled={otpValue.length !== 6}
              onClick={() => verifyOtpMutation.mutate({ email: otpEmail, code: otpValue })}
              style={{ height: 52, borderRadius: 14, fontSize: 16, fontWeight: 700 }}
            >
              Xác thực
            </Button>
            <div style={{ marginTop: 16 }}>
              <Button
                type="link"
                loading={resendOtpMutation.isPending}
                onClick={() => resendOtpMutation.mutate(otpEmail)}
                style={{ fontWeight: 600 }}
              >
                Gửi lại mã xác nhận
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Forgot Password Modal */}
      <Modal
        title="Quên mật khẩu"
        open={forgotOpen}
        onCancel={() => setForgotOpen(false)}
        footer={null}
        destroyOnClose
        width={440}
      >
        <Form form={forgotForm} layout="vertical" onFinish={(values) => {
          if (!resetStep) forgotMutation.mutate(values.email)
          else resetMutation.mutate(values)
        }}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Email không hợp lệ' }]}>
            <Input prefix={<MailOutlined />} disabled={resetStep} style={{ borderRadius: 12 }} />
          </Form.Item>
          {resetStep && (
            <>
              <Form.Item name="code" label="Mã xác nhận" rules={[{ required: true, message: 'Nhập mã xác nhận' }]}>
                <Input maxLength={6} style={{ borderRadius: 12 }} />
              </Form.Item>
              <Form.Item name="newPassword" label="Mật khẩu mới" rules={[{ required: true, min: 6, message: 'Mật khẩu ít nhất 6 ký tự' }]}>
                <Input.Password prefix={<LockOutlined />} style={{ borderRadius: 12 }} />
              </Form.Item>
            </>
          )}
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={forgotMutation.isPending || resetMutation.isPending}
            style={{ height: 48, borderRadius: 14, fontWeight: 700 }}
          >
            {resetStep ? 'Đặt lại mật khẩu' : 'Gửi mã xác nhận'}
          </Button>
        </Form>
      </Modal>
    </div>
  )
}
