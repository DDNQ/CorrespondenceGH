import fs from 'node:fs/promises'

import {
  DEFAULT_API_BASE_URL,
  DEFAULT_API_TIMEOUT_MS,
  normalizeApiBaseUrl,
  normalizeApiTimeoutMs,
} from '../../src/config/environment.js'
import { getUserRoleLabel } from '../../src/constants/roles.js'
import { normalizeAuthenticatedUser, normalizeEmail } from '../../src/utils/auth.js'
import { buildApiUrl } from '../../src/services/api/httpClient.js'
import { createApiError, normalizeApiError } from '../../src/services/api/errors.js'

export const LIVE_AUTH_DEFAULT_API_BASE_URL = DEFAULT_API_BASE_URL
export const LIVE_AUTH_DEFAULT_TIMEOUT_MS = DEFAULT_API_TIMEOUT_MS

export class LiveAuthVerificationConfigError extends Error {
  constructor(message, code = 'LIVE_AUTH_CONFIG_INVALID') {
    super(message)
    this.name = 'LiveAuthVerificationConfigError'
    this.code = code
  }
}

function trimString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function redactToken(token) {
  const normalizedToken = trimString(token)

  if (!normalizedToken) {
    return '[missing]'
  }

  if (normalizedToken.length <= 12) {
    return `${normalizedToken.slice(0, 3)}...${normalizedToken.slice(-3)}`
  }

  return `${normalizedToken.slice(0, 5)}...${normalizedToken.slice(-4)}`
}

export function categorizeOfficeShape(officeValue) {
  if (officeValue === null || officeValue === undefined) {
    return 'null'
  }

  if (typeof officeValue === 'string') {
    return 'string'
  }

  if (typeof officeValue === 'object' && !Array.isArray(officeValue)) {
    return 'object'
  }

  return 'other'
}

export function validateLiveAuthEnvironment(env = process.env) {
  const enabled = trimString(env.MRH_RUN_LIVE_API_TESTS)
  const email = trimString(env.MRH_LIVE_TEST_EMAIL)
  const password = typeof env.MRH_LIVE_TEST_PASSWORD === 'string' ? env.MRH_LIVE_TEST_PASSWORD : ''
  const baseUrl = normalizeApiBaseUrl(
    trimString(env.MRH_LIVE_API_BASE_URL) || LIVE_AUTH_DEFAULT_API_BASE_URL,
  )
  const timeoutMs = normalizeApiTimeoutMs(
    trimString(env.MRH_LIVE_API_TIMEOUT_MS) || LIVE_AUTH_DEFAULT_TIMEOUT_MS,
  )
  const reportPath = trimString(env.MRH_LIVE_TEST_REPORT_PATH)

  if (enabled !== 'true') {
    throw new LiveAuthVerificationConfigError(
      'Live authentication verification is disabled. Set MRH_RUN_LIVE_API_TESTS=true to run it.',
      'LIVE_AUTH_NOT_ENABLED',
    )
  }

  if (!email || !password) {
    throw new LiveAuthVerificationConfigError(
      'Live authentication verification requires MRH_LIVE_TEST_EMAIL and MRH_LIVE_TEST_PASSWORD.',
      'LIVE_AUTH_CREDENTIALS_REQUIRED',
    )
  }

  let parsedUrl = null

  try {
    parsedUrl = new URL(baseUrl)
  } catch {
    throw new LiveAuthVerificationConfigError(
      'MRH_LIVE_API_BASE_URL must be a valid HTTPS URL.',
      'LIVE_AUTH_BASE_URL_INVALID',
    )
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new LiveAuthVerificationConfigError(
      'MRH_LIVE_API_BASE_URL must use HTTPS.',
      'LIVE_AUTH_BASE_URL_NOT_HTTPS',
    )
  }

  if (!/\/api\/$/i.test(parsedUrl.pathname)) {
    throw new LiveAuthVerificationConfigError(
      'MRH_LIVE_API_BASE_URL must point to the backend API root and end with /api/.',
      'LIVE_AUTH_BASE_URL_NOT_API_ROOT',
    )
  }

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new LiveAuthVerificationConfigError(
      'MRH_LIVE_API_TIMEOUT_MS must be a positive number.',
      'LIVE_AUTH_TIMEOUT_INVALID',
    )
  }

  return {
    enabled: true,
    email: normalizeEmail(email),
    password,
    baseUrl,
    timeoutMs,
    reportPath: reportPath || null,
  }
}

export function validateLoginResponseShape(rawResponse) {
  const accessToken = trimString(rawResponse?.access)
  const refreshToken = trimString(rawResponse?.refresh)
  const rawUser = rawResponse?.user ?? null
  const normalizedUser = normalizeAuthenticatedUser(rawUser)
  const rawRole = rawUser?.role ?? null
  const rawOffice = rawUser?.office ?? rawUser?.officeId ?? rawUser?.office_id ?? rawUser?.officeName ?? rawUser?.office_name ?? null

  if (!accessToken) {
    throw createApiError('The backend returned an invalid authentication response.', {
      code: 'MISSING_ACCESS_TOKEN',
    })
  }

  if (!refreshToken) {
    throw createApiError('The backend returned an invalid authentication response.', {
      code: 'MISSING_REFRESH_TOKEN',
    })
  }

  if (!normalizedUser) {
    throw createApiError('The backend returned an invalid authenticated user.', {
      code: 'INVALID_AUTH_USER',
    })
  }

  return {
    accessToken,
    refreshToken,
    user: normalizedUser,
    rawRole,
    rawRoleLabel: getUserRoleLabel(rawRole),
    officeShape: categorizeOfficeShape(rawOffice),
    rawOffice,
  }
}

export function validateRefreshResponseShape(rawResponse) {
  const accessToken = trimString(rawResponse?.access)
  const refreshToken = trimString(rawResponse?.refresh)

  if (!accessToken) {
    throw createApiError('The backend returned an invalid refresh response.', {
      code: 'MISSING_REFRESH_ACCESS_TOKEN',
    })
  }

  return {
    accessToken,
    refreshToken: refreshToken || null,
  }
}

export function createIncorrectPassword(password) {
  const basePassword = typeof password === 'string' ? password : ''
  return `${basePassword}__invalid__${Date.now().toString(36)}`
}

function parseResponseBody(text, contentType = '') {
  if (!text.trim()) {
    return null
  }

  if (!contentType.toLowerCase().includes('application/json')) {
    return text
  }

  try {
    return JSON.parse(text)
  } catch {
    throw createApiError('The backend returned an invalid JSON response.', {
      code: 'INVALID_JSON_RESPONSE',
    })
  }
}

export async function requestJson({
  baseUrl,
  path,
  method = 'GET',
  body,
  accessToken = null,
  timeoutMs = LIVE_AUTH_DEFAULT_TIMEOUT_MS,
  fetchImpl = fetch,
}) {
  const controller = new AbortController()
  const requestStart = Date.now()
  const timeoutId = setTimeout(() => {
    controller.abort('timeout')
  }, timeoutMs)

  const headers = new Headers({
    Accept: 'application/json',
  })

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  let requestBody = undefined

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
    requestBody = JSON.stringify(body)
  }

  try {
    const response = await fetchImpl(buildApiUrl(path, baseUrl), {
      method,
      headers,
      body: requestBody,
      signal: controller.signal,
    })
    const rawText = await response.text()
    const durationMs = Date.now() - requestStart
    const parsedBody = parseResponseBody(rawText, response.headers.get('content-type') ?? '')

    return {
      ok: response.ok,
      status: response.status,
      durationMs,
      timedOut: false,
      coldStartLikely: durationMs > 20000,
      data: parsedBody,
    }
  } catch (error) {
    const durationMs = Date.now() - requestStart

    if (error?.name === 'AbortError') {
      throw createApiError('The live verification request timed out.', {
        code: 'REQUEST_TIMEOUT',
        isTimeout: true,
        details: {
          path,
          durationMs,
        },
      })
    }

    if (error instanceof TypeError) {
      throw createApiError('Unable to reach the backend service.', {
        code: 'NETWORK_ERROR',
        isNetworkError: true,
        details: {
          path,
          durationMs,
        },
      })
    }

    throw normalizeApiError(error)
  } finally {
    clearTimeout(timeoutId)
  }
}

export function createInMemoryTokenStore() {
  let accessToken = null
  let refreshToken = null

  return {
    getAccessToken() {
      return accessToken
    },
    getRefreshToken() {
      return refreshToken
    },
    setTokens({ access, refresh }) {
      accessToken = trimString(access) || null
      refreshToken = trimString(refresh) || null
    },
    clear() {
      accessToken = null
      refreshToken = null
    },
  }
}

export function buildSafeJsonReport(result) {
  const report = {
    generatedAt: new Date().toISOString(),
    configuration: {
      baseUrl: result.configuration.baseUrl,
      timeoutMs: result.configuration.timeoutMs,
      enabled: result.configuration.enabled,
    },
    login: {
      status: result.login.status,
      durationMs: result.login.durationMs,
      accessTokenReceived: result.login.accessTokenReceived,
      refreshTokenReceived: result.login.refreshTokenReceived,
      coldStartLikely: result.login.coldStartLikely,
      rawRole: result.login.rawRole,
      canonicalRole: result.login.canonicalRole,
      officeShape: result.login.officeShape,
      userId: result.login.userId,
      email: result.login.email,
      office: result.login.office,
    },
    currentUser: {
      status: result.currentUser.status,
      durationMs: result.currentUser.durationMs,
      identityMatched: result.currentUser.identityMatched,
      roleMatched: result.currentUser.roleMatched,
      officeMatched: result.currentUser.officeMatched,
    },
    refresh: {
      status: result.refresh.status,
      durationMs: result.refresh.durationMs,
      accessTokenReceived: result.refresh.accessTokenReceived,
      replacementRefreshTokenReceived: result.refresh.replacementRefreshTokenReceived,
      refreshedMeStatus: result.refresh.refreshedMeStatus,
      refreshedMeDurationMs: result.refresh.refreshedMeDurationMs,
      refreshedIdentityMatched: result.refresh.refreshedIdentityMatched,
      refreshedRoleMatched: result.refresh.refreshedRoleMatched,
      refreshedOfficeMatched: result.refresh.refreshedOfficeMatched,
    },
    invalidLogin: {
      status: result.invalidLogin.status,
      rejectedCorrectly: result.invalidLogin.rejectedCorrectly,
      returnedTokens: result.invalidLogin.returnedTokens,
      safeErrorCode: result.invalidLogin.safeErrorCode,
    },
    overall: {
      passed: result.overall.passed,
    },
    notes: {
      corsVerifiedInNode: false,
      cleanupPerformed: true,
    },
  }

  return JSON.parse(JSON.stringify(report))
}

export async function writeOptionalJsonReport(reportPath, result) {
  if (!reportPath) {
    return null
  }

  const safeReport = buildSafeJsonReport(result)
  await fs.writeFile(reportPath, `${JSON.stringify(safeReport, null, 2)}\n`, 'utf8')
  return reportPath
}

export async function runLiveAuthVerification({
  env = process.env,
  fetchImpl = fetch,
} = {}) {
  const config = validateLiveAuthEnvironment(env)
  const tokenStore = createInMemoryTokenStore()
  let passwordReference = config.password

  const result = {
    configuration: {
      baseUrl: config.baseUrl,
      timeoutMs: config.timeoutMs,
      enabled: true,
    },
    login: null,
    currentUser: null,
    refresh: null,
    invalidLogin: null,
    overall: {
      passed: false,
    },
  }

  try {
    const loginResponse = await requestJson({
      baseUrl: config.baseUrl,
      path: 'auth/login/',
      method: 'POST',
      body: {
        email: config.email,
        password: passwordReference,
      },
      timeoutMs: config.timeoutMs,
      fetchImpl,
    })

    if (!loginResponse.ok) {
      throw createApiError('Authentication login request failed.', {
        code: `HTTP_${loginResponse.status}`,
        status: loginResponse.status,
        details: loginResponse.data,
      })
    }

    const normalizedLogin = validateLoginResponseShape(loginResponse.data)
    tokenStore.setTokens({
      access: normalizedLogin.accessToken,
      refresh: normalizedLogin.refreshToken,
    })

    result.login = {
      status: loginResponse.status,
      durationMs: loginResponse.durationMs,
      accessTokenReceived: true,
      refreshTokenReceived: true,
      accessTokenRedacted: redactToken(normalizedLogin.accessToken),
      refreshTokenRedacted: redactToken(normalizedLogin.refreshToken),
      coldStartLikely: loginResponse.coldStartLikely,
      rawRole: normalizedLogin.rawRole,
      canonicalRole: normalizedLogin.user.role,
      roleLabel: getUserRoleLabel(normalizedLogin.user.role),
      officeShape: normalizedLogin.officeShape,
      rawOfficeCategoryMatchesDocumentation:
        normalizedLogin.officeShape === 'object' || normalizedLogin.officeShape === 'string' || normalizedLogin.officeShape === 'null',
      userId: normalizedLogin.user.id,
      email: normalizedLogin.user.email,
      office: {
        id: normalizedLogin.user.office?.id ?? null,
        name: normalizedLogin.user.office?.name ?? '',
        code: normalizedLogin.user.office?.code ?? null,
        status: normalizedLogin.user.office?.status ?? null,
      },
    }

    const meResponse = await requestJson({
      baseUrl: config.baseUrl,
      path: 'me/',
      method: 'GET',
      accessToken: tokenStore.getAccessToken(),
      timeoutMs: config.timeoutMs,
      fetchImpl,
    })

    if (!meResponse.ok) {
      throw createApiError('Current-user verification failed.', {
        code: `HTTP_${meResponse.status}`,
        status: meResponse.status,
        details: meResponse.data,
      })
    }

    const normalizedMeUser = normalizeAuthenticatedUser(meResponse.data)

    if (!normalizedMeUser) {
      throw createApiError('The backend returned an invalid current-user response.', {
        code: 'INVALID_ME_USER',
      })
    }

    result.currentUser = {
      status: meResponse.status,
      durationMs: meResponse.durationMs,
      identityMatched: normalizedMeUser.id === result.login.userId,
      roleMatched: normalizedMeUser.role === result.login.canonicalRole,
      officeMatched:
        (normalizedMeUser.office?.id ?? null) === (result.login.office.id ?? null) &&
        (normalizedMeUser.office?.name ?? '') === (result.login.office.name ?? ''),
    }

    const refreshResponse = await requestJson({
      baseUrl: config.baseUrl,
      path: 'auth/refresh/',
      method: 'POST',
      body: {
        refresh: tokenStore.getRefreshToken(),
      },
      timeoutMs: config.timeoutMs,
      fetchImpl,
    })

    if (!refreshResponse.ok) {
      throw createApiError('Token refresh verification failed.', {
        code: `HTTP_${refreshResponse.status}`,
        status: refreshResponse.status,
        details: refreshResponse.data,
      })
    }

    const normalizedRefresh = validateRefreshResponseShape(refreshResponse.data)
    const previousRefreshToken = tokenStore.getRefreshToken()
    tokenStore.setTokens({
      access: normalizedRefresh.accessToken,
      refresh: normalizedRefresh.refreshToken ?? previousRefreshToken,
    })

    const refreshedMeResponse = await requestJson({
      baseUrl: config.baseUrl,
      path: 'me/',
      method: 'GET',
      accessToken: tokenStore.getAccessToken(),
      timeoutMs: config.timeoutMs,
      fetchImpl,
    })

    if (!refreshedMeResponse.ok) {
      throw createApiError('Refreshed-token verification failed.', {
        code: `HTTP_${refreshedMeResponse.status}`,
        status: refreshedMeResponse.status,
        details: refreshedMeResponse.data,
      })
    }

    const refreshedUser = normalizeAuthenticatedUser(refreshedMeResponse.data)

    if (!refreshedUser) {
      throw createApiError('The backend returned an invalid refreshed current-user response.', {
        code: 'INVALID_REFRESHED_ME_USER',
      })
    }

    result.refresh = {
      status: refreshResponse.status,
      durationMs: refreshResponse.durationMs,
      accessTokenReceived: true,
      replacementRefreshTokenReceived: Boolean(normalizedRefresh.refreshToken),
      accessTokenRedacted: redactToken(normalizedRefresh.accessToken),
      refreshTokenRedacted: redactToken(tokenStore.getRefreshToken()),
      refreshedMeStatus: refreshedMeResponse.status,
      refreshedMeDurationMs: refreshedMeResponse.durationMs,
      refreshedIdentityMatched: refreshedUser.id === result.login.userId,
      refreshedRoleMatched: refreshedUser.role === result.login.canonicalRole,
      refreshedOfficeMatched:
        (refreshedUser.office?.id ?? null) === (result.login.office.id ?? null) &&
        (refreshedUser.office?.name ?? '') === (result.login.office.name ?? ''),
    }

    const stableAccessToken = tokenStore.getAccessToken()
    const stableRefreshToken = tokenStore.getRefreshToken()
    const invalidLoginResponse = await requestJson({
      baseUrl: config.baseUrl,
      path: 'auth/login/',
      method: 'POST',
      body: {
        email: config.email,
        password: createIncorrectPassword(passwordReference),
      },
      timeoutMs: config.timeoutMs,
      fetchImpl,
    })

    result.invalidLogin = {
      status: invalidLoginResponse.status,
      rejectedCorrectly: invalidLoginResponse.status === 400 || invalidLoginResponse.status === 401,
      returnedTokens: Boolean(
        trimString(invalidLoginResponse.data?.access) || trimString(invalidLoginResponse.data?.refresh),
      ),
      safeErrorCode:
        invalidLoginResponse.data?.code ??
        (invalidLoginResponse.status ? `HTTP_${invalidLoginResponse.status}` : 'UNKNOWN_ERROR'),
      tokensUnaffected:
        tokenStore.getAccessToken() === stableAccessToken &&
        tokenStore.getRefreshToken() === stableRefreshToken,
    }

    result.overall.passed = Boolean(
      result.currentUser.identityMatched &&
        result.currentUser.roleMatched &&
        result.refresh.refreshedIdentityMatched &&
        result.refresh.refreshedRoleMatched &&
        result.invalidLogin.rejectedCorrectly &&
        !result.invalidLogin.returnedTokens &&
        result.invalidLogin.tokensUnaffected,
    )

    await writeOptionalJsonReport(config.reportPath, result)
    return result
  } finally {
    tokenStore.clear()
    passwordReference = null
  }
}

export function formatLiveAuthVerificationSummary(result) {
  const lines = [
    'MRH Live Authentication Verification',
    '',
    'Configuration:',
    `- API base URL: ${result.configuration.baseUrl}`,
    `- timeout: ${result.configuration.timeoutMs} ms`,
    `- live tests explicitly enabled: ${result.configuration.enabled ? 'yes' : 'no'}`,
    '',
    'Login:',
    `- status: ${result.login?.status ?? 'not run'}`,
    `- duration: ${result.login?.durationMs ?? 'n/a'} ms`,
    `- access token received: ${result.login?.accessTokenReceived ? 'yes' : 'no'}`,
    `- refresh token received: ${result.login?.refreshTokenReceived ? 'yes' : 'no'}`,
    `- access token: ${result.login?.accessTokenRedacted ?? '[not available]'}`,
    `- refresh token: ${result.login?.refreshTokenRedacted ?? '[not available]'}`,
  ]

  if (result.login?.coldStartLikely) {
    lines.push('- note: The first request was slow and may have encountered a hosting cold start.')
  }

  lines.push(
    '',
    'User:',
    `- ID: ${result.login?.userId ?? 'n/a'}`,
    `- email: ${result.login?.email ?? 'n/a'}`,
    `- raw role: ${result.login?.rawRole ?? 'n/a'}`,
    `- canonical role: ${result.login?.canonicalRole ?? 'n/a'}`,
    `- role label: ${result.login?.roleLabel ?? 'n/a'}`,
    `- office response shape: ${result.login?.officeShape ?? 'n/a'}`,
    `- normalized office: ${JSON.stringify(result.login?.office ?? null)}`,
    '',
    'Current User:',
    `- status: ${result.currentUser?.status ?? 'not run'}`,
    `- identity matched: ${result.currentUser?.identityMatched ? 'yes' : 'no'}`,
    `- role matched: ${result.currentUser?.roleMatched ? 'yes' : 'no'}`,
    `- office matched: ${result.currentUser?.officeMatched ? 'yes' : 'no'}`,
    '',
    'Refresh:',
    `- status: ${result.refresh?.status ?? 'not run'}`,
    `- duration: ${result.refresh?.durationMs ?? 'n/a'} ms`,
    `- new access token received: ${result.refresh?.accessTokenReceived ? 'yes' : 'no'}`,
    `- replacement refresh token received: ${result.refresh?.replacementRefreshTokenReceived ? 'yes' : 'no'}`,
    `- refreshed /me/ succeeded: ${result.refresh?.refreshedMeStatus ? 'yes' : 'no'}`,
    '',
    'Invalid Login:',
    `- rejected correctly: ${result.invalidLogin?.rejectedCorrectly ? 'yes' : 'no'}`,
    `- status: ${result.invalidLogin?.status ?? 'not run'}`,
    `- normalized error code: ${result.invalidLogin?.safeErrorCode ?? 'n/a'}`,
    '',
    'Overall:',
    `- ${result.overall.passed ? 'PASS' : 'FAIL'}`,
    '',
    'CORS Limitation:',
    '- This Node verification checks reachability, authentication contract, response shapes, and token flow.',
    '- It does not prove browser CORS configuration. Browser preflight and allowed-origin checks must be verified separately.',
    '',
    'Cleanup:',
    '- In-memory access and refresh tokens were cleared after verification.',
    '- No backend logout endpoint was assumed or called.',
  )

  return lines.join('\n')
}
