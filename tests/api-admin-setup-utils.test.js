import test from 'node:test'
import assert from 'node:assert/strict'

import { USER_ROLES } from '../src/constants/roles.js'
import { createApiError } from '../src/services/api/errors.js'
import {
  appendSessionCreatedOffice,
  buildCreateUserPayload,
  createCredentialResult,
  createEmptyOfficeForm,
  createEmptyPasswordRegenerationForm,
  createEmptyUserForm,
  getApiAdminCapabilityRows,
  mapApiAdminActionError,
  validateOfficeCreateInput,
  validatePasswordRegenerationInput,
  validateUserCreateInput,
} from '../src/pages/admin/apiAdminSetupUtils.js'

test('api admin setup helpers validate exact create-office, create-user, and password-regeneration inputs', () => {
  assert.deepEqual(createEmptyOfficeForm(), { name: '', code: '' })
  assert.deepEqual(createEmptyPasswordRegenerationForm(), { userId: '' })
  assert.deepEqual(createEmptyUserForm(), {
    firstName: '',
    middleName: '',
    lastName: '',
    role: USER_ROLES.OFFICE_USER,
    officeId: '',
    phoneNumber: '',
    accountStatus: 'Active',
  })

  assert.deepEqual(validateOfficeCreateInput({ name: '', code: '' }), {
    name: 'Office name is required.',
    code: 'Office code is required.',
  })

  assert.deepEqual(
    validateUserCreateInput({
      firstName: ' ',
      lastName: '',
      role: 'UNKNOWN',
      officeId: '',
      accountStatus: '',
      temporaryPassword: '',
    }),
    {
      firstName: 'First name is required.',
      lastName: 'Last name is required.',
      role: 'Select a valid role.',
      officeId: 'Select an office.',
      accountStatus: 'Select an account status.',
    },
  )

  assert.deepEqual(validatePasswordRegenerationInput({ userId: '  ' }), {
    userId: 'Enter the user ID.',
  })
})

test('api admin setup helpers build exact API payloads and keep session-created offices in memory only', () => {
  const currentOffices = [{ id: 'office-legal', name: 'Legal Directorate', code: 'LEG', status: 'Active' }]

  assert.deepEqual(
    buildCreateUserPayload({
      firstName: ' Abena ',
      middleName: ' Akosua ',
      lastName: ' Owusu ',
      role: USER_ROLES.SUPERVISOR,
      officeId: ' office-legal ',
      phoneNumber: ' 0200000000 ',
      accountStatus: ' Active ',
      temporaryPassword: ' Password123 ',
    }),
    {
      firstName: 'Abena',
      middleName: 'Akosua',
      lastName: 'Owusu',
      role: USER_ROLES.SUPERVISOR,
      officeId: 'office-legal',
      phoneNumber: '0200000000',
      accountStatus: 'Active',
    },
  )

  const nextOffices = appendSessionCreatedOffice(currentOffices, {
    id: 'office-finance',
    name: 'Finance Directorate',
    code: 'FIN',
    status: 'Active',
  })

  assert.equal(currentOffices.length, 1)
  assert.equal(nextOffices.length, 2)
  assert.equal(nextOffices[0].id, 'office-finance')
  assert.equal(nextOffices[1].id, 'office-legal')
})

test('api admin setup helpers normalize safe error messages and one-time credential results', () => {
  const duplicateError = createApiError('Conflict', {
    status: 409,
    code: 'USER_ALREADY_EXISTS',
    details: {
      officeId: ['The selected office is no longer available.'],
    },
  })

  assert.deepEqual(mapApiAdminActionError(duplicateError, 'Fallback'), {
    form: 'A record with these details may already exist.',
    fields: {
      officeId: 'The selected office is no longer available.',
    },
  })

  const timeoutError = createApiError('Slow', {
    code: 'REQUEST_TIMEOUT',
    isTimeout: true,
  })

  assert.equal(
    mapApiAdminActionError(timeoutError, 'Fallback').form,
    'The server took too long to respond. Please try again.',
  )

  const credentials = createCredentialResult({
    title: 'User account created successfully',
    user: {
      id: 'user-100',
      email: 'abena.owusu@legal.mrh.gov.gh',
      role: USER_ROLES.OFFICE_USER,
      office: {
        id: 'office-legal',
        name: 'Legal Directorate',
        code: 'LEG',
        status: 'Active',
      },
    },
    generatedPassword: 'Password123',
  })

  assert.equal(credentials.title, 'User account created successfully')
  assert.equal(credentials.email, 'abena.owusu@legal.mrh.gov.gh')
  assert.equal(credentials.generatedPassword, 'Password123')
  assert.equal(credentials.roleLabel, 'Office User')
  assert.equal(credentials.officeLabel, 'Legal Directorate')

  const capabilityRows = getApiAdminCapabilityRows()
  assert.equal(capabilityRows.some((row) => row.label === 'Create office' && row.available), true)
  assert.equal(
    capabilityRows.some(
      (row) => row.label === 'List all users' && row.available === false,
    ),
    true,
  )
})
