import { getDefaultRouteForRole } from '../utils/auth.js'

export function getAuthenticatedRouteTarget({ user }) {
  return getDefaultRouteForRole(user?.role)
}

export function canAccessAuthenticatedApplication() {
  return true
}

export function canAccessApiAdministratorSetup() {
  return false
}

export function canAccessPreparedApiRoute() {
  return true
}

export function shouldAttemptApiSessionRestore({ refreshToken }) {
  return typeof refreshToken === 'string' && refreshToken.trim().length > 0
}

export function normalizeAuthenticationError(error) {
  const status = Number.isFinite(error?.status) ? error.status : null
  const code = typeof error?.code === 'string' ? error.code : ''

  if (status === 401) {
    return 'Invalid email or password.'
  }

  if (code === 'REQUEST_TIMEOUT') {
    return 'The server took too long to respond. Please try again.'
  }

  if (code === 'NETWORK_ERROR') {
    return 'Unable to reach the server. Please check your connection and try again.'
  }

  if (
    code === 'INVALID_JSON_RESPONSE' ||
    code === 'INVALID_AUTH_USER' ||
    code === 'MISSING_ACCESS_TOKEN' ||
    code === 'MISSING_REFRESH_TOKEN' ||
    code === 'INVALID_REFRESH_RESPONSE' ||
    code === 'MISSING_REFRESH_ACCESS_TOKEN'
  ) {
    return 'Sign-in could not be completed. Please try again.'
  }

  if (status && status >= 500) {
    return 'Sign-in could not be completed. Please try again.'
  }

  return error?.message ?? 'Sign-in could not be completed. Please try again.'
}
