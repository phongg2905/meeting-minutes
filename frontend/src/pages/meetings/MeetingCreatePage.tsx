import { Breadcrumb, message } from 'antd'
import { HomeOutlined, FileAddOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import MeetingForm from '../../components/meeting/MeetingForm'
import { meetingMinutesService } from '../../services'
import { PageHeader } from '../../components/common'

export default function MeetingCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: meetingMinutesService.create,
    onSuccess: (data) => {
      message.success('Tạo biên bản thành công!')
      queryClient.invalidateQueries({ queryKey: ['meeting-minutes'] })
      navigate(`/meetings/${data.minute_id}`)
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Có lỗi xảy ra khi tạo biên bản')
    },
  })

  return (
    <div>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <span onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}><HomeOutlined style={{ color: 'var(--color-text-secondary)' }} /></span> },
          { title: <span onClick={() => navigate('/meetings')} style={{ cursor: 'pointer' }}>Biên bản họp</span> },
          { title: 'Tạo mới' },
        ]}
      />
      <PageHeader
        title="Tạo biên bản mới"
        subtitle="Điền đầy đủ thông tin để tạo biên bản họp lớp"
        icon={<FileAddOutlined />}
      />

      <MeetingForm
        mode="create"
        onSubmit={createMutation.mutate}
        loading={createMutation.isPending}
      />
    </div>
  )
}
