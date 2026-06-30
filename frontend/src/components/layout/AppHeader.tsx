import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Layout, Button, Avatar, Dropdown, Typography, Badge, Space,
  Tooltip, Breadcrumb,
} from 'antd'
import {
  BellOutlined, UserOutlined, LogoutOutlined, KeyOutlined,
  MenuOutlined, HomeOutlined, SunOutlined, MoonOutlined,
  FileTextOutlined, PlusOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { keepPreviousDataPlaceholder, queryKeys } from '../../utils/queryKeys'
import { useAuthStore } from '../../store/authStore'
import { notificationsService } from '../../services'
import { canWriteMinutes, formatDateTime } from '../../utils'
import type { Notification } from '../../types'

const { Header } = Layout
const { Text } = Typography

interface AppHeaderProps {
  collapsed: boolean
  onToggleSidebar: () => void
  onMobileMenuOpen: () => void
  onToggleTheme: () => void
  isDark: boolean
}

// Breadcrumb path mapping
const BREADCRUMB_MAP: Record<string, { label: string; parent?: string }> = {
  '/dashboard': { label: 'Tổng quan' },
  '/meetings': { label: 'Biên bản họp', parent: 'Tổng quan' },
  '/meetings/create': { label: 'Tạo mới', parent: 'Biên bản họp' },
  '/support': { label: 'Hỗ trợ' },
  '/profile': { label: 'Thông tin cá nhân' },
  '/manager-request': { label: 'Đăng ký quản lý' },
  '/admin/users': { label: 'Người dùng', parent: 'Quản trị' },
  '/admin/manager-requests': { label: 'Duyệt quản lý', parent: 'Quản trị' },
  '/admin/activity-logs': { label: 'Nhật ký hoạt động', parent: 'Quản trị' },
  '/admin/backup-logs': { label: 'Lịch sử backup', parent: 'Quản trị' },
  '/admin/health': { label: 'Giám sát hệ thống', parent: 'Quản trị' },
}

function useBreadcrumb(pathname: string, navigate: (path: string) => void) {
  const config = BREADCRUMB_MAP[pathname]
  if (!config) return [{ title: 'Trang' }]

  const items: any[] = [
    {
      title: (
        <span onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
          <HomeOutlined />
        </span>
      ),
    },
  ]
  if (config.parent && config.parent !== 'Tổng quan') {
    items.push({ title: config.parent })
  }
  items.push({ title: config.label })
  return items
}

export default function AppHeader({
  collapsed,
  onToggleSidebar,
  onMobileMenuOpen,
  onToggleTheme,
  isDark,
}: AppHeaderProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { user, logout } = useAuthStore()
  const breadcrumbItems = useBreadcrumb(location.pathname, navigate)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const summaryQueryKey = queryKeys.notifications.sidebarSummary()
  const notificationQueryKey = queryKeys.notifications.all(20)

  const { data: summaryData } = useQuery({
    queryKey: summaryQueryKey,
    queryFn: notificationsService.sidebarSummary,
    enabled: !!user?.user_id,
    staleTime: 30_000,
    refetchInterval: 60_000,
    placeholderData: keepPreviousDataPlaceholder,
  })

  const { data: notifications = [], isFetching: isNotificationsFetching } = useQuery({
    queryKey: notificationQueryKey,
    queryFn: () => notificationsService.getAll(20),
    enabled: notificationsOpen && !!user?.user_id,
    staleTime: 30_000,
    placeholderData: keepPreviousDataPlaceholder,
  })

  const markAsReadMutation = useMutation({
    mutationFn: notificationsService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationQueryKey })
      queryClient.invalidateQueries({ queryKey: summaryQueryKey })
    },
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: notificationsService.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationQueryKey })
      queryClient.invalidateQueries({ queryKey: summaryQueryKey })
    },
  })

  const getNotificationPath = (notification: Notification) => {
    if (notification.target_table === 'meeting_minutes' && notification.target_id)
      return `/meetings/${notification.target_id}`
    if (notification.target_table === 'support_requests') return '/support'
    if (notification.target_table === 'manager_role_requests') {
      return user?.role_id === 1 ? '/admin/manager-requests' : '/manager-request'
    }
    return '/dashboard'
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) markAsReadMutation.mutate(notification.notification_id)
    navigate(getNotificationPath(notification))
  }

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Thông tin cá nhân',
    },
    {
      key: 'change-password',
      icon: <KeyOutlined />,
      label: 'Đổi mật khẩu',
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
    },
  ]

  const handleUserMenu = ({ key }: { key: string }) => {
    if (key === 'logout') {
      queryClient.clear()
      logout()
      navigate('/login')
      return
    }
    if (key === 'profile') {
      navigate('/profile')
      return
    }
    if (key === 'change-password') {
      navigate('/profile?tab=password')
    }
  }

  return (
    <Header
      style={{
        height: 64,
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border-light)',
        position: 'sticky',
        top: 0,
        zIndex: 99,
      }}
    >
      {/* Left side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
        <Button
          type="text"
          icon={<MenuOutlined />}
          onClick={onMobileMenuOpen}
          className="mobile-menu-btn"
          style={{ fontSize: 18, color: 'var(--color-text)' }}
        />

        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={onToggleSidebar}
          className="desktop-collapse-btn"
          style={{ fontSize: 18, color: 'var(--color-text)' }}
          aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
        />

        {/* Breadcrumb */}
        <Breadcrumb
          items={breadcrumbItems}
          style={{ fontSize: 13, flex: 1, minWidth: 0 }}
        />
      </div>

      {/* Right side */}
      <Space size={4} style={{ flexShrink: 0 }}>
        {/* Create Button */}
        {canWriteMinutes(user?.role_id) && location.pathname !== '/meetings/create' && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/meetings/create')}
            style={{
              borderRadius: 10,
              fontWeight: 600,
              height: 36,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
            className="header-create-btn"
          >
            <span className="create-btn-text">Tạo biên bản</span>
          </Button>
        )}

        {/* Theme Toggle */}
        <Tooltip title={isDark ? 'Chế độ sáng' : 'Chế độ tối'}>
          <Button
            type="text"
            icon={isDark ? <SunOutlined style={{ fontSize: 18 }} /> : <MoonOutlined style={{ fontSize: 18 }} />}
            onClick={onToggleTheme}
            style={{ color: 'var(--color-text-secondary)' }}
            aria-label="Chuyển đổi giao diện"
          />
        </Tooltip>

        {/* Notifications */}
        <Dropdown
          open={notificationsOpen}
          onOpenChange={setNotificationsOpen}
          popupRender={() => (
            <div
              style={{
                width: 380,
                maxWidth: 'calc(100vw - 32px)',
                borderRadius: 16,
                background: 'var(--color-surface-raised)',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--color-border-light)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--color-border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text strong style={{ fontSize: 15 }}>Thông báo</Text>
                <Button
                  type="link"
                  size="small"
                  disabled={!summaryData?.totalUnread}
                  loading={markAllAsReadMutation.isPending}
                  onClick={() => markAllAsReadMutation.mutate()}
                  style={{ fontSize: 12 }}
                >
                  Đánh dấu đã đọc
                </Button>
              </div>
              <div style={{ maxHeight: 420, overflow: 'auto' }}>
                {isNotificationsFetching && notifications.length === 0 ? (
                  <div
                    style={{
                      padding: 32,
                      textAlign: 'center',
                      color: 'var(--color-text-secondary)',
                      fontSize: 14,
                    }}
                  >
                    Đang tải thông báo
                  </div>
                ) : notifications.length > 0 ? (
                  notifications.map((item: Notification) => (
                    <div
                      key={item.notification_id}
                      onClick={() => handleNotificationClick(item)}
                      style={{
                        cursor: 'pointer',
                        padding: '12px 16px',
                        background: item.is_read ? 'transparent' : 'var(--color-primary-subtle)',
                        borderBottom: '1px solid var(--color-border-light)',
                        transition: 'background var(--transition-fast)',
                      }}
                      onMouseEnter={(e) => {
                        if (item.is_read) e.currentTarget.style.background = 'var(--color-surface-muted)'
                      }}
                      onMouseLeave={(e) => {
                        if (item.is_read) e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      <Text strong={!item.is_read} style={{ display: 'block', fontSize: 13, color: 'var(--color-text)' }}>
                        {item.title}
                      </Text>
                      <Text
                        style={{
                          display: 'block',
                          fontSize: 12,
                          color: 'var(--color-text-secondary)',
                          marginTop: 2,
                        }}
                      >
                        {item.message}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          color: 'var(--color-text-tertiary)',
                          marginTop: 4,
                          display: 'block',
                        }}
                      >
                        {formatDateTime(item.created_at)}
                      </Text>
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      padding: 32,
                      textAlign: 'center',
                      color: 'var(--color-text-secondary)',
                      fontSize: 14,
                    }}
                  >
                    Chưa có thông báo
                  </div>
                )}
              </div>
            </div>
          )}
          trigger={['click']}
          placement="bottomRight"
        >
          <Badge count={summaryData?.totalUnread || 0} size="small" offset={[-2, 2]}>
            <Button
              type="text"
              icon={<BellOutlined style={{ fontSize: 18 }} />}
              style={{ color: 'var(--color-text-secondary)' }}
              aria-label="Thông báo"
            />
          </Badge>
        </Dropdown>

        {/* User Menu */}
        <Dropdown
          menu={{ items: userMenuItems, onClick: handleUserMenu }}
          placement="bottomRight"
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 10,
              transition: 'background var(--transition-fast)',
              marginLeft: 4,
            }}
            className="header-user-btn"
          >
            <Avatar
              size={32}
              style={{
                background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {user?.full_name?.[0]?.toUpperCase()}
            </Avatar>
            <div style={{ lineHeight: 1.2 }} className="user-name-text">
              <Text
                strong
                style={{
                  fontSize: 13,
                  color: 'var(--color-text)',
                  display: 'block',
                }}
              >
                {user?.full_name}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: 'var(--color-text-tertiary)',
                  display: 'block',
                }}
              >
                {user?.role?.role_name}
              </Text>
            </div>
          </div>
        </Dropdown>
      </Space>

      <style>{`
        @media (max-width: 768px) {
          .desktop-collapse-btn { display: none !important; }
          .mobile-menu-btn { display: inline-flex !important; }
          .create-btn-text { display: none; }
          .user-name-text { display: none !important; }
          .header-create-btn { padding: 0 8px !important; }
        }
        @media (min-width: 769px) {
          .mobile-menu-btn { display: none !important; }
          .desktop-collapse-btn { display: inline-flex !important; }
        }
        .header-user-btn:hover {
          background: var(--color-surface-muted) !important;
        }
      `}</style>
    </Header>
  )
}
