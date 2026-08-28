import { ApiError } from './apiClient.js'
import { getServiceBundle } from './serviceProvider.js'

function mapUserServiceError(error, action = 'create') {
  if (error instanceof ApiError) {
    if (error.code === 'API_NOT_CONFIGURED') {
      return new ApiError(
        action === 'create'
          ? 'User account creation is not available because the backend service has not been configured.'
          : 'User account management is not available because the backend service has not been configured.',
        { code: error.code },
      )
    }

    if (error.code === 'NETWORK_ERROR') {
      return new ApiError(
        'Unable to connect to the user account service. Please try again later.',
        { code: error.code },
      )
    }

    if (error.code === 'REQUEST_ABORTED') {
      return error
    }

    if (error.status === 400 || error.status === 422) {
      return new ApiError(
        action === 'create'
          ? 'Unable to create the user account. Please review the entered details.'
          : 'Unable to update the user account. Please review the entered details.',
        {
          status: error.status,
          code: error.code,
          details: error.details,
        },
      )
    }

    if (error.status === 401) {
      return new ApiError('Authentication is required to complete this request.', {
        status: error.status,
        code: error.code,
      })
    }

    if (error.status === 403) {
      return new ApiError('Administrator permission is required to complete this request.', {
        status: error.status,
        code: error.code,
      })
    }

    if (error.status === 404) {
      return new ApiError('The selected office is no longer available.', {
        status: error.status,
        code: error.code,
      })
    }

    if (error.status === 409) {
      return new ApiError(
        action === 'create'
          ? 'Unable to create the account because the generated email is already in use.'
          : 'Unable to update the account because a conflicting user record already exists.',
        {
          status: error.status,
          code: error.code,
        },
      )
    }

    if (error.status >= 500) {
      return new ApiError('The backend service is currently unavailable. Please try again later.', {
        status: error.status,
        code: error.code,
      })
    }

    return error
  }

  return new ApiError(
    action === 'create'
      ? 'Unable to create the user account. Please try again.'
      : 'Unable to update the user account. Please try again.',
  )
}

export function getExpectedEmailPreview(input) {
  return getServiceBundle().users.getExpectedEmailPreview(input)
}

export async function createUser(payload, options = {}) {
  try {
    return await getServiceBundle().users.createUser(payload, options)
  } catch (error) {
    throw mapUserServiceError(error, 'create')
  }
}

export async function updateUser(userId, payload, options = {}) {
  try {
    return await getServiceBundle().users.updateUser(userId, payload, options)
  } catch (error) {
    throw mapUserServiceError(error, 'update')
  }
}
