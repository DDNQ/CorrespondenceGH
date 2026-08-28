import {
  getConfiguredApiBaseUrl,
  getConfiguredApiTimeoutMs,
  normalizeApiBaseUrl,
} from '../../config/environment.js'
import { clearSessionExpiredHandler, notifySessionExpired } from './sessionEvents.js'
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  hasRefreshToken,
  setAccessToken,
  setRefreshToken,
} from './tokenStore.js'
import { createApiError, normalizeApiError } from './errors.js'

let refreshRequestPromise = null

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function isFormData(value) {
  return typeof FormData !== 'undefined' && value instanceof FormData
}

function isBlob(value) {
  return typeof Blob !== 'undefined' && value instanceof Blob
}

function isFile(value) {
  return typeof File !== 'undefined' && value instanceof File
}

function normalizePath(path = '') {
  const trimmedPath = String(path ?? '').trim()
  return trimmedPath.replace(/^\/+/, '').replace(/\/+$/, '')
}

export function buildApiUrl(path, baseUrl = getConfiguredApiBaseUrl()) {
  const normalizedBaseUrl = String(baseUrl ?? '').trim()

  if (!normalizedBaseUrl) {
    throw createApiError('The backend service has not been configured.', {
      code: 'API_NOT_CONFIGURED',
    })
  }

  const url = new URL(normalizedBaseUrl)
  const pathString = String(path ?? '').trim()
  const [pathnamePart, searchPart = ''] = pathString.split('?')
  let normalizedPath = normalizePath(pathnamePart)
  const basePathname = url.pathname.replace(/\/+$/, '')
  const hadTrailingSlash = /\/+$/.test(pathnamePart)

  if (
    basePathname.endsWith('/api') &&
    (normalizedPath === 'api' || normalizedPath.startsWith('api/'))
  ) {
    normalizedPath = normalizedPath.replace(/^api\/?/, '')
  }

  const joinedPath = [basePathname, normalizedPath].filter(Boolean).join('/').replace(/\/{2,}/g, '/')
  url.pathname = normalizedPath && hadTrailingSlash ? `${joinedPath}/` : joinedPath || '/'
  url.search = searchPart ? `?${searchPart}` : ''

  return url.toString()
}

export function resolveApiResourceUrl(pathOrUrl, baseUrl = getConfiguredApiBaseUrl()) {
  const normalizedValue = String(pathOrUrl ?? '').trim()

  if (!normalizedValue) {
    return null
  }

  try {
    return new URL(normalizedValue).toString()
  } catch {
    return new URL(normalizedValue, normalizeApiBaseUrl(baseUrl)).toString()
  }
}

function isAuthenticationPath(path) {
  const normalizedPath = normalizePath(path).toLowerCase()
  return normalizedPath === 'auth/login/' ||
    normalizedPath === 'auth/login' ||
    normalizedPath === 'auth/refresh/' ||
    normalizedPath === 'auth/refresh'
}

function mergeAbortSignals({ timeoutController, externalSignal }) {
  const abort = (event) => {
    if (!timeoutController.signal.aborted) {
      timeoutController.abort(event?.target?.reason ?? undefined)
    }
  }

  if (externalSignal) {
    if (externalSignal.aborted) {
      abort({ target: externalSignal })
    } else {
      externalSignal.addEventListener('abort', abort, { once: true })
    }
  }

  return () => {
    if (externalSignal) {
      externalSignal.removeEventListener('abort', abort)
    }
  }
}

async function parseResponseBody(response) {
  if (response.status === 204) {
    return null
  }

  const rawText = await response.text()

  if (!rawText.trim()) {
    return null
  }

  const contentType = response.headers.get('content-type') ?? ''

  if (!contentType.toLowerCase().includes('application/json')) {
    return rawText
  }

  try {
    return JSON.parse(rawText)
  } catch {
    throw createApiError('The backend returned an invalid response.', {
      code: 'INVALID_JSON_RESPONSE',
      status: response.status,
      details: rawText,
    })
  }
}

function createRequestOptions({
  method = 'GET',
  body,
  headers = {},
  authenticated = false,
}) {
  const normalizedMethod = String(method).toUpperCase()
  const requestHeaders = new Headers({
    Accept: 'application/json',
    ...headers,
  })
  let requestBody = body

  if (authenticated) {
    const accessToken = getAccessToken()

    if (accessToken) {
      requestHeaders.set('Authorization', `Bearer ${accessToken}`)
    }
  }

  if (!['GET', 'HEAD'].includes(normalizedMethod) && body !== undefined && body !== null) {
    if (isFormData(body) || isBlob(body) || isFile(body)) {
      requestBody = body
    } else if (isPlainObject(body)) {
      requestBody = JSON.stringify(body)
      requestHeaders.set('Content-Type', 'application/json')
    }
  } else {
    requestBody = undefined
  }

  return {
    method: normalizedMethod,
    headers: requestHeaders,
    body: requestBody,
  }
}

function getTimeoutValue(timeoutMs) {
  const fallbackTimeout = getConfiguredApiTimeoutMs()
  const parsedTimeout = Number(timeoutMs)
  return Number.isFinite(parsedTimeout) && parsedTimeout > 0
    ? Math.round(parsedTimeout)
    : fallbackTimeout
}

export async function requestNewAccessToken(refreshToken) {
  const normalizedRefreshToken =
    typeof refreshToken === 'string' && refreshToken.trim() ? refreshToken.trim() : null

  if (!normalizedRefreshToken) {
    clearTokens()
    throw createApiError('Your session has expired. Please sign in again.', {
      code: 'SESSION_EXPIRED',
      status: 401,
      isAuthenticationError: true,
    })
  }

  const response = await apiRequest('auth/refresh/', {
    method: 'POST',
    body: { refresh: normalizedRefreshToken },
    authenticated: false,
    retryOnUnauthorized: false,
  })

  const accessToken =
    typeof response?.access === 'string' && response.access.trim() ? response.access.trim() : null
  const replacementRefreshToken =
    typeof response?.refresh === 'string' && response.refresh.trim()
      ? response.refresh.trim()
      : null

  if (!accessToken) {
    clearTokens()
    throw createApiError('Your session has expired. Please sign in again.', {
      code: 'INVALID_REFRESH_RESPONSE',
      status: 401,
      isAuthenticationError: true,
    })
  }

  setAccessToken(accessToken)
  if (replacementRefreshToken) {
    setRefreshToken(replacementRefreshToken)
  }
  return accessToken
}

async function refreshAccessTokenSingleFlight() {
  if (!refreshRequestPromise) {
    refreshRequestPromise = requestNewAccessToken(getRefreshToken())
      .catch((error) => {
        clearTokens()
        const sessionExpiredError = createApiError(
          'Your session has expired. Please sign in again.',
          {
            code: 'SESSION_EXPIRED',
            status: 401,
            isAuthenticationError: true,
            details: error?.details ?? null,
          },
        )
        notifySessionExpired(sessionExpiredError)
        throw sessionExpiredError
      })
      .finally(() => {
        refreshRequestPromise = null
      })
  }

  return refreshRequestPromise
}

export async function apiRequest(path, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    authenticated = false,
    timeoutMs,
    retryOnUnauthorized = true,
    signal,
    _retryAttempted = false,
  } = options

  const timeoutController = new AbortController()
  const cleanupSignals = mergeAbortSignals({
    timeoutController,
    externalSignal: signal,
  })
  const timeout = getTimeoutValue(timeoutMs)
  const timeoutId = setTimeout(() => {
    timeoutController.abort('timeout')
  }, timeout)

  const requestOptions = createRequestOptions({
    method,
    body,
    headers,
    authenticated,
  })

  try {
    const response = await fetch(buildApiUrl(path), {
      ...requestOptions,
      signal: timeoutController.signal,
    })

    const responseData = await parseResponseBody(response)

    if (
      response.status === 401 &&
      authenticated &&
      retryOnUnauthorized &&
      !_retryAttempted &&
      hasRefreshToken() &&
      !isAuthenticationPath(path)
    ) {
      await refreshAccessTokenSingleFlight()

      return apiRequest(path, {
        ...options,
        _retryAttempted: true,
      })
    }

    if (!response.ok) {
      throw createApiError(
        typeof responseData?.message === 'string' && responseData.message.trim()
          ? responseData.message
          : undefined,
        {
          status: response.status,
          code: responseData?.code ?? `HTTP_${response.status}`,
          errors: responseData?.errors ?? null,
          details: responseData,
          isAuthenticationError: response.status === 401,
        },
      )
    }

    return responseData
  } catch (error) {
    if (error?.name === 'AbortError') {
      const isTimeout = timeoutController.signal.reason === 'timeout'

      throw createApiError(
        isTimeout
          ? 'The server took too long to respond. It may still be starting up. Please try again.'
          : 'The request was cancelled.',
        {
          code: isTimeout ? 'REQUEST_TIMEOUT' : 'REQUEST_ABORTED',
          isTimeout,
          isNetworkError: false,
        },
      )
    }

    if (error instanceof TypeError) {
      throw createApiError('Unable to connect to the backend service. Please try again later.', {
        code: 'NETWORK_ERROR',
        isNetworkError: true,
      })
    }

    throw normalizeApiError(error)
  } finally {
    clearTimeout(timeoutId)
    cleanupSignals()
  }
}

export function clearApiHttpStateForTests() {
  refreshRequestPromise = null
  clearTokens()
  clearSessionExpiredHandler()
}
