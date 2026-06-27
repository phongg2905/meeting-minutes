import { Card } from 'antd'
import SkeletonBox from './Skeleton'

interface TableSkeletonProps {
  rows?: number
  columns?: { width: number | string }[]
}

const DEFAULT_COLUMNS = [
  { width: 160 },   // Mã biên bản
  { width: '28%' }, // Tiêu đề
  { width: 180 },   // Loại
  { width: 130 },   // Ngày họp
  { width: 170 },   // Số liệu
  { width: 130 },   // Trạng thái
  { width: 100 },   // Công khai
  { width: 72 },    // Thao tác
]

export default function TableSkeleton({ rows = 6, columns = DEFAULT_COLUMNS }: TableSkeletonProps) {
  return (
    <Card
      style={{
        borderRadius: 16,
        border: '1px solid var(--color-border-light)',
        overflow: 'hidden',
      }}
      bodyStyle={{ padding: 0 }}
    >
      {/* Table header */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          padding: '12px 16px',
          background: 'var(--color-surface-muted)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        {columns.map((col, i) => (
          <div key={i} style={{ width: col.width, flexShrink: 0 }}>
            <div
              className="skeleton-box"
              style={{
                height: 11,
                width: '60%',
                borderRadius: 3,
              }}
              aria-hidden="true"
            />
          </div>
        ))}
      </div>

      {/* Table body skeleton rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="skeleton-table-row"
          style={{
            opacity: 1 - rowIdx * 0.08,
          }}
        >
          {columns.map((col, colIdx) => {
            // Different skeleton shapes for different columns
            const isStatusCol = colIdx === 5
            const isPublicCol = colIdx === 6
            const isActionsCol = colIdx === 7
            const isCodeCol = colIdx === 0
            const isTitleCol = colIdx === 1
            const isCountsCol = colIdx === 4

            return (
              <div key={colIdx} style={{ width: col.width, flexShrink: 0 }}>
                {isStatusCol || isPublicCol ? (
                  <div
                    className="skeleton-box skeleton-badge"
                    style={{
                      width: isStatusCol ? '85%' : '55%',
                      height: 24,
                      margin: isPublicCol ? '0 auto' : undefined,
                    }}
                    aria-hidden="true"
                  />
                ) : isCountsCol ? (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <div className="skeleton-box" style={{ width: 42, height: 22, borderRadius: 4 }} aria-hidden="true" />
                    <div className="skeleton-box" style={{ width: 38, height: 22, borderRadius: 4 }} aria-hidden="true" />
                    <div className="skeleton-box" style={{ width: 36, height: 22, borderRadius: 4 }} aria-hidden="true" />
                  </div>
                ) : isActionsCol ? (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                    <div className="skeleton-box" style={{ width: 28, height: 28, borderRadius: 6 }} aria-hidden="true" />
                  </div>
                ) : (
                  <div
                    className="skeleton-box"
                    style={{
                      height: 14,
                      width: isCodeCol ? '70%' : isTitleCol ? '90%' : '65%',
                      borderRadius: 4,
                    }}
                    aria-hidden="true"
                  />
                )}
              </div>
            )
          })}
        </div>
      ))}
    </Card>
  )
}
