import test from 'node:test'
import assert from 'node:assert/strict'

import {
  assertApiApplicationReadyForAuthenticatedRoutes,
  getApiApplicationReadiness,
  isApiAdministratorSetupReady,
  isApiAuthenticationIntegrated,
  isApiDomainIntegrationComplete,
} from '../src/config/apiApplicationReadiness.js'
import {
  canAccessApiAdministratorSetup,
  canAccessAuthenticatedApplication,
  canAccessPreparedApiRoute,
  getAuthenticatedRouteTarget,
  normalizeAuthenticationError,
  shouldAttemptApiSessionRestore,
} from '../src/context/authRuntime.js'
import { USER_ROLES } from '../src/constants/roles.js'
import { createApiError } from '../src/services/api/errors.js'
import { normalizeAuthenticatedUser } from '../src/utils/auth.js'

test('api readiness now reflects a production authenticated runtime', () => {
  const readiness = getApiApplicationReadiness()

  assert.deepEqual(readiness.authentication, {
    login: true,
    restoreSession: true,
    logout: true,
  })
  assert.deepEqual(readiness.dashboards, {
    officeDashboardLiveVerified: true,
    adminDashboardLiveVerified: true,
  })
  assert.equal(readiness.authenticatedApplicationReady, true)
  assert.equal(isApiAuthenticationIntegrated(), true)
  assert.equal(isApiAdministratorSetupReady(), true)
  assert.equal(isApiDomainIntegrationComplete(), true)
  assert.equal(assertApiApplicationReadyForAuthenticatedRoutes(), true)
})

test('authenticated route targeting resolves directly by canonical role', () => {
  const adminUser = normalizeAuthenticatedUser({
    id: 'user-admin-1',
    fullName: 'Esi Owusu',
    email: 'esi.owusu@mrh.gov.gh',
    role: USER_ROLES.ADMIN,
    office: null,
  })
  const officeUser = normalizeAuthenticatedUser({
    id: 'user-office-1',
    fullName: 'Ama Mensah',
    email: 'ama.mensah@mrh.gov.gh',
    role: USER_ROLES.OFFICE_USER,
    office: { id: 'office-legal', name: 'Legal Directorate', code: 'LEG', status: 'Active' },
  })
  const supervisorUser = normalizeAuthenticatedUser({
    id: 'user-supervisor-1',
    fullName: 'Kwesi Boateng',
    email: 'kwesi.boateng@mrh.gov.gh',
    role: USER_ROLES.SUPERVISOR,
    office: { id: 'office-legal', name: 'Legal Directorate', code: 'LEG', status: 'Active' },
  })

  assert.equal(getAuthenticatedRouteTarget({ user: adminUser }), '/admin/dashboard')
  assert.equal(getAuthenticatedRouteTarget({ user: officeUser }), '/dashboard')
  assert.equal(getAuthenticatedRouteTarget({ user: supervisorUser }), '/dashboard')
  assert.equal(canAccessAuthenticatedApplication(), true)
  assert.equal(canAccessApiAdministratorSetup(), false)
  assert.equal(canAccessPreparedApiRoute('/dashboard', officeUser), true)
})

test('session restoration helper refreshes whenever a refresh token exists', () => {
  assert.equal(
    shouldAttemptApiSessionRestore({
      refreshToken: 'refresh-token',
    }),
    true,
  )
  assert.equal(
    shouldAttemptApiSessionRestore({
      refreshToken: '',
    }),
    false,
  )
})

test('authentication error normalization returns safe user-facing messages', () => {
  assert.equal(
    normalizeAuthenticationError(createApiError('Unauthorized', { status: 401 })),
    'Invalid email or password.',
  )
  assert.equal(
    normalizeAuthenticationError(createApiError('Slow', { code: 'REQUEST_TIMEOUT' })),
    'The server took too long to respond. Please try again.',
  )
  assert.equal(
    normalizeAuthenticationError(createApiError('CORS failure', { code: 'NETWORK_ERROR' })),
    'Unable to reach the server. Please check your connection and try again.',
  )

  const safeMessage = normalizeAuthenticationError(
    createApiError('token access-token secret', { code: 'INVALID_AUTH_USER' }),
  )

  assert.equal(safeMessage, 'Sign-in could not be completed. Please try again.')
  assert.doesNotMatch(safeMessage, /access-token|secret/i)
})

test('authenticated user normalization accepts admin users with null offices and rejects unknown roles', () => {
  assert.deepEqual(
    normalizeAuthenticatedUser({
      id: 'user-admin-1',
      fullName: 'Esi Owusu',
      email: 'esi.owusu@mrh.gov.gh',
      role: 'ADMIN',
      office: null,
    })?.office,
    {
      id: null,
      name: '',
      code: null,
      status: null,
    },
  )
  assert.equal(
    normalizeAuthenticatedUser({
      id: 'user-unknown-1',
      fullName: 'Unknown User',
      email: 'unknown@mrh.gov.gh',
      role: 'UNKNOWN_ROLE',
      office: null,
    }),
    null,
  )
})
