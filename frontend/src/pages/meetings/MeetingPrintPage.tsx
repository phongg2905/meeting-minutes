import { useQuery } from '@tanstack/react-query'
import { Empty, Spin } from 'antd'
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { keepPreviousDataPlaceholder } from '../../utils/queryKeys'
import MeetingMinuteDocumentView from '../../components/meeting/MeetingMinuteDocumentView'
import { meetingMinutesService } from '../../services'

declare global {
  interface Window {
    __MEETING_MINUTE_PRINT_READY__?: boolean
  }
}

export default function MeetingPrintPage() {
  const { id } = useParams<{ id: string }>()
  const { data: minute, isLoading } = useQuery({
    queryKey: ['meeting-minute-print', id],
    queryFn: () => meetingMinutesService.getOne(Number(id)),
    enabled: !!id,
    retry: 1,
    placeholderData: keepPreviousDataPlaceholder,
  })

  useEffect(() => {
    window.__MEETING_MINUTE_PRINT_READY__ = false
  }, [])

  useEffect(() => {
    if (!isLoading) {
      window.__MEETING_MINUTE_PRINT_READY__ = true
    }
  }, [isLoading])

  useEffect(() => {
    if (minute && !isLoading) {
      const timer = setTimeout(() => {
        window.print()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [minute, isLoading])

  if (isLoading) return <div data-print-ready="true" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><Spin size="large" /></div>
  if (!minute) return <div data-print-ready="true" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><Empty description="Không tìm thấy biên bản" /></div>

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <div className="print-toolbar">
        <button className="btn-print" onClick={() => window.print()}>
          In / Xuất PDF
        </button>
        <button className="btn-back" onClick={() => window.close()}>
          Đóng cửa sổ
        </button>
      </div>
      <div className="print-content" style={{ padding: '0 8px' }}>
        <MeetingMinuteDocumentView minute={minute} typeName={minute.minute_type?.type_name} printable />
      </div>
    </div>
  )
}
