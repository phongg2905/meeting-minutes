import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Layout, Menu, Avatar, Dropdown, Button, Typography, Badge, Space, Empty, List } from 'antd'
import {
  DashboardOutlined, FileTextOutlined, PlusOutlined, UserOutlined,
  LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, TeamOutlined,
  AuditOutlined, SettingOutlined, BellOutlined, KeyOutlined, DatabaseOutlined,
  CustomerServiceOutlined, MonitorOutlined
} from '@ant-design/icons'
import { useAuthStore } from '../../store/authStore'
import { canWriteMinutes, formatDateTime, isAdmin } from '../../utils'
import { notificationsService } from '../../services'
import { Notification } from '../../types'

const { Header, Sider, Content } = Layout
const { Text } = Typography

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const notificationQueryKey = ['notifications', user?.user_id]
  const unreadQueryKey = ['notifications-unread-count', user?.user_id]

  const { data: notifications = [] } = useQuery({
    queryKey: notificationQueryKey,
    queryFn: () => notificationsService.getAll(20),
    refetchInterval: 30000,
  })

  const { data: unreadData } = useQuery({
    queryKey: unreadQueryKey,
    queryFn: notificationsService.unreadCount,
    refetchInterval: 30000,
  })

  const markAsReadMutation = useMutation({
    mutationFn: notificationsService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationQueryKey })
      queryClient.invalidateQueries({ queryKey: unreadQueryKey })
    },
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: notificationsService.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationQueryKey })
      queryClient.invalidateQueries({ queryKey: unreadQueryKey })
    },
  })

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Tổng quan' },
    {
      key: 'meetings',
      icon: <FileTextOutlined />,
      label: 'Biên bản họp',
      children: [
        { key: '/meetings', icon: <FileTextOutlined />, label: 'Danh sách' },
        ...(canWriteMinutes(user?.role_id) ? [
          { key: '/meetings/create', icon: <PlusOutlined />, label: 'Tạo mới' },
        ] : []),
      ],
    },
    ...(!canWriteMinutes(user?.role_id) ? [
      { key: '/manager-request', icon: <TeamOutlined />, label: 'Đăng ký quản lý' },
    ] : []),
    { key: '/support', icon: <CustomerServiceOutlined />, label: 'Hỗ trợ' },
    ...(isAdmin(user?.role_id) ? [
      {
        key: 'admin',
        icon: <SettingOutlined />,
        label: 'Quản trị',
        children: [
          { key: '/admin/users', icon: <TeamOutlined />, label: 'Người dùng' },
          { key: '/admin/manager-requests', icon: <TeamOutlined />, label: 'Duyệt quản lý' },
          { key: '/admin/activity-logs', icon: <AuditOutlined />, label: 'Nhật ký hoạt động' },
          { key: '/admin/backup-logs', icon: <DatabaseOutlined />, label: 'Lịch sử backup' },
          { key: '/admin/health', icon: <MonitorOutlined />, label: 'Giám sát hệ thống' },
        ],
      },
    ] : []),
  ]

  const userMenuItems = [
    { key: 'profile', icon: <UserOutlined />, label: 'Thông tin cá nhân' },
    { key: 'change-password', icon: <KeyOutlined />, label: 'Đổi mật khẩu' },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', danger: true },
  ]

  const handleUserMenu = ({ key }: { key: string }) => {
    if (key === 'logout') {
      queryClient.clear()
      logout()
      navigate('/login')
      return
    }
    if (key === 'profile' || key === 'change-password') {
      navigate('/profile')
    }
  }

  const getNotificationPath = (notification: Notification) => {
    if (notification.target_table === 'meeting_minutes' && notification.target_id) return `/meetings/${notification.target_id}`
    if (notification.target_table === 'support_requests') return '/support'
    if (notification.target_table === 'manager_role_requests') {
      return isAdmin(user?.role_id) ? '/admin/manager-requests' : '/manager-request'
    }
    return '/dashboard'
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) markAsReadMutation.mutate(notification.notification_id)
    navigate(getNotificationPath(notification))
  }

  const notificationPanel = (
    <div style={{ width: 360, maxWidth: 'calc(100vw - 32px)', background: '#fff', borderRadius: 8, boxShadow: '0 8px 24px rgba(15,38,68,0.14)' }}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #edf2f7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text strong>Thông báo</Text>
        <Button
          type="link"
          size="small"
          disabled={!unreadData?.count}
          loading={markAllAsReadMutation.isPending}
          onClick={() => markAllAsReadMutation.mutate()}
        >
          Đánh dấu đã đọc
        </Button>
      </div>
      {notifications.length ? (
        <List
          dataSource={notifications}
          style={{ maxHeight: 420, overflow: 'auto' }}
          renderItem={(item: Notification) => (
            <List.Item
              onClick={() => handleNotificationClick(item)}
              style={{
                cursor: 'pointer',
                padding: '12px 14px',
                background: item.is_read ? '#fff' : '#eff6ff',
              }}
            >
              <List.Item.Meta
                title={<Text strong={!item.is_read}>{item.title}</Text>}
                description={(
                  <div>
                    <div style={{ color: '#475569', marginBottom: 4 }}>{item.message}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>{formatDateTime(item.created_at)}</Text>
                  </div>
                )}
              />
            </List.Item>
          )}
        />
      ) : (
        <div style={{ padding: 24 }}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thông báo" />
        </div>
      )}
    </div>
  )

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={240}
        theme="dark"
        style={{
          background: '#0f2644',
          boxShadow: '2px 0 12px rgba(0,0,0,0.15)',
          position: 'fixed',
          height: '100vh',
          left: 0,
          top: 0,
          zIndex: 100,
          overflow: 'auto',
        }}
      >
        <div style={{
          padding: collapsed ? '20px 12px' : '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #3b82f6, #1a56a0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, fontSize: 14, fontWeight: 700, color: '#fff',
          }}>BB</div>
          {!collapsed && (
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>Biên bản họp</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>Quản lý lớp học</div>
            </div>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['meetings', 'admin']}
          items={menuItems}
          onClick={({ key }) => {
            if (key === 'meetings' || key === 'admin') return
            navigate(key)
          }}
          style={{ background: 'transparent', border: 'none', marginTop: 8 }}
        />

        {!collapsed && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '16px', borderTop: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar size={32} style={{ background: '#1a56a0', flexShrink: 0 }}>
                {user?.full_name?.[0]?.toUpperCase()}
              </Avatar>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ color: '#fff', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.full_name}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>
                  {user?.role?.role_name}
                </div>
              </div>
            </div>
          </div>
        )}
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: 'margin 0.2s' }}>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
          position: 'sticky', top: 0, zIndex: 99,
          height: 64,
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16, color: '#0f2644' }}
          />

          <Space size={12}>
            <Dropdown popupRender={() => notificationPanel} trigger={['click']} placement="bottomRight">
              <Badge count={unreadData?.count || 0} size="small">
                <Button type="text" aria-label="Thông báo" icon={<BellOutlined style={{ fontSize: 18 }} />} />
              </Badge>
            </Dropdown>

            <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenu }} placement="bottomRight">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 8px', borderRadius: 8 }}>
                <Avatar size={34} style={{ background: '#1a56a0' }}>
                  {user?.full_name?.[0]?.toUpperCase()}
                </Avatar>
                <div style={{ lineHeight: 1.2 }}>
                  <Text strong style={{ fontSize: 13, display: 'block' }}>{user?.full_name}</Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>{user?.role?.role_name}</Text>
                </div>
              </div>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ padding: 24, minHeight: 'calc(100vh - 64px)' }}>
          <div className="fade-in">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
