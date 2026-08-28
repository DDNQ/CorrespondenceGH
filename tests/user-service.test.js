import test from 'node:test'
import assert from 'node:assert/strict'

import { createUser, getExpectedEmailPreview, updateUser } from '../src/services/userService.js'
import { USER_ROLES } from '../src/constants/roles.js'

test('user service keeps the expected institutional email preview centralized', () => {
  assert.equal(
    getExpectedEmailPreview({
      firstName: 'Abena',
      lastName: 'Owusu',
      officeId: 'office-legal',
    }),
    '',
  )
})

test('user service surfaces safe api-backed errors when create and update cannot reach the service', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => {
    throw new TypeError('Failed to fetch')
  }

  try {
    await assert.rejects(
      createUser({
        firstName: 'Abena',
        middleName: '',
        lastName: 'Owusu',
        role: USER_ROLES.OFFICE_USER,
        officeId: 'office-legal',
        phoneNumber: '0200000000',
        accountStatus: 'Active',
      }),
      (error) =>
        error?.message === 'Unable to connect to the user account service. Please try again later.',
    )

    await assert.rejects(
      updateUser('user-123', {
        firstName: 'Abena',
        middleName: '',
        lastName: 'Owusu',
        role: USER_ROLES.SUPERVISOR,
        officeId: 'office-legal',
        phoneNumber: '0200000000',
        accountStatus: 'Active',
      }),
      (error) =>
        error?.message === 'Unable to update the user account. Please try again.',
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})
