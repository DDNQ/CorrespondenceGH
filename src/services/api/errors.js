function sanitizeMessage(value, fallback) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

export class ApiError extends Error {
  constructor(message, options = {}) {
    super(sanitizeMessage(message, 'The request could not be completed.'))
    this.name = 'ApiError'
    this.code = options.code ?? 'API_ERROR'
    this.status = Number.isFinite(options.status) ? options.status : null
    this.errors = options.errors ?? null
    this.details = options.details ?? null
    this.isNetworkError = Boolean(options.isNetworkError)
    this.isTimeout = Boolean(options.isTimeout)
    this.isAuthenticationError =
      Boolean(options.isAuthenticationError) || this.status === 401
  }
}

export class ApiContractMismatchError extends ApiError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: options.code ?? 'API_CONTRACT_MISMATCH',
      status: options.status ?? null,
    })
    this.name = 'ApiContractMismatchError'
    this.operation = options.operation ?? ''
    this.receivedTopLevelType = options.receivedTopLevelType ?? null
    this.safeTopLevelKeys = Array.isArray(options.safeTopLevelKeys)
      ? [...options.safeTopLevelKeys]
      : []
    this.missingExpectedKeys = Array.isArray(options.missingExpectedKeys)
      ? [...options.missingExpectedKeys]
      : []
  }
}

export class UnsupportedApiQueryError extends ApiError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: options.code ?? 'API_QUERY_UNSUPPORTED',
      status: options.status ?? null,
    })
    this.name = 'UnsupportedApiQueryError'
    this.operation = options.operation ?? ''
    this.unsupportedParams = Array.isArray(options.unsupportedParams)
      ? [...options.unsupportedParams]
      : []
    this.safeAllowedParams = Array.isArray(options.safeAllowedParams)
      ? [...options.safeAllowedParams]
      : []
  }
}

export function createApiError(message, options = {}) {
  return new ApiError(message, options)
}

export function createApiContractMismatchError(message, options = {}) {
  return new ApiContractMismatchError(message, options)
}

export function createUnsupportedApiQueryError(message, options = {}) {
  return new UnsupportedApiQueryError(message, options)
}

function getDefaultStatusMessage(status) {
  if (status === 400) {
    return 'The request could not be processed.'
  }

  if (status === 401) {
    return 'Your session has expired. Please sign in again.'
  }

  if (status === 403) {
    return 'You do not have permission to perform this action.'
  }

  if (status === 404) {
    return 'The requested resource could not be found.'
  }

  if (status === 409) {
    return 'The request could not be completed because of a conflict.'
  }

  if (status === 413) {
    return 'The submitted request is too large.'
  }

  if (status === 422) {
    return 'The submitted information could not be validated.'
  }

  if (status >= 500) {
    return 'The backend service is currently unavailable. Please try again later.'
  }

  return 'The request could not be completed.'
}

export function normalizeApiError(error, fallbackOptions = {}) {
  if (error instanceof ApiError) {
    return error
  }

  if (error?.name === 'AbortError') {
    return createApiError('The request was cancelled.', {
      code: 'REQUEST_ABORTED',
      isTimeout: Boolean(fallbackOptions.isTimeout),
      ...fallbackOptions,
    })
  }

  if (error && typeof error === 'object') {
    const status = Number.isFinite(error.status) ? error.status : null
    const message = sanitizeMessage(
      error.message,
      status ? getDefaultStatusMessage(status) : 'Unable to connect to the backend service.',
    )

    return createApiError(message, {
      code: error.code ?? fallbackOptions.code ?? 'API_ERROR',
      status,
      errors: error.errors ?? fallbackOptions.errors ?? null,
      details: error.details ?? fallbackOptions.details ?? null,
      isNetworkError:
        fallbackOptions.isNetworkError ?? (!status && error.name === 'TypeError'),
      isTimeout: fallbackOptions.isTimeout ?? false,
      isAuthenticationError:
        fallbackOptions.isAuthenticationError ?? status === 401,
    })
  }

  return createApiError(
    fallbackOptions.message ?? 'Unable to connect to the backend service.',
    fallbackOptions,
  )
}

export function isApiError(error) {
  return error instanceof ApiError
}
