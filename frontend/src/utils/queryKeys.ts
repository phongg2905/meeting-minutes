/**
 * Query key factory — chuẩn hoá tất cả query keys
 * để tận dụng cache và prefetch giữa các page.
 */
export const queryKeys = {
  // ─── Auth ───
  auth: {
    me: ['auth', 'me'] as const,
  },

  // ─── Users ───
  users: {
    all: ['users'] as const,
    list: (params?: Record<string, any>) => ['users', 'list', params] as const,
    roles: ['roles'] as const,
  },

  // ─── Meeting Minutes ───
  meetings: {
    all: ['meeting-minutes'] as const,
    list: (userId?: number, params?: Record<string, any>) =>
      ['meeting-minutes', 'list', userId, params] as const,
    dashboard: (userId?: number) =>
      ['meeting-minutes', 'dashboard', userId] as const,
    detail: (id: number) => ['meeting-minute', id] as const,
    print: (id: number) => ['meeting-minute-print', id] as const,
    types: ['minute-types'] as const,
  },

  // ─── Public Meetings ───
  publicMeetings: {
    list: (params?: Record<string, any>) =>
      ['public-meetings', 'list', params] as const,
    detail: (id: number) => ['public-meeting', id] as const,
    print: (id: number) => ['public-meeting-print', id] as const,
  },

  // ─── Admin ───
  activityLogs: {
    list: (params?: Record<string, any>) =>
      ['activity-logs', 'list', params] as const,
  },
  backupLogs: {
    list: (params?: Record<string, any>) =>
      ['backup-logs', 'list', params] as const,
    status: ['backup-logs-status'] as const,
  },
  health: ['health'] as const,

  // ─── Manager Role Requests ───
  managerRoleRequests: {
    all: ['manager-role-requests'] as const,
    pending: ['manager-role-requests', 'pending'] as const,
    history: ['manager-role-requests', 'history'] as const,
  },

  // ─── Support ───
  supportTickets: {
    list: (params?: Record<string, any>) =>
      ['support-tickets', 'list', params] as const,
    detail: (id: number) => ['support-ticket-detail', id] as const,
  },
  supportRequests: {
    list: (params?: Record<string, any>) =>
      ['support-requests', 'list', params] as const,
  },

  // ─── Notifications ───
  notifications: {
    all: (limit?: number) => ['notifications', limit] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
  },
} as const

/**
 * Giữ dữ liệu cũ khi đang fetch lại (tránh skeleton flash).
 * Sử dụng: placeholderData: keepPreviousDataPlaceholder
 */
export function keepPreviousDataPlaceholder<T>(previousData: T | undefined): T | undefined {
  return previousData
}
