import type { CSSProperties, ReactNode } from 'react'

interface SkeletonBoxProps {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  className?: string
  style?: CSSProperties
}

export default function SkeletonBox({ width, height, borderRadius, className = '', style }: SkeletonBoxProps) {
  return (
    <div
      className={`skeleton-box ${className}`}
      style={{
        width: width ?? '100%',
        height: height ?? 14,
        borderRadius: borderRadius ?? undefined,
        ...style,
      }}
      aria-hidden="true"
    />
  )
}

interface SkeletonTextProps {
  width?: string | number
  lines?: number
  lineHeight?: number
  lastLineWidth?: string | number
}

export function SkeletonText({ width = '100%', lines = 1, lineHeight = 14, lastLineWidth }: SkeletonTextProps) {
  return (
    <div style={{ width }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton-box"
          style={{
            height: lineHeight,
            width: i === lines - 1 && lastLineWidth ? lastLineWidth : '100%',
            marginBottom: 6,
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

interface SkeletonTitleProps {
  width?: string | number
}

export function SkeletonTitle({ width = '60%' }: SkeletonTitleProps) {
  return <div className="skeleton-box skeleton-title" style={{ width }} aria-hidden="true" />
}

interface SkeletonBadgeProps {
  width?: string | number
}

export function SkeletonBadge({ width = 80 }: SkeletonBadgeProps) {
  return <div className="skeleton-box skeleton-badge" style={{ width }} aria-hidden="true" />
}

interface SkeletonAvatarProps {
  size?: number
}

export function SkeletonAvatar({ size = 32 }: SkeletonAvatarProps) {
  return <div className="skeleton-box skeleton-avatar" style={{ width: size, height: size }} aria-hidden="true" />
}

interface SkeletonButtonProps {
  width?: string | number
  height?: number
}

export function SkeletonButton({ width = 120, height = 40 }: SkeletonButtonProps) {
  return <div className="skeleton-box skeleton-button" style={{ width, height }} aria-hidden="true" />
}
