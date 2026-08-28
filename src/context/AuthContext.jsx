import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { getServiceBundle, getServiceProviderState } from '../services/serviceProvider.js'
import {
  clearSessionExpiredHandler,
  setSessionExpiredHandler,
} from '../services/api/sessionEvents.js'
import { getRefreshToken } from '../services/api/tokenStore.js'
import { clearStoredAuthUser } from '../utils/auth'
import {
  getAuthenticatedRouteTarget,
  normalizeAuthenticationError,
  shouldAttemptApiSessionRestore,
} from './authRuntime.js'
import AuthContext from './auth-context'

export function AuthProvider({ children }) {
  const providerState = useMemo(() => getServiceProviderState(), [])
  const serviceResolution = useMemo(
    () => ({
      bundle: getServiceBundle(),
      error: null,
    }),
    [],
  )
  const authService = serviceResolution.bundle.auth
  const sessionExpirationHandledRef = useRef(false)

  const [currentUser, setCurrentUser] = useState(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isRestoringSession, setIsRestoringSession] = useState(false)
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false)
  const [authenticationError, setAuthenticationError] = useState('')
  const [sessionExpired, setSessionExpired] = useState(false)

  const clearAuthenticationError = useCallback(() => {
    setAuthenticationError('')
    setSessionExpired(false)
  }, [])

  const handleLocalLogout = useCallback(async () => {
    try {
      await authService?.logout?.()
    } finally {
      clearStoredAuthUser()
      setCurrentUser(null)
    }
  }, [authService])

  const restoreSession = useCallback(async () => {
    setIsRestoringSession(true)
    setIsInitializing(true)

    try {
      const refreshToken = getRefreshToken()

      if (
        !shouldAttemptApiSessionRestore({
          refreshToken,
        })
      ) {
        clearStoredAuthUser()
        setCurrentUser(null)
        return null
      }

      const restoredUser = await authService.refreshSession()
      setCurrentUser(restoredUser ?? null)
      setAuthenticationError('')
      setSessionExpired(false)
      sessionExpirationHandledRef.current = false
      return restoredUser ?? null
    } catch (error) {
      await handleLocalLogout()
      setAuthenticationError(normalizeAuthenticationError(error))
      return null
    } finally {
      setIsRestoringSession(false)
      setIsInitializing(false)
    }
  }, [authService, handleLocalLogout])

  const login = useCallback(
    async ({ email, password, rememberMe }) => {
      clearAuthenticationError()
      setIsSubmittingLogin(true)

      try {
        if (!authService) {
          throw serviceResolution.error ?? new Error('Authentication service is unavailable.')
        }

        const authenticatedUser = await authService.login({ email, password, rememberMe })
        setCurrentUser(authenticatedUser)
        setAuthenticationError('')
        setSessionExpired(false)
        sessionExpirationHandledRef.current = false
        return authenticatedUser
      } catch (error) {
        const normalizedMessage = normalizeAuthenticationError(error)
        setAuthenticationError(normalizedMessage)
        const safeError = new Error(normalizedMessage)
        safeError.code = error?.code ?? null
        throw safeError
      } finally {
        setIsSubmittingLogin(false)
      }
    },
    [authService, clearAuthenticationError, serviceResolution.error],
  )

  const logout = useCallback(async () => {
    sessionExpirationHandledRef.current = false
    await handleLocalLogout()
    setAuthenticationError('')
    setSessionExpired(false)
  }, [handleLocalLogout])

  useEffect(() => {
    const restoreTimer = setTimeout(() => {
      void restoreSession()
    }, 0)

    return () => {
      clearTimeout(restoreTimer)
    }
  }, [restoreSession])

  useEffect(() => {
    const handleSessionExpired = async () => {
      if (sessionExpirationHandledRef.current) {
        return
      }

      sessionExpirationHandledRef.current = true
      await handleLocalLogout()
      setSessionExpired(true)
      setAuthenticationError('Your session has expired. Please sign in again.')
    }

    setSessionExpiredHandler(handleSessionExpired)

    return () => {
      clearSessionExpiredHandler()
    }
  }, [handleLocalLogout])

  const value = useMemo(
    () => ({
      user: currentUser,
      currentUser,
      isAuthenticated: Boolean(currentUser),
      isInitializing,
      isRestoringSession,
      isSubmittingLogin,
      authenticationError,
      sessionExpired,
      activeSource: providerState.activeSource,
      configuredSource: providerState.configuredSource,
      authenticatedRouteTarget: getAuthenticatedRouteTarget({
        user: currentUser,
        activeSource: providerState.activeSource,
      }),
      login,
      signIn: login,
      logout,
      restoreSession,
      clearAuthenticationError,
    }),
    [
      authenticationError,
      clearAuthenticationError,
      currentUser,
      isInitializing,
      isRestoringSession,
      isSubmittingLogin,
      login,
      logout,
      providerState.activeSource,
      providerState.configuredSource,
      restoreSession,
      sessionExpired,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
