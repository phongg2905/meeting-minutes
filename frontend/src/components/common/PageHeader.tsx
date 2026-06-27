import { Typography } from 'antd'
import type { ReactNode } from 'react'

const { Title, Text } = Typography

interface PageHeaderProps {
  title: string
  subtitle?: string
  extra?: ReactNode
  icon?: ReactNode
}

export default function PageHeader({ title, subtitle, extra, icon }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {icon && (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: 'var(--color-primary-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              color: 'var(--color-primary)',
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        )}
        <div>
          <Title className="page-title" style={{ margin: 0 }}>
            {title}
          </Title>
          {subtitle && (
            <Text className="page-subtitle" style={{ margin: 0 }}>
              {subtitle}
            </Text>
          )}
        </div>
      </div>
      {extra && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{extra}</div>}
    </div>
  )
}
