import { Breadcrumb, Spin, message } from 'antd'
import { HomeOutlined, EditOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import MeetingForm from '../../components/meeting/MeetingForm'
import { meetingMinutesService } from '../../services'

export default function MeetingEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: minute, isLoading } = useQuery({
    queryKey: ['meeting-minute', id],
    queryFn: () => meetingMinutesService.getOne(Number(id)),
    enabled: !!id,
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

  if (isLoading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>

  return (
    <div>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { href: '/dashboard', title: <HomeOutlined /> },
          { href: '/meetings', title: 'Biên bản họp' },
          { href: `/meetings/${id}`, title: minute?.minute_code },
          { title: 'Chỉnh sửa' },
        ]}
      />
      <div className="page-header">
        <div>
          <h1 className="page-title"><EditOutlined /> Chỉnh sửa biên bản</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
            Mã: <strong>{minute?.minute_code}</strong>
          </p>
        </div>
      </div>

      <MeetingForm
        mode="edit"
        initialValues={minute}
        onSubmit={updateMutation.mutate}
        loading={updateMutation.isPending}
      />
    </div>
  )
}
