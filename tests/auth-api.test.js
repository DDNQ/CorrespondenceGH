import test from 'node:test'
import assert from 'node:assert/strict'

import {
  clearApiSession,
  getCurrentApiUser,
  loginWithApi,
  normalizeLoginResponse,
  refreshApiSession,
} from '../src/services/api/authApi.js'
import { clearApiHttpStateForTests } from '../src/services/api/httpClient.js'
import { clearOfficeDirectoryCacheForTests } from '../src/services/api/officeApi.js'
import { getAccessToken, getRefreshToken, setRefreshToken } from '../src/services/api/tokenStore.js'
import { ApiError } from '../src/services/api/errors.js'
import { getStoredAuthUser, persistAuthUser } from '../src/utils/auth.js'

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
  clearOfficeDirectoryCacheForTests()
})

test.afterEach(() => {
  clearApiHttpStateForTests()
  clearOfficeDirectoryCacheForTests()
})

test('normalizeLoginResponse validates tokens and normalizes the authenticated user', () => {
  const normalized = normalizeLoginResponse({
    access: 'access-token',
    refresh: 'refresh-token',
    user: {
      id: 'user-legal-1',
      fullName: 'Ama Mensah',
      email: 'ama.mensah@mrh.gov.gh',
      role: 'OFFICE_USER',
      office: 'office-legal',
    },
  })

  assert.equal(normalized.accessToken, 'access-token')
  assert.equal(normalized.refreshToken, 'refresh-token')
  assert.equal(normalized.user.role, 'OFFICE_USER')
  assert.equal(normalized.user.office?.id, 'office-legal')
  assert.equal(
    normalizeLoginResponse({
      access: 'access-supervisor',
      refresh: 'refresh-supervisor',
      user: {
        id: 'user-supervisor-1',
        fullName: 'Kwesi Boateng',
        email: 'kwesi.boateng@mrh.gov.gh',
        role: 'SUPERVISOR',
        office: '10272b78-9ec7-4853-be7a-ac313a584165',
        office_name: 'Correspondence Integration Test Office',
      },
    }).user.office?.name,
    'Correspondence Integration Test Office',
  )
  assert.deepEqual(
    normalizeLoginResponse({
      access: 'access-admin',
      refresh: 'refresh-admin',
      user: {
        id: 'user-admin-1',
        fullName: 'Esi Owusu',
        email: 'esi.owusu@mrh.gov.gh',
        role: 'ADMIN',
        office: null,
      },
    }).user.office,
    {
      id: null,
      name: '',
      code: null,
      status: null,
    },
  )

  assert.throws(() => normalizeLoginResponse({ refresh: 'refresh-token', user: {} }), /invalid authentication response/i)
  assert.throws(() => normalizeLoginResponse({ access: 'access-token', user: {} }), /invalid authentication response/i)
  assert.throws(
    () => normalizeLoginResponse({ access: 'access-token', refresh: 'refresh-token', user: { role: 'UNKNOWN_ROLE' } }),
    /invalid authenticated user/i,
  )
})

test('loginWithApi sends credentials, stores tokens, and returns a canonical user', async () => {
  const capturedRequests = []

  globalThis.fetch = async (url, init) => {
    capturedRequests.push({ url: String(url), init })

    if (String(url).endsWith('/auth/login/')) {
      return createJsonResponse({
        access: 'access-token',
        refresh: 'refresh-token',
        user: {
          id: 'user-supervisor-1',
          fullName: 'Kwesi Boateng',
          email: 'kwesi.boateng@mrh.gov.gh',
          role: 'SUPERVISOR',
          office: 'Correspondence Integration Test Office',
        },
      })
    }

    if (String(url).endsWith('/me/')) {
      assert.equal(init.headers.get('Authorization'), 'Bearer access-token')
      return createJsonResponse({
        id: 'user-supervisor-1',
        first_name: 'Kwesi',
        last_name: 'Boateng',
        email: 'kwesi.boateng@mrh.gov.gh',
        role: 'SUPERVISOR',
        office: '3e8043fb-e811-42db-b5ad-138d64a36d7c',
      })
    }

    return createJsonResponse({})
  }

  const user = await loginWithApi(' Kwesi.Boateng@mrh.gov.gh ', 'Password123', {
    rememberMe: true,
  })

  assert.equal(capturedRequests.length, 2)
  assert.ok(capturedRequests[0].url.endsWith('/auth/login/'))
  assert.equal(
    capturedRequests[0].init.body,
    JSON.stringify({ email: 'kwesi.boateng@mrh.gov.gh', password: 'Password123' }),
  )
  assert.equal(getAccessToken(), 'access-token')
  assert.equal(getRefreshToken(), 'refresh-token')
  assert.equal(user.email, 'kwesi.boateng@mrh.gov.gh')
  assert.equal(user.office?.id, '3e8043fb-e811-42db-b5ad-138d64a36d7c')
  assert.equal(user.office?.name, 'Correspondence Integration Test Office')
  assert.equal(getStoredAuthUser()?.email, 'kwesi.boateng@mrh.gov.gh')
  assert.equal(getStoredAuthUser()?.officeId, '3e8043fb-e811-42db-b5ad-138d64a36d7c')
  assert.equal(getStoredAuthUser()?.officeName, 'Correspondence Integration Test Office')
  assert.equal(globalThis.localStorage.getItem('mrh-auth-user') !== null, true)
})

test('refreshApiSession and getCurrentApiUser use the prepared authenticated transport', async () => {
  setRefreshToken('refresh-token')
  persistAuthUser(
    {
      id: 'user-supervisor-1',
      fullName: 'Kwesi Boateng',
      email: 'kwesi.boateng@mrh.gov.gh',
      role: 'SUPERVISOR',
      office: 'Correspondence Integration Test Office',
    },
    false,
  )

  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith('/auth/refresh/')) {
      return createJsonResponse({ access: 'new-access-token' })
    }

    if (String(url).endsWith('/me/')) {
      assert.equal(init.headers.get('Authorization'), 'Bearer new-access-token')
      return createJsonResponse({
        id: 'user-supervisor-1',
        first_name: 'Kwesi',
        last_name: 'Boateng',
        email: 'kwesi.boateng@mrh.gov.gh',
        role: 'SUPERVISOR',
        office: '11afda65-e13b-43b0-a76b-dfb9b5f34e7b',
      })
    }

    return createJsonResponse({})
  }

  const refreshedAccessToken = await refreshApiSession()
  const user = await getCurrentApiUser()

  assert.equal(refreshedAccessToken, 'new-access-token')
  assert.equal(user.role, 'SUPERVISOR')
  assert.equal(user.fullName, 'Kwesi Boateng')
  assert.equal(user.office?.id, '11afda65-e13b-43b0-a76b-dfb9b5f34e7b')
  assert.equal(user.office?.name, 'Correspondence Integration Test Office')
  assert.equal(getRefreshToken(), 'refresh-token')
  assert.equal(getStoredAuthUser()?.officeName, 'Correspondence Integration Test Office')
})

test('refreshApiSession persists replacement refresh tokens when the backend rotates them', async () => {
  setRefreshToken('stale-refresh-token')

  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/auth/refresh/')) {
      return createJsonResponse({
        access: 'new-access-token',
        refresh: 'rotated-refresh-token',
      })
    }

    return createJsonResponse({})
  }

  const refreshedAccessToken = await refreshApiSession()

  assert.equal(refreshedAccessToken, 'new-access-token')
  assert.equal(getAccessToken(), 'new-access-token')
  assert.equal(getRefreshToken(), 'rotated-refresh-token')
})

test('getCurrentApiUser enriches identifier-only office values from the live office directory once it is available', async () => {
  const requests = []

  globalThis.fetch = async (url, init) => {
    requests.push(String(url))

    if (String(url).endsWith('/auth/login/')) {
      return createJsonResponse({
        access: 'access-token',
        refresh: 'refresh-token',
        user: {
          id: 'user-destination-1',
          fullName: 'Forwarding Verify',
          email: 'forwarding.verify@fin.mrh.gov.gh',
          role: 'SUPERVISOR',
          office: '238cf6e0-6dae-48a5-b872-a9802e784803',
        },
      })
    }

    if (String(url).endsWith('/me/')) {
      assert.equal(init.headers.get('Authorization'), 'Bearer access-token')
      return createJsonResponse({
        id: 'user-destination-1',
        fullName: 'Forwarding Verify',
        email: 'forwarding.verify@fin.mrh.gov.gh',
        role: 'SUPERVISOR',
        office: '238cf6e0-6dae-48a5-b872-a9802e784803',
      })
    }

    if (String(url).endsWith('/offices/')) {
      return createJsonResponse([
        {
          id: '238cf6e0-6dae-48a5-b872-a9802e784803',
          name: 'testFINACIAL OFFICE',
          code: 'FIN',
          status: 'Active',
        },
      ])
    }

    return createJsonResponse({})
  }

  const user = await loginWithApi('forwarding.verify@fin.mrh.gov.gh', 'Password123')

  assert.equal(user.office?.id, '238cf6e0-6dae-48a5-b872-a9802e784803')
  assert.equal(user.office?.name, 'testFINACIAL OFFICE')
  assert.equal(getStoredAuthUser()?.officeName, 'testFINACIAL OFFICE')
  assert.equal(requests.filter((url) => url.endsWith('/offices/')).length, 1)
})

test('clearApiSession removes stored tokens and auth functions surface normalized errors', async () => {
  clearApiSession()
  assert.equal(getAccessToken(), null)
  assert.equal(getRefreshToken(), null)

  globalThis.fetch = async () => createJsonResponse({ message: 'Unauthorized.' }, 401)

  await assert.rejects(
    loginWithApi('ama.mensah@mrh.gov.gh', 'Password123'),
    (error) => error instanceof ApiError && error.status === 401,
  )
})
