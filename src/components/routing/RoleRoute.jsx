import { Navigate, Outlet } from 'react-router-dom'

import { hasAnyRole } from '../../constants/roles'
import { useAuth } from '../../context/useAuth'

function RoleRoute({ allowedRoles }) {
  const { currentUser } = useAuth()

  if (!currentUser || !hasAnyRole(currentUser, allowedRoles)) {
    return <Navigate to="/access-denied" replace />
  }

  return <Outlet />
}

export default RoleRoute
