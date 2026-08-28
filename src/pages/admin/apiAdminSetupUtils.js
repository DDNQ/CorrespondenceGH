import { USER_ROLES, getUserRoleLabel, normalizeUserRole } from '../../constants/roles.js'
import { normalizeOffice } from '../../utils/offices.js'
import { getAdminUserOfficeLabel } from '../../utils/adminUsersOffices.js'

function normalizeWhitespace(value = '') {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

function getDetailMessage(details, key) {
  const value = details?.[key]

  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
    return value[0].trim()
  }

  return ''
}

export function createEmptyOfficeForm() {
  return {
    name: '',
    code: '',
  }
}

export function createEmptyUserForm() {
  return {
    firstName: '',
    middleName: '',
    lastName: '',
    role: USER_ROLES.OFFICE_USER,
    officeId: '',
    phoneNumber: '',
    accountStatus: 'Active',
  }
}

export function createEmptyPasswordRegenerationForm() {
  return {
    userId: '',
  }
}

export function validateOfficeCreateInput(input = {}) {
  const errors = {}

  if (!normalizeWhitespace(input.name)) {
    errors.name = 'Office name is required.'
  }

  if (!normalizeWhitespace(input.code)) {
    errors.code = 'Office code is required.'
  }

  return errors
}

export function validateUserCreateInput(input = {}) {
  const errors = {}

  if (!normalizeWhitespace(input.firstName)) {
    errors.firstName = 'First name is required.'
  }

  if (!normalizeWhitespace(input.lastName)) {
    errors.lastName = 'Last name is required.'
  }

  if (!normalizeUserRole(input.role)) {
    errors.role = 'Select a valid role.'
  }

  if (!normalizeWhitespace(input.officeId)) {
    errors.officeId = 'Select an office.'
  }

  if (!normalizeWhitespace(input.accountStatus)) {
    errors.accountStatus = 'Select an account status.'
  }

  return errors
}

export function validatePasswordRegenerationInput(input = {}) {
  const errors = {}

  if (!normalizeWhitespace(input.userId)) {
    errors.userId = 'Enter the user ID.'
  }

  return errors
}

export function buildCreateUserPayload(input = {}) {
  return {
    firstName: normalizeWhitespace(input.firstName),
    middleName: normalizeWhitespace(input.middleName),
    lastName: normalizeWhitespace(input.lastName),
    role: normalizeUserRole(input.role) ?? '',
    officeId: normalizeWhitespace(input.officeId),
    phoneNumber: normalizeWhitespace(input.phoneNumber),
    accountStatus: normalizeWhitespace(input.accountStatus),
  }
}

export function appendSessionCreatedOffice(currentOffices = [], office) {
  const normalizedOffice = normalizeOffice(office)

  if (!normalizedOffice?.id) {
    return currentOffices
  }

  const remainingOffices = currentOffices.filter((currentOffice) => currentOffice?.id !== normalizedOffice.id)
  return [normalizedOffice, ...remainingOffices]
}

export function mapApiAdminActionError(error, fallbackMessage) {
  const status = Number.isFinite(error?.status) ? error.status : null
  const details =
    error?.details && typeof error.details === 'object' && !Array.isArray(error.details)
      ? error.details
      : {}

  const fieldKeys = [
    'name',
    'code',
    'firstName',
    'middleName',
    'lastName',
    'role',
    'officeId',
    'phoneNumber',
    'accountStatus',
    'userId',
  ]

  const fields = fieldKeys.reduce((accumulator, key) => {
    const message = getDetailMessage(details, key)

    if (message) {
      accumulator[key] = message
    }

    return accumulator
  }, {})

  let formMessage = fallbackMessage

  if (status === 400) {
    formMessage = 'Please review the information and try again.'
  } else if (status === 422) {
    formMessage = 'Please review the information and try again.'
  } else if (status === 401) {
    formMessage = 'Your session has expired. Please sign in again.'
  } else if (status === 403) {
    formMessage = 'You do not have permission to perform this action.'
  } else if (status === 404) {
    formMessage = 'The requested user or resource could not be found.'
  } else if (
    status === 409 ||
    error?.code === 'OFFICE_ALREADY_EXISTS' ||
    error?.code === 'USER_ALREADY_EXISTS'
  ) {
    formMessage = 'A record with these details may already exist.'
  } else if (error?.code === 'REQUEST_TIMEOUT' || error?.isTimeout) {
    formMessage = 'The server took too long to respond. Please try again.'
  } else if (error?.code === 'NETWORK_ERROR' || error?.isNetworkError) {
    formMessage = 'Unable to reach the server. Please check your connection and try again.'
  } else if (status && status >= 500) {
    formMessage = 'The server could not complete the request. Please try again later.'
  } else if (typeof error?.message === 'string' && error.message.trim()) {
    formMessage = error.message.trim()
  }

  return {
    form: formMessage,
    fields,
  }
}

export function createCredentialResult({
  title,
  user,
  email = '',
  generatedPassword = '',
  notice,
}) {
  const normalizedOffice = normalizeOffice(user?.office ?? user?.officeId ?? user?.officeName ?? null)
  const normalizedEmail = normalizeWhitespace(email) || normalizeWhitespace(user?.email)

  return {
    title,
    notice:
      notice ??
      'This temporary password is shown only once. Store it securely and send it to the user through an approved channel.',
    userId: user?.id ?? null,
    email: normalizedEmail,
    generatedPassword: String(generatedPassword ?? '').trim(),
    role: normalizeUserRole(user?.role) ?? null,
    roleLabel: user?.role ? getUserRoleLabel(user.role) : 'Not returned',
    office: normalizedOffice,
    officeLabel: getAdminUserOfficeLabel({
      role: user?.role,
      office: normalizedOffice,
      officeName: user?.officeName ?? null,
    }),
  }
}

export function getApiAdminCapabilityRows() {
  return [
    {
      label: 'Create office',
      available: true,
      description: 'Available now.',
    },
    {
      label: 'Create user',
      available: true,
      description: 'Available now.',
    },
    {
      label: 'Regenerate user password',
      available: true,
      description: 'Available now.',
    },
    {
      label: 'List all users',
      available: false,
      description: 'Not available yet.',
    },
    {
      label: 'View individual user details',
      available: false,
      description: 'Not available yet.',
    },
    {
      label: 'Edit user role or office assignment',
      available: false,
      description: 'Not available yet.',
    },
    {
      label: 'Activate or deactivate users',
      available: false,
      description: 'Not available yet.',
    },
    {
      label: 'List all offices',
      available: false,
      description: 'Not available yet.',
    },
    {
      label: 'Edit or delete offices',
      available: false,
      description: 'Not available yet.',
    },
  ]
}
