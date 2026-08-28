import { isAdmin, normalizeUserRole } from '../constants/roles.js'
import { normalizeOffice } from './offices.js'

export const AUTH_STORAGE_KEY = 'mrh-auth-user'
export const EMPTY_AUTH_OFFICE = Object.freeze({
  id: null,
  name: '',
  code: null,
  status: null,
})

export function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

function pickNonEmptyString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return null
}

function buildAuthenticatedFullName(user) {
  if (!user || typeof user !== 'object') {
    return ''
  }

  const preferredName = pickNonEmptyString(
    user.fullName,
    user.full_name,
    user.displayName,
    user.display_name,
  )

  if (preferredName) {
    return preferredName
  }

  const firstName = pickNonEmptyString(user.firstName, user.first_name)
  const middleName = pickNonEmptyString(user.middleName, user.middle_name)
  const lastName = pickNonEmptyString(user.lastName, user.last_name)

  return [firstName, middleName, lastName].filter(Boolean).join(' ').trim()
}

function resolveAuthenticatedUserOffice(user) {
  if (!user || typeof user !== 'object') {
    return null
  }

  const directOffice = user.office ?? user.represented_office ?? user.representedOffice ?? null
  const directNormalizedOffice =
    directOffice !== null && directOffice !== undefined
      ? normalizeOffice(directOffice)
      : null
  const officeId = pickNonEmptyString(
    user.officeId,
    user.office_id,
    user.officeUuid,
    user.office_uuid,
    user.representedOfficeId,
    user.represented_office_id,
    directNormalizedOffice?.id,
  )
  const officeName = pickNonEmptyString(
    user.officeName,
    user.office_name,
    user.officeDisplayName,
    user.office_display_name,
    user.representedOfficeName,
    user.represented_office_name,
    directNormalizedOffice?.name,
  )
  const officeCode = pickNonEmptyString(
    user.officeCode,
    user.office_code,
    user.representedOfficeCode,
    user.represented_office_code,
    directNormalizedOffice?.code,
  )
  const officeStatus = pickNonEmptyString(
    user.officeStatus,
    user.office_status,
    user.representedOfficeStatus,
    user.represented_office_status,
    directNormalizedOffice?.status,
  )

  if (directOffice && typeof directOffice === 'object') {
    return {
      ...directOffice,
      id: officeId,
      name: officeName ?? '',
      code: officeCode,
      status: officeStatus,
    }
  }

  if (
    officeId ||
    officeName ||
    officeCode ||
    officeStatus ||
    directNormalizedOffice
  ) {
    return {
      id: officeId,
      name: officeName ?? '',
      code: officeCode,
      status: officeStatus,
    }
  }

  return directOffice
}

function mergeAuthenticatedOffice(normalizedOffice, fallbackOffice) {
  const canonicalOffice = normalizeOffice(normalizedOffice)
  const canonicalFallbackOffice = normalizeOffice(fallbackOffice)

  if (!canonicalOffice) {
    return canonicalFallbackOffice
  }

  if (!canonicalFallbackOffice) {
    return canonicalOffice
  }

  const officeIdsMatch =
    !canonicalOffice.id ||
    !canonicalFallbackOffice.id ||
    canonicalOffice.id === canonicalFallbackOffice.id

  if (!officeIdsMatch) {
    return canonicalOffice
  }

  return normalizeOffice(
    {
      id: canonicalOffice.id ?? canonicalFallbackOffice.id ?? null,
      name: canonicalOffice.name || canonicalFallbackOffice.name || '',
      code: canonicalOffice.code ?? canonicalFallbackOffice.code ?? null,
      status: canonicalOffice.status ?? canonicalFallbackOffice.status ?? null,
    },
  )
}

export function normalizeAuthenticatedUser(user) {
  if (!user || typeof user !== 'object') {
    return null
  }

  const normalizedRole = normalizeUserRole(user.role)
  const normalizedOffice = normalizeOffice(resolveAuthenticatedUserOffice(user))
  const fullName = buildAuthenticatedFullName(user)
  const firstName = pickNonEmptyString(user.firstName, user.first_name)
  const middleName = pickNonEmptyString(user.middleName, user.middle_name)
  const lastName = pickNonEmptyString(user.lastName, user.last_name)

  if (!normalizedRole) {
    return null
  }

  return {
    ...user,
    firstName: firstName ?? '',
    middleName: middleName ?? '',
    lastName: lastName ?? '',
    fullName,
    displayName: fullName,
    role: normalizedRole,
    office: normalizedOffice ?? { ...EMPTY_AUTH_OFFICE },
    officeId: normalizedOffice?.id ?? null,
    officeName: normalizedOffice?.name ?? '',
    officeCode: normalizedOffice?.code ?? null,
    officeStatus: normalizedOffice?.status ?? null,
  }
}

export function reconcileAuthenticatedUser(user, fallbackUser) {
  const normalizedUser = normalizeAuthenticatedUser(user)

  if (!normalizedUser) {
    return null
  }

  const normalizedFallbackUser = normalizeAuthenticatedUser(fallbackUser)
  const mergedOffice = mergeAuthenticatedOffice(
    normalizedUser.office,
    normalizedFallbackUser?.office ?? null,
  )
  const fullName =
    normalizedUser.fullName ||
    normalizedFallbackUser?.fullName ||
    normalizedUser.displayName ||
    normalizedFallbackUser?.displayName ||
    ''

  return {
    ...normalizedFallbackUser,
    ...normalizedUser,
    fullName,
    displayName: fullName,
    office: mergedOffice ?? { ...EMPTY_AUTH_OFFICE },
    officeId: mergedOffice?.id ?? null,
    officeName: mergedOffice?.name ?? '',
    officeCode: mergedOffice?.code ?? null,
    officeStatus: mergedOffice?.status ?? null,
  }
}

export function getDefaultRouteForRole(role) {
  return isAdmin(role) ? '/admin/dashboard' : '/dashboard'
}

export function getStoredAuthUser() {
  const localUser = localStorage.getItem(AUTH_STORAGE_KEY)
  const sessionUser = sessionStorage.getItem(AUTH_STORAGE_KEY)
  const storedUser = localUser ?? sessionUser

  if (!storedUser) {
    return null
  }

  try {
    return normalizeAuthenticatedUser(JSON.parse(storedUser))
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    sessionStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

export function isStoredAuthUserRemembered() {
  try {
    return localStorage.getItem(AUTH_STORAGE_KEY) !== null
  } catch {
    return false
  }
}

export function persistAuthUser(user, rememberMe) {
  const normalizedUser = normalizeAuthenticatedUser(user)

  if (!normalizedUser) {
    clearStoredAuthUser()
    return
  }

  const storage = rememberMe ? localStorage : sessionStorage
  const otherStorage = rememberMe ? sessionStorage : localStorage

  otherStorage.removeItem(AUTH_STORAGE_KEY)
  storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(normalizedUser))
}

export function clearStoredAuthUser() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  sessionStorage.removeItem(AUTH_STORAGE_KEY)
}
