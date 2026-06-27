import { Breadcrumb, Spin, message } from 'antd'
import { HomeOutlined, EditOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { keepPreviousDataPlaceholder } from '../../utils/queryKeys'
import { useNavigate, useParams } from 'react-router-dom'
import MeetingForm from '../../components/meeting/MeetingForm'
import { meetingMinutesService } from '../../services'
import { PageHeader, FormSkeleton } from '../../components/common'

export default function MeetingEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: minute, isLoading } = useQuery({
    queryKey: ['meeting-minute', id],
    queryFn: () => meetingMinutesService.getOne(Number(id)),
    enabled: !!id,
    placeholderData: keepPreviousDataPlaceholder,
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => meetingMinutesService.update(Number(id), data),
    onSuccess: () => {
      message.success('Cập nhật biên bản thành công!')
      queryClient.invalidateQueries({ queryKey: ['meeting-minutes'] })
      queryClient.invalidateQueries({ queryKey: ['meeting-minute', id] })
      navigate(`/meetings/${id}`)
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Có lỗi xảy ra khi cập nhật')
    },
  })

  if (isLoading) {
    return (
      <div>
        <Breadcrumb
          style={{ marginBottom: 16 }}
          items={[
            { title: <span onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}><HomeOutlined style={{ color: 'var(--color-text-secondary)' }} /></span> },
            { title: <span onClick={() => navigate('/meetings')} style={{ cursor: 'pointer' }}>Biên bản họp</span> },
            { title: '...' },
            { title: 'Chỉnh sửa' },
          ]}
        />
        <PageHeader
          title="Chỉnh sửa biên bản"
          subtitle="Đang tải dữ liệu..."
          icon={<EditOutlined />}
        />
        <FormSkeleton fields={8} />
      </div>
    )
  }

  return (
    <div>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <span onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}><HomeOutlined style={{ color: 'var(--color-text-secondary)' }} /></span> },
          { title: <span onClick={() => navigate('/meetings')} style={{ cursor: 'pointer' }}>Biên bản họp</span> },
          { title: minute?.minute_code },
          { title: 'Chỉnh sửa' },
        ]}
      />
      <PageHeader
        title="Chỉnh sửa biên bản"
        subtitle={`Mã: ${minute?.minute_code}`}
        icon={<EditOutlined />}
      />

      <MeetingForm
        mode="edit"
        initialValues={minute}
        onSubmit={updateMutation.mutate}
        loading={updateMutation.isPending}
      />
    </div>
  )
}
