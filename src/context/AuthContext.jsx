import { useMemo, useState } from 'react'

import { mockUsers } from '../data/mockUsers'
import {
  clearStoredAuthUser,
  getStoredAuthUser,
  normalizeEmail,
  persistAuthUser,
} from '../utils/auth'
import AuthContext from './auth-context'

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => getStoredAuthUser())

  const signIn = async ({ email, password, rememberMe }) => {
    const normalizedEmail = normalizeEmail(email)
    const trimmedPassword = password.trim()

    if (!normalizedEmail || !trimmedPassword) {
      throw new Error('Email address and password are required.')
    }

    const matchedUser =
      mockUsers.find(
        (user) =>
          normalizeEmail(user.email) === normalizedEmail && user.password === trimmedPassword,
      ) ?? null

    if (!matchedUser) {
      throw new Error('Invalid email address or password')
    }

    // TODO: Replace this temporary frontend authentication logic with the backend authentication API.
    const authenticatedUser = {
      id: matchedUser.id,
      fullName: matchedUser.fullName,
      email: matchedUser.email,
      role: matchedUser.role,
      officeId: matchedUser.officeId,
      officeName: matchedUser.officeName,
    }

    persistAuthUser(authenticatedUser, rememberMe)
    setCurrentUser(authenticatedUser)

    return authenticatedUser
  }

  const logout = () => {
    clearStoredAuthUser()
    setCurrentUser(null)
  }

  const value = useMemo(
    () => ({
      currentUser,
      isAuthenticated: Boolean(currentUser),
      signIn,
      logout,
    }),
    [currentUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
