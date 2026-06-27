type SidebarBadgeProps = {
  count?: number
  dot?: boolean
  severity?: 'info' | 'warning' | 'error'
  label: string
}

const BADGE_COLORS = {
  info: {
    bg: 'var(--color-primary)',
    color: '#fff',
  },
  warning: {
    bg: 'var(--color-warning)',
    color: '#fff',
  },
  error: {
    bg: 'var(--color-danger)',
    color: '#fff',
  },
}

export default function SidebarBadge({
  count = 0,
  dot = false,
  severity = 'info',
  label,
}: SidebarBadgeProps) {
  if (!dot && count <= 0) return null

  const colors = BADGE_COLORS[severity]

  if (dot) {
    return (
      <span
        aria-label={label}
        title={label}
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: colors.bg,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
    )
  }

  const displayCount = count > 99 ? '99+' : String(count)

  return (
    <span
      key={count}
      className="badge-pop"
      aria-label={label}
      title={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        padding: '0 5px',
        background: colors.bg,
        color: colors.color,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1,
        flexShrink: 0,
        animation: 'badge-pop 350ms ease-out',
      }}
    >
      {displayCount}
    </span>
  )
}
