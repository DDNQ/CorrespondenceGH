import { Navigate, Route, Routes } from 'react-router-dom'

import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/routing/ProtectedRoute'
import RoleRoute from './components/routing/RoleRoute'
import { ROLES } from './constants/roles'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AuditLogPage from './pages/admin/AuditLogPage'
import UsersOfficesPage from './pages/admin/UsersOfficesPage'
import LoginPage from './pages/auth/LoginPage'
import AccessDeniedPage from './pages/errors/AccessDeniedPage'
import NotFoundPage from './pages/errors/NotFoundPage'
import CorrespondenceDetailPage from './pages/office/CorrespondenceDetailPage'
import CorrespondenceListPage from './pages/office/CorrespondenceListPage'
import DashboardPage from './pages/office/DashboardPage'
import NotificationsPage from './pages/office/NotificationsPage'
import RegisterCorrespondencePage from './pages/office/RegisterCorrespondencePage'
import SettingsPage from './pages/office/SettingsPage'
import OfficeReportsPage from './pages/supervisor/OfficeReportsPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/access-denied" element={<AccessDeniedPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/correspondence" element={<CorrespondenceListPage />} />
          <Route path="/correspondence/:reference" element={<CorrespondenceDetailPage />} />

          <Route
            element={
              <RoleRoute
                allowedRoles={[ROLES.OFFICE_USER, ROLES.OFFICE_SUPERVISOR]}
              />
            }
          >
            <Route path="/correspondence/new" element={<RegisterCorrespondencePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={[ROLES.OFFICE_SUPERVISOR]} />}>
            <Route path="/reports" element={<OfficeReportsPage />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={[ROLES.SYSTEM_ADMIN]} />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/users-offices" element={<UsersOfficesPage />} />
            <Route path="/admin/audit-log" element={<AuditLogPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
