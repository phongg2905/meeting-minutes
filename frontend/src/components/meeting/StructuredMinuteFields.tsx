import { Button, Card, Col, Empty, Form, Input, Row, Space, Table, Typography } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { STRUCTURED_TEMPLATE_SECTIONS } from '../../utils/minuteTemplates'

const { TextArea } = Input
const { Text } = Typography

type Props = {
  typeId?: number
}

export default function StructuredMinuteFields({ typeId }: Props) {
  const sections = typeId ? STRUCTURED_TEMPLATE_SECTIONS[typeId] : undefined

  if (!sections?.length) {
    return <Empty description="Chọn loại biên bản để hiển thị các trường nội dung tương ứng" />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {sections.map((section) => (
        <Card key={section.title} size="small" style={{ borderRadius: 8 }}>
          <Text strong style={{ display: 'block', marginBottom: 12, color: '#0f2644' }}>
            {section.title}
          </Text>
          <Row gutter={[16, 0]}>
            {section.fields.map((field) => (
              <Col
                key={field.name}
                xs={24}
                md={field.type === 'textarea' || field.type === 'table' ? 24 : 12}
              >
                <Form.Item
                  label={field.label}
                  name={field.type === 'table' ? undefined : ['template_data', field.name]}
                  rules={
                    field.type !== 'table' && field.required
                      ? [{ required: true, message: `Nhập ${field.label.toLowerCase()}` }]
                      : undefined
                  }
                >
                  {field.type === 'textarea' ? (
                    <TextArea autoSize={{ minRows: 2 }} placeholder={field.placeholder} />
                  ) : field.type === 'table' ? (
                    <Form.List name={['template_data', field.name]} initialValue={[{}]}>
                      {(rows, { add, remove }) => (
                        <Space direction="vertical" size={10} style={{ width: '100%' }}>
                          <Table
                            bordered
                            pagination={false}
                            size="small"
                            rowKey="key"
                            dataSource={rows}
                            scroll={{ x: 640 }}
                            columns={[
                              ...(field.columns || []).map((column) => ({
                                title: column.label,
                                key: column.name,
                                render: (_: any, row: any) => (
                                  <Form.Item name={[row.name, column.name]} style={{ margin: 0 }}>
                                    <Input
                                      type={column.type === 'number' ? 'number' : 'text'}
                                      placeholder={column.placeholder}
                                    />
                                  </Form.Item>
                                ),
                              })),
                              {
                                title: '',
                                key: 'action',
                                width: 52,
                                render: (_: any, row: any) => (
                                  <Button
                                    type="text"
                                    danger
                                    size="small"
                                    icon={<DeleteOutlined />}
                                    disabled={rows.length <= 1}
                                    onClick={() => remove(row.name)}
                                  />
                                ),
                              },
                            ]}
                          />
                          <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({})}>
                            {field.name === 'teachers' ? 'Thêm giáo viên' : 'Thêm hàng'}
                          </Button>
                        </Space>
                      )}
                    </Form.List>
                  ) : (
                    <Input type={field.type === 'number' ? 'number' : 'text'} placeholder={field.placeholder} />
                  )}
                </Form.Item>
              </Col>
            ))}
          </Row>
        </Card>
      ))}
    </div>
  )
}
