import { Typography } from 'antd'

const { Text } = Typography

interface TableRefreshIndicatorProps {
    visible?: boolean
    text?: string
}

export default function TableRefreshIndicator({ visible = false, text = 'Đang cập nhật dữ liệu...' }: TableRefreshIndicatorProps) {
    if (!visible) return null

    return (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span
                    style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'var(--color-primary)',
                        opacity: 0.8,
                        display: 'inline-block',
                    }}
                />
                {text}
            </Text>
        </div>
    )
}
