import { useMemo, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Avatar, Tooltip } from 'antd'
import { keepPreviousDataPlaceholder, queryKeys } from '../../utils/queryKeys'
import { notificationsService } from '../../services'
import SidebarBadge from '../common/SidebarBadge'
import {
  DashboardOutlined,
  FileTextOutlined,
  PlusOutlined,
  TeamOutlined,
  SettingOutlined,
  AuditOutlined,
  DatabaseOutlined,
  MonitorOutlined,
  CustomerServiceOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../../store/authStore'
import { canWriteMinutes, isAdmin } from '../../utils'
import {
  meetingMinutesService,
  minuteTypesService,
  usersService,
  rolesService,
  activityLogsService,
  backupLogsService,
  healthService,
  managerRoleRequestsService,
  supportTicketsService,
} from '../../services'

interface AppSidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen?: boolean
  onMobileClose?: () => void
}

type SidebarNavItem = {
  id: string
  key: string
  href?: string
  match?: 'exact' | 'prefix'
  defaultHref?: string
  selectable?: boolean
  icon: ReactNode
  label: string
  groupId?: string
  children?: SidebarNavItem[]
}

function normalizePath(path: string) {
  if (!path) return '/'

  const withoutQuery = path.split('?')[0]
  const withoutHash = withoutQuery.split('#')[0]
  const trimmed = withoutHash.replace(/\/+$/, '')

  return trimmed || '/'
}

function isRouteActive(currentPath: string, itemPath?: string, exact = true) {
  if (!itemPath) return false

  const current = normalizePath(currentPath)
  const target = normalizePath(itemPath)

  if (exact) {
    return current === target
  }

  return current === target || current.startsWith(`${target}/`)
}

function matchMenuItem(pathname: string, item: SidebarNavItem) {
  if (!item.href) return false

  if (item.match === 'prefix') {
    return isRouteActive(pathname, item.href, false)
  }

  return isRouteActive(pathname, item.href, true)
}

function flattenVisibleItems(items: SidebarNavItem[]): SidebarNavItem[] {
  return items.flatMap((item) => {
    const children = flattenVisibleItems(item.children ?? [])
    return [...(item.selectable !== false && item.href ? [item] : []), ...children]
  })
}

function findActiveMenuItem(pathname: string, items: SidebarNavItem[]) {
  const matches = flattenVisibleItems(items)
    .filter((item) => matchMenuItem(pathname, item))
    .sort((a, b) => (b.href?.length ?? 0) - (a.href?.length ?? 0))

  return matches[0] ?? null
}

export default function AppSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: AppSidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  // Khởi tạo state từ pathname hiện tại để tự động mở nhóm tương ứng
  // khi người dùng tải trực tiếp một route con
  // ─── Sidebar summary ───
  const { data: summary, isError: summaryError } = useQuery({
    queryKey: queryKeys.notifications.sidebarSummary(),
    queryFn: notificationsService.sidebarSummary,
    enabled: !!user?.user_id,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousDataPlaceholder,
    retry: 2,
  })

  // Compute badge counts — silent fail = no badges
  const summaryAvailable = !summaryError && !!summary
  const badgeCounts = useMemo(() => {
    if (!summaryAvailable) return {}

    const meetingsBadge = (summary.meetings?.unread ?? 0) + (summary.meetings?.pending ?? 0)
    const supportBadge = (summary.support?.unread ?? 0) + (summary.support?.pending ?? 0)

    const adminChildren: Record<string, number | { dot: boolean }> = {}
    let adminTotal = 0
    if (summary.admin) {
      if (summary.admin.managerRequests > 0) {
        adminChildren['admin-approvals'] = summary.admin.managerRequests
        adminTotal += summary.admin.managerRequests
      }
      if (summary.admin.systemAlerts > 0) {
        // Giám sát: hiển thị số lỗi (severity error), không double-count
        adminChildren['admin-monitoring'] = summary.admin.systemAlerts
        adminTotal += summary.admin.systemAlerts
        // Nhật ký: hiển thị chấm đỏ nếu có lỗi (không cộng vào tổng)
        adminChildren['admin-logs'] = { dot: true }
      }
      if (summary.admin.backupErrors > 0) {
        adminChildren['admin-backup'] = summary.admin.backupErrors
        adminTotal += summary.admin.backupErrors
      }
    }

    return {
      'meetings-group': meetingsBadge > 0 ? meetingsBadge : undefined,
      'meetings-list': meetingsBadge > 0 ? meetingsBadge : undefined,
      'support': supportBadge > 0 ? supportBadge : undefined,
      'admin-group': adminTotal > 0 ? adminTotal : undefined,
      ...adminChildren,
    }
  }, [summary, summaryAvailable])

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const path = location.pathname
    return {
      'meetings-group': path.startsWith('/meetings') || path.startsWith('/meeting'),
      'admin-group': path.startsWith('/admin'),
    }
  })

  const menuItems = useMemo<SidebarNavItem[]>(() => [
    { id: 'dashboard', key: '/dashboard', href: '/dashboard', icon: <DashboardOutlined />, label: 'Tổng quan', selectable: true },
    {
      id: 'meetings-group',
      key: 'meetings-group',
      href: '/meetings',
      defaultHref: '/meetings',
      groupId: 'meetings',
      icon: <FileTextOutlined />,
      label: 'Biên bản họp',
      selectable: false,
      children: [
        { id: 'meetings-list', key: '/meetings', href: '/meetings', match: 'prefix' as const, icon: <FileTextOutlined />, label: 'Danh sách biên bản', selectable: true },
        { id: 'meetings-mine', key: '/meetings/mine', href: '/meetings/mine', icon: <FileTextOutlined />, label: 'Biên bản của tôi', selectable: true },
        ...(canWriteMinutes(user?.role_id) ? [{ id: 'meetings-create', key: '/meetings/create', href: '/meetings/create', icon: <PlusOutlined />, label: 'Tạo mới', selectable: true }] : []),
      ],
    },
    ...(!canWriteMinutes(user?.role_id) ? [{ id: 'manager-request', key: '/manager-request', href: '/manager-request', icon: <TeamOutlined />, label: 'Đăng ký quản lý', selectable: true }] : []),
    { id: 'support', key: '/support', href: '/support', icon: <CustomerServiceOutlined />, label: 'Hỗ trợ', selectable: true },
    ...(isAdmin(user?.role_id)
      ? [
        {
          id: 'admin-group',
          key: 'admin-group',
          href: '/admin/users',
          defaultHref: '/admin/users',
          groupId: 'administration',
          icon: <SettingOutlined />,
          label: 'Quản trị',
          selectable: false,
          children: [
            { id: 'admin-users', key: '/admin/users', href: '/admin/users', match: 'prefix' as const, icon: <TeamOutlined />, label: 'Người dùng', selectable: true },
            { id: 'admin-approvals', key: '/admin/manager-requests', href: '/admin/manager-requests', icon: <AuditOutlined />, label: 'Duyệt quản lý', selectable: true },
            { id: 'admin-logs', key: '/admin/activity-logs', href: '/admin/activity-logs', icon: <AuditOutlined />, label: 'Nhật ký', selectable: true },
            { id: 'admin-backup', key: '/admin/backup-logs', href: '/admin/backup-logs', icon: <DatabaseOutlined />, label: 'Backup', selectable: true },
            { id: 'admin-monitoring', key: '/admin/health', href: '/admin/health', icon: <MonitorOutlined />, label: 'Giám sát', selectable: true },
          ],
        },
      ]
      : []),
  ], [user?.role_id])

  const activeItem = useMemo(() => findActiveMenuItem(location.pathname, menuItems), [location.pathname, menuItems])

  /**
   * Xử lý click vào item menu:
   * - Nếu item có children (nhóm): chỉ toggle mở/đóng, KHÔNG điều hướng
   * - Nếu item không có children (mục đơn): chỉ điều hướng, KHÔNG toggle
   */
  const handleNavClick = (item: SidebarNavItem) => {
    if (item.children && !collapsed) {
      // Nhóm menu: chỉ toggle, không điều hướng
      setExpandedGroups((previous) => ({ ...previous, [item.id]: !previous[item.id] }))
    } else {
      // Mục đơn: chỉ điều hướng
      const targetPath = item.defaultHref ?? item.href ?? item.key
      if (targetPath) {
        navigate(targetPath)
      }
    }
    onMobileClose?.()
  }

  /**
   * Prefetch API data khi hover vào menu item — dùng đúng query key hiện tại
   * của page đích để cache được tận dụng ngay khi click.
   */
  const handleNavHover = useCallback((item: SidebarNavItem) => {
    if (item.children || collapsed) return

    const path = item.defaultHref ?? item.href ?? ''

    switch (true) {
      case path === '/dashboard':
        if (user) {
          queryClient.prefetchQuery({
            queryKey: queryKeys.meetings.dashboard(user.user_id),
            queryFn: () => meetingMinutesService.getDashboard(),
            staleTime: 60000,
          })
        }
        break

      case path === '/meetings' || path.startsWith('/meetings'):
        queryClient.prefetchQuery({
          queryKey: ['meeting-minutes', user?.user_id, 'all', { page: 1, limit: 10 }],
          queryFn: () => meetingMinutesService.getAll({ page: 1, limit: 10 }),
          staleTime: 60000,
        })
        if (path === '/meetings/mine') {
          queryClient.prefetchQuery({
            queryKey: ['meeting-minutes', user?.user_id, 'mine', { page: 1, limit: 10, mine: 'true' }],
            queryFn: () => meetingMinutesService.getAll({ page: 1, limit: 10, mine: 'true' }),
            staleTime: 60000,
          })
        }
        queryClient.prefetchQuery({
          queryKey: ['minute-types'],
          queryFn: () => minuteTypesService.getAll(),
          staleTime: 5 * 60 * 1000,
        })
        break

      case path === '/admin/users':
        queryClient.prefetchQuery({
          queryKey: ['users', { page: 1, limit: 10 }],
          queryFn: () => usersService.getAll({ page: 1, limit: 10 }),
          staleTime: 60000,
        })
        queryClient.prefetchQuery({
          queryKey: ['roles'],
          queryFn: () => rolesService.getAll(),
          staleTime: 5 * 60 * 1000,
        })
        break

      case path === '/admin/manager-requests':
        queryClient.prefetchQuery({
          queryKey: ['manager-role-requests', 'pending'],
          queryFn: () => managerRoleRequestsService.getPending(),
          staleTime: 60000,
        })
        break

      case path === '/admin/activity-logs':
        queryClient.prefetchQuery({
          queryKey: ['activity-logs', { page: 1, limit: 10 }],
          queryFn: () => activityLogsService.getAll({ page: 1, limit: 10 }),
          staleTime: 60000,
        })
        break

      case path === '/admin/backup-logs':
        queryClient.prefetchQuery({
          queryKey: ['backup-logs', { page: 1, limit: 10 }],
          queryFn: () => backupLogsService.getAll({ page: 1, limit: 10 }),
          staleTime: 60000,
        })
        break

      case path === '/admin/health':
        queryClient.prefetchQuery({
          queryKey: ['health'],
          queryFn: () => healthService.get(),
          staleTime: 60000,
        })
        break

      case path === '/support':
        queryClient.prefetchQuery({
          queryKey: ['support-tickets', { page: 1, limit: 10 }],
          queryFn: () => supportTicketsService.getAll({ page: 1, limit: 10 }),
          staleTime: 60000,
        })
        break
    }
  }, [queryClient, collapsed, user])

  const sidebarWidth = collapsed ? 88 : 280

  const renderNavItem = (item: SidebarNavItem, depth = 0) => {
    const isActive = item.id === activeItem?.id
    const isChildActive = item.children?.some((child) => child.id === activeItem?.id)
    // Chỉ dùng state để quyết định mở/đóng, không dùng isChildActive
    // để người dùng có thể đóng thủ công dù đang ở route con
    const isExpanded = Boolean(expandedGroups[item.id])

    const button = (
      <button
        type="button"
        onClick={() => handleNavClick(item)}
        onMouseEnter={() => handleNavHover(item)}
        style={{
          width: collapsed ? 48 : '100%',
          minHeight: 48,
          border: 'none',
          background: isActive ? 'var(--color-primary-light)' : 'transparent',
          color: isActive ? 'var(--color-primary)' : isChildActive ? 'var(--color-text)' : 'var(--color-text-secondary)',
          borderRadius: 14,
          padding: collapsed ? 0 : '10px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: collapsed ? 0 : 12,
          cursor: 'pointer',
          transition: 'background var(--transition-fast), color var(--transition-fast)',
          marginLeft: depth > 0 ? 10 : 0,
          marginBottom: 4,
          overflow: 'hidden',
          textAlign: 'left',
        }}
        title={collapsed ? item.label : undefined}
      >
        <span
          style={{
            width: 20,
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {item.icon}
        </span>
        {!collapsed && (
          <span
            style={{
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: 13,
              fontWeight: isActive || isChildActive ? 700 : 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.label}
            </span>
            {badgeCounts[item.id] != null && (
              <SidebarBadge
                count={typeof badgeCounts[item.id] === 'object' ? (badgeCounts[item.id] as any).dot ? undefined : (badgeCounts[item.id] as any).count : badgeCounts[item.id] as number | undefined}
                dot={typeof badgeCounts[item.id] === 'object' ? (badgeCounts[item.id] as any).dot : false}
                severity={item.id === 'admin-monitoring' || item.id === 'admin-logs' ? 'error' : item.id === 'admin-backup' || item.id === 'admin-approvals' ? 'warning' : 'info'}
                label={`${item.label}: ${typeof badgeCounts[item.id] === 'object' ? 'có cảnh báo' : badgeCounts[item.id] + ' thông báo'}`}
              />
            )}
          </span>
        )}
        {!collapsed && item.children && (
          <RightOutlined
            style={{
              fontSize: 12,
              flexShrink: 0,
              transform: isExpanded ? 'rotate(90deg)' : undefined,
              transition: 'transform var(--transition-fast)',
            }}
          />
        )}
      </button>
    )

    return (
      <div key={item.id} style={{ width: '100%' }}>
        {collapsed ? (
          <Tooltip title={item.label} placement="right">
            {button}
          </Tooltip>
        ) : (
          button
        )}
        {!collapsed && item.children && isExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2, paddingLeft: 8 }}>
            {item.children.map((child) => renderNavItem(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const sidebarContent = (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border-light)',
        overflowX: 'hidden',
      }}
    >
      <div
        style={{
          height: 88,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: collapsed ? 0 : 12,
          padding: collapsed ? '0 8px' : '0 16px',
          borderBottom: '1px solid var(--color-border-light)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: 15,
            fontWeight: 800,
            color: '#fff',
            boxShadow: '0 2px 10px rgba(37, 99, 235, 0.25)',
          }}
        >
          BB
        </div>
        {!collapsed && (
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div style={{ color: 'var(--color-text)', fontWeight: 700, fontSize: 15, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Biên bản họp
            </div>
            <div style={{ color: 'var(--color-text-tertiary)', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Quản lý lớp học
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '10px 8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {menuItems.map((item) => renderNavItem(item))}
        </div>
      </div>

      <div style={{ marginTop: 'auto', flexShrink: 0, borderTop: '1px solid var(--color-border-light)' }}>
        {!collapsed && user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' }}>
            <Avatar size={36} style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)', flexShrink: 0, fontSize: 14, fontWeight: 700 }}>
              {user.full_name?.[0]?.toUpperCase()}
            </Avatar>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div style={{ color: 'var(--color-text)', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.full_name}
              </div>
              <div style={{ color: 'var(--color-text-tertiary)', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.role?.role_name}
              </div>
            </div>
          </div>
        )}
        {collapsed && user && (
          <Tooltip title={user.full_name} placement="right">
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
              <Avatar size={34} style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)', fontSize: 14, fontWeight: 700 }}>
                {user.full_name?.[0]?.toUpperCase()}
              </Avatar>
            </div>
          </Tooltip>
        )}
      </div>
    </div>
  )

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          width: sidebarWidth,
          zIndex: 100,
          transition: 'width var(--transition-base)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: collapsed ? 'none' : '1px 0 0 var(--color-border-light)',
        }}
        className="sidebar-desktop"
      >
        {sidebarContent}
      </div>

      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={onMobileClose} />
          <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 280, background: 'var(--color-surface)', boxShadow: 'var(--shadow-xl)', overflow: 'hidden' }}>
            {sidebarContent}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 1023px) {
          .sidebar-desktop { display: none !important; }
        }
        @media (min-width: 1024px) {
          .sidebar-desktop { display: flex !important; }
        }
      `}</style>
    </>
  )
}
