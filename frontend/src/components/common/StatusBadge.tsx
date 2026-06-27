import { Tag } from 'antd'
import {
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Đang chỉnh sửa', color: 'default', icon: <FileTextOutlined /> },
  completed: { label: 'Hoàn tất', color: 'success', icon: <CheckCircleOutlined /> },
  pending: { label: 'Chờ duyệt', color: 'warning', icon: <ClockCircleOutlined /> },
  approved: { label: 'Đã duyệt', color: 'success', icon: <CheckCircleOutlined /> },
  rejected: { label: 'Từ chối', color: 'error', icon: <CloseCircleOutlined /> },
}

interface StatusBadgeProps {
  status: string
  type?: 'minute' | 'task' | 'ticket' | 'request'
}

export default function StatusBadge({ status, type = 'minute' }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status]
  if (!cfg) {
    return <Tag>{status}</Tag>
  }

  return (
    <Tag
      color={cfg.color}
      icon={cfg.icon}
      style={{
        borderRadius: 6,
        fontWeight: 600,
        padding: '2px 10px',
        margin: 0,
      }}
    >
      {cfg.label}
    </Tag>
  )
}
