export const USER_ROLES = Object.freeze({
  OFFICE_USER: 'OFFICE_USER',
  SUPERVISOR: 'SUPERVISOR',
  ADMIN: 'ADMIN',
})

export const ROLES = USER_ROLES

export const USER_ROLE_LABELS = Object.freeze({
  [USER_ROLES.OFFICE_USER]: 'Office User',
  [USER_ROLES.SUPERVISOR]: 'Office Supervisor',
  [USER_ROLES.ADMIN]: 'System Administrator',
})

export function normalizeUserRole(rawRole) {
  if (!rawRole || typeof rawRole !== 'string') {
    return null
  }

  const role = rawRole.trim().toUpperCase()

  switch (role) {
    case USER_ROLES.OFFICE_USER:
      return USER_ROLES.OFFICE_USER
    case USER_ROLES.SUPERVISOR:
    case 'OFFICE_SUPERVISOR':
      return USER_ROLES.SUPERVISOR
    case USER_ROLES.ADMIN:
    case 'SYSTEM_ADMIN':
      return USER_ROLES.ADMIN
    default:
      return null
  }
}

export function getUserRoleLabel(role) {
  const normalizedRole = normalizeUserRole(role)

  if (normalizedRole) {
    return USER_ROLE_LABELS[normalizedRole]
  }

  return typeof role === 'string' && role.trim() ? role.trim() : 'Unknown role'
}

function resolveRole(userOrRole) {
  if (typeof userOrRole === 'string') {
    return normalizeUserRole(userOrRole)
  }

  return normalizeUserRole(userOrRole?.role ?? null)
}

export function isOfficeUser(userOrRole) {
  return resolveRole(userOrRole) === USER_ROLES.OFFICE_USER
}

export function isSupervisor(userOrRole) {
  return resolveRole(userOrRole) === USER_ROLES.SUPERVISOR
}

export function isAdmin(userOrRole) {
  return resolveRole(userOrRole) === USER_ROLES.ADMIN
}

export function canAccessOfficeReports(userOrRole) {
  return isSupervisor(userOrRole)
}

export function canManageUsersAndOffices(userOrRole) {
  return isAdmin(userOrRole)
}

export function canViewSystemAudit(userOrRole) {
  return isAdmin(userOrRole)
}

export function canPerformOfficeWorkflow(userOrRole) {
  return isOfficeUser(userOrRole) || isSupervisor(userOrRole)
}

export function canRegisterCorrespondence(userOrRole) {
  return canPerformOfficeWorkflow(userOrRole)
}

export function canAccessOfficeWorkspace(userOrRole) {
  return canPerformOfficeWorkflow(userOrRole)
}

export function hasAnyRole(userOrRole, allowedRoles = []) {
  const resolvedRole = resolveRole(userOrRole)
  return Boolean(
    resolvedRole &&
      allowedRoles.some((allowedRole) => normalizeUserRole(allowedRole) === resolvedRole),
  )
}
