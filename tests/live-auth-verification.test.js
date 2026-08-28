import test from 'node:test'
import assert from 'node:assert/strict'

import {
  LIVE_AUTH_DEFAULT_API_BASE_URL,
  buildSafeJsonReport,
  categorizeOfficeShape,
  formatLiveAuthVerificationSummary,
  redactToken,
  validateLiveAuthEnvironment,
  validateLoginResponseShape,
} from '../scripts/lib/liveAuthVerification.mjs'

test('live-auth environment validation fails safely without leaking credentials', () => {
  assert.throws(
    () =>
      validateLiveAuthEnvironment({
        MRH_RUN_LIVE_API_TESTS: 'false',
        MRH_LIVE_TEST_EMAIL: 'hidden@example.com',
        MRH_LIVE_TEST_PASSWORD: 'Secret123',
      }),
    /MRH_RUN_LIVE_API_TESTS=true/,
  )

  assert.throws(
    () =>
      validateLiveAuthEnvironment({
        MRH_RUN_LIVE_API_TESTS: 'true',
        MRH_LIVE_TEST_EMAIL: '',
        MRH_LIVE_TEST_PASSWORD: '',
      }),
    /MRH_LIVE_TEST_EMAIL and MRH_LIVE_TEST_PASSWORD/,
  )

  const config = validateLiveAuthEnvironment({
    MRH_RUN_LIVE_API_TESTS: 'true',
    MRH_LIVE_TEST_EMAIL: ' user@example.com ',
    MRH_LIVE_TEST_PASSWORD: 'Secret123',
    MRH_LIVE_API_BASE_URL: LIVE_AUTH_DEFAULT_API_BASE_URL,
  })

  assert.equal(config.email, 'user@example.com')
  assert.equal(config.baseUrl, LIVE_AUTH_DEFAULT_API_BASE_URL)
})

test('token redaction and office shape categorization remain safe', () => {
  assert.equal(redactToken('abcdefghijklmnop'), 'abcde...mnop')
  assert.equal(redactToken('shorttoken'), 'sho...ken')
  assert.equal(redactToken(''), '[missing]')

  assert.equal(categorizeOfficeShape(null), 'null')
  assert.equal(categorizeOfficeShape('office-legal'), 'string')
  assert.equal(categorizeOfficeShape({ id: 'office-legal' }), 'object')
  assert.equal(categorizeOfficeShape(['office-legal']), 'other')
})

test('login response validation normalizes role and office while rejecting invalid users', () => {
  const normalized = validateLoginResponseShape({
    access: 'access-token',
    refresh: 'refresh-token',
    user: {
      id: 'user-1',
      email: 'ama.mensah@mrh.gov.gh',
      fullName: 'Ama Mensah',
      role: 'OFFICE_SUPERVISOR',
      office: 'office-legal',
    },
  })

  assert.equal(normalized.user.role, 'SUPERVISOR')
  assert.equal(normalized.user.office?.id, 'office-legal')
  assert.equal(normalized.officeShape, 'string')

  assert.throws(
    () =>
      validateLoginResponseShape({
        access: 'access-token',
        refresh: 'refresh-token',
        user: {
          id: 'user-1',
          email: 'ama.mensah@mrh.gov.gh',
          fullName: 'Ama Mensah',
          role: 'UNKNOWN_ROLE',
        },
      }),
    /invalid authenticated user/i,
  )
})

test('safe json report excludes secrets and summary output stays redacted', () => {
  const result = {
    configuration: {
      baseUrl: LIVE_AUTH_DEFAULT_API_BASE_URL,
      timeoutMs: 75000,
      enabled: true,
    },
    login: {
      status: 200,
      durationMs: 2500,
      accessTokenReceived: true,
      refreshTokenReceived: true,
      accessTokenRedacted: 'abcde...wxyz',
      refreshTokenRedacted: 'rstuv...1234',
      coldStartLikely: false,
      rawRole: 'ADMIN',
      canonicalRole: 'ADMIN',
      roleLabel: 'System Administrator',
      officeShape: 'object',
      userId: 'user-1',
      email: 'admin@mrh.gov.gh',
      office: { id: 'office-ict', name: 'ICT Directorate', code: 'ICT', status: 'Active' },
      accessToken: 'do-not-keep',
      refreshToken: 'do-not-keep',
    },
    currentUser: {
      status: 200,
      durationMs: 500,
      identityMatched: true,
      roleMatched: true,
      officeMatched: true,
    },
    refresh: {
      status: 200,
      durationMs: 400,
      accessTokenReceived: true,
      replacementRefreshTokenReceived: false,
      refreshedMeStatus: 200,
      refreshedMeDurationMs: 450,
      refreshedIdentityMatched: true,
      refreshedRoleMatched: true,
      refreshedOfficeMatched: true,
      accessToken: 'do-not-keep',
    },
    invalidLogin: {
      status: 401,
      rejectedCorrectly: true,
      returnedTokens: false,
      safeErrorCode: 'HTTP_401',
      password: 'do-not-keep',
    },
    overall: {
      passed: true,
    },
  }

  const safeReport = buildSafeJsonReport(result)
  const summary = formatLiveAuthVerificationSummary(result)

  assert.equal('accessToken' in safeReport.login, false)
  assert.equal('refreshToken' in safeReport.login, false)
  assert.equal('password' in safeReport.invalidLogin, false)
  assert.equal(summary.includes('do-not-keep'), false)
  assert.equal(summary.includes('abcde...wxyz'), true)
})
