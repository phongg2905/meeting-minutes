export interface Role {
  role_id: number
  role_name: string
}

export interface User {
  user_id: number
  role_id: number
  full_name: string
  email: string
  phone?: string
  status: string
  created_at: string
  role: Role
}

export interface MinuteType {
  type_id: number
  type_name: string
}

export interface MinuteTask {
  task_id: number
  minute_id: number
  task_content: string
  assigned_to?: string
  deadline?: string
  task_status: string
}

export interface MinuteParticipant {
  participant_id: number
  minute_id: number
  full_name: string
  role_in_meeting?: string
  attendance_status: string
}

export interface MinuteAttachment {
  attachment_id: number
  minute_id: number
  file_name: string
  file_type?: string
  uploaded_by?: number
  is_public_safe?: boolean
  public_scan_status?: string
  uploaded_at: string
  uploader?: { user_id?: number; full_name: string }
}

export interface MeetingMinute {
  minute_id: number
  minute_code: string
  type_id: number
  created_by: number
  title: string
  class_name: string
  meeting_date: string
  start_time: string
  end_time: string
  location?: string
  meeting_form?: string
  host_name?: string
  secretary_name?: string
  attendee_summary?: string
  absentee_summary?: string
  purpose?: string
  discussion_content: string
  conclusion_content?: string
  followup_summary?: string
  template_data?: Record<string, any>
  status: string
  reviewed_by?: number
  reviewed_at?: string
  review_note?: string
  created_at: string
  updated_at?: string
  is_public: boolean
  published_at?: string
  minute_type?: MinuteType
  creator?: { user_id: number; full_name: string }
  tasks?: MinuteTask[]
  participants?: MinuteParticipant[]
  attachments?: MinuteAttachment[]
  _count?: { tasks: number; participants: number; attachments: number }
}

export interface ActivityLog {
  log_id: number
  user_id: number
  action_name: string
  target_table?: string
  target_id?: number
  action_detail?: string
  created_at: string
  user?: { full_name: string; email: string }
}

export interface Notification {
  notification_id: number
  user_id: number
  title: string
  message: string
  type: string
  target_table?: string
  target_id?: number
  is_read: boolean
  created_at: string
  read_at?: string
}

export interface SupportRequest {
  request_id: number
  requested_by?: number
  title: string
  content: string
  status: string
  response?: string
  handled_by?: number
  created_at: string
  updated_at?: string
  requester?: { user_id: number; full_name: string; email: string }
  handler?: { user_id: number; full_name: string; email: string }
}

export interface SupportTicket {
  ticket_id: number
  requested_by?: number
  title: string
  content: string
  category?: string
  status: 'PENDING' | 'PROCESSING' | 'WAITING_FOR_USER' | 'COMPLETED'
  response?: string
  resolution?: string
  assigned_admin?: number
  handled_by?: number
  resolved_by?: number
  resolved_at?: string
  last_message_at?: string
  created_at: string
  updated_at?: string
  requester?: { user_id: number; full_name: string; email: string }
  handler?: { user_id: number; full_name: string; email: string }
  assignee?: { user_id: number; full_name: string; email: string }
  resolver?: { user_id: number; full_name: string; email: string }
  messages?: SupportMessage[]
  _count?: { messages: number }
}

export interface SupportMessage {
  message_id: number
  ticket_id: number
  sender_id: number
  sender_type: 'USER' | 'ADMIN'
  content: string
  created_at: string
  sender?: { user_id: number; full_name: string; email: string }
  attachments?: SupportAttachment[]
}

export interface SupportAttachment {
  attachment_id: number
  message_id: number
  file_name: string
  file_path: string
  file_type?: string
  file_size?: number
  uploaded_by?: number
  created_at: string
}

export interface ManagerRoleRequest {
  request_id: number
  user_id: number
  reason?: string
  status: string
  response?: string
  reviewed_by?: number
  created_at: string
  updated_at?: string
  user?: User
  reviewer?: { user_id: number; full_name: string; email: string }
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface DashboardSummary {
  stats: {
    total: number
    public: number
    private: number
    editing: number
  }
  recentMinutes: MeetingMinute[]
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (token: string, user: User) => void
  logout: () => void
  setUser: (user: User) => void
}
