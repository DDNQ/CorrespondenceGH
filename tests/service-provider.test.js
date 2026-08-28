import test from 'node:test'
import assert from 'node:assert/strict'

import { getActiveRuntimeSource } from '../src/config/environment.js'
import {
  getApiReadinessReport,
  getApiServiceBundle,
  getServiceBundle,
  getServiceProviderState,
} from '../src/services/serviceProvider.js'
import { UnsupportedApiOperationError } from '../src/services/api/unsupported.js'

test('runtime source stays api regardless of legacy source-toggle variables', () => {
  assert.equal(getActiveRuntimeSource({}), 'api')
  assert.equal(
    getActiveRuntimeSource({
      VITE_DATA_SOURCE: 'mock',
      VITE_API_RUNTIME_ENABLED: 'false',
    }),
    'api',
  )
  assert.equal(
    getActiveRuntimeSource({
      VITE_DATA_SOURCE: 'api',
      VITE_API_RUNTIME_ENABLED: 'false',
    }),
    'api',
  )
})

test('service provider resolves one coherent api bundle', async () => {
  const bundle = getServiceBundle()
  const apiBundle = getApiServiceBundle()

  assert.equal(bundle, apiBundle)
  assert.equal(typeof bundle.auth.login, 'function')
  assert.equal(typeof bundle.correspondence.listCorrespondence, 'function')
  assert.equal(typeof bundle.reports.getOfficeReportWorkspace, 'function')
  assert.equal(typeof bundle.reports.generateFormalReportPreview, 'function')
  assert.equal(typeof bundle.reports.generateFormalReport, 'function')
  assert.equal(typeof bundle.reports.listFormalReportsHistory, 'function')
  assert.equal(typeof bundle.reports.getFormalReportById, 'function')
  assert.equal(typeof bundle.users.createUser, 'function')
  assert.equal(typeof bundle.reports.getOfficeSummaryReport, 'function')
  assert.equal(typeof bundle.reports.getOfficeStaffContributionReport, 'function')

  await assert.rejects(
    bundle.users.updateUser('user-1', {}),
    (error) => error instanceof UnsupportedApiOperationError && error.capability === 'users.update',
  )
})

test('readiness report exposes api-only runtime state safely', () => {
  const report = getApiReadinessReport({})

  assert.equal(report.runtimeEnabled, true)
  assert.equal(report.configuredSource, 'api')
  assert.equal(report.activeSource, 'api')
  assert.equal(report.ready, true)
  assert.equal(report.readiness.authenticatedApplicationReady, true)
  assert.equal(report.readiness.notifications.available, false)
  assert.ok(Array.isArray(report.capabilities))
  assert.ok(Array.isArray(report.unavailableCapabilities))
})

test('provider state is api-only in the production runtime', () => {
  const state = getServiceProviderState({})

  assert.equal(state.configuredSource, 'api')
  assert.equal(state.activeSource, 'api')
  assert.equal(state.isMock, false)
  assert.equal(state.isApi, true)
})
