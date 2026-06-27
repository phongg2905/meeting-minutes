import { Typography, Button } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'

const { Text, Title } = Typography

interface EmptyStateProps {
  icon?: ReactNode
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export default function EmptyState({
  icon = <InboxOutlined style={{ fontSize: 48 }} />,
  title = 'Không có dữ liệu',
  description,
  action,
}: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 24,
          background: 'var(--color-surface-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-tertiary)',
          marginBottom: 16,
        }}
      >
        {icon}
      </div>
      <Title level={4} style={{ margin: '0 0 4px', color: 'var(--color-text)' }}>
        {title}
      </Title>
      {description && (
        <Text style={{ color: 'var(--color-text-secondary)', fontSize: 14, maxWidth: 300 }}>
          {description}
        </Text>
      )}
      {action && (
        <Button
          type="primary"
          onClick={action.onClick}
          style={{ marginTop: 16, borderRadius: 10, fontWeight: 600 }}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
