import test from 'node:test'
import assert from 'node:assert/strict'

import {
  clearAccessToken,
  clearRefreshToken,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  getRefreshTokenStorageKey,
  hasRefreshToken,
  setAccessToken,
  setRefreshToken,
  setTokens,
} from '../src/services/api/tokenStore.js'

class MemoryStorage {
  constructor(shouldThrow = false) {
    this.shouldThrow = shouldThrow
    this.store = new Map()
  }

  getItem(key) {
    if (this.shouldThrow) {
      throw new Error('storage unavailable')
    }

    return this.store.has(key) ? this.store.get(key) : null
  }

  setItem(key, value) {
    if (this.shouldThrow) {
      throw new Error('storage unavailable')
    }

    this.store.set(key, String(value))
  }

  removeItem(key) {
    if (this.shouldThrow) {
      throw new Error('storage unavailable')
    }

    this.store.delete(key)
  }
}

test.beforeEach(() => {
  globalThis.sessionStorage = new MemoryStorage()
  globalThis.localStorage = new MemoryStorage()
  clearTokens()
})

test.afterEach(() => {
  clearTokens()
})

test('token store keeps access tokens in memory only and refresh tokens in sessionStorage', () => {
  setAccessToken('  access-token  ')
  setRefreshToken('  refresh-token  ')

  assert.equal(getAccessToken(), 'access-token')
  assert.equal(getRefreshToken(), 'refresh-token')
  assert.equal(globalThis.sessionStorage.getItem(getRefreshTokenStorageKey()), 'refresh-token')
  assert.equal(globalThis.localStorage.getItem(getRefreshTokenStorageKey()), null)
})

test('token store handles empty token values and clear operations', () => {
  setTokens({ access: 'access-token', refresh: 'refresh-token' })
  clearAccessToken()
  assert.equal(getAccessToken(), null)
  assert.equal(hasRefreshToken(), true)

  clearRefreshToken()
  assert.equal(getRefreshToken(), null)
  assert.equal(hasRefreshToken(), false)

  setTokens({ access: '', refresh: '   ' })
  assert.equal(getAccessToken(), null)
  assert.equal(getRefreshToken(), null)

  clearTokens()
  assert.equal(getAccessToken(), null)
  assert.equal(getRefreshToken(), null)
})

test('token store tolerates unavailable sessionStorage and never touches localStorage for tokens', () => {
  globalThis.sessionStorage = new MemoryStorage(true)
  globalThis.localStorage = new MemoryStorage()

  setRefreshToken('refresh-token')
  assert.equal(getRefreshToken(), null)
  assert.equal(globalThis.localStorage.getItem(getRefreshTokenStorageKey()), null)
})
