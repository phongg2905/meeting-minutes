import { useQuery } from '@tanstack/react-query'
import { publicMeetingMinutesService } from '../../services'
import { Button, Card, Col, DatePicker, Empty, Input, Row, Table, Tag, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SearchOutlined, LoginOutlined } from '@ant-design/icons'
import { formatDate, STATUS_COLORS, STATUS_LABELS } from '../../utils'
import type { Dayjs } from 'dayjs'
import { TableRefreshIndicator, TableSkeleton } from '../../components/common'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

export default function PublicMeetingsListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [page, setPage] = useState(1)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['public-meetings', search, dateRange, page],
    queryFn: () => publicMeetingMinutesService.getAll({
      search: search || undefined,
      date_from: dateRange?.[0]?.format('YYYY-MM-DD'),
      date_to: dateRange?.[1]?.format('YYYY-MM-DD'),
      page,
      limit: 10,
    }),
  })
  const hasExistingData = (data?.data?.length ?? 0) > 0

  const columns = useMemo(() => [
    {
      title: 'Mã biên bản',
      dataIndex: 'minute_code',
      key: 'minute_code',
      render: (value: string, record: any) => (
        <span
          onClick={() => navigate(`/public/meetings/${record.minute_id}`)}
          style={{ fontWeight: 700, color: 'var(--color-primary)', cursor: 'pointer' }}
        >
          {value}
        </span>
      ),
    },
    { title: 'Tiêu đề', dataIndex: 'title', key: 'title', ellipsis: true },
    { title: 'Lớp', dataIndex: 'class_name', key: 'class_name', width: 100 },
    {
      title: 'Ngày họp',
      dataIndex: 'meeting_date',
      key: 'meeting_date',
      width: 110,
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (value: string) => (
        <Tag color={STATUS_COLORS[value]} style={{ borderRadius: 6, fontWeight: 600 }}>
          {STATUS_LABELS[value] || value}
        </Tag>
      ),
    },
  ], [navigate])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0B1220 0%, #1a2a4a 100%)',
        padding: '32px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Row justify="space-between" align="middle" gutter={[16, 16]}>
            <Col>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800, color: '#fff',
                }}>BB</div>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 600 }}>
                  Biên bản họp
                </span>
              </div>
              <Title level={2} style={{ margin: '12px 0 4px', color: '#fff', fontWeight: 800 }}>
                Tra cứu biên bản công khai
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15 }}>
                Hiển thị các biên bản đã được duyệt công khai để tra cứu.
              </Text>
            </Col>
            <Col>
              <Link to="/login">
                <Button
                  type="primary"
                  icon={<LoginOutlined />}
                  size="large"
                  style={{ borderRadius: 12, fontWeight: 700, height: 44, paddingInline: 24 }}
                >
                  Đăng nhập hệ thống
                </Button>
              </Link>
            </Col>
          </Row>
        </div>
      </div>

      {/* Search & Filter */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>
        <Card
          style={{
            marginBottom: 16,
            borderRadius: 16,
            border: '1px solid var(--color-border-light)',
          }}
          bodyStyle={{ padding: '16px 20px' }}
        >
          <Row gutter={[12, 12]}>
            <Col xs={24} md={14}>
              <Input
                prefix={<SearchOutlined style={{ color: 'var(--color-text-tertiary)' }} />}
                placeholder="Tìm theo tiêu đề, mã biên bản, lớp..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                allowClear
                style={{ borderRadius: 12, height: 42 }}
              />
            </Col>
            <Col xs={24} md={10}>
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

        {/* Results */}
        <Card
          style={{
            borderRadius: 16,
            border: '1px solid var(--color-border-light)',
          }}
          bodyStyle={{ padding: 0 }}
        >
          {isLoading && !hasExistingData ? (
            <TableSkeleton rows={5} />
          ) : (
            <>
              <TableRefreshIndicator visible={isFetching && hasExistingData} />
              <Table
                dataSource={data?.data || []}
                columns={columns}
                rowKey="minute_id"
                locale={{
                  emptyText: (
                    <Empty
                      description="Chưa có biên bản công khai"
                      style={{ padding: 32 }}
                    />
                  ),
                }}
                pagination={{
                  current: page,
                  total: data?.total || 0,
                  pageSize: 10,
                  onChange: setPage,
                  showSizeChanger: false,
                }}
              />
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
