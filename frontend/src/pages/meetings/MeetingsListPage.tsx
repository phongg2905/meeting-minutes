import { useState } from 'react'
import { Table, Button, Tag, Input, Select, Space, Popconfirm, message, Card, Row, Col, Typography, Tooltip, DatePicker, Switch } from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined, FilterOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { meetingMinutesService, minuteTypesService } from '../../services'
import { useAuthStore } from '../../store/authStore'
import { canWriteMinutes, formatDate, STATUS_LABELS, STATUS_COLORS, isAdmin, isMinuteManager } from '../../utils'
import { MeetingMinute, MinuteType } from '../../types'
import dayjs, { Dayjs } from 'dayjs'

const { Text } = Typography
const { RangePicker } = DatePicker

export default function MeetingsListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>()
  const [typeFilter, setTypeFilter] = useState<string>()
  const [classFilter, setClassFilter] = useState('')
  const [hostFilter, setHostFilter] = useState('')
  const [secretaryFilter, setSecretaryFilter] = useState('')
  const [meetingFormFilter, setMeetingFormFilter] = useState<string>()
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
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
  })

  const { data: types } = useQuery({
    queryKey: ['minute-types'],
    queryFn: minuteTypesService.getAll,
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

  const publicMutation = useMutation({
    mutationFn: ({ id, isPublic }: { id: number; isPublic: boolean }) =>
      meetingMinutesService.updatePublic(id, isPublic),
    onSuccess: () => {
      message.success('Cập nhật công khai thành công')
      queryClient.invalidateQueries({ queryKey: ['meeting-minutes'] })
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Không thể cập nhật công khai')
    },
  })

  const columns = [
    {
      title: 'Mã biên bản',
      dataIndex: 'minute_code',
      key: 'minute_code',
      width: 150,
      render: (code: string, record: MeetingMinute) => (
        <a onClick={() => navigate(`/meetings/${record.minute_id}`)} style={{ fontWeight: 700, color: '#1a56a0' }}>
          {code}
        </a>
      ),
    },
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string, record: MeetingMinute) => (
        <div>
          <div style={{ fontWeight: 500 }}>{title}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>Lớp: {record.class_name}</Text>
        </div>
      ),
    },
    {
      title: 'Loại',
      key: 'type',
      width: 150,
      render: (_: any, record: MeetingMinute) => (
        <Text style={{ fontSize: 13 }}>{record.minute_type?.type_name}</Text>
      ),
    },
    {
      title: 'Ngày họp',
      dataIndex: 'meeting_date',
      key: 'meeting_date',
      width: 132,
      render: (d: string) => <span style={{ whiteSpace: 'nowrap' }}>{formatDate(d)}</span>,
    },
    {
      title: 'Số liệu',
      key: 'counts',
      width: 130,
      render: (_: any, record: MeetingMinute) => (
        <Space size={4} wrap>
          <Tag color="blue">P {record._count?.participants || 0}</Tag>
          <Tag color="orange">T {record._count?.tasks || 0}</Tag>
          <Tag color="green">F {record._count?.attachments || 0}</Tag>
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 170,
      render: (status: string, record: MeetingMinute) => (
        (isAdmin(user?.role_id) || (isMinuteManager(user?.role_id) && record.created_by === user?.user_id)) ? (
          <Select
            value={status}
            size="small"
            style={{ width: 150 }}
            onChange={(value) => statusMutation.mutate({ id: record.minute_id, status: value })}
            options={[
              { value: 'draft', label: 'Đang chỉnh sửa' },
              { value: 'completed', label: 'Hoàn tất' },
            ]}
          />
        ) : (
          <Tag color={STATUS_COLORS[status]}>{STATUS_LABELS[status] || status}</Tag>
        )
      ),
    },
    {
      title: 'Công khai',
      dataIndex: 'is_public',
      key: 'is_public',
      width: 120,
      render: (value: boolean, record: MeetingMinute) => (
        (isAdmin(user?.role_id) || (isMinuteManager(user?.role_id) && record.created_by === user?.user_id)) ? (
          <Switch
            checked={value}
            onChange={(checked) => publicMutation.mutate({ id: record.minute_id, isPublic: checked })}
            size="small"
          />
        ) : (
          <Tag color={value ? 'success' : 'default'}>{value ? 'Có' : 'Không'}</Tag>
        )
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 120,
      render: (_: any, record: MeetingMinute) => (
        <Space>
          <Tooltip title="Xem chi tiết">
            <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/meetings/${record.minute_id}`)} />
          </Tooltip>
          {canWriteMinutes(user?.role_id) && (isAdmin(user?.role_id) || record.created_by === user?.user_id) && (
            <>
              <Tooltip title="Chỉnh sửa">
                <Button type="text" size="small" icon={<EditOutlined />} onClick={() => navigate(`/meetings/${record.minute_id}/edit`)} />
              </Tooltip>
              <Tooltip title="Xóa">
                <Popconfirm
                  title="Xóa biên bản này?"
                  description="Hành động này không thể hoàn tác"
                  onConfirm={() => deleteMutation.mutate(record.minute_id)}
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                >
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Biên bản họp lớp</h1>
        {canWriteMinutes(user?.role_id) && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/meetings/create')} style={{ borderRadius: 8, fontWeight: 600 }}>
            Tạo biên bản
          </Button>
        )}
      </div>

      <Card style={{ marginBottom: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Tìm theo tiêu đề, mã, lớp..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              allowClear
              style={{ borderRadius: 8 }}
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Input
              placeholder="Lọc theo lớp"
              value={classFilter}
              onChange={(e) => { setClassFilter(e.target.value); setPage(1) }}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <RangePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              value={dateRange}
              onChange={(value) => { setDateRange(value as [Dayjs | null, Dayjs | null] | null); setPage(1) }}
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Input
              placeholder="Lọc theo chủ tọa"
              value={hostFilter}
              onChange={(e) => { setHostFilter(e.target.value); setPage(1) }}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Input
              placeholder="Lọc theo thư ký"
              value={secretaryFilter}
              onChange={(e) => { setSecretaryFilter(e.target.value); setPage(1) }}
              allowClear
            />
          </Col>
          <Col xs={24} sm={6} md={4}>
            <Select
              placeholder="Hình thức"
              allowClear
              value={meetingFormFilter}
              onChange={(v) => { setMeetingFormFilter(v); setPage(1) }}
              style={{ width: '100%' }}
              options={[
                { value: 'Trực tiếp', label: 'Trực tiếp' },
                { value: 'Trực tuyến', label: 'Trực tuyến' },
                { value: 'Kết hợp', label: 'Kết hợp' },
              ]}
            />
          </Col>
          <Col xs={24} sm={6} md={3}>
            <Select
              placeholder="Trạng thái"
              allowClear
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); setPage(1) }}
              style={{ width: '100%' }}
              options={[
                { value: 'draft', label: 'Đang chỉnh sửa' },
                { value: 'completed', label: 'Hoàn tất' },
              ]}
            />
          </Col>
          <Col xs={24} sm={6} md={3}>
            <Select
              placeholder="Loại biên bản"
              allowClear
              value={typeFilter}
              onChange={(v) => { setTypeFilter(v); setPage(1) }}
              style={{ width: '100%' }}
              options={(types || []).map((t: MinuteType) => ({
                value: String(t.type_id),
                label: t.type_name,
              }))}
            />
          </Col>
          <Col span={24}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              <FilterOutlined /> {data?.total || 0} kết quả
            </Text>
          </Col>
        </Row>
      </Card>

      <Card style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        <Table
          dataSource={data?.data || []}
          columns={columns}
          rowKey="minute_id"
          loading={isLoading}
          scroll={{ x: 1160 }}
          pagination={{
            current: page,
            total: data?.total || 0,
            pageSize: 10,
            onChange: setPage,
            showSizeChanger: false,
            showTotal: (total) => `Tổng ${total} biên bản`,
          }}
        />
      </Card>
    </div>
  )
}
