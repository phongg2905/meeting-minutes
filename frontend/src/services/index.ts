import api, { publicApi } from './api'

export const authService = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then(r => r.data),
  register: (data: any) => api.post('/auth/register', data).then(r => r.data),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }).then(r => r.data),
  resetPassword: (data: any) => api.post('/auth/reset-password', data).then(r => r.data),
  getMe: () => api.get('/auth/me').then(r => r.data),
  changePassword: (oldPassword: string, newPassword: string) =>
    api.patch('/auth/change-password', { oldPassword, newPassword }).then(r => r.data),
}

export const usersService = {
  getAll: (params?: any) => api.get('/users', { params }).then(r => r.data),
  getOne: (id: number) => api.get(`/users/${id}`).then(r => r.data),
  create: (data: any) => api.post('/users', data).then(r => r.data),
  update: (id: number, data: any) => api.patch(`/users/${id}`, data).then(r => r.data),
  updateMe: (data: any) => api.patch('/users/me', data).then(r => r.data),
  updateStatus: (id: number, status: string) =>
    api.patch(`/users/${id}/status`, { status }).then(r => r.data),
  remove: (id: number) => api.delete(`/users/${id}`).then(r => r.data),
}

export const rolesService = {
  getAll: () => api.get('/roles').then(r => r.data),
}

export const minuteTypesService = {
  getAll: () => api.get('/minute-types').then(r => r.data),
}

export const meetingMinutesService = {
  getAll: (params?: any) => api.get('/meeting-minutes', { params }).then(r => r.data),
  getOne: (id: number) => api.get(`/meeting-minutes/${id}`).then(r => r.data),
  create: (data: any) => api.post('/meeting-minutes', data).then(r => r.data),
  update: (id: number, data: any) => api.patch(`/meeting-minutes/${id}`, data).then(r => r.data),
  updateStatus: (id: number, status: string, review_note?: string) =>
    api.patch(`/meeting-minutes/${id}/status`, { status, review_note }).then(r => r.data),
  updatePublic: (id: number, is_public: boolean) =>
    api.patch(`/meeting-minutes/${id}/public`, { is_public }).then(r => r.data),
  remove: (id: number) => api.delete(`/meeting-minutes/${id}`).then(r => r.data),
}

export const publicMeetingMinutesService = {
  getAll: (params?: any) => publicApi.get('/public/meeting-minutes', { params }).then(r => r.data),
  getOne: (id: number) => publicApi.get(`/public/meeting-minutes/${id}`).then(r => r.data),
}

export const minuteTasksService = {
  getByMinute: (minuteId: number) =>
    api.get(`/minute-tasks/minute/${minuteId}`).then(r => r.data),
  create: (minuteId: number, data: any) =>
    api.post(`/minute-tasks/minute/${minuteId}`, data).then(r => r.data),
  update: (id: number, data: any) =>
    api.patch(`/minute-tasks/${id}`, data).then(r => r.data),
  remove: (id: number) => api.delete(`/minute-tasks/${id}`).then(r => r.data),
}

export const minuteParticipantsService = {
  getByMinute: (minuteId: number) =>
    api.get(`/minute-participants/minute/${minuteId}`).then(r => r.data),
  create: (minuteId: number, data: any) =>
    api.post(`/minute-participants/minute/${minuteId}`, data).then(r => r.data),
  update: (id: number, data: any) =>
    api.patch(`/minute-participants/${id}`, data).then(r => r.data),
  remove: (id: number) =>
    api.delete(`/minute-participants/${id}`).then(r => r.data),
}

export const minuteAttachmentsService = {
  getByMinute: (minuteId: number) =>
    api.get(`/minute-attachments/minute/${minuteId}`).then(r => r.data),
  upload: (minuteId: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/minute-attachments/minute/${minuteId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
  download: async (id: number, fileName: string) => {
    const response = await api.get(`/minute-attachments/${id}/download`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },
  remove: (id: number) => api.delete(`/minute-attachments/${id}`).then(r => r.data),
}

export const activityLogsService = {
  getAll: (params?: any) => api.get('/activity-logs', { params }).then(r => r.data),
}

export const notificationsService = {
  getAll: (limit = 20) => api.get('/notifications', { params: { limit } }).then(r => r.data),
  unreadCount: () => api.get('/notifications/unread-count').then(r => r.data),
  markAsRead: (id: number) => api.patch(`/notifications/${id}/read`).then(r => r.data),
  markAllAsRead: () => api.patch('/notifications/read-all').then(r => r.data),
}

export const backupLogsService = {
  getAll: (params?: any) => api.get('/backup-logs', { params }).then(r => r.data),
  create: (data: any) => api.post('/backup-logs', data).then(r => r.data),
  run: () => api.post('/backup-logs/run').then(r => r.data),
  restore: (backup_id: number, confirmation = 'RESTORE') =>
    api.post('/backup-logs/restore', { backup_id, confirmation }, { timeout: 300000 }).then(r => r.data),
  remove: (backup_id: number) => api.delete(`/backup-logs/${backup_id}`).then(r => r.data),
}

export const supportRequestsService = {
  getAll: (params?: any) => api.get('/support-requests', { params }).then(r => r.data),
  create: (data: any) => api.post('/support-requests', data).then(r => r.data),
  update: (id: number, data: any) => api.patch(`/support-requests/${id}`, data).then(r => r.data),
}

export const healthService = {
  get: () => api.get('/health').then(r => r.data),
}

export const managerRoleRequestsService = {
  getAll: () => api.get('/manager-role-requests').then(r => r.data),
  getPending: () => api.get('/manager-role-requests/pending').then(r => r.data),
  getHistory: () => api.get('/manager-role-requests/history').then(r => r.data),
  getOne: (id: number) => api.get(`/manager-role-requests/${id}`).then(r => r.data),
  create: (data: any) => api.post('/manager-role-requests', data).then(r => r.data),
  review: (id: number, data: any) => api.patch(`/manager-role-requests/${id}/review`, data).then(r => r.data),
}
