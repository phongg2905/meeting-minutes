import {
  Breadcrumb, Card, Tag, Button, Spin, Typography, Descriptions, Table, Tabs, Space, Popconfirm, message, Empty, Divider
} from 'antd'
import {
  HomeOutlined, EditOutlined, DeleteOutlined, ArrowLeftOutlined,
  UserOutlined, CheckSquareOutlined, PaperClipOutlined, InfoCircleOutlined, PrinterOutlined, UploadOutlined, DownloadOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { keepPreviousDataPlaceholder } from '../../utils/queryKeys'
import { useNavigate, useParams } from 'react-router-dom'
import type React from 'react'
import { useRef, useState } from 'react'
import { meetingMinutesService, minuteAttachmentsService } from '../../services'
import { useAuthStore } from '../../store/authStore'
import {
  formatDate, formatTime, formatDateTime,
  STATUS_LABELS, STATUS_COLORS,
  TASK_STATUS_LABELS, TASK_STATUS_COLORS,
  ATTENDANCE_LABELS, canWriteMinutes, isAdmin
} from '../../utils'
import MeetingMinuteDocumentView from '../../components/meeting/MeetingMinuteDocumentView'
import { STRUCTURED_TEMPLATE_SECTIONS, type TemplateField } from '../../utils/minuteTemplates'
import { DetailSkeleton } from '../../components/common'

const { Title, Text, Paragraph } = Typography

function hasTemplateValue(value: any, field: TemplateField) {
  if (value === undefined || value === null || value === '') return false
  if (field.type === 'table') {
    return Array.isArray(value) && value.some((row) => (
      field.columns || []
    ).some((column) => row?.[column.name] !== undefined && row?.[column.name] !== null && row?.[column.name] !== ''))
  }
  return true
}

function renderTemplateField(field: TemplateField, data: Record<string, any>) {
  const value = data?.[field.name]
  if (!hasTemplateValue(value, field)) return null

  if (field.type === 'table' && Array.isArray(value)) {
    const rows = value
      .filter((row) => (field.columns || []).some((column) => row?.[column.name]))
      .map((row, index) => ({ key: index, ...row }))

    return (
      <div key={field.name} style={{ marginBottom: 16 }}>
        <Text strong style={{ display: 'block', marginBottom: 8, color: 'var(--color-text)' }}>{field.label}</Text>
        <Table
          bordered
          size="small"
          pagination={false}
          dataSource={rows}
          columns={(field.columns || []).map((column) => ({
            title: column.label,
            dataIndex: column.name,
            key: column.name,
            render: (cell: any) => cell || '—',
          }))}
          scroll={{ x: 640 }}
        />
      </div>
    )
  }

  return (
    <div key={field.name} style={{ marginBottom: 16 }}>
      <Text strong style={{ display: 'block', marginBottom: 6, color: 'var(--color-text)' }}>{field.label}</Text>
      <Paragraph style={{ background: 'var(--color-surface-muted)', padding: '12px 16px', borderRadius: 8, margin: 0, whiteSpace: 'pre-wrap' }}>
        {String(value)}
      </Paragraph>
    </div>
  )
}

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const { data: minute, isLoading } = useQuery({
    queryKey: ['meeting-minute', id],
    queryFn: () => meetingMinutesService.getOne(Number(id)),
    enabled: !!id,
    placeholderData: keepPreviousDataPlaceholder,
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

  if (isLoading) return <DetailSkeleton />
  if (!minute) return (
    <div style={{ padding: 48 }}>
      <Empty description="Không tìm thấy biên bản" />
    </div>
  )

  const canEdit = canWriteMinutes(user?.role_id) && (isAdmin(user?.role_id) || minute.created_by === user?.user_id)
  const structuredSections = STRUCTURED_TEMPLATE_SECTIONS[minute.type_id] || []
  const templateData = minute.template_data || {}

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
        return <Tag color={colors[status] || 'default'} style={{ borderRadius: 6 }}>{ATTENDANCE_LABELS[status] || status}</Tag>
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
      render: (status: string) => <Tag color={TASK_STATUS_COLORS[status]} style={{ borderRadius: 6 }}>{TASK_STATUS_LABELS[status] || status}</Tag>,
    },
  ]

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    uploadAttachmentMutation.mutate(file)
    event.target.value = ''
  }

  const handleExportPdf = () => {
    window.open(`/meetings/${id}/print`, '_blank')
  }

  const tabItems = [
    {
      key: 'info',
      label: <span><InfoCircleOutlined /> Thông tin</span>,
      children: (
        <div>
          <Descriptions
            bordered
            column={{ xs: 1, sm: 2, md: 3 }}
            size="small"
            style={{ marginBottom: 24 }}
          >
            <Descriptions.Item label="Mã biên bản">
              <Text strong style={{ color: 'var(--color-primary)' }}>{minute.minute_code}</Text>
            </Descriptions.Item>
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
            <Card size="small" style={{ marginBottom: 12, borderRadius: 10, background: 'var(--color-success-bg)', border: 'none' }}>
              <Text strong>Thành phần có mặt:</Text>
              <Paragraph style={{ margin: '4px 0 0' }}>{minute.attendee_summary}</Paragraph>
            </Card>
          )}
          {minute.absentee_summary && (
            <Card size="small" style={{ marginBottom: 12, borderRadius: 10, background: 'var(--color-warning-bg)', border: 'none' }}>
              <Text strong>Thành phần vắng mặt:</Text>
              <Paragraph style={{ margin: '4px 0 0' }}>{minute.absentee_summary}</Paragraph>
            </Card>
          )}

          <Divider orientation="left" style={{ fontSize: 14, color: 'var(--color-text)' }}>Nội dung theo cấu trúc biểu mẫu</Divider>
          {minute.purpose && (
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 6, color: 'var(--color-text)' }}>Mục đích:</Text>
              <Paragraph style={{ background: 'var(--color-surface-muted)', padding: '12px 16px', borderRadius: 8, margin: 0 }}>{minute.purpose}</Paragraph>
            </div>
          )}
          {structuredSections.length ? (
            structuredSections.map((section) => {
              const fields = section.fields
                .map((field) => renderTemplateField(field, templateData))
                .filter(Boolean)

              if (!fields.length) return null

              return (
                <div key={section.title} style={{ marginBottom: 20 }}>
                  <Divider orientation="left" style={{ marginTop: 8, fontSize: 14, color: 'var(--color-text)' }}>
                    {section.title}
                  </Divider>
                  {fields}
                </div>
              )
            })
          ) : (
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 6, color: 'var(--color-text)' }}>Nội dung:</Text>
              <Paragraph style={{ background: 'var(--color-surface-muted)', padding: '12px 16px', borderRadius: 8, margin: 0, whiteSpace: 'pre-wrap' }}>{minute.discussion_content}</Paragraph>
            </div>
          )}
          {minute.conclusion_content && (
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 6, color: 'var(--color-text)' }}>Kết luận / ý kiến góp ý:</Text>
              <Paragraph style={{ background: 'var(--color-success-bg)', padding: '12px 16px', borderRadius: 8, margin: 0, whiteSpace: 'pre-wrap' }}>{minute.conclusion_content}</Paragraph>
            </div>
          )}
          {minute.followup_summary && (
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6, color: 'var(--color-text)' }}>Theo dõi tiếp / kiến nghị:</Text>
              <Paragraph style={{ background: 'var(--color-warning-bg)', padding: '12px 16px', borderRadius: 8, margin: 0, whiteSpace: 'pre-wrap' }}>{minute.followup_summary}</Paragraph>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'document',
      label: <span><FileTextOutlined /> Biểu mẫu</span>,
      children: (
        <MeetingMinuteDocumentView minute={minute} typeName={minute.minute_type?.type_name} />
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
              <Button
                icon={<UploadOutlined />}
                onClick={() => fileInputRef.current?.click()}
                loading={uploadAttachmentMutation.isPending}
                style={{ borderRadius: 10, fontWeight: 600 }}
              >
                Tải tệp lên
              </Button>
            </div>
          )}

          {minute.attachments?.length ? minute.attachments.map((att: any) => (
            <Card
              key={att.attachment_id}
              size="small"
              style={{ borderRadius: 12, border: '1px solid var(--color-border-light)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <Text strong style={{ color: 'var(--color-text)' }}>{att.file_name}</Text>
                  <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                    {att.file_type || 'unknown'} — {att.uploader?.full_name} — {formatDateTime(att.uploaded_at)}
                  </div>
                </div>
                <Space>
                  <Button
                    icon={<DownloadOutlined />}
                    size="small"
                    onClick={() => minuteAttachmentsService.download(att.attachment_id, att.file_name)}
                    style={{ borderRadius: 8 }}
                  >
                    Tải xuống
                  </Button>
                  {canEdit && (
                    <Popconfirm
                      title="Xóa tệp đính kèm này?"
                      onConfirm={() => deleteAttachmentMutation.mutate(att.attachment_id)}
                      okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
                    >
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        size="small"
                        loading={deleteAttachmentMutation.isPending}
                        style={{ borderRadius: 8 }}
                      />
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
          { title: <span onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}><HomeOutlined style={{ color: 'var(--color-text-secondary)' }} /></span> },
          { title: <span onClick={() => navigate('/meetings')} style={{ cursor: 'pointer' }}>Biên bản họp</span> },
          { title: minute.minute_code },
        ]}
      />

      {/* Header Card */}
      <Card
        style={{
          marginBottom: 16,
          borderRadius: 16,
          border: '1px solid var(--color-border-light)',
        }}
        bodyStyle={{ padding: '18px 20px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <Tag color="blue" style={{ borderRadius: 6, fontWeight: 700 }}>
                {minute.minute_code}
              </Tag>
              <Tag color={STATUS_COLORS[minute.status] || 'default'} style={{ borderRadius: 6 }}>
                {STATUS_LABELS[minute.status] || minute.status}
              </Tag>
              <Tag color={minute.is_public ? 'success' : 'default'} style={{ borderRadius: 6 }}>
                {minute.is_public ? 'Công khai' : 'Nội bộ'}
              </Tag>
              <Tag color="purple" style={{ borderRadius: 6 }}>
                {minute.minute_type?.type_name}
              </Tag>
            </div>
            <Title level={4} style={{ margin: '0 0 6px', color: 'var(--color-text)' }}>{minute.title}</Title>
            <Space size={16} wrap style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
              <span>Lớp: <strong style={{ color: 'var(--color-text)' }}>{minute.class_name}</strong></span>
              <span>{formatDate(minute.meeting_date)}</span>
              <span>{formatTime(minute.start_time)} - {formatTime(minute.end_time)}</span>
              {minute.location && <span>{minute.location}</span>}
            </Space>
          </div>

          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/meetings')}
              style={{ borderRadius: 10 }}
            >
              Quay lại
            </Button>
            <Button
              icon={<PrinterOutlined />}
              onClick={handleExportPdf}
              style={{ borderRadius: 10 }}
            >
              Xuất PDF
            </Button>
            {canEdit && (
              <>
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/meetings/${id}/edit`)}
                  style={{ borderRadius: 10, fontWeight: 600 }}
                >
                  Chỉnh sửa
                </Button>
                <Popconfirm
                  title="Xóa biên bản này?"
                  description="Hành động này không thể hoàn tác"
                  onConfirm={() => deleteMutation.mutate()}
                  okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
                >
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    loading={deleteMutation.isPending}
                    style={{ borderRadius: 10 }}
                  />
                </Popconfirm>
              </>
            )}
          </Space>
        </div>
      </Card>

      {/* Content Tabs */}
      <Card
        style={{
          borderRadius: 16,
          border: '1px solid var(--color-border-light)',
        }}
      >
        <Tabs items={tabItems} defaultActiveKey="document" />
      </Card>
    </div>
  )
}
