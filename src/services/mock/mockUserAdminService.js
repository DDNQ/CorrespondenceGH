import { USER_ROLES } from '../../constants/roles.js'
import { getOfficeById } from '../../data/offices.js'
import { getUsers } from '../../data/users.js'
import { createApiError } from '../api/errors.js'

function normalizeWhitespace(value = '') {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
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

function createMockUserRecord(payload) {
  const office = getOfficeById(payload.officeId)

  if (!office) {
    throw createApiError('The selected office is no longer available.', {
      code: 'OFFICE_NOT_FOUND',
      status: 404,
      details: {
        officeId: 'The selected office is no longer available.',
      },
    })
  }

  if (!payload.firstName?.trim()) {
    throw createApiError('Unable to create the user account. Please review the entered details.', {
      code: 'VALIDATION_ERROR',
      status: 422,
      details: {
        firstName: 'First name is required.',
      },
    })
  }

  if (!Object.values(USER_ROLES).includes(payload.role)) {
    throw createApiError('Unable to create the user account. Please review the entered details.', {
      code: 'VALIDATION_ERROR',
      status: 422,
      details: {
        role: 'Select a valid role.',
      },
    })
  }

  return {
    id: `mock-user-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    firstName: normalizeWhitespace(payload.firstName),
    middleName: normalizeWhitespace(payload.middleName),
    lastName: normalizeWhitespace(payload.lastName),
    fullName: buildDisplayName(payload),
    displayName: buildDisplayName(payload),
    email: getExpectedEmailPreview(payload) || 'pending@mrh.gov.gh',
    role: payload.role,
    office,
    officeId: office.id,
    officeName: office.name,
    officeCode: office.code,
    officeStatus: office.status,
    phoneNumber: normalizeWhitespace(payload.phoneNumber),
    status: payload.accountStatus ?? 'Active',
    accountStatus: payload.accountStatus ?? 'Active',
    lastLogin: 'Not yet signed in',
    createdAt: new Date().toISOString(),
    password: '',
  }
}

export async function createMockUser(payload) {
  return {
    user: createMockUserRecord(payload),
    auditEntry: null,
  }
}

export async function updateMockUser(userId, payload) {
  const mockUser = createMockUserRecord(payload)

  return {
    user: {
      ...mockUser,
      id: userId,
    },
    auditEntry: null,
  }
}

export async function listMockUsers() {
  return getUsers()
}

export async function regenerateMockUserPassword(userId) {
  const user = getUsers().find((item) => item.id === userId) ?? null

  if (!user) {
    throw createApiError('The selected user account could not be found.', {
      code: 'USER_NOT_FOUND',
      status: 404,
    })
  }

  return {
    user,
    userId: user.id,
    email: user.email,
    generatedPassword: 'Password123',
  }
}

export const mockUserAdminService = Object.freeze({
  listUsers: listMockUsers,
  createUser: createMockUser,
  updateUser: updateMockUser,
  regenerateUserPassword: regenerateMockUserPassword,
  getExpectedEmailPreview,
})
