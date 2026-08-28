import { isAdmin } from '../constants/roles'

export function getDashboardRoute(user) {
  if (!user) {
    return '/login'
  }

  if (isAdmin(user)) {
    return '/admin/dashboard'
  }

  return '/dashboard'
}
