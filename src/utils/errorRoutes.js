import { ROLES } from '../constants/roles'

export function getDashboardRoute(user) {
  if (!user) {
    return '/login'
  }

  if (user.role === ROLES.SYSTEM_ADMIN) {
    return '/admin/dashboard'
  }

  return '/dashboard'
}
