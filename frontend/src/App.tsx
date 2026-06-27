import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

const MainLayout = lazy(() => import('./components/layout/MainLayout'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'))
const MeetingsListPage = lazy(() => import('./pages/meetings/MeetingsListPage'))
const MeetingCreatePage = lazy(() => import('./pages/meetings/MeetingCreatePage'))
const MeetingEditPage = lazy(() => import('./pages/meetings/MeetingEditPage'))
const MeetingDetailPage = lazy(() => import('./pages/meetings/MeetingDetailPage'))
const MeetingPrintPage = lazy(() => import('./pages/meetings/MeetingPrintPage'))
const UsersPage = lazy(() => import('./pages/admin/UsersPage'))
const ActivityLogsPage = lazy(() => import('./pages/admin/ActivityLogsPage'))
const BackupLogsPage = lazy(() => import('./pages/admin/BackupLogsPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const PublicMeetingsListPage = lazy(() => import('./pages/public/PublicMeetingsListPage'))
const PublicMeetingDetailPage = lazy(() => import('./pages/public/PublicMeetingDetailPage'))
const PublicMeetingPrintPage = lazy(() => import('./pages/public/PublicMeetingPrintPage'))
const SupportRequestsPage = lazy(() => import('./pages/support/SupportRequestsPage'))
const SupportTicketsPage = lazy(() => import('./pages/support/SupportTicketsPage'))
const SystemHealthPage = lazy(() => import('./pages/admin/SystemHealthPage'))
const ManagerRoleRequestPage = lazy(() => import('./pages/manager/ManagerRoleRequestPage'))
const ManagerRoleRequestsPage = lazy(() => import('./pages/admin/ManagerRoleRequestsPage'))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/public/meetings" replace />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  return user?.role_id === 1 ? <>{children}</> : <Navigate to="/dashboard" replace />
}

export default function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#1a56a0', fontWeight: 600 }}>Đang tải...</div>}>
      <Routes>
        <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/public/meetings'} replace />} />
        <Route path="/public/meetings" element={<PublicMeetingsListPage />} />
        <Route path="/public/meetings/:id" element={<PublicMeetingDetailPage />} />
        <Route path="/public/meetings/:id/print" element={<PublicMeetingPrintPage />} />
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />
        <Route
          path="/"
          element={<ProtectedRoute><MainLayout /></ProtectedRoute>}
        >
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="meetings" element={<MeetingsListPage />} />
          <Route path="meetings/create" element={<MeetingCreatePage />} />
          <Route path="meetings/:id" element={<MeetingDetailPage />} />
          <Route path="meetings/:id/edit" element={<MeetingEditPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="support" element={<SupportTicketsPage />} />
          <Route path="manager-request" element={<ManagerRoleRequestPage />} />
          <Route path="admin/users" element={<AdminRoute><UsersPage /></AdminRoute>} />
          <Route path="admin/manager-requests" element={<AdminRoute><ManagerRoleRequestsPage /></AdminRoute>} />
          <Route path="admin/activity-logs" element={<AdminRoute><ActivityLogsPage /></AdminRoute>} />
          <Route path="admin/backup-logs" element={<AdminRoute><BackupLogsPage /></AdminRoute>} />
          <Route path="admin/health" element={<AdminRoute><SystemHealthPage /></AdminRoute>} />
        </Route>
        <Route path="/meetings/:id/print" element={<ProtectedRoute><MeetingPrintPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/public/meetings'} replace />} />
      </Routes>
    </Suspense>
  )
}
