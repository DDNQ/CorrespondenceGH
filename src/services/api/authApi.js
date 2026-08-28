import {
  clearStoredAuthUser,
  getStoredAuthUser,
  isStoredAuthUserRemembered,
  normalizeAuthenticatedUser,
  normalizeEmail,
  persistAuthUser,
  reconcileAuthenticatedUser,
} from '../../utils/auth.js'
import { createApiError } from './errors.js'
import { apiRequest, requestNewAccessToken } from './httpClient.js'
import { resolveOfficeFromDirectory } from './officeApi.js'
import { clearTokens, getRefreshToken, setTokens } from './tokenStore.js'

export function normalizeLoginResponse(rawResponse) {
  const accessToken =
    typeof rawResponse?.access === 'string' && rawResponse.access.trim()
      ? rawResponse.access.trim()
      : null
  const refreshToken =
    typeof rawResponse?.refresh === 'string' && rawResponse.refresh.trim()
      ? rawResponse.refresh.trim()
      : null
  const user = normalizeAuthenticatedUser(rawResponse?.user ?? null)

  if (!accessToken) {
    throw createApiError('The backend returned an invalid authentication response.', {
      code: 'MISSING_ACCESS_TOKEN',
    })
  }

  if (!refreshToken) {
    throw createApiError('The backend returned an invalid authentication response.', {
      code: 'MISSING_REFRESH_TOKEN',
    })
  }

  if (!user) {
    throw createApiError('The backend returned an invalid authenticated user.', {
      code: 'INVALID_AUTH_USER',
    })
  }

  return {
    accessToken,
    refreshToken,
    user,
  }
}

async function enrichAuthenticatedUserOffice(user, options = {}) {
  if (!user?.office?.id || user.office.name) {
    return user
  }

  const office = await resolveOfficeFromDirectory(user.office, {
    signal: options.signal,
  })

  if (!office?.id || !office.name) {
    return user
  }

  return {
    ...user,
    office,
    officeId: office.id,
    officeName: office.name,
    officeCode: office.code,
    officeStatus: office.status,
  }
}

export async function loginWithApi(email, password, options = {}) {
  const normalizedEmail = normalizeEmail(email ?? '')
  const normalizedPassword = typeof password === 'string' ? password.trim() : ''

  if (!normalizedEmail || !normalizedPassword) {
    throw createApiError('Email address and password are required.', {
      code: 'AUTH_CREDENTIALS_REQUIRED',
    })
  }

  const response = await apiRequest('auth/login/', {
    method: 'POST',
    body: {
      email: normalizedEmail,
      password: normalizedPassword,
    },
    authenticated: false,
    retryOnUnauthorized: false,
    signal: options.signal,
  })

  const normalizedResponse = normalizeLoginResponse(response)
  const authenticatedUser = await enrichAuthenticatedUserOffice(normalizedResponse.user, options)
  setTokens({
    access: normalizedResponse.accessToken,
    refresh: normalizedResponse.refreshToken,
  })
  persistAuthUser(authenticatedUser, Boolean(options.rememberMe))

  try {
    return await getCurrentApiUser({
      signal: options.signal,
      rememberMe: Boolean(options.rememberMe),
    })
  } catch (error) {
    clearApiSession()
    clearStoredAuthUser()
    throw error
  }
}

export async function refreshApiSession() {
  const refreshToken = getRefreshToken()

  if (!refreshToken) {
    clearTokens()
    throw createApiError('Your session has expired. Please sign in again.', {
      code: 'SESSION_EXPIRED',
      status: 401,
      isAuthenticationError: true,
    })
  }

  return requestNewAccessToken(refreshToken)
}

export async function getCurrentApiUser(options = {}) {
  const response = await apiRequest('me/', {
    method: 'GET',
    authenticated: true,
    signal: options.signal,
  })
  const normalizedUser = await enrichAuthenticatedUserOffice(
    reconcileAuthenticatedUser(response, getStoredAuthUser()),
    options,
  )

  if (!normalizedUser) {
    throw createApiError('The backend returned an invalid authenticated user.', {
      code: 'INVALID_AUTH_USER',
    })
  }

  persistAuthUser(normalizedUser, options.rememberMe ?? isStoredAuthUserRemembered())

  return normalizedUser
}

export function clearApiSession() {
  clearTokens()
}

export async function login(credentials = {}) {
  return loginWithApi(credentials.email, credentials.password, credentials)
}

export async function refreshSession() {
  await refreshApiSession()
  return getCurrentApiUser()
}

export async function getCurrentUser(options = {}) {
  return getCurrentApiUser(options)
}

export async function logout() {
  clearApiSession()
}

export const authApiService = Object.freeze({
  login,
  refreshSession,
  getCurrentUser,
  logout,
})
