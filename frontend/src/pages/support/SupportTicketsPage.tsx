import { useState } from 'react'
import { Button, Card, DatePicker, Form, Input, message, Modal, Select, Space, Table, Tag, Typography, Upload, Divider, Empty, Grid, Pagination, Skeleton } from 'antd'
import { PlusOutlined, SearchOutlined, SendOutlined, CheckCircleOutlined, InfoCircleOutlined, UploadOutlined, PaperClipOutlined, UserOutlined, CrownOutlined, ClockCircleOutlined, MessageOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { keepPreviousDataPlaceholder } from '../../utils/queryKeys'
import { supportTicketsService } from '../../services'
import { useAuthStore } from '../../store/authStore'
import { formatDateTime, isAdmin } from '../../utils'
import { TableRefreshIndicator, TableSkeleton } from '../../components/common'
import { SupportTicket, SupportMessage } from '../../types'

const { Text, Title, Paragraph } = Typography
const { TextArea } = Input
const { RangePicker } = DatePicker
const { useBreakpoint } = Grid

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: 'Chờ xử lý', color: 'gold', icon: <ClockCircleOutlined /> },
  PROCESSING: { label: 'Đang xử lý', color: 'processing', icon: <InfoCircleOutlined /> },
  WAITING_FOR_USER: { label: 'Chờ phản hồi', color: 'orange', icon: <UserOutlined /> },
  COMPLETED: { label: 'Hoàn tất', color: 'success', icon: <CheckCircleOutlined /> },
}

const CATEGORY_OPTIONS = [
  { value: 'kỹ thuật', label: 'Kỹ thuật' },
  { value: 'tài khoản', label: 'Tài khoản' },
  { value: 'dữ liệu', label: 'Dữ liệu' },
  { value: 'khác', label: 'Khác' },
]

export default function SupportTicketsPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [replyFiles, setReplyFiles] = useState<File[]>([])
  const [requestInfoModalOpen, setRequestInfoModalOpen] = useState(false)
  const [requestInfoContent, setRequestInfoContent] = useState('')
  const [completeModalOpen, setCompleteModalOpen] = useState(false)
  const [resolution, setResolution] = useState('')
  const [resolutionError, setResolutionError] = useState('')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>()
  const [categoryFilter, setCategoryFilter] = useState<string>()
  const [dateRange, setDateRange] = useState<any>(null)
  const [createForm] = Form.useForm()

  const admin = isAdmin(user?.role_id)
  const screens = useBreakpoint()
  const isMobile = !screens.md

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['support-tickets', { page, search, statusFilter, categoryFilter, dateRange }],
    queryFn: () => supportTicketsService.getAll({
      page,
      limit: 10,
      search: search || undefined,
      status: statusFilter,
      category: categoryFilter,
      date_from: dateRange?.[0]?.format('YYYY-MM-DD'),
      date_to: dateRange?.[1]?.format('YYYY-MM-DD'),
    }),
    placeholderData: keepPreviousDataPlaceholder,
  })
  const hasExistingData = (data?.data?.length ?? 0) > 0

  const { data: ticketDetail, refetch: refetchDetail } = useQuery({
    queryKey: ['support-ticket-detail', selectedTicket?.ticket_id],
    queryFn: () => supportTicketsService.getOne(selectedTicket!.ticket_id),
    enabled: !!selectedTicket,
    placeholderData: keepPreviousDataPlaceholder,
  })

  const createMutation = useMutation({
    mutationFn: supportTicketsService.create,
    onSuccess: () => {
      message.success('Đã gửi yêu cầu hỗ trợ')
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] })
      setCreateModalOpen(false)
      createForm.resetFields()
    },
  })

  const replyMutation = useMutation({
    mutationFn: ({ id, content, files }: { id: number; content: string; files?: File[] }) =>
      supportTicketsService.addMessage(id, { content }, files),
    onSuccess: () => {
      message.success('Đã gửi phản hồi')
      setReplyContent('')
      setReplyFiles([])
      refetchDetail()
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] })
    },
  })

  const requestInfoMutation = useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) =>
      supportTicketsService.requestMoreInfo(id, { content }),
    onSuccess: () => {
      message.success('Đã yêu cầu bổ sung thông tin')
      setRequestInfoModalOpen(false)
      setRequestInfoContent('')
      refetchDetail()
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] })
    },
  })

  // Helper: lấy message lỗi từ API
  const getApiErrorMessage = (error: unknown): string => {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosErr = error as any
      const msg = axiosErr.response?.data?.message
      if (Array.isArray(msg)) return msg.join(', ')
      if (typeof msg === 'string') return msg
    }
    return 'Không thể hoàn thành yêu cầu hỗ trợ. Vui lòng thử lại.'
  }

  const completeMutation = useMutation({
    mutationFn: ({ id, resolution }: { id: number; resolution: string }) =>
      supportTicketsService.complete(id, { resolution: resolution.trim() }),
    onSuccess: () => {
      message.success('Đã hoàn thành xử lý yêu cầu hỗ trợ.')
      setCompleteModalOpen(false)
      setResolution('')
      setResolutionError('')
      refetchDetail()
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] })
    },
    onError: (error: unknown) => {
      message.error(getApiErrorMessage(error))
    },
  })

  const openDetail = (ticket: SupportTicket) => {
    setSelectedTicket(ticket)
    setDetailModalOpen(true)
  }

  const handleCreate = (values: any) => {
    createMutation.mutate(values)
  }

  const handleReply = () => {
    if (!replyContent.trim()) {
      message.warning('Vui lòng nhập nội dung phản hồi')
      return
    }
    if (!selectedTicket) return
    replyMutation.mutate({
      id: selectedTicket.ticket_id,
      content: replyContent,
      files: replyFiles.length > 0 ? replyFiles : undefined,
    })
  }

  const handleRequestInfo = () => {
    if (!requestInfoContent.trim() || !selectedTicket) return
    requestInfoMutation.mutate({
      id: selectedTicket.ticket_id,
      content: requestInfoContent,
    })
  }

  const handleComplete = () => {
    if (!selectedTicket) {
      message.error('Không xác định được yêu cầu hỗ trợ.')
      return
    }
    const normalizedResult = resolution.trim()
    if (!normalizedResult) {
      setResolutionError('Vui lòng nhập nội dung kết quả xử lý.')
      return
    }
    setResolutionError('')
    completeMutation.mutate({
      id: selectedTicket.ticket_id,
      resolution: normalizedResult,
    })
  }

  const canSubmitComplete =
    resolution.trim().length > 0 && !completeMutation.isPending

  const columns = [
    {
      title: 'Yêu cầu',
      key: 'title',
      width: 420,
      render: (_: any, record: SupportTicket) => (
        <div style={{ minWidth: 0, width: '100%' }}>
          <div
            style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--color-text)', marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.45 }}
            onClick={() => openDetail(record)}
            title={record.title}
          >
            {record.title}
          </div>
          <div
            style={{ color: 'var(--color-text-secondary)', fontSize: 13, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
            title={record.content}
          >
            {record.content}
          </div>
          {record.category && (
            <div style={{ marginTop: 8 }}>
              <Tag style={{ borderRadius: 999, fontSize: 11, padding: '2px 8px' }}>{record.category}</Tag>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status: string) => {
        const cfg = STATUS_CONFIG[status] || { label: status, color: 'default', icon: null }
        return (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Tag icon={cfg.icon} color={cfg.color} style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 110 }}>
              {cfg.label}
            </Tag>
          </div>
        )
      },
    },
    {
      title: 'Tin nhắn',
      key: 'messages',
      width: 100,
      align: 'center' as const,
      render: (_: any, record: SupportTicket) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <MessageOutlined style={{ color: 'var(--color-text-tertiary)', fontSize: 14 }} />
          <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{record._count?.messages || 0}</span>
        </div>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 200,
      render: (value: string) => (
        <div style={{ whiteSpace: 'nowrap', color: 'var(--color-text-secondary)', fontSize: 13 }}>
          {formatDateTime(value)}
        </div>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 120,
      align: 'center' as const,
      render: (_: any, record: SupportTicket) => (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Button size="small" type="primary" ghost onClick={() => openDetail(record)} style={{ minWidth: 84, height: 38, borderRadius: 10 }}>
            Chi tiết
          </Button>
        </div>
      ),
    },
  ]

  const renderMessages = (messages?: SupportMessage[]) => {
    if (!messages?.length) {
      return <Empty description="Chưa có tin nhắn" />
    }
    return messages.map((msg) => {
      const isAdminMsg = msg.sender_type === 'ADMIN'
      return (
        <div key={msg.message_id} style={{
          display: 'flex',
          justifyContent: isAdminMsg ? 'flex-start' : 'flex-end',
          marginBottom: 12,
        }}>
          <div style={{
            maxWidth: '80%',
            background: isAdminMsg ? 'var(--color-primary-light)' : 'var(--color-success-bg)',
            borderRadius: 12,
            borderTopLeftRadius: isAdminMsg ? 4 : 12,
            borderTopRightRadius: isAdminMsg ? 12 : 4,
            padding: '10px 14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              {isAdminMsg ? (
                <CrownOutlined style={{ color: 'var(--color-warning)', fontSize: 13 }} />
              ) : (
                <UserOutlined style={{ color: 'var(--color-success)', fontSize: 13 }} />
              )}
              <Text strong style={{ fontSize: 12 }}>
                {msg.sender?.full_name || (isAdminMsg ? 'Admin' : 'Người dùng')}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {formatDateTime(msg.created_at)}
              </Text>
            </div>
            <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</Paragraph>
            {msg.attachments?.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {msg.attachments.map((att) => (
                  <Tag key={att.attachment_id} icon={<PaperClipOutlined />} color="blue">
                    {att.file_name}
                  </Tag>
                ))}
              </div>
            )}
          </div>
        </div>
      )
    })
  }

  const renderTableSkeleton = () => (
    <div style={{ padding: 8 }}>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} style={{ display: 'flex', gap: 12, padding: '12px 8px', borderBottom: index === 4 ? undefined : '1px solid var(--color-border-light)' }}>
          <div style={{ flex: '0 0 42%', minWidth: 0 }}>
            <Skeleton.Input active size="small" style={{ width: '85%', height: 16, marginBottom: 8 }} />
            <Skeleton.Input active size="small" style={{ width: '70%', height: 12, marginBottom: 8 }} />
            <Skeleton.Button active size="small" style={{ width: 56, height: 24, borderRadius: 999 }} />
          </div>
          <div style={{ flex: '0 0 15%' }}>
            <Skeleton.Button active size="small" style={{ width: 92, height: 28, borderRadius: 999 }} />
          </div>
          <div style={{ flex: '0 0 10%', display: 'flex', justifyContent: 'center' }}>
            <Skeleton.Input active size="small" style={{ width: 24, height: 16 }} />
          </div>
          <div style={{ flex: '0 0 20%' }}>
            <Skeleton.Input active size="small" style={{ width: '90%', height: 14 }} />
          </div>
          <div style={{ flex: '0 0 13%', display: 'flex', justifyContent: 'center' }}>
            <Skeleton.Button active size="small" style={{ width: 78, height: 36, borderRadius: 10 }} />
          </div>
        </div>
      ))}
    </div>
  )

  const renderDetailFooter = () => {
    if (!selectedTicket || !ticketDetail) return null

    const ticket = ticketDetail as SupportTicket

    // COMPLETED - chỉ xem, không có ô nhập
    if (ticket.status === 'COMPLETED') {
      return (
        <Card style={{ marginTop: 16, background: 'var(--color-success-bg)', border: '1px solid var(--color-success)' }}>
          <Space>
            <CheckCircleOutlined style={{ color: 'var(--color-success)', fontSize: 20 }} />
            <div>
              <Text strong style={{ color: 'var(--color-success)' }}>Đã xử lý xong</Text>
              {ticket.resolution && (
                <div style={{ marginTop: 4, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>
                  <Text type="secondary">Kết quả xử lý:</Text>
                  <Paragraph style={{ margin: '4px 0 0 0', whiteSpace: 'pre-wrap' }}>
                    {ticket.resolution}
                  </Paragraph>
                </div>
              )}
            </div>
          </Space>
        </Card>
      )
    }

    // Admin actions
    if (admin) {
      const isProcessing = ticket.status === 'PENDING' || ticket.status === 'PROCESSING'
      return (
        <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {isProcessing && (
            <>
              <Button
                icon={<InfoCircleOutlined />}
                onClick={() => setRequestInfoModalOpen(true)}
              >
                Yêu cầu bổ sung
              </Button>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => setCompleteModalOpen(true)}
              >
                Hoàn thành
              </Button>
            </>
          )}
        </div>
      )
    }

    // User reply (only when WAITING_FOR_USER)
    if (ticket.status === 'WAITING_FOR_USER') {
      return (
        <Card style={{ marginTop: 16, background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning)' }}>
          <Title level={5} style={{ marginTop: 0 }}>
            <InfoCircleOutlined style={{ color: 'var(--color-warning)', marginRight: 8 }} />
            Admin yêu cầu bổ sung thông tin
          </Title>
          <TextArea
            rows={4}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Nhập nội dung bổ sung..."
            style={{ marginBottom: 12 }}
          />
          <Upload
            multiple
            beforeUpload={(file) => {
              setReplyFiles((prev) => [...prev, file])
              return false
            }}
            onRemove={(file) => {
              setReplyFiles((prev) => prev.filter((f) => f.name !== file.name))
            }}
            fileList={replyFiles.map((f) => ({ uid: f.name, name: f.name, status: 'done' }))}
          >
            <Button icon={<UploadOutlined />} size="small" style={{ marginRight: 8 }}>
              Đính kèm file
            </Button>
          </Upload>
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={replyMutation.isPending}
              onClick={handleReply}
            >
              Gửi phản hồi
            </Button>
          </div>
        </Card>
      )
    }

    // PROCESSING or PENDING for user - just show info
    if (ticket.status === 'PROCESSING' || ticket.status === 'PENDING') {
      return (
        <Card style={{ marginTop: 16, background: 'var(--color-primary-light)', border: '1px solid var(--color-primary)' }}>
          <Text type="secondary">
            <InfoCircleOutlined style={{ marginRight: 6 }} />
            Yêu cầu của bạn đang được xử lý. Vui lòng chờ phản hồi từ Admin.
          </Text>
        </Card>
      )
    }

    return null
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Hỗ trợ</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
          Tạo yêu cầu
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Tìm tiêu đề, nội dung..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            allowClear
          />
          <Select
            placeholder="Trạng thái"
            value={statusFilter}
            onChange={(value) => { setStatusFilter(value); setPage(1) }}
            allowClear
            options={Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({
              value,
              label: cfg.label,
            }))}
          />
          <Select
            placeholder="Danh mục"
            value={categoryFilter}
            onChange={(value) => { setCategoryFilter(value); setPage(1) }}
            allowClear
            options={CATEGORY_OPTIONS}
          />
          <RangePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            value={dateRange}
            onChange={(value) => { setDateRange(value); setPage(1) }}
          />
        </div>
      </Card>
      <Card style={{ borderRadius: 18, overflow: 'hidden' }} bodyStyle={{ padding: 0 }}>
        {isLoading && !hasExistingData ? (
          renderTableSkeleton()
        ) : isMobile ? (
          <div style={{ padding: 16 }}>
            <TableRefreshIndicator visible={isFetching && hasExistingData} />
            {(!data?.data || data.data.length === 0) ? (
              <Empty description="Chưa có yêu cầu hỗ trợ" style={{ padding: '24px 0' }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(data?.data || []).map((record) => (
                  <Card key={record.ticket_id} size="small" style={{ borderRadius: 14, border: '1px solid var(--color-border-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }} title={record.title}>{record.title}</div>
                        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }} title={record.content}>{record.content}</div>
                        {record.category && (
                          <div style={{ marginTop: 8 }}>
                            <Tag style={{ borderRadius: 999, fontSize: 11, padding: '2px 8px' }}>{record.category}</Tag>
                          </div>
                        )}
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        {(() => {
                          const cfg = STATUS_CONFIG[record.status] || { label: record.status, color: 'default', icon: null }
                          return <Tag icon={cfg.icon} color={cfg.color}>{cfg.label}</Tag>
                        })()}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginTop: 12 }}>
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Tin nhắn</div>
                        <div style={{ fontWeight: 700, marginTop: 2 }}>{record._count?.messages || 0}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Ngày tạo</div>
                        <div style={{ fontWeight: 700, marginTop: 2 }}>{formatDateTime(record.created_at)}</div>
                      </div>
                    </div>
                    <Button type="primary" ghost onClick={() => openDetail(record)} style={{ width: '100%', marginTop: 12, height: 40, borderRadius: 10 }}>
                      Chi tiết
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <TableRefreshIndicator visible={isFetching && hasExistingData} />
            <Table
              dataSource={data?.data || []}
              columns={columns}
              rowKey="ticket_id"
              tableLayout="fixed"
              pagination={false}
              locale={{ emptyText: <Empty description="Chưa có yêu cầu hỗ trợ" /> }}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', flexDirection: screens.sm ? 'row' : 'column', justifyContent: 'space-between', alignItems: screens.sm ? 'center' : 'flex-start', gap: 12, padding: '16px 20px', borderTop: '1px solid var(--color-border-light)' }}>
              <Text type="secondary" style={{ fontSize: 13 }}>Tổng {data?.total || 0} yêu cầu</Text>
              <Pagination
                current={page}
                pageSize={10}
                total={data?.total || 0}
                onChange={setPage}
                showSizeChanger={false}
                showLessItems
                size="small"
              />
            </div>
          </>
        )}
      </Card>

      {/* Modal tạo ticket */}
      <Modal
        title="Tạo yêu cầu hỗ trợ"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item label="Tiêu đề" name="title" rules={[{ required: true, message: 'Nhập tiêu đề' }]}>
            <Input placeholder="Tóm tắt nội dung yêu cầu" />
          </Form.Item>
          <Form.Item label="Danh mục" name="category">
            <Select placeholder="Chọn danh mục (nếu có)" allowClear options={CATEGORY_OPTIONS} />
          </Form.Item>
          <Form.Item label="Nội dung" name="content" rules={[{ required: true, message: 'Nhập nội dung' }]}>
            <TextArea rows={5} placeholder="Mô tả chi tiết vấn đề bạn gặp phải..." />
          </Form.Item>
          <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setCreateModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
              Gửi yêu cầu
            </Button>
          </Space>
        </Form>
      </Modal>

      {/* Modal chi tiết ticket */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>{selectedTicket?.title}</span>
            {selectedTicket && (
              <Tag icon={STATUS_CONFIG[selectedTicket.status]?.icon} color={STATUS_CONFIG[selectedTicket.status]?.color}>
                {STATUS_CONFIG[selectedTicket.status]?.label}
              </Tag>
            )}
          </div>
        }
        open={detailModalOpen}
        onCancel={() => { setDetailModalOpen(false); setSelectedTicket(null); setReplyContent(''); setReplyFiles([]) }}
        footer={null}
        width={700}
        destroyOnClose
      >
        {ticketDetail ? (
          <>
            <Card style={{ marginBottom: 16, background: 'var(--color-surface-muted)' }} size="small">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Người gửi</Text>
                  <div>{ticketDetail.requester?.full_name || 'Không rõ'}</div>
                </div>
                {ticketDetail.category && (
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Danh mục</Text>
                    <div><Tag>{ticketDetail.category}</Tag></div>
                  </div>
                )}
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Ngày tạo</Text>
                  <div>{formatDateTime(ticketDetail.created_at)}</div>
                </div>
                {ticketDetail.handler && (
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Người xử lý</Text>
                    <div>{ticketDetail.handler.full_name}</div>
                  </div>
                )}
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <Text strong>Nội dung yêu cầu</Text>
              <Paragraph style={{ margin: '8px 0 0 0', whiteSpace: 'pre-wrap' }}>
                {ticketDetail.content}
              </Paragraph>
            </Card>

            <Title level={5}>Lịch sử trao đổi</Title>
            <div style={{ maxHeight: 400, overflow: 'auto', padding: '0 4px' }}>
              {renderMessages(ticketDetail.messages)}
            </div>

            {renderDetailFooter()}
          </>
        ) : (
          <div style={{ padding: '40px 0' }}>
            <TableSkeleton rows={3} columns={[{ width: '100%' }]} />
          </div>
        )}
      </Modal>

      {/* Modal yêu cầu bổ sung (Admin) */}
      <Modal
        title="Yêu cầu bổ sung thông tin"
        open={requestInfoModalOpen}
        onCancel={() => { setRequestInfoModalOpen(false); setRequestInfoContent('') }}
        onOk={handleRequestInfo}
        okText="Gửi yêu cầu"
        confirmLoading={requestInfoMutation.isPending}
      >
        <TextArea
          rows={4}
          value={requestInfoContent}
          onChange={(e) => setRequestInfoContent(e.target.value)}
          placeholder="Nhập nội dung yêu cầu bổ sung...&#10;VD: Vui lòng gửi ảnh màn hình lỗi."
        />
      </Modal>

      {/* Modal hoàn thành (Admin) */}
      <Modal
        title="Hoàn thành xử lý"
        open={completeModalOpen}
        onCancel={() => {
          if (!completeMutation.isPending) {
            setCompleteModalOpen(false)
            setResolution('')
            setResolutionError('')
          }
        }}
        onOk={handleComplete}
        okText={completeMutation.isPending ? 'Đang hoàn thành...' : 'Hoàn thành'}
        okButtonProps={{ disabled: !canSubmitComplete }}
        okType="primary"
        confirmLoading={completeMutation.isPending}
        closable={!completeMutation.isPending}
        maskClosable={!completeMutation.isPending}
      >
        <TextArea
          rows={4}
          value={resolution}
          onChange={(e) => {
            setResolution(e.target.value)
            if (resolutionError) setResolutionError('')
          }}
          disabled={completeMutation.isPending}
          placeholder="Nhập nội dung kết quả xử lý...&#10;VD: Đã đặt lại mật khẩu. Bạn có thể đăng nhập lại."
          status={resolutionError ? 'error' : undefined}
        />
        {resolutionError && (
          <div style={{ color: 'var(--color-danger)', fontSize: 13, marginTop: 6 }}>
            {resolutionError}
          </div>
        )}
      </Modal>
    </div>
  )
}
