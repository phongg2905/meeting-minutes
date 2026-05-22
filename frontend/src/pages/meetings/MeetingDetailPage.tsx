import {
  Breadcrumb, Card, Tag, Button, Spin, Typography, Descriptions, Table, Tabs, Space, Popconfirm, message, Empty, Divider
} from 'antd'
import {
  HomeOutlined, EditOutlined, DeleteOutlined, ArrowLeftOutlined,
  UserOutlined, CheckSquareOutlined, PaperClipOutlined, InfoCircleOutlined, PrinterOutlined, UploadOutlined, DownloadOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import type React from 'react'
import { meetingMinutesService, minuteAttachmentsService } from '../../services'
import { useAuthStore } from '../../store/authStore'
import {
  formatDate, formatTime, formatDateTime,
  STATUS_LABELS, STATUS_COLORS,
  TASK_STATUS_LABELS, TASK_STATUS_COLORS,
  ATTENDANCE_LABELS, canWriteMinutes, isAdmin
} from '../../utils'
import { useRef } from 'react'
import { exportElementToPdf } from '../../utils/exportPdf'
import MinuteDocumentPreview from '../../components/meeting/MinuteDocumentPreview'

const { Title, Text, Paragraph } = Typography

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const exportRef = useRef<HTMLDivElement | null>(null)

  const { data: minute, isLoading } = useQuery({
    queryKey: ['meeting-minute', id],
    queryFn: () => meetingMinutesService.getOne(Number(id)),
    enabled: !!id,
  })

  const deleteMutation = useMutation({
    mutationFn: () => meetingMinutesService.remove(Number(id)),
    onSuccess: () => {
      message.success('Đã xóa biên bản')
      queryClient.invalidateQueries({ queryKey: ['meeting-minutes'] })
      navigate('/meetings')
    },
  })

  const uploadAttachmentMutation = useMutation({
    mutationFn: (file: File) => minuteAttachmentsService.upload(Number(id), file),
    onSuccess: () => {
      message.success('Tải tệp lên thành công')
      queryClient.invalidateQueries({ queryKey: ['meeting-minute', id] })
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Không thể tải tệp lên')
    },
  })

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: number) => minuteAttachmentsService.remove(attachmentId),
    onSuccess: () => {
      message.success('Đã xóa tệp đính kèm')
      queryClient.invalidateQueries({ queryKey: ['meeting-minute', id] })
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Không thể xóa tệp đính kèm')
    },
  })

  if (isLoading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
  if (!minute) return <Empty description="Không tìm thấy biên bản" />

  const canEdit = canWriteMinutes(user?.role_id) && (isAdmin(user?.role_id) || minute.created_by === user?.user_id)

  const participantColumns = [
    { title: '#', key: 'index', width: 50, render: (_: any, __: any, i: number) => i + 1 },
    { title: 'Họ và tên', dataIndex: 'full_name', key: 'full_name', render: (name: string) => <Text strong>{name}</Text> },
    { title: 'Vai trò', dataIndex: 'role_in_meeting', key: 'role_in_meeting', render: (role: string) => role || '—' },
    {
      title: 'Tình trạng',
      dataIndex: 'attendance_status',
      key: 'attendance_status',
      render: (status: string) => {
        const colors: Record<string, string> = { present: 'success', absent: 'error', late: 'warning' }
        return <Tag color={colors[status] || 'default'}>{ATTENDANCE_LABELS[status] || status}</Tag>
      },
    },
  ]

  const taskColumns = [
    { title: '#', key: 'index', width: 50, render: (_: any, __: any, i: number) => i + 1 },
    { title: 'Nội dung nhiệm vụ', dataIndex: 'task_content', key: 'task_content' },
    { title: 'Người phụ trách', dataIndex: 'assigned_to', key: 'assigned_to', render: (value: string) => value || '—' },
    { title: 'Hạn chót', dataIndex: 'deadline', key: 'deadline', render: (date: string) => formatDate(date) },
    {
      title: 'Trạng thái',
      dataIndex: 'task_status',
      key: 'task_status',
      render: (status: string) => <Tag color={TASK_STATUS_COLORS[status]}>{TASK_STATUS_LABELS[status] || status}</Tag>,
    },
  ]

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    uploadAttachmentMutation.mutate(file)
    event.target.value = ''
  }

  const handleExportPdf = async () => {
    if (!exportRef.current) return
    await exportElementToPdf(exportRef.current, `${minute.minute_code || 'meeting-minute'}.pdf`)
  }

  const tabItems = [
    {
      key: 'info',
      label: <span><InfoCircleOutlined /> Thông tin</span>,
      children: (
        <div>
          <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }} size="small" style={{ marginBottom: 24 }}>
            <Descriptions.Item label="Mã biên bản"><Text strong style={{ color: '#1a56a0' }}>{minute.minute_code}</Text></Descriptions.Item>
            <Descriptions.Item label="Loại biên bản">{minute.minute_type?.type_name}</Descriptions.Item>
            <Descriptions.Item label="Tên lớp">{minute.class_name}</Descriptions.Item>
            <Descriptions.Item label="Ngày họp">{formatDate(minute.meeting_date)}</Descriptions.Item>
            <Descriptions.Item label="Giờ bắt đầu">{formatTime(minute.start_time)}</Descriptions.Item>
            <Descriptions.Item label="Giờ kết thúc">{formatTime(minute.end_time)}</Descriptions.Item>
            <Descriptions.Item label="Địa điểm">{minute.location || '—'}</Descriptions.Item>
            <Descriptions.Item label="Hình thức họp">{minute.meeting_form || '—'}</Descriptions.Item>
            <Descriptions.Item label="Người tạo">{minute.creator?.full_name}</Descriptions.Item>
            <Descriptions.Item label="Chủ tọa">{minute.host_name || '—'}</Descriptions.Item>
            <Descriptions.Item label="Thư ký">{minute.secretary_name || '—'}</Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">{formatDateTime(minute.created_at)}</Descriptions.Item>
          </Descriptions>

          {minute.attendee_summary && (
            <Card size="small" style={{ marginBottom: 12, borderRadius: 8, background: '#f0fdf4' }}>
              <Text strong>Thành phần có mặt:</Text>
              <Paragraph style={{ margin: '4px 0 0' }}>{minute.attendee_summary}</Paragraph>
            </Card>
          )}
          {minute.absentee_summary && (
            <Card size="small" style={{ marginBottom: 12, borderRadius: 8, background: '#fef9c3' }}>
              <Text strong>Thành phần vắng mặt:</Text>
              <Paragraph style={{ margin: '4px 0 0' }}>{minute.absentee_summary}</Paragraph>
            </Card>
          )}

          <Divider orientation="left">Nội dung cuộc họp</Divider>
          {minute.purpose && (
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 6, color: '#0f2644' }}>Mục đích:</Text>
              <Paragraph style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 8, margin: 0 }}>{minute.purpose}</Paragraph>
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 6, color: '#0f2644' }}>Nội dung theo mẫu:</Text>
            <Paragraph style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 8, margin: 0, whiteSpace: 'pre-wrap' }}>{minute.discussion_content}</Paragraph>
          </div>
          {minute.conclusion_content && (
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 6, color: '#0f2644' }}>Kết luận / ý kiến góp ý:</Text>
              <Paragraph style={{ background: '#f0fdf4', padding: '12px 16px', borderRadius: 8, margin: 0, whiteSpace: 'pre-wrap' }}>{minute.conclusion_content}</Paragraph>
            </div>
          )}
          {minute.followup_summary && (
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6, color: '#0f2644' }}>Theo dõi tiếp / kiến nghị:</Text>
              <Paragraph style={{ background: '#fffbeb', padding: '12px 16px', borderRadius: 8, margin: 0, whiteSpace: 'pre-wrap' }}>{minute.followup_summary}</Paragraph>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'document',
      label: <span><FileTextOutlined /> Biểu mẫu</span>,
      children: (
        <div ref={exportRef}>
          <MinuteDocumentPreview minute={minute} typeName={minute.minute_type?.type_name} />
        </div>
      ),
    },
    {
      key: 'participants',
      label: <span><UserOutlined /> Tham dự ({minute.participants?.length || 0})</span>,
      children: <Table dataSource={minute.participants || []} columns={participantColumns} rowKey="participant_id" pagination={false} size="small" />,
    },
    {
      key: 'tasks',
      label: <span><CheckSquareOutlined /> Nhiệm vụ ({minute.tasks?.length || 0})</span>,
      children: <Table dataSource={minute.tasks || []} columns={taskColumns} rowKey="task_id" pagination={false} size="small" />,
    },
    {
      key: 'attachments',
      label: <span><PaperClipOutlined /> Tệp đính kèm ({minute.attachments?.length || 0})</span>,
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {canEdit && (
            <div>
              <input ref={fileInputRef} type="file" hidden onChange={handleFileChange} />
              <Button icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()} loading={uploadAttachmentMutation.isPending}>
                Tải tệp lên
              </Button>
            </div>
          )}

          {minute.attachments?.length ? minute.attachments.map((att: any) => (
            <Card key={att.attachment_id} size="small" style={{ borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <Text strong>{att.file_name}</Text>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    {att.file_type || 'unknown'} - {att.uploader?.full_name} - {formatDateTime(att.uploaded_at)}
                  </div>
                </div>
                <Space>
                  <Button icon={<DownloadOutlined />} onClick={() => minuteAttachmentsService.download(att.attachment_id, att.file_name)}>
                    Tải xuống
                  </Button>
                  {canEdit && (
                    <Popconfirm title="Xóa tệp đính kèm này?" onConfirm={() => deleteAttachmentMutation.mutate(att.attachment_id)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                      <Button danger icon={<DeleteOutlined />} loading={deleteAttachmentMutation.isPending}>
                        Xóa
                      </Button>
                    </Popconfirm>
                  )}
                </Space>
              </div>
            </Card>
          )) : <Empty description="Chưa có tệp đính kèm" />}
        </div>
      ),
    },
  ]

  return (
    <div>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { href: '/dashboard', title: <HomeOutlined /> },
          { href: '/meetings', title: 'Biên bản họp' },
          { title: minute.minute_code },
        ]}
      />

      <Card style={{ marginBottom: 16, borderRadius: 12, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <Tag color="blue">{minute.minute_code}</Tag>
              <Tag color={STATUS_COLORS[minute.status]}>{STATUS_LABELS[minute.status] || minute.status}</Tag>
              <Tag color={minute.is_public ? 'success' : 'default'}>{minute.is_public ? 'Công khai' : 'Nội bộ'}</Tag>
              <Tag color="purple">{minute.minute_type?.type_name}</Tag>
            </div>
            <Title level={4} style={{ margin: '0 0 6px', color: '#0f2644' }}>{minute.title}</Title>
            <Space size={16} wrap style={{ color: '#64748b', fontSize: 13 }}>
              <span>Lớp: <strong>{minute.class_name}</strong></span>
              <span>{formatDate(minute.meeting_date)}</span>
              <span>{formatTime(minute.start_time)} - {formatTime(minute.end_time)}</span>
              {minute.location && <span>{minute.location}</span>}
            </Space>
          </div>

          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/meetings')}>Quay lại</Button>
            <Button icon={<PrinterOutlined />} onClick={handleExportPdf}>Xuất PDF</Button>
            {canEdit && (
              <>
                <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/meetings/${id}/edit`)}>Chỉnh sửa</Button>
                <Popconfirm
                  title="Xóa biên bản này?"
                  description="Hành động này không thể hoàn tác"
                  onConfirm={() => deleteMutation.mutate()}
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger icon={<DeleteOutlined />} loading={deleteMutation.isPending}>Xóa</Button>
                </Popconfirm>
              </>
            )}
          </Space>
        </div>
      </Card>

      <Card style={{ borderRadius: 12, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <Tabs items={tabItems} defaultActiveKey="document" />
      </Card>
    </div>
  )
}
