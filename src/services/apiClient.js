const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(message, options = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = options.status
    this.code = options.code
    this.details = options.details
  }
}

async function parseResponseBody(response) {
  const contentType = response.headers.get('content-type') ?? ''

  if (!contentType.includes('application/json')) {
    return null
  }

  try {
    return await response.json()
  } catch {
    return null
  }
}

export function getApiBaseUrl() {
  return API_BASE_URL ?? ''
}

export async function apiRequest(path, options = {}) {
  if (!API_BASE_URL) {
    throw new ApiError(
      'The backend service has not been configured.',
      { code: 'API_NOT_CONFIGURED' },
    )
  }

  const { headers, body, ...restOptions } = options

  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...restOptions,
      body,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
    })
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new ApiError('The request was cancelled.', {
        code: 'REQUEST_ABORTED',
      })
    }

    throw new ApiError(
      'Unable to connect to the user account service. Please try again later.',
      { code: 'NETWORK_ERROR' },
    )
  }

  const data = await parseResponseBody(response)

  if (!response.ok) {
    throw new ApiError(
      typeof data?.message === 'string' && data.message.trim()
        ? data.message
        : 'The request could not be completed.',
      {
        status: response.status,
        code: data?.code,
        details: data?.errors,
      },
    )
  }

  return data
}
