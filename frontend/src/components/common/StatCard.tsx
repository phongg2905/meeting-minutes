import { Card, Typography } from 'antd'
import type { ReactNode } from 'react'

const { Text } = Typography

interface StatCardProps {
  title: string
  value: number | string
  icon: ReactNode
  color?: string
  onClick?: () => void
}

export default function StatCard({ title, value, icon, color = '#2563EB', onClick }: StatCardProps) {
  return (
    <Card
      className="stat-card"
      hoverable={!!onClick}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      bodyStyle={{ padding: '18px 20px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Text
            type="secondary"
            style={{
              fontSize: 12,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {title}
          </Text>
          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              color,
              lineHeight: 1.2,
              marginTop: 4,
            }}
          >
            {value}
          </div>
        </div>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: `color-mix(in srgb, ${color} 10%, transparent)`,
            color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
    </Card>
  )
}
