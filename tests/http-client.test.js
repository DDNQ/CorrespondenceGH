import test from 'node:test'
import assert from 'node:assert/strict'

import { setSessionExpiredHandler } from '../src/services/api/sessionEvents.js'
import {
  clearApiHttpStateForTests,
  apiRequest,
  buildApiUrl,
  resolveApiResourceUrl,
} from '../src/services/api/httpClient.js'
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken } from '../src/services/api/tokenStore.js'
import { ApiError } from '../src/services/api/errors.js'
import { buildQueryString } from '../src/services/api/queryString.js'

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

function createJsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

test.beforeEach(() => {
  globalThis.sessionStorage = new MemoryStorage()
  globalThis.localStorage = new MemoryStorage()
  clearApiHttpStateForTests()
})

test.afterEach(() => {
  clearApiHttpStateForTests()
})

test('http client builds api urls and query strings safely', () => {
  assert.equal(
    buildApiUrl('auth/login/', 'https://mrh-backend.onrender.com/api/'),
    'https://mrh-backend.onrender.com/api/auth/login/',
  )
  assert.equal(
    buildApiUrl('/auth/login/', 'https://mrh-backend.onrender.com/api/'),
    'https://mrh-backend.onrender.com/api/auth/login/',
  )
  assert.equal(
    buildApiUrl('api/auth/login/', 'https://mrh-backend.onrender.com/api/'),
    'https://mrh-backend.onrender.com/api/auth/login/',
  )
  assert.equal(buildQueryString({ page: 1, active: false, search: 'road project' }), '?active=false&page=1&search=road+project')
  assert.equal(buildQueryString({ page: null, status: undefined }), '')
  assert.equal(
    resolveApiResourceUrl('https://cdn.example.test/files/contract.pdf'),
    'https://cdn.example.test/files/contract.pdf',
  )
  assert.equal(
    resolveApiResourceUrl('/files/contract.pdf', 'https://mrh-backend.onrender.com/api/'),
    'https://mrh-backend.onrender.com/files/contract.pdf',
  )
  assert.equal(
    resolveApiResourceUrl('files/contract.pdf', 'https://mrh-backend.onrender.com/api/'),
    'https://mrh-backend.onrender.com/api/files/contract.pdf',
  )
})

test('http client serializes json bodies and attaches authorization only when requested', async () => {
  let capturedInit = null

  globalThis.fetch = async (_, init) => {
    capturedInit = init
    return createJsonResponse({ ok: true })
  }

  setAccessToken('access-token')

  await apiRequest('users', {
    method: 'POST',
    body: { firstName: 'Ama', status: null },
    authenticated: true,
  })

  assert.equal(capturedInit.method, 'POST')
  assert.equal(capturedInit.headers.get('Authorization'), 'Bearer access-token')
  assert.equal(capturedInit.headers.get('Content-Type'), 'application/json')
  assert.equal(capturedInit.body, JSON.stringify({ firstName: 'Ama', status: null }))

  await apiRequest('ping', { method: 'GET' })
  assert.equal(capturedInit.headers.get('Authorization'), null)
})

test('http client preserves FormData bodies without forcing multipart content type', async () => {
  let capturedInit = null

  globalThis.fetch = async (_, init) => {
    capturedInit = init
    return createJsonResponse({ ok: true })
  }

  const formData = new FormData()
  formData.append('file', new File(['contract'], 'contract.pdf', { type: 'application/pdf' }))

  await apiRequest('correspondence/mock/attachments/', {
    method: 'POST',
    body: formData,
    authenticated: true,
  })

  assert.equal(capturedInit.body, formData)
  assert.equal(capturedInit.headers.get('Content-Type'), null)
})

test('http client handles 204, empty, validation, forbidden, network, timeout, and caller abort cases', async () => {
  globalThis.fetch = async () => new Response(null, { status: 204 })
  assert.equal(await apiRequest('empty', { method: 'DELETE' }), null)

  globalThis.fetch = async () =>
    new Response('', { status: 200, headers: { 'content-type': 'application/json' } })
  assert.equal(await apiRequest('blank'), null)

  globalThis.fetch = async () =>
    createJsonResponse(
      {
        message: 'Validation failed.',
        code: 'VALIDATION_FAILED',
        errors: { firstName: ['Required.'] },
      },
      422,
    )
  await assert.rejects(
    apiRequest('users', { method: 'POST', body: { firstName: '' } }),
    (error) =>
      error instanceof ApiError &&
      error.status === 422 &&
      error.code === 'VALIDATION_FAILED' &&
      error.errors.firstName[0] === 'Required.',
  )

  globalThis.fetch = async () => createJsonResponse({ message: 'Forbidden.' }, 403)
  await assert.rejects(
    apiRequest('forbidden'),
    (error) => error instanceof ApiError && error.status === 403,
  )

  globalThis.fetch = async () => {
    throw new TypeError('network failure')
  }
  await assert.rejects(
    apiRequest('offline'),
    (error) =>
      error instanceof ApiError &&
      error.code === 'NETWORK_ERROR' &&
      !error.message.includes('access-token'),
  )

  globalThis.fetch = (_, init) =>
    new Promise((_, reject) => {
      init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    })
  await assert.rejects(
    apiRequest('slow', { timeoutMs: 10 }),
    (error) => error instanceof ApiError && error.isTimeout === true && error.code === 'REQUEST_TIMEOUT',
  )

  const callerAbortController = new AbortController()
  globalThis.fetch = (_, init) =>
    new Promise((_, reject) => {
      init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
      setTimeout(() => callerAbortController.abort(), 0)
    })
  await assert.rejects(
    apiRequest('abort', { signal: callerAbortController.signal }),
    (error) => error instanceof ApiError && error.code === 'REQUEST_ABORTED',
  )
})

test('http client refreshes once, retries once, and coordinates concurrent 401 responses', async () => {
  setAccessToken('old-access-token')
  setRefreshToken('refresh-token')

  let refreshCalls = 0
  let secureCalls = 0

  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith('/auth/refresh/')) {
      refreshCalls += 1
      return createJsonResponse({ access: 'new-access-token' })
    }

    if (String(url).endsWith('/secure-resource/')) {
      secureCalls += 1
      const authorizationHeader = init.headers.get('Authorization')

      if (authorizationHeader === 'Bearer old-access-token') {
        return createJsonResponse({ message: 'Expired.' }, 401)
      }

      return createJsonResponse({ ok: true, call: secureCalls })
    }

    return createJsonResponse({ ok: true })
  }

  const [firstResponse, secondResponse] = await Promise.all([
    apiRequest('secure-resource/', { authenticated: true }),
    apiRequest('secure-resource/', { authenticated: true }),
  ])

  assert.equal(refreshCalls, 1)
  assert.equal(secureCalls, 4)
  assert.equal(getAccessToken(), 'new-access-token')
  assert.equal(firstResponse.ok, true)
  assert.equal(secondResponse.ok, true)
})

test('http client clears tokens and invokes the session-expired handler when refresh fails', async () => {
  setAccessToken('expired-access-token')
  setRefreshToken('refresh-token')

  let refreshCalls = 0
  let handlerInvoked = false

  setSessionExpiredHandler(() => {
    handlerInvoked = true
  })

  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/auth/refresh/')) {
      refreshCalls += 1
      return createJsonResponse({ message: 'Expired refresh token.' }, 401)
    }

    return createJsonResponse({ message: 'Expired access token.' }, 401)
  }

  await assert.rejects(
    apiRequest('secure-resource/', { authenticated: true }),
    (error) =>
      error instanceof ApiError &&
      error.code === 'SESSION_EXPIRED' &&
      error.isAuthenticationError === true,
  )

  assert.equal(refreshCalls, 1)
  assert.equal(getAccessToken(), null)
  assert.equal(getRefreshToken(), null)
  assert.equal(handlerInvoked, true)
})

test('http client never refreshes for login or refresh endpoints and never retries twice', async () => {
  setAccessToken('expired-access-token')
  setRefreshToken('refresh-token')

  let refreshCalls = 0

  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/auth/refresh/')) {
      refreshCalls += 1
    }

    return createJsonResponse({ message: 'Unauthorized.' }, 401)
  }

  await assert.rejects(
    apiRequest('auth/login/', {
      method: 'POST',
      body: { email: 'user@example.com', password: 'Password123' },
    }),
    (error) => error instanceof ApiError && error.status === 401,
  )

  await assert.rejects(
    apiRequest('auth/refresh/', {
      method: 'POST',
      body: { refresh: 'refresh-token' },
    }),
    (error) => error instanceof ApiError && error.status === 401,
  )

  assert.equal(refreshCalls, 1)
})
