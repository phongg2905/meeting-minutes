import dayjs from 'dayjs'

export const formatDate = (date?: string) =>
  date ? dayjs(date).format('DD/MM/YYYY') : '-'

export const formatDateTime = (date?: string) =>
  date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-'

export const formatTime = (time?: any) => {
  if (!time) return '-'
  if (typeof time === 'string' && /^\d{2}:\d{2}/.test(time)) return time.slice(0, 5)
  const isoTime = typeof time === 'string' ? time.match(/T(\d{2}:\d{2})/) : null
  if (isoTime) return isoTime[1]
  return dayjs(time).format('HH:mm')
}

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Đang chỉnh sửa',
  completed: 'Hoàn tất',
}

export const STATUS_COLORS: Record<string, string> = {
  draft: 'warning',
  completed: 'success',
}

export const TASK_STATUS_LABELS: Record<string, string> = {
  pending: 'Chưa xong',
  in_progress: 'Đang làm',
  done: 'Hoàn thành',
  overdue: 'Quá hạn',
}

export const TASK_STATUS_COLORS: Record<string, string> = {
  pending: 'warning',
  in_progress: 'processing',
  done: 'success',
  overdue: 'error',
}

export const ATTENDANCE_LABELS: Record<string, string> = {
  present: 'Có mặt',
  absent: 'Vắng mặt',
  late: 'Đến trễ',
}

export const isAdmin = (roleId?: number) => roleId === 1
export const isMinuteManager = (roleId?: number) => roleId === 1 || roleId === 2
export const canWriteMinutes = (roleId?: number) => roleId === 1 || roleId === 2
export const canManageMinute = (roleId?: number, userId?: number, createdBy?: number) =>
  roleId === 1 || (roleId === 2 && userId === createdBy)
