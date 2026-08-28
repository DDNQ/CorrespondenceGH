import test from 'node:test'
import assert from 'node:assert/strict'

import { USER_ROLES } from '../src/constants/roles.js'
import { getOfficeById } from '../src/data/offices.js'
import { getAccessToken, getRefreshToken } from '../src/services/api/tokenStore.js'
import { mockAuthService } from '../src/services/mock/mockAuthService.js'
import { AUTH_STORAGE_KEY } from '../src/utils/auth.js'

class MemoryStorage {
  constructor() {
    this.store = new Map()
  }

  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null
  }

  setItem(key, value) {
    this.store.set(key, String(value))
  }

  removeItem(key) {
    this.store.delete(key)
  }
}

test.beforeEach(() => {
  globalThis.localStorage = new MemoryStorage()
  globalThis.sessionStorage = new MemoryStorage()
  globalThis.fetch = async () => {
    throw new Error('Mock authentication should not issue API requests.')
  }
})

test('existing seeded credentials still sign in with canonical roles', async () => {
  const officeUser = await mockAuthService.login({
    email: 'ama.mensah@mrh.gov.gh',
    password: 'Password123',
    rememberMe: false,
  })
  const supervisor = await mockAuthService.login({
    email: 'kwesi.boateng@mrh.gov.gh',
    password: 'Password123',
    rememberMe: false,
  })
  const admin = await mockAuthService.login({
    email: 'esi.owusu@mrh.gov.gh',
    password: 'Password123',
    rememberMe: true,
  })

  assert.equal(officeUser?.role, USER_ROLES.OFFICE_USER)
  assert.equal(supervisor?.role, USER_ROLES.SUPERVISOR)
  assert.equal(admin?.role, USER_ROLES.ADMIN)
  assert.deepEqual(officeUser?.office, getOfficeById('office-legal'))
  assert.deepEqual(supervisor?.office, getOfficeById('office-legal'))
  assert.deepEqual(admin?.office, getOfficeById('office-ict'))
  assert.equal(sessionStorage.getItem(AUTH_STORAGE_KEY), null)
  assert.equal(localStorage.getItem(AUTH_STORAGE_KEY) !== null, true)
  assert.equal(getAccessToken(), null)
  assert.equal(getRefreshToken(), null)
})

test('invalid seeded credentials remain rejected', async () => {
  await assert.rejects(
    mockAuthService.login({
      email: 'unknown@mrh.gov.gh',
      password: 'Password123',
    }),
    /invalid email address or password/i,
  )
  await assert.rejects(
    mockAuthService.login({
      email: 'ama.mensah@mrh.gov.gh',
      password: 'WrongPassword',
    }),
    /invalid email address or password/i,
  )
})

test('mock logout clears only stored mock auth state', async () => {
  await mockAuthService.login({
    email: 'ama.mensah@mrh.gov.gh',
    password: 'Password123',
    rememberMe: false,
  })

  assert.equal(sessionStorage.getItem(AUTH_STORAGE_KEY) !== null, true)

  await mockAuthService.logout()

  assert.equal(sessionStorage.getItem(AUTH_STORAGE_KEY), null)
  assert.equal(localStorage.getItem(AUTH_STORAGE_KEY), null)
  assert.equal(getAccessToken(), null)
  assert.equal(getRefreshToken(), null)
})
