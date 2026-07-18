import { ROLES } from '../constants/roles'

export const AUTH_STORAGE_KEY = 'mrh-auth-user'

export function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

export function getDefaultRouteForRole(role) {
  return role === ROLES.SYSTEM_ADMIN ? '/admin/dashboard' : '/dashboard'
}

export function getStoredAuthUser() {
  const localUser = localStorage.getItem(AUTH_STORAGE_KEY)
  const sessionUser = sessionStorage.getItem(AUTH_STORAGE_KEY)
  const storedUser = localUser ?? sessionUser

  if (!storedUser) {
    return null
  }

  try {
    return JSON.parse(storedUser)
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    sessionStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

export function persistAuthUser(user, rememberMe) {
  const storage = rememberMe ? localStorage : sessionStorage
  const otherStorage = rememberMe ? sessionStorage : localStorage

  otherStorage.removeItem(AUTH_STORAGE_KEY)
  storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
}

export function clearStoredAuthUser() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  sessionStorage.removeItem(AUTH_STORAGE_KEY)
}
