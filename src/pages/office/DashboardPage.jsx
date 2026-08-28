import { Navigate } from 'react-router-dom'

import ApiOfficeDashboardWorkspace from '../../components/dashboard/ApiOfficeDashboardWorkspace.jsx'
import { isAdmin } from '../../constants/roles.js'
import { useAuth } from '../../context/useAuth.js'

function DashboardPage() {
  const { currentUser } = useAuth()

  if (isAdmin(currentUser)) {
    return <Navigate to="/admin/dashboard" replace />
  }

  return <ApiOfficeDashboardWorkspace currentUser={currentUser} />
}

export default DashboardPage
