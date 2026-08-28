import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

import {
  API_CAPABILITIES,
  assertApiCapability,
  getApiCapabilityStatus,
  isApiCapabilityAvailable,
} from '../src/services/api/capabilities.js'
import { UnsupportedApiOperationError } from '../src/services/api/unsupported.js'

test('known capability metadata is exposed and confidential admin report comparison is absent', () => {
  const status = getApiCapabilityStatus(API_CAPABILITIES.REPORT_STAFF_CONTRIBUTION)
  const formalGenerateStatus = getApiCapabilityStatus(API_CAPABILITIES.REPORT_FORMAL_GENERATE)

  assert.equal(status.available, true)
  assert.equal(status.endpoint, 'reports/offices/{id}/staff-contribution/')
  assert.equal(status.method, 'GET')
  assert.equal(formalGenerateStatus.available, true)
  assert.equal(formalGenerateStatus.endpoint, 'reports/formal/generate/')
  assert.equal(formalGenerateStatus.method, 'POST')
  assert.equal(
    Object.values(API_CAPABILITIES).includes('reports.compare'),
    false,
  )
})

test('available and unknown capability checks fail safely', () => {
  assert.equal(isApiCapabilityAvailable(API_CAPABILITIES.USER_CREATE), true)
  assert.doesNotThrow(() => assertApiCapability(API_CAPABILITIES.USER_CREATE))
  assert.throws(
    () => getApiCapabilityStatus('unknown.capability'),
    /Unknown API capability/,
  )
})

test('unsupported operation error shape remains normalized', () => {
  const error = new UnsupportedApiOperationError('users.update')

  assert.equal(error.name, 'UnsupportedApiOperationError')
  assert.equal(error.code, 'API_OPERATION_UNAVAILABLE')
  assert.equal(error.capability, 'users.update')
  assert.equal(error.status, null)
})

test('api modules do not contain prohibited undocumented endpoint guesses', async () => {
  const files = [
    'src/services/api/officeApi.js',
    'src/services/api/userAdminApi.js',
    'src/services/api/correspondenceApi.js',
    'src/services/api/attachmentApi.js',
    'src/services/api/noteApi.js',
    'src/services/api/dashboardApi.js',
    'src/services/api/reportApi.js',
  ]

  const content = (
    await Promise.all(files.map((file) => fs.readFile(new URL(`../${file}`, import.meta.url), 'utf8')))
  ).join('\n')

  assert.equal(/notifications\/read-all\//.test(content), false)
  assert.equal(/DELETE\s+correspondence\/\{id\}\//.test(content), false)
  assert.equal(/PATCH\s+users\/\{id\}\//.test(content), false)
  assert.equal(/GET\s+offices\/\{id\}\//.test(content), false)
})
