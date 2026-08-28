import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DATA_SOURCES,
  DEFAULT_API_BASE_URL,
  DEFAULT_API_TIMEOUT_MS,
  createEnvironmentConfig,
  getConfiguredDataSource,
  isApiDataSource,
  isMockDataSource,
  normalizeApiBaseUrl,
  normalizeApiTimeoutMs,
} from '../src/config/environment.js'

test('environment config defaults to api with normalized backend settings', () => {
  const config = createEnvironmentConfig({})

  assert.equal(config.dataSource, DATA_SOURCES.API)
  assert.equal(config.activeRuntimeSource, DATA_SOURCES.API)
  assert.equal(config.apiRuntimeEnabled, true)
  assert.equal(config.apiBaseUrl, DEFAULT_API_BASE_URL)
  assert.equal(config.apiTimeoutMs, DEFAULT_API_TIMEOUT_MS)
})

test('data-source helpers stay pinned to api in the production runtime', () => {
  assert.equal(getConfiguredDataSource({}), DATA_SOURCES.API)
  assert.equal(getConfiguredDataSource({ VITE_DATA_SOURCE: 'mock' }), DATA_SOURCES.API)
  assert.equal(getConfiguredDataSource({ VITE_DATA_SOURCE: 'api' }), DATA_SOURCES.API)
  assert.equal(isMockDataSource({ VITE_DATA_SOURCE: 'mock' }), false)
  assert.equal(isApiDataSource({ VITE_DATA_SOURCE: 'api' }), true)
})

test('invalid legacy source flags no longer affect environment configuration', () => {
  const config = createEnvironmentConfig({
    VITE_DATA_SOURCE: 'unsupported',
    VITE_API_RUNTIME_ENABLED: 'false',
    VITE_API_BASE_URL: ' https://mrh-backend.onrender.com/api ',
    VITE_API_TIMEOUT_MS: '-10',
  })

  assert.equal(config.dataSource, DATA_SOURCES.API)
  assert.equal(config.activeRuntimeSource, DATA_SOURCES.API)
  assert.equal(config.apiRuntimeEnabled, true)
  assert.equal(config.apiBaseUrl, 'https://mrh-backend.onrender.com/api/')
  assert.equal(config.apiTimeoutMs, DEFAULT_API_TIMEOUT_MS)
})

test('environment normalization keeps base urls consistent and non-secret', () => {
  assert.equal(
    normalizeApiBaseUrl('https://mrh-backend.onrender.com/api'),
    'https://mrh-backend.onrender.com/api/',
  )
  assert.equal(
    normalizeApiBaseUrl('https://mrh-backend.onrender.com/api/'),
    'https://mrh-backend.onrender.com/api/',
  )
  assert.equal(normalizeApiTimeoutMs('75000'), 75000)
  assert.equal(normalizeApiTimeoutMs('invalid'), DEFAULT_API_TIMEOUT_MS)
  assert.match(DEFAULT_API_BASE_URL, /^https:\/\//)
  assert.doesNotMatch(DEFAULT_API_BASE_URL, /password|token|secret/i)
})
