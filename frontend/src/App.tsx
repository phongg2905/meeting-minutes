import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import MainLayout from './components/layout/MainLayout'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import MeetingsListPage from './pages/meetings/MeetingsListPage'
import MeetingCreatePage from './pages/meetings/MeetingCreatePage'
import MeetingEditPage from './pages/meetings/MeetingEditPage'
import MeetingDetailPage from './pages/meetings/MeetingDetailPage'
import UsersPage from './pages/admin/UsersPage'
import ActivityLogsPage from './pages/admin/ActivityLogsPage'
import BackupLogsPage from './pages/admin/BackupLogsPage'
import ProfilePage from './pages/ProfilePage'
import PublicMeetingsListPage from './pages/public/PublicMeetingsListPage'
import PublicMeetingDetailPage from './pages/public/PublicMeetingDetailPage'
import SupportRequestsPage from './pages/support/SupportRequestsPage'
import SystemHealthPage from './pages/admin/SystemHealthPage'
import ManagerRoleRequestPage from './pages/manager/ManagerRoleRequestPage'
import ManagerRoleRequestsPage from './pages/admin/ManagerRoleRequestsPage'

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
    <Routes>
      <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/public/meetings'} replace />} />
      <Route path="/public/meetings" element={<PublicMeetingsListPage />} />
      <Route path="/public/meetings/:id" element={<PublicMeetingDetailPage />} />
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
        <Route path="support" element={<SupportRequestsPage />} />
        <Route path="manager-request" element={<ManagerRoleRequestPage />} />
        <Route path="admin/users" element={<AdminRoute><UsersPage /></AdminRoute>} />
        <Route path="admin/manager-requests" element={<AdminRoute><ManagerRoleRequestsPage /></AdminRoute>} />
        <Route path="admin/activity-logs" element={<AdminRoute><ActivityLogsPage /></AdminRoute>} />
        <Route path="admin/backup-logs" element={<AdminRoute><BackupLogsPage /></AdminRoute>} />
        <Route path="admin/health" element={<AdminRoute><SystemHealthPage /></AdminRoute>} />
      </Route>
      <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/public/meetings'} replace />} />
    </Routes>
  )
}
