import SkeletonBox, { SkeletonTitle } from './Skeleton'

export default function PageSkeleton() {
  return (
    <div>
      {/* Section label skeleton */}
      <div className="skeleton-box" style={{ height: 11, width: 120, marginBottom: 12, borderRadius: 3 }} aria-hidden="true" />
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <SkeletonTitle width="40%" />
          <div className="skeleton-box" style={{ height: 14, width: '55%', marginTop: 8, borderRadius: 4 }} aria-hidden="true" />
        </div>
        <div className="skeleton-box skeleton-button" style={{ width: 140 }} aria-hidden="true" />
      </div>
    </div>
  )
}
