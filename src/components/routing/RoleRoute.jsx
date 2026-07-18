import { Navigate, Outlet } from 'react-router-dom'

import { useAuth } from '../../context/useAuth'

function RoleRoute({ allowedRoles }) {
  const { currentUser } = useAuth()

  if (!currentUser || !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/access-denied" replace />
  }

  return <Outlet />
}

export default RoleRoute
