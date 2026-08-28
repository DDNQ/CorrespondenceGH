import { users as seededUsers } from '../../data/users.js'
import {
  clearStoredAuthUser,
  getStoredAuthUser,
  normalizeAuthenticatedUser,
  normalizeEmail,
  persistAuthUser,
} from '../../utils/auth.js'

export async function login(credentials = {}) {
  const normalizedEmail = normalizeEmail(String(credentials.email ?? ''))
  const trimmedPassword = String(credentials.password ?? '').trim()

  if (!normalizedEmail || !trimmedPassword) {
    throw new Error('Email address and password are required.')
  }

  const matchedUser =
    seededUsers.find(
      (user) =>
        normalizeEmail(user.email) === normalizedEmail && user.password === trimmedPassword,
    ) ?? null

  if (!matchedUser) {
    throw new Error('Invalid email address or password')
  }

  const authenticatedUser = normalizeAuthenticatedUser({
    id: matchedUser.id,
    fullName: matchedUser.fullName,
    email: matchedUser.email,
    role: matchedUser.role,
    office: matchedUser.office,
  })

  persistAuthUser(authenticatedUser, Boolean(credentials.rememberMe))
  return authenticatedUser
}

export async function refreshSession() {
  return getStoredAuthUser()
}

export async function getCurrentUser() {
  return getStoredAuthUser()
}

export async function logout() {
  clearStoredAuthUser()
}

export const mockAuthService = Object.freeze({
  login,
  refreshSession,
  getCurrentUser,
  logout,
})
