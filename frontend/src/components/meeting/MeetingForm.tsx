import { useEffect } from 'react'
import {
  Form, Input, Select, DatePicker, TimePicker, Button, Card,
  Row, Col, Divider, Typography, Table, Popconfirm
} from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { minuteTypesService } from '../../services'
import { MinuteType, MeetingMinute } from '../../types'

const { TextArea } = Input
const { Title } = Typography

interface Props {
  initialValues?: MeetingMinute
  onSubmit: (values: any) => void
  loading?: boolean
  mode?: 'create' | 'edit'
}

export default function MeetingForm({ initialValues, onSubmit, loading, mode = 'create' }: Props) {
  const [form] = Form.useForm()

  const { data: types } = useQuery({
    queryKey: ['minute-types'],
    queryFn: minuteTypesService.getAll,
  })

  useEffect(() => {
    if (!initialValues) return
    form.setFieldsValue({
      ...initialValues,
      meeting_date: initialValues.meeting_date ? dayjs(initialValues.meeting_date) : null,
      start_time: initialValues.start_time ? dayjs(initialValues.start_time) : null,
      end_time: initialValues.end_time ? dayjs(initialValues.end_time) : null,
      tasks: initialValues.tasks?.map((task) => ({
        ...task,
        deadline: task.deadline ? dayjs(task.deadline).format('YYYY-MM-DD') : undefined,
      })),
    })
  }, [initialValues, form])

  const handleFinish = (values: any) => {
    onSubmit({
      ...values,
      meeting_date: values.meeting_date?.format('YYYY-MM-DD'),
      start_time: values.start_time?.format('HH:mm'),
      end_time: values.end_time?.format('HH:mm'),
      participants: values.participants || [],
      tasks: values.tasks || [],
    })
  }

  const participantColumns = [
    {
      title: 'Họ tên',
      key: 'full_name',
      render: (_: any, field: any) => (
        <Form.Item name={[field.name, 'full_name']} style={{ margin: 0 }} rules={[{ required: true, message: 'Nhập họ tên' }]}>
          <Input placeholder="Họ và tên" />
        </Form.Item>
      ),
    },
    {
      title: 'Vai trò',
      key: 'role_in_meeting',
      render: (_: any, field: any) => (
        <Form.Item name={[field.name, 'role_in_meeting']} style={{ margin: 0 }}>
          <Input placeholder="VD: Lớp trưởng" />
        </Form.Item>
      ),
    },
    {
      title: 'Tình trạng',
      key: 'attendance_status',
      width: 150,
      render: (_: any, field: any) => (
        <Form.Item name={[field.name, 'attendance_status']} style={{ margin: 0 }} initialValue="present">
          <Select options={[
            { value: 'present', label: 'Có mặt' },
            { value: 'absent', label: 'Vắng mặt' },
            { value: 'late', label: 'Đến trễ' },
          ]} />
        </Form.Item>
      ),
    },
    {
      title: '',
      key: 'action',
      width: 52,
      render: (_: any, field: any, __: number, remove?: (index: number) => void) => (
        <Popconfirm title="Xóa nguoi tham du?" onConfirm={() => remove?.(field.name)} okText="Xóa" cancelText="Hủy">
          <Button type="text" danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ]

  const taskColumns = [
    {
      title: 'Nội dung nhiệm vụ',
      key: 'task_content',
      render: (_: any, field: any) => (
        <Form.Item name={[field.name, 'task_content']} style={{ margin: 0 }} rules={[{ required: true, message: 'Nhập nội dung' }]}>
          <Input placeholder="Nội dung nhiệm vụ" />
        </Form.Item>
      ),
    },
    {
      title: 'Người phụ trách',
      key: 'assigned_to',
      width: 180,
      render: (_: any, field: any) => (
        <Form.Item name={[field.name, 'assigned_to']} style={{ margin: 0 }}>
          <Input placeholder="Người phụ trách" />
        </Form.Item>
      ),
    },
    {
      title: 'Hạn chót',
      key: 'deadline',
      width: 160,
      render: (_: any, field: any) => (
        <Form.Item name={[field.name, 'deadline']} style={{ margin: 0 }}>
          <Input type="date" />
        </Form.Item>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'task_status',
      width: 150,
      render: (_: any, field: any) => (
        <Form.Item name={[field.name, 'task_status']} style={{ margin: 0 }} initialValue="pending">
          <Select options={[
            { value: 'pending', label: 'Chưa xong' },
            { value: 'in_progress', label: 'Đang làm' },
            { value: 'done', label: 'Hoàn thành' },
          ]} />
        </Form.Item>
      ),
    },
  ]

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={{ status: 'draft', meeting_form: 'Trực tiếp' }}
      scrollToFirstError
    >
      <Card style={{ marginBottom: 16, borderRadius: 12 }}>
        <Title level={5} style={{ color: '#0f2644', marginBottom: 20 }}>Thông tin cơ bản</Title>
        <Row gutter={[16, 0]}>
          <Col xs={24} md={12}>
            <Form.Item label="Loại biên bản" name="type_id" rules={[{ required: true, message: 'Chọn loại biên bản' }]}>
              <Select placeholder="Chọn loại biên bản" options={(types || []).map((t: MinuteType) => ({ value: t.type_id, label: t.type_name }))} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Tên lớp" name="class_name" rules={[{ required: true, message: 'Nhập tên lớp' }]}>
              <Input placeholder="VD: CNTT01 - K2022" />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item label="Tiêu đề biên bản" name="title" rules={[{ required: true, message: 'Nhập tiêu đề' }]}>
              <Input placeholder="VD: Biên bản họp lớp thang 11/2024" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Ngày họp" name="meeting_date" rules={[{ required: true, message: 'Chọn ngày họp' }]}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
            </Form.Item>
          </Col>
          <Col xs={12} md={8}>
            <Form.Item label="Giờ bắt đầu" name="start_time" rules={[{ required: true, message: 'Chọn giờ' }]}>
              <TimePicker style={{ width: '100%' }} format="HH:mm" placeholder="Giờ bắt đầu" />
            </Form.Item>
          </Col>
          <Col xs={12} md={8}>
            <Form.Item label="Giờ kết thúc" name="end_time" rules={[{ required: true, message: 'Chọn giờ' }]}>
              <TimePicker style={{ width: '100%' }} format="HH:mm" placeholder="Giờ kết thúc" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Địa điểm" name="location">
              <Input placeholder="VD: Phòng A101" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Hình thức hop" name="meeting_form">
              <Select options={[
                { value: 'Trực tiếp', label: 'Trực tiếp' },
                { value: 'Trực tuyến', label: 'Trực tuyến' },
                { value: 'Kết hợp', label: 'Kết hợp' },
              ]} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Chủ tọa" name="host_name">
              <Input placeholder="Họ tên chu toa" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Thư ký" name="secretary_name">
              <Input placeholder="Họ tên thu ky" />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card style={{ marginBottom: 16, borderRadius: 12 }}>
        <Title level={5} style={{ color: '#0f2644', marginBottom: 20 }}>Thành phần dự họp</Title>
        <Row gutter={[16, 0]}>
          <Col xs={24} md={12}>
            <Form.Item label="Tóm tắt thành phần có mặt" name="attendee_summary">
              <TextArea rows={2} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Tóm tắt thành phần vắng mặt" name="absentee_summary">
              <TextArea rows={2} />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left" style={{ fontSize: 13, color: '#64748b' }}>Danh sách tham dự</Divider>
        <Form.List name="participants">
          {(fields, { add, remove }) => (
            <>
              <Table
                dataSource={fields}
                columns={participantColumns.map((col) => col.key === 'action' ? { ...col, render: (_: any, field: any) => col.render(_, field, 0, remove) } : col)}
                rowKey="key"
                pagination={false}
                size="small"
                scroll={{ x: 640 }}
                locale={{ emptyText: 'Chưa có người tham dự' }}
              />
              <Button type="dashed" onClick={() => add({ attendance_status: 'present' })} icon={<PlusOutlined />} style={{ marginTop: 12, borderRadius: 8 }}>
                Thêm người tham dự
              </Button>
            </>
          )}
        </Form.List>
      </Card>

      <Card style={{ marginBottom: 16, borderRadius: 12 }}>
        <Title level={5} style={{ color: '#0f2644', marginBottom: 20 }}>Nội dung cuộc họp</Title>
        <Form.Item label="Mục đích cuộc họp" name="purpose">
          <TextArea rows={2} />
        </Form.Item>
        <Form.Item label="Nội dung thảo luận" name="discussion_content" rules={[{ required: true, message: 'Nhập nội dung thao luan' }]}>
          <TextArea rows={5} />
        </Form.Item>
        <Form.Item label="Kết luận" name="conclusion_content">
          <TextArea rows={3} />
        </Form.Item>
        <Form.Item label="Theo dõi tiếp" name="followup_summary">
          <TextArea rows={2} />
        </Form.Item>
      </Card>

      <Card style={{ marginBottom: 24, borderRadius: 12 }}>
        <Title level={5} style={{ color: '#0f2644', marginBottom: 20 }}>Nhiệm vụ được giao</Title>
        <Form.List name="tasks">
          {(fields, { add, remove }) => (
            <>
              <Table
                dataSource={fields}
                columns={[
                  ...taskColumns,
                  {
                    title: '',
                    key: 'action',
                    width: 52,
                    render: (_: any, field: any) => (
                      <Popconfirm title="Xóa nhiem vu?" onConfirm={() => remove(field.name)} okText="Xóa" cancelText="Hủy">
                        <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                      </Popconfirm>
                    ),
                  },
                ]}
                rowKey="key"
                pagination={false}
                size="small"
                scroll={{ x: 760 }}
                locale={{ emptyText: 'Chưa có nhiệm vụ nào' }}
              />
              <Button type="dashed" onClick={() => add({ task_status: 'pending' })} icon={<PlusOutlined />} style={{ marginTop: 12, borderRadius: 8 }}>
                Thêm nhiệm vụ
              </Button>
            </>
          )}
        </Form.List>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <Button size="large" onClick={() => window.history.back()} style={{ borderRadius: 8 }}>
          Hủy
        </Button>
        <Button type="primary" htmlType="submit" size="large" loading={loading} style={{ borderRadius: 8, fontWeight: 600, minWidth: 140 }}>
          {mode === 'create' ? 'Tạo biên bản' : 'Lưu thay đổi'}
        </Button>
      </div>
    </Form>
  )
}
