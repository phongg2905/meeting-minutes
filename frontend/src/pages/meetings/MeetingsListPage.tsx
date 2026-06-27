import { useState } from 'react'
import { Table, Button, Tag, Input, Select, Space, Popconfirm, message, Card, Row, Col, Typography, Tooltip, DatePicker, Collapse, Badge, Grid } from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined, FilterOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { keepPreviousDataPlaceholder } from '../../utils/queryKeys'
import { useNavigate } from 'react-router-dom'
import { meetingMinutesService, minuteTypesService } from '../../services'
import MeetingVisibilityToggle from '../../components/meeting/MeetingVisibilityToggle'
import { useAuthStore } from '../../store/authStore'
import { canWriteMinutes, formatDate, STATUS_LABELS, STATUS_COLORS, isAdmin, isMinuteManager } from '../../utils'
import { MeetingMinute, MinuteType } from '../../types'
import dayjs, { Dayjs } from 'dayjs'
import { EmptyState, TableRefreshIndicator, TableSkeleton } from '../../components/common'

const { Text } = Typography
const { RangePicker } = DatePicker
const { useBreakpoint } = Grid

export default function MeetingsListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const screens = useBreakpoint()
  const isMobile = !screens.md

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>()
  const [typeFilter, setTypeFilter] = useState<string>()
  const [classFilter, setClassFilter] = useState('')
  const [hostFilter, setHostFilter] = useState('')
  const [secretaryFilter, setSecretaryFilter] = useState('')
  const [meetingFormFilter, setMeetingFormFilter] = useState<string>()
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [page, setPage] = useState(1)
  const [filterOpen, setFilterOpen] = useState(false)
  const activeFilterCount = [
    statusFilter,
    typeFilter,
    classFilter || undefined,
    meetingFormFilter,
    dateRange,
  ].filter(Boolean).length

  // Draft states for filter panel (only applied on "Áp dụng")
  const [draftStatus, setDraftStatus] = useState<string | undefined>(undefined)
  const [draftType, setDraftType] = useState<string | undefined>(undefined)
  const [draftClass, setDraftClass] = useState('')
  const [draftMeetingForm, setDraftMeetingForm] = useState<string | undefined>(undefined)
  const [draftDateRange, setDraftDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['meeting-minutes', user?.user_id, { search, statusFilter, typeFilter, classFilter, hostFilter, secretaryFilter, meetingFormFilter, dateRange, page }],
    queryFn: () => meetingMinutesService.getAll({
      search: search || undefined,
      status: statusFilter,
      type_id: typeFilter,
      class_name: classFilter || undefined,
      host_name: hostFilter || undefined,
      secretary_name: secretaryFilter || undefined,
      meeting_form: meetingFormFilter,
      date_from: dateRange?.[0]?.format('YYYY-MM-DD'),
      date_to: dateRange?.[1]?.format('YYYY-MM-DD'),
      page,
      limit: 10,
    }),
    placeholderData: keepPreviousDataPlaceholder,
  })
  const hasExistingData = (data?.data?.length ?? 0) > 0

  const { data: types } = useQuery({
    queryKey: ['minute-types'],
    queryFn: minuteTypesService.getAll,
    staleTime: 5 * 60 * 1000,
  })

  const deleteMutation = useMutation({
    mutationFn: meetingMinutesService.remove,
    onSuccess: () => {
      message.success('Xóa biên bản thành công')
      queryClient.invalidateQueries({ queryKey: ['meeting-minutes'] })
    },
    onError: () => message.error('Có lỗi xảy ra khi xóa'),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      meetingMinutesService.updateStatus(id, status),
    onSuccess: () => {
      message.success('Cập nhật trạng thái thành công')
      queryClient.invalidateQueries({ queryKey: ['meeting-minutes'] })
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Không thể cập nhật trạng thái')
    },
  })

  const applyFilters = () => {
    setStatusFilter(draftStatus)
    setTypeFilter(draftType)
    setClassFilter(draftClass)
    setMeetingFormFilter(draftMeetingForm)
    setDateRange(draftDateRange)
    setPage(1)
    setFilterOpen(false)
  }

  const clearFilters = () => {
    setDraftStatus(undefined)
    setDraftType(undefined)
    setDraftClass('')
    setDraftMeetingForm(undefined)
    setDraftDateRange(null)
    setStatusFilter(undefined)
    setTypeFilter(undefined)
    setClassFilter('')
    setMeetingFormFilter(undefined)
    setDateRange(null)
    setPage(1)
  }

  // ─── Table columns ───────────────────────────────────
  const columns = [
    {
      title: 'Mã biên bản',
      dataIndex: 'minute_code',
      key: 'minute_code',
      width: 160,
      render: (code: string, record: MeetingMinute) => (
        <div style={{ maxWidth: 160, wordBreak: 'break-word' }}>
          <span
            onClick={() => navigate(`/meetings/${record.minute_id}`)}
            style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: 13, lineHeight: 1.4, cursor: 'pointer' }}
          >
            {code}
          </span>
        </div>
      ),
    },
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      key: 'title',
      ellipsis: false,
      render: (title: string, record: MeetingMinute) => (
        <div style={{ minWidth: 0, maxWidth: 400 }}>
          <Tooltip title={title}>
            <div
              style={{
                fontWeight: 600,
                color: 'var(--color-text)',
                fontSize: 14,
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {title}
            </div>
          </Tooltip>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Lớp: {record.class_name}
          </div>
        </div>
      ),
    },
    {
      title: 'Loại',
      key: 'type',
      width: 180,
      responsive: ['lg' as const],
      render: (_: any, record: MeetingMinute) => (
        <Tooltip title={record.minute_type?.type_name || ''}>
          <div
            style={{
              fontSize: 13,
              color: 'var(--color-text-secondary)',
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              maxWidth: 180,
            }}
          >
            {record.minute_type?.type_name}
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Ngày họp',
      dataIndex: 'meeting_date',
      key: 'meeting_date',
      width: 130,
      render: (d: string) => (
        <span style={{ whiteSpace: 'nowrap', fontSize: 13, color: 'var(--color-text-secondary)' }}>
          {formatDate(d)}
        </span>
      ),
    },
    {
      title: 'Số liệu',
      key: 'counts',
      width: 170,
      render: (_: any, record: MeetingMinute) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxWidth: 170 }}>
          <Tag color="blue" style={{ borderRadius: 4, fontSize: 11, lineHeight: '20px', margin: 0, flexShrink: 0 }}>
            P {record._count?.participants || 0}
          </Tag>
          <Tag color="orange" style={{ borderRadius: 4, fontSize: 11, lineHeight: '20px', margin: 0, flexShrink: 0 }}>
            T {record._count?.tasks || 0}
          </Tag>
          <Tag color="green" style={{ borderRadius: 4, fontSize: 11, lineHeight: '20px', margin: 0, flexShrink: 0 }}>
            F {record._count?.attachments || 0}
          </Tag>
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: string, record: MeetingMinute) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {(isAdmin(user?.role_id) || (isMinuteManager(user?.role_id) && record.created_by === user?.user_id)) ? (
            <Select
              value={status}
              size="small"
              style={{ width: 130 }}
              onChange={(value) => statusMutation.mutate({ id: record.minute_id, status: value })}
              options={[
                { value: 'draft', label: 'Đang chỉnh sửa' },
                { value: 'completed', label: 'Hoàn tất' },
              ]}
              dropdownStyle={{ borderRadius: 10 }}
            />
          ) : (
            <Tag
              color={STATUS_COLORS[status]}
              style={{ borderRadius: 6, fontWeight: 600, fontSize: 12, padding: '2px 10px', margin: 0, whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {STATUS_LABELS[status] || status}
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Công khai',
      dataIndex: 'is_public',
      key: 'is_public',
      width: 140,
      render: (value: boolean, record: MeetingMinute) => (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <MeetingVisibilityToggle
            meetingId={record.minute_id}
            meetingCode={record.minute_code}
            meetingTitle={record.title}
            isPublic={value}
            canUpdate={isAdmin(user?.role_id) || (isMinuteManager(user?.role_id) && record.created_by === user?.user_id)}
          />
        </div>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 72,
      render: (_: any, record: MeetingMinute) => (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
          <Tooltip title="Xem chi tiết">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/meetings/${record.minute_id}`)}
              style={{ color: 'var(--color-text-secondary)', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            />
          </Tooltip>
          {canWriteMinutes(user?.role_id) && (isAdmin(user?.role_id) || record.created_by === user?.user_id) && (
            <>
              <Tooltip title="Chỉnh sửa">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/meetings/${record.minute_id}/edit`)}
                  style={{ color: 'var(--color-text-secondary)', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                />
              </Tooltip>
              <Popconfirm
                title="Xóa biên bản này?"
                description="Hành động này không thể hoàn tác"
                onConfirm={() => deleteMutation.mutate(record.minute_id)}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <Tooltip title="Xóa">
                  <Button
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    style={{ color: 'var(--color-danger)', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  />
                </Tooltip>
              </Popconfirm>
            </>
          )}
        </div>
      ),
    },
  ]

  // ─── Mobile card render ─────────────────────────────
  const renderMobileCard = (record: MeetingMinute) => {
    const canManage = isAdmin(user?.role_id) || (isMinuteManager(user?.role_id) && record.created_by === user?.user_id)
    return (
      <Card
        key={record.minute_id}
        style={{
          marginBottom: 12,
          borderRadius: 12,
          border: '1px solid var(--color-border-light)',
          cursor: 'pointer',
        }}
        bodyStyle={{ padding: 14 }}
        onClick={() => navigate(`/meetings/${record.minute_id}`)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--color-primary)' }}>
              {record.minute_code}
            </div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)', marginTop: 2, lineHeight: 1.4 }}>
              {record.title}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              Lớp: {record.class_name}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
            {canManage && (
              <>
                <Tooltip title="Chỉnh sửa">
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={(e) => { e.stopPropagation(); navigate(`/meetings/${record.minute_id}/edit`) }}
                    style={{ width: 32, height: 32 }}
                  />
                </Tooltip>
                <span onClick={(e) => e.stopPropagation()}>
                  <Popconfirm
                    title="Xóa biên bản này?"
                    onConfirm={() => deleteMutation.mutate(record.minute_id)}
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                  >
                    <Tooltip title="Xóa">
                      <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        style={{ color: 'var(--color-danger)', width: 32, height: 32 }}
                      />
                    </Tooltip>
                  </Popconfirm>
                </span>
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, alignItems: 'center' }}>
          {record.minute_type?.type_name && (
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              {record.minute_type.type_name}
            </span>
          )}
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
            {formatDate(record.meeting_date)}
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, alignItems: 'center' }}>
          <Tag color="blue" style={{ borderRadius: 4, fontSize: 11, lineHeight: '20px', margin: 0 }}>
            P {record._count?.participants || 0}
          </Tag>
          <Tag color="orange" style={{ borderRadius: 4, fontSize: 11, lineHeight: '20px', margin: 0 }}>
            T {record._count?.tasks || 0}
          </Tag>
          <Tag color="green" style={{ borderRadius: 4, fontSize: 11, lineHeight: '20px', margin: 0 }}>
            F {record._count?.attachments || 0}
          </Tag>
          <Tag
            color={STATUS_COLORS[record.status]}
            style={{ borderRadius: 6, fontWeight: 600, fontSize: 11, margin: 0 }}
          >
            {STATUS_LABELS[record.status] || record.status}
          </Tag>
          <Tag
            color={record.is_public ? 'success' : 'default'}
            style={{ borderRadius: 6, fontSize: 11, margin: 0 }}
          >
            {record.is_public ? 'Công khai' : 'Nội bộ'}
          </Tag>
        </div>
      </Card>
    )
  }

  // ─── Main render ────────────────────────────────────
  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>
            BIÊN BẢN HỌP
          </div>
          <h1 className="page-title">Danh sách biên bản</h1>
        </div>
        {canWriteMinutes(user?.role_id) && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/meetings/create')}
            style={{ borderRadius: 12, fontWeight: 700, height: 42, paddingInline: 20, fontSize: 14, flexShrink: 0 }}
          >
            Tạo biên bản
          </Button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <Card
        style={{
          marginBottom: 16,
          border: '1px solid var(--color-border-light)',
          borderRadius: 16,
        }}
        bodyStyle={{ padding: '16px 20px' }}
      >
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={18} md={20}>
            <Input
              prefix={<SearchOutlined style={{ color: 'var(--color-text-tertiary)' }} />}
              placeholder="Tìm theo tiêu đề, mã cuộc họp, lớp, chủ tọa hoặc thư ký"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              allowClear
              style={{ borderRadius: 12, height: 42 }}
            />
          </Col>
          <Col xs={24} sm={6} md={4}>
            <Badge count={activeFilterCount} size="small" offset={[-8, 6]}>
              <Button
                icon={<FilterOutlined />}
                onClick={() => {
                  if (!filterOpen) {
                    setDraftStatus(statusFilter)
                    setDraftType(typeFilter)
                    setDraftClass(classFilter)
                    setDraftMeetingForm(meetingFormFilter)
                    setDraftDateRange(dateRange)
                  }
                  setFilterOpen(!filterOpen)
                }}
                type={filterOpen ? 'primary' : 'default'}
                style={{ width: '100%', borderRadius: 12, height: 42, fontWeight: 600 }}
              >
                Bộ lọc
              </Button>
            </Badge>
          </Col>
        </Row>

        {/* Filter Panel */}
        <Collapse
          activeKey={filterOpen ? 'filter-panel' : undefined}
          ghost
          style={{ marginTop: 8 }}
        >
          <Collapse.Panel key="filter-panel" showArrow={false} header={null}>
            <div
              style={{
                padding: 16,
                background: 'var(--color-surface-muted)',
                borderRadius: 12,
                marginTop: 4,
              }}
            >
              <Row gutter={[12, 12]}>
                <Col xs={24} sm={12} md={8}>
                  <Select
                    placeholder="Trạng thái"
                    allowClear
                    value={draftStatus}
                    onChange={(v) => setDraftStatus(v)}
                    style={{ width: '100%' }}
                    options={[
                      { value: 'draft', label: 'Đang chỉnh sửa' },
                      { value: 'completed', label: 'Hoàn tất' },
                    ]}
                  />
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Input
                    placeholder="Lọc theo lớp"
                    value={draftClass}
                    onChange={(e) => setDraftClass(e.target.value)}
                    allowClear
                    style={{ borderRadius: 12 }}
                  />
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Select
                    placeholder="Hình thức"
                    allowClear
                    value={draftMeetingForm}
                    onChange={(v) => setDraftMeetingForm(v)}
                    style={{ width: '100%' }}
                    options={[
                      { value: 'Trực tiếp', label: 'Trực tiếp' },
                      { value: 'Trực tuyến', label: 'Trực tuyến' },
                      { value: 'Kết hợp', label: 'Kết hợp' },
                    ]}
                  />
                </Col>
                <Col xs={24} sm={12} md={12}>
                  <RangePicker
                    style={{ width: '100%' }}
                    format="DD/MM/YYYY"
                    value={draftDateRange}
                    onChange={(value) => setDraftDateRange(value as [Dayjs | null, Dayjs | null] | null)}
                  />
                </Col>
                <Col xs={24} sm={12} md={12}>
                  <Select
                    placeholder="Loại biên bản"
                    allowClear
                    value={draftType}
                    onChange={(v) => setDraftType(v)}
                    style={{ width: '100%' }}
                    options={(types || []).map((t: MinuteType) => ({
                      value: String(t.type_id),
                      label: t.type_name,
                    }))}
                  />
                </Col>
              </Row>
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button onClick={clearFilters} style={{ borderRadius: 10, fontWeight: 600 }}>
                  Xóa bộ lọc
                </Button>
                <Button
                  type="primary"
                  onClick={applyFilters}
                  style={{ borderRadius: 10, fontWeight: 600 }}
                >
                  Áp dụng
                </Button>
              </div>
            </div>
          </Collapse.Panel>
        </Collapse>

        {/* Result count */}
        <div style={{ marginTop: 12 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            <FilterOutlined style={{ marginRight: 4 }} />
            {data?.total || 0} kết quả
          </Text>
        </div>
      </Card>

      {/* Error State */}
      {isError ? (
        <Card
          style={{
            border: '1px solid var(--color-danger-bg)',
            borderRadius: 16,
            textAlign: 'center',
            padding: 48,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: 'var(--color-danger-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: 28,
              color: 'var(--color-danger)',
            }}
          >
            !
          </div>
          <h3 style={{ margin: '0 0 8px', color: 'var(--color-text)' }}>Không thể tải dữ liệu</h3>
          <p style={{ margin: '0 0 20px', color: 'var(--color-text-secondary)', fontSize: 14 }}>
            Có lỗi xảy ra khi tải danh sách biên bản. Vui lòng thử lại.
          </p>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
            style={{ borderRadius: 10, fontWeight: 600 }}
          >
            Thử lại
          </Button>
        </Card>
      ) : isLoading && !hasExistingData ? (
        <TableSkeleton rows={6} />
      ) : isMobile ? (
        /* ── Mobile Card Layout ── */
        <div>
          {(data?.data || []).map(renderMobileCard)}
          {(data?.total || 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
              <Button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                style={{ borderRadius: 10, fontWeight: 600 }}
              >
                Trang trước
              </Button>
              <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                Trang {page} / {Math.ceil((data?.total || 0) / 10)}
              </span>
              <Button
                disabled={page >= Math.ceil((data?.total || 0) / 10)}
                onClick={() => setPage(page + 1)}
                style={{ borderRadius: 10, fontWeight: 600 }}
              >
                Trang sau
              </Button>
            </div>
          )}
          {(!data?.data || data.data.length === 0) && (
            <EmptyState
              title="Chưa có biên bản nào"
              description={canWriteMinutes(user?.role_id) ? 'Tạo biên bản đầu tiên để bắt đầu.' : 'Chưa có biên bản nào được tạo.'}
              action={canWriteMinutes(user?.role_id) ? { label: 'Tạo biên bản', onClick: () => navigate('/meetings/create') } : undefined}
            />
          )}
        </div>
      ) : (
        /* ── Desktop/Tablet Table ── */
        <div style={{ overflow: 'hidden', borderRadius: 16, border: '1px solid var(--color-border-light)' }}>
          <div style={{ overflowX: screens.lg ? 'visible' : 'auto' }}>
            <>
              <TableRefreshIndicator visible={isFetching && hasExistingData} />
              <Table
                dataSource={data?.data || []}
                columns={columns}
                rowKey="minute_id"
                scroll={{ x: screens.lg ? undefined : 900 }}
                pagination={{
                  current: page,
                  total: data?.total || 0,
                  pageSize: 10,
                  onChange: setPage,
                  showSizeChanger: false,
                  showTotal: (total) => (
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
                      Tổng <strong style={{ color: 'var(--color-text)' }}>{total}</strong> biên bản
                    </span>
                  ),
                  style: { margin: '16px 0', padding: '0 20px' },
                }}
                locale={{
                  emptyText: (
                    <EmptyState
                      title="Chưa có biên bản nào"
                      description={canWriteMinutes(user?.role_id) ? 'Tạo biên bản đầu tiên để bắt đầu.' : 'Chưa có biên bản nào được tạo.'}
                      action={canWriteMinutes(user?.role_id) ? { label: 'Tạo biên bản', onClick: () => navigate('/meetings/create') } : undefined}
                    />
                  ),
                }}
              />
            </>
          </div>
        </div>
      )}
    </div>
  )
}
