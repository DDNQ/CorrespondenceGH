export const DATA_SOURCES = Object.freeze({
  API: 'api',
})

export const DEFAULT_API_BASE_URL = 'https://mrh-backend.onrender.com/api/'
export const DEFAULT_API_TIMEOUT_MS = 75000
export const DEFAULT_API_RUNTIME_ENABLED = true

function getRuntimeEnv() {
  if (typeof import.meta !== 'undefined' && import.meta?.env) {
    return import.meta.env
  }

  return {}
}

export function normalizeDataSource() {
  return DATA_SOURCES.API
}

export function normalizeApiBaseUrl(value) {
  const trimmedValue = String(value ?? '').trim()

  if (!trimmedValue) {
    return DEFAULT_API_BASE_URL
  }

  return `${trimmedValue.replace(/\/+$/, '')}/`
}

export function normalizeApiTimeoutMs(value) {
  const parsedValue = Number(value)

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return DEFAULT_API_TIMEOUT_MS
  }

  return Math.round(parsedValue)
}

export function normalizeApiRuntimeEnabled() {
  return true
}

export function createEnvironmentConfig(env = getRuntimeEnv()) {
  return {
    dataSource: DATA_SOURCES.API,
    apiRuntimeEnabled: true,
    activeRuntimeSource: DATA_SOURCES.API,
    apiBaseUrl: normalizeApiBaseUrl(env.VITE_API_BASE_URL),
    apiTimeoutMs: normalizeApiTimeoutMs(env.VITE_API_TIMEOUT_MS),
  }
}

export function getConfiguredDataSource(env = getRuntimeEnv()) {
  return createEnvironmentConfig(env).dataSource
}

export function isApiRuntimeEnabled(env = getRuntimeEnv()) {
  return createEnvironmentConfig(env).apiRuntimeEnabled
}

export function getActiveRuntimeSource(env = getRuntimeEnv()) {
  return createEnvironmentConfig(env).activeRuntimeSource
}

export function isMockDataSource() {
  return false
}

export function isApiDataSource() {
  return true
}

export function getConfiguredApiBaseUrl(env = getRuntimeEnv()) {
  return createEnvironmentConfig(env).apiBaseUrl
}

export function getConfiguredApiTimeoutMs(env = getRuntimeEnv()) {
  return createEnvironmentConfig(env).apiTimeoutMs
}

export function assertApiRuntimeReady() {
  return true
}
