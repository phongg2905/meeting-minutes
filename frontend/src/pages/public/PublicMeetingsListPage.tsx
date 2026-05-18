import { useQuery } from '@tanstack/react-query'
import { publicMeetingMinutesService } from '../../services'
import { Button, Card, Col, DatePicker, Empty, Input, Row, Table, Tag, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SearchOutlined } from '@ant-design/icons'
import { formatDate, STATUS_COLORS, STATUS_LABELS } from '../../utils'
import type { Dayjs } from 'dayjs'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

export default function PublicMeetingsListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['public-meetings', search, classFilter, dateRange, page],
    queryFn: () => publicMeetingMinutesService.getAll({
      search: search || undefined,
      class_name: classFilter || undefined,
      date_from: dateRange?.[0]?.format('YYYY-MM-DD'),
      date_to: dateRange?.[1]?.format('YYYY-MM-DD'),
      page,
      limit: 10,
    }),
  })

  const columns = useMemo(() => [
    {
      title: 'Mã biên bản',
      dataIndex: 'minute_code',
      key: 'minute_code',
      render: (value: string, record: any) => (
        <a onClick={() => navigate(`/public/meetings/${record.minute_id}`)}>{value}</a>
      ),
    },
    { title: 'Tiêu đề', dataIndex: 'title', key: 'title' },
    { title: 'Lớp', dataIndex: 'class_name', key: 'class_name' },
    {
      title: 'Ngày họp',
      dataIndex: 'meeting_date',
      key: 'meeting_date',
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => <Tag color={STATUS_COLORS[value]}>{STATUS_LABELS[value] || value}</Tag>,
    },
  ], [navigate])

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 20px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>Tra cứu biên bản công khai</Title>
            <Text type="secondary">Hiển thị các biên bản đã được duyệt để tra cứu công khai.</Text>
          </Col>
          <Col>
            <Link to="/login">
              <Button type="primary">Đăng nhập hệ thống</Button>
            </Link>
          </Col>
        </Row>

        <Card style={{ marginBottom: 16 }}>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={10}>
              <Input
                prefix={<SearchOutlined />}
                placeholder="Tìm theo tiêu đề, mã biên bản, lớp..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                allowClear
              />
            </Col>
            <Col xs={24} md={6}>
              <Input
                placeholder="Lọc theo lớp"
                value={classFilter}
                onChange={(e) => {
                  setClassFilter(e.target.value)
                  setPage(1)
                }}
                allowClear
              />
            </Col>
            <Col xs={24} md={8}>
              <RangePicker
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
                value={dateRange}
                onChange={(value) => {
                  setDateRange(value as [Dayjs | null, Dayjs | null] | null)
                  setPage(1)
                }}
              />
            </Col>
          </Row>
        </Card>

        <Card>
          <Table
            dataSource={data?.data || []}
            columns={columns}
            rowKey="minute_id"
            loading={isLoading}
            locale={{ emptyText: <Empty description="Chưa có biên bản công khai" /> }}
            pagination={{
              current: page,
              total: data?.total || 0,
              pageSize: 10,
              onChange: setPage,
              showSizeChanger: false,
            }}
          />
        </Card>
      </div>
    </div>
  )
}
