import { Breadcrumb, message } from 'antd'
import { HomeOutlined, FileAddOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import MeetingForm from '../../components/meeting/MeetingForm'
import { meetingMinutesService } from '../../services'

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
          { href: '/dashboard', title: <HomeOutlined /> },
          { href: '/meetings', title: 'Biên bản họp' },
          { title: 'Tạo mới' },
        ]}
      />
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: '#eff6ff', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 22,
          }}>
            <FileAddOutlined style={{ color: '#1a56a0' }} />
          </div>
          <div>
            <h1 className="page-title" style={{ marginBottom: 0 }}>Tạo biên bản mới</h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
              Điền đầy đủ thông tin để tạo biên bản họp lớp
            </p>
          </div>
        </div>
      </div>

      <MeetingForm
        mode="create"
        onSubmit={createMutation.mutate}
        loading={createMutation.isPending}
      />
    </div>
  )
}
