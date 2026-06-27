import { useEffect, useMemo } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  TimePicker,
  Typography,
} from 'antd'
import { DeleteOutlined, FileTextOutlined, PlusOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { keepPreviousDataPlaceholder } from '../../utils/queryKeys'
import { minuteTypesService } from '../../services'
import { MeetingMinute, MinuteType } from '../../types'
import {
  buildDefaultMinuteCode,
  buildStructuredMinuteContent,
  getMinuteTemplate,
  getMinuteTypeName,
  getStructuredTemplateDefaults,
} from '../../utils/minuteTemplates'
import { formatTime } from '../../utils'
import MinuteDocumentPreview from './MinuteDocumentPreview'
import StructuredMinuteFields from './StructuredMinuteFields'

const { TextArea } = Input
const { Text, Title } = Typography

interface Props {
  initialValues?: MeetingMinute
  onSubmit: (values: any) => void
  loading?: boolean
  mode?: 'create' | 'edit'
}

function normalizeTemplateData(templateData?: Record<string, any>) {
  if (!templateData) return {}

  if (Array.isArray(templateData.teachers) && templateData.teachers.filter(Boolean).length) {
    return {
      ...templateData,
      teachers: templateData.teachers.map((teacher) => (
        typeof teacher === 'string'
          ? { full_name: teacher }
          : teacher
      )),
    }
  }

  if (templateData.teacher_name) {
    return {
      ...templateData,
      teachers: [{ full_name: templateData.teacher_name }],
    }
  }

  return templateData
}

export default function MeetingForm({ initialValues, onSubmit, loading, mode = 'create' }: Props) {
  const [form] = Form.useForm()
  const selectedTypeId = Form.useWatch('type_id', form)
  const formValues = Form.useWatch([], form)

  const { data: types } = useQuery({
    queryKey: ['minute-types'],
    queryFn: minuteTypesService.getAll,
    staleTime: 5 * 60 * 1000,
  })

  const selectedTypeName = useMemo(() => {
    const fromApi = (types || []).find((type: MinuteType) => type.type_id === selectedTypeId)?.type_name
    return getMinuteTypeName(selectedTypeId, fromApi)
  }, [selectedTypeId, types])

  useEffect(() => {
    if (!initialValues) return

    form.setFieldsValue({
      ...initialValues,
      meeting_date: initialValues.meeting_date ? dayjs(initialValues.meeting_date) : null,
      start_time: initialValues.start_time ? dayjs(`1970-01-01T${formatTime(initialValues.start_time)}`) : null,
      end_time: initialValues.end_time ? dayjs(`1970-01-01T${formatTime(initialValues.end_time)}`) : null,
      template_data: normalizeTemplateData(initialValues.template_data),
      tasks: initialValues.tasks?.map((task) => ({
        ...task,
        deadline: task.deadline ? dayjs(task.deadline).format('YYYY-MM-DD') : undefined,
      })),
    })
  }, [initialValues, form])

  const applyTemplate = (typeId = selectedTypeId, overwrite = true) => {
    const template = getMinuteTemplate(typeId)
    if (!template) return

    const current = form.getFieldsValue()
    form.setFieldsValue({
      minute_code: current.minute_code || buildDefaultMinuteCode(typeId),
      title: overwrite || !current.title ? template.title : current.title,
      purpose: overwrite || !current.purpose ? template.purpose : current.purpose,
      template_data: overwrite || !current.template_data ? getStructuredTemplateDefaults(typeId) : current.template_data,
    })
  }

  const handleTypeChange = (typeId: number) => {
    const template = getMinuteTemplate(typeId)

    form.setFieldsValue({
      type_id: typeId,
      title: template?.title,
      purpose: template?.purpose,
      template_data: getStructuredTemplateDefaults(typeId),
      discussion_content: undefined,
      conclusion_content: undefined,
      followup_summary: undefined,
    })
  }

  const handleFinish = (values: any) => {
    const structuredContent = buildStructuredMinuteContent(values.type_id, values.template_data)
    const templateHostName = values.template_data?.chair_name
    const templateSecretaryName = values.template_data?.secretary_name

    onSubmit({
      ...values,
      minute_code: values.minute_code?.trim(),
      meeting_date: values.meeting_date?.format('YYYY-MM-DD'),
      start_time: values.start_time?.format('HH:mm'),
      end_time: values.end_time?.format('HH:mm'),
      host_name: templateHostName || values.host_name,
      secretary_name: templateSecretaryName || values.secretary_name,
      discussion_content: structuredContent || values.discussion_content || 'Chưa nhập nội dung',
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
        <Popconfirm title="Xóa người tham dự?" onConfirm={() => remove?.(field.name)} okText="Xóa" cancelText="Hủy">
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
      <Form.Item name="discussion_content" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="conclusion_content" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="followup_summary" hidden>
        <Input />
      </Form.Item>

      <Card style={{ marginBottom: 16, borderRadius: 12 }}>
        <Title level={5} style={{ color: '#0f2644', marginBottom: 20 }}>Thông tin cơ bản</Title>
        <Row gutter={[16, 0]}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Mã biên bản"
              name="minute_code"
              rules={[
                { required: true, message: 'Nhập mã biên bản' },
                { max: 50, message: 'Mã biên bản tối đa 50 ký tự' },
              ]}
            >
              <Input placeholder="VD: BB-202605-0001" maxLength={50} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Loại biên bản" name="type_id" rules={[{ required: true, message: 'Chọn loại biên bản' }]}>
              <Select
                placeholder="Chọn loại biên bản"
                onChange={handleTypeChange}
                options={(types || []).map((type: MinuteType) => ({ value: type.type_id, label: getMinuteTypeName(type.type_id, type.type_name) }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message={selectedTypeName || 'Chọn loại biên bản để nạp đúng mẫu'}
              description="Sau khi chọn loại, hệ thống hiển thị các trường nhập cố định theo mẫu. Dữ liệu vẫn được tổng hợp thành nội dung biên bản khi lưu."
              action={selectedTypeId ? (
                <Button size="small" icon={<FileTextOutlined />} onClick={() => applyTemplate(selectedTypeId, true)}>
                  Áp dụng lại mẫu
                </Button>
              ) : undefined}
            />
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Tên lớp" name="class_name" rules={[{ required: true, message: 'Nhập tên lớp' }]}>
              <Input placeholder="VD: CNTT01 - K2022" />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item label="Tiêu đề biên bản" name="title" rules={[{ required: true, message: 'Nhập tiêu đề' }]}>
              <Input placeholder="VD: Biên bản họp lớp tháng 11/2024" />
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
            <Form.Item label="Hình thức họp" name="meeting_form">
              <Select options={[
                { value: 'Trực tiếp', label: 'Trực tiếp' },
                { value: 'Trực tuyến', label: 'Trực tuyến' },
                { value: 'Kết hợp', label: 'Kết hợp' },
              ]} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Chủ tọa / Chủ trì" name="host_name">
              <Input placeholder="Họ tên chủ tọa" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Thư ký" name="secretary_name">
              <Input placeholder="Họ tên thư ký" />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card style={{ marginBottom: 16, borderRadius: 12 }}>
        <Title level={5} style={{ color: '#0f2644', marginBottom: 20 }}>Thành phần dự họp</Title>
        <Row gutter={[16, 0]}>
          <Col xs={24} md={12}>
            <Form.Item label="Tóm tắt thành phần có mặt" name="attendee_summary">
              <TextArea autoSize={{ minRows: 2 }} placeholder="VD: 42 bạn" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Tóm tắt thành phần vắng mặt" name="absentee_summary">
              <TextArea autoSize={{ minRows: 2 }} placeholder="VD: 2 bạn có phép, 1 bạn không phép" />
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
          <TextArea autoSize={{ minRows: 2 }} />
        </Form.Item>
        <StructuredMinuteFields typeId={selectedTypeId} />
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
                      <Popconfirm title="Xóa nhiệm vụ?" onConfirm={() => remove(field.name)} okText="Xóa" cancelText="Hủy">
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

      <Card style={{ marginBottom: 24, borderRadius: 12 }}>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <div>
            <Title level={5} style={{ color: '#0f2644', marginBottom: 4 }}>Xem trước biểu mẫu</Title>
            <Text type="secondary">Bản xem trước dùng cùng dữ liệu với phần xuất PDF ở trang chi tiết.</Text>
          </div>
          <MinuteDocumentPreview
            minute={{
              ...formValues,
              type_id: selectedTypeId,
              discussion_content: buildStructuredMinuteContent(selectedTypeId, formValues?.template_data),
            }}
            typeName={selectedTypeName}
          />
        </Space>
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
