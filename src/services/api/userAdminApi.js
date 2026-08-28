import { normalizeUserRole } from '../../constants/roles.js'
import { normalizeOffice } from '../../utils/offices.js'
import { ApiError, apiRequest, createApiContractMismatchError } from '../apiClient.js'
import { assertApiCapability, API_CAPABILITIES } from './capabilities.js'
import { listOffices, resolveOfficeFromDirectory } from './officeApi.js'
import { createUnsupportedApiOperationError } from './unsupported.js'

function normalizeWhitespace(value = '') {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

function getSafeTopLevelKeys(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return []
  }

  return Object.keys(value).sort()
}

function normalizeUserDirectoryEnvelope(response) {
  if (Array.isArray(response)) {
    return response
  }

  if (response && typeof response === 'object' && !Array.isArray(response)) {
    const supportedEnvelopeKeys = ['count', 'next', 'previous', 'results']
    const responseKeys = Object.keys(response)
    const unsupportedKeys = responseKeys.filter((key) => !supportedEnvelopeKeys.includes(key))

    if (!unsupportedKeys.length && Array.isArray(response.results)) {
      return response.results
    }
  }

  throw createApiContractMismatchError('The user directory response could not be understood.', {
    operation: 'users.list',
    receivedTopLevelType: Array.isArray(response) ? 'array' : typeof response,
    safeTopLevelKeys: getSafeTopLevelKeys(response),
    missingExpectedKeys:
      response && typeof response === 'object' && !Array.isArray(response) && !Array.isArray(response.results)
        ? ['results']
        : [],
  })
}

function enrichUserOffice(user, officeDirectory = []) {
  const normalizedOffice = normalizeOffice(
    user?.office ?? user?.officeId ?? user?.officeName ?? null,
    officeDirectory,
  )

  return {
    ...user,
    office: normalizedOffice,
    officeId: normalizedOffice?.id ?? null,
    officeName: normalizedOffice?.name ?? '',
    officeCode: normalizedOffice?.code ?? null,
    officeStatus: normalizedOffice?.status ?? null,
  }
}

export function normalizeBackendUser(user) {
  const office = normalizeOffice(
    user?.office ??
      user?.officeId ??
      user?.office_id ??
      user?.officeName ??
      user?.office_name ??
      null,
  )

  return {
    id: user?.id ?? null,
    firstName: normalizeWhitespace(user?.firstName ?? user?.first_name ?? ''),
    middleName: normalizeWhitespace(user?.middleName ?? user?.middle_name ?? ''),
    lastName: normalizeWhitespace(user?.lastName ?? user?.last_name ?? ''),
    fullName:
      user?.displayName ??
      user?.display_name ??
      user?.fullName ??
      normalizeWhitespace(
        [user?.firstName ?? user?.first_name, user?.middleName ?? user?.middle_name, user?.lastName ?? user?.last_name]
          .filter(Boolean)
          .join(' '),
      ),
    email: normalizeWhitespace(user?.email ?? ''),
    role: normalizeUserRole(user?.role) ?? '',
    office,
    officeId: office?.id ?? null,
    officeName: office?.name ?? '',
    officeCode: office?.code ?? null,
    officeStatus: office?.status ?? null,
    phoneNumber: normalizeWhitespace(user?.phoneNumber ?? user?.phone_number ?? ''),
    status: user?.accountStatus ?? user?.account_status ?? user?.status ?? 'Active',
    accountStatus: user?.accountStatus ?? user?.account_status ?? user?.status ?? 'Active',
    lastLogin: user?.lastLogin ?? user?.last_login ?? 'Not yet signed in',
    createdAt: user?.createdAt ?? user?.created_at ?? '',
    password: '',
  }
}

function normalizeRoleForBackend(role) {
  const normalizedRole = normalizeUserRole(role)

  if (!normalizedRole) {
    throw new ApiError('Select a valid role.', {
      code: 'VALIDATION_ERROR',
      status: 422,
      details: { role: 'Select a valid role.' },
    })
  }

  return normalizedRole
}

function validateUserCreateInput(input = {}) {
  const firstName = normalizeWhitespace(input.firstName)
  const middleName = normalizeWhitespace(input.middleName)
  const lastName = normalizeWhitespace(input.lastName)
  const officeId = normalizeWhitespace(input.officeId)
  const role = normalizeRoleForBackend(input.role)
  const phoneNumber = normalizeWhitespace(input.phoneNumber)
  const accountStatus = normalizeWhitespace(input.accountStatus)

  if (!firstName || !lastName) {
    throw new ApiError('Enter a valid first name and last name.', {
      code: 'VALIDATION_ERROR',
      status: 422,
      details: {
        ...(firstName ? {} : { firstName: 'First name is required.' }),
        ...(lastName ? {} : { lastName: 'Last name is required.' }),
      },
    })
  }

  if (!officeId) {
    throw new ApiError('Enter a valid backend office ID.', {
      code: 'VALIDATION_ERROR',
      status: 422,
      details: { officeId: 'Enter a valid backend office ID.' },
    })
  }

  return {
    firstName,
    middleName,
    lastName,
    role,
    officeId,
    phoneNumber,
    accountStatus,
  }
}

export function toCreateUserPayload(input = {}) {
  const validatedInput = validateUserCreateInput(input)
  const payload = {
    first_name: validatedInput.firstName,
  }

  if (validatedInput.middleName) {
    payload.middle_name = validatedInput.middleName
  }

  payload.last_name = validatedInput.lastName
  payload.role = validatedInput.role
  payload.office = validatedInput.officeId

  if (validatedInput.phoneNumber) {
    payload.phone_number = validatedInput.phoneNumber
  }

  return payload
}

export function getCreateUserPayloadKeyList(input = {}) {
  return Object.keys(toCreateUserPayload(input))
}

export function normalizeGeneratedCredentialResponse(rawResponse) {
  const generatedPassword = String(
    rawResponse?.generatedPassword ??
      rawResponse?.generated_password ??
      rawResponse?.temporaryPassword ??
      rawResponse?.temporary_password ??
      '',
  ).trim()

  if (!generatedPassword) {
    throw new ApiError('The backend returned an invalid credential response.', {
      code: 'INVALID_GENERATED_PASSWORD_RESPONSE',
    })
  }

  const user = rawResponse?.user ? normalizeBackendUser(rawResponse.user) : null
  const email = normalizeWhitespace(rawResponse?.email ?? user?.email ?? '')

  return {
    user,
    userId: rawResponse?.userId ?? rawResponse?.user_id ?? user?.id ?? null,
    email,
    generatedPassword,
  }
}

export async function createUser(input, options = {}) {
  assertApiCapability(API_CAPABILITIES.USER_CREATE)

  const response = await apiRequest('users/', {
    method: 'POST',
    body: toCreateUserPayload(input),
    authenticated: true,
    signal: options.signal,
  })

  const normalizedUser = normalizeBackendUser(response?.user ?? response)
  const officeReference = normalizedUser.office?.id
    ? normalizedUser.office
    : input?.officeId ?? null
  const office = await resolveOfficeFromDirectory(officeReference, {
    signal: options.signal,
  })

  return {
    user:
      office?.id && office.name
        ? {
            ...normalizedUser,
            office,
            officeId: office.id,
            officeName: office.name,
            officeCode: office.code,
            officeStatus: office.status,
          }
        : normalizedUser,
    generatedPassword: String(
      response?.generatedPassword ??
        response?.generated_password ??
        response?.temporaryPassword ??
        response?.temporary_password ??
        '',
    ).trim() || null,
  }
}

export async function regenerateUserPassword(userId, options = {}) {
  assertApiCapability(API_CAPABILITIES.USER_REGENERATE_PASSWORD)

  const normalizedUserId = String(userId ?? '').trim()

  if (!normalizedUserId) {
    throw new ApiError('A valid user ID is required.', {
      code: 'VALIDATION_ERROR',
      status: 422,
    })
  }

  const response = await apiRequest(`users/${normalizedUserId}/regenerate-password/`, {
    method: 'POST',
    authenticated: true,
    signal: options.signal,
  })

  return normalizeGeneratedCredentialResponse(response)
}

export async function listUsers(options = {}) {
  assertApiCapability(API_CAPABILITIES.USER_LIST)

  const response = await apiRequest('users/', {
    method: 'GET',
    authenticated: true,
    signal: options.signal,
  })

  const rawUsers = normalizeUserDirectoryEnvelope(response)
  let officeDirectory = []

  try {
    officeDirectory = await listOffices({ signal: options.signal })
  } catch {
    officeDirectory = []
  }

  return rawUsers.map((rawUser) => enrichUserOffice(normalizeBackendUser(rawUser), officeDirectory))
}

export async function updateUser() {
  throw createUnsupportedApiOperationError('users.update')
}

export function getExpectedEmailPreview() {
  return ''
}

export const userAdminApiService = Object.freeze({
  listUsers,
  createUser,
  updateUser,
  regenerateUserPassword,
  getExpectedEmailPreview,
})
