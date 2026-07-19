import { getOfficeById } from '../data/offices'
import { ApiError, apiRequest } from './apiClient'

function normalizeWhitespace(value = '') {
  return value.trim().replace(/\s+/g, ' ')
}

function stripDiacritics(value = '') {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function normalizePreviewPart(value = '') {
  return stripDiacritics(normalizeWhitespace(value))
    .toLowerCase()
    .replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9\s.]/g, ' ')
    .replace(/\s+/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.+|\.+$/g, '')
}

function buildDisplayName({ firstName = '', middleName = '', lastName = '' }) {
  return [firstName, middleName, lastName].map(normalizeWhitespace).filter(Boolean).join(' ')
}

function normalizeBackendUser(user) {
  return {
    id: user.id,
    firstName: normalizeWhitespace(user.firstName ?? ''),
    middleName: normalizeWhitespace(user.middleName ?? ''),
    lastName: normalizeWhitespace(user.lastName ?? ''),
    fullName:
      user.displayName ||
      user.fullName ||
      buildDisplayName({
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
      }),
    email: user.email ?? '',
    role: user.role ?? '',
    officeId: user.officeId ?? '',
    officeName: user.officeName ?? '',
    phoneNumber: normalizeWhitespace(user.phoneNumber ?? ''),
    status: user.accountStatus ?? user.status ?? 'Active',
    accountStatus: user.accountStatus ?? user.status ?? 'Active',
    lastLogin: user.lastLogin ?? 'Not yet signed in',
    createdAt: user.createdAt ?? '',
    password: '',
  }
}

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

export function getExpectedEmailPreview({ firstName = '', lastName = '', officeId = '' }) {
  const office = getOfficeById(officeId)
  const previewFirstName = normalizePreviewPart(firstName)
  const previewLastName = normalizePreviewPart(lastName)
  const username = [previewFirstName, previewLastName].filter(Boolean).join('.')

  if (!office?.emailSubdomain || !username) {
    return ''
  }

  return `${username}@${office.emailSubdomain}.mrh.gov.gh`
}

export async function createUser(payload, options = {}) {
  try {
    const response = await apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
      signal: options.signal,
    })

    if (!response?.user) {
      throw new ApiError('The backend returned an invalid user response.', {
        code: 'INVALID_RESPONSE',
      })
    }

    return {
      user: normalizeBackendUser(response.user),
      auditEntry: response.auditEntry ?? null,
    }
  } catch (error) {
    throw mapUserServiceError(error, 'create')
  }
}

export async function updateUser(userId, payload, options = {}) {
  try {
    const response = await apiRequest(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      signal: options.signal,
    })

    if (!response?.user) {
      throw new ApiError('The backend returned an invalid user response.', {
        code: 'INVALID_RESPONSE',
      })
    }

    return {
      user: normalizeBackendUser(response.user),
      auditEntry: response.auditEntry ?? null,
    }
  } catch (error) {
    throw mapUserServiceError(error, 'update')
  }
}
