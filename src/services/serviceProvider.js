import { getActiveRuntimeSource, getConfiguredDataSource } from '../config/environment.js'
import { getApiApplicationReadiness } from '../config/apiApplicationReadiness.js'
import { authApiService } from './api/authApi.js'
import { listApiCapabilityStatuses } from './api/capabilities.js'
import { attachmentApiService } from './api/attachmentApi.js'
import { correspondenceApiService } from './api/correspondenceApi.js'
import { dashboardApiService } from './api/dashboardApi.js'
import { noteApiService } from './api/noteApi.js'
import { officeApiService } from './api/officeApi.js'
import { reportApiService } from './api/reportApi.js'
import { userAdminApiService } from './api/userAdminApi.js'
import { authServiceContract } from './contracts/authServiceContract.js'
import { attachmentServiceContract } from './contracts/attachmentServiceContract.js'
import { correspondenceServiceContract } from './contracts/correspondenceServiceContract.js'
import { dashboardServiceContract } from './contracts/dashboardServiceContract.js'
import { noteServiceContract } from './contracts/noteServiceContract.js'
import { officeServiceContract } from './contracts/officeServiceContract.js'
import { reportServiceContract } from './contracts/reportServiceContract.js'
import { assertServiceContract, getContractMethodNames } from './contracts/serviceContractUtils.js'
import { userAdminServiceContract } from './contracts/userAdminServiceContract.js'

const SERVICE_CONTRACTS = Object.freeze({
  auth: authServiceContract,
  offices: officeServiceContract,
  users: userAdminServiceContract,
  correspondence: correspondenceServiceContract,
  attachments: attachmentServiceContract,
  notes: noteServiceContract,
  dashboards: dashboardServiceContract,
  reports: reportServiceContract,
})

function assertBundleContracts(bundle) {
  Object.entries(SERVICE_CONTRACTS).forEach(([key, contract]) => {
    assertServiceContract(bundle[key], getContractMethodNames(contract), contract.name)
  })

  return bundle
}

const apiServiceBundle = assertBundleContracts({
  auth: authApiService,
  offices: officeApiService,
  users: userAdminApiService,
  correspondence: correspondenceApiService,
  attachments: attachmentApiService,
  notes: noteApiService,
  dashboards: dashboardApiService,
  reports: reportApiService,
})

export function getApiServiceBundle() {
  return apiServiceBundle
}

export function getServiceBundle() {
  return apiServiceBundle
}

export function getApiReadinessReport(env) {
  const capabilities = listApiCapabilityStatuses()
  const readiness = getApiApplicationReadiness()

  return {
    runtimeEnabled: true,
    configuredSource: getConfiguredDataSource(env),
    activeSource: getActiveRuntimeSource(env),
    ready: true,
    readiness,
    capabilities,
    unavailableCapabilities: capabilities.filter((capability) => !capability.available),
  }
}

export function getServiceProviderState(env) {
  return {
    configuredSource: getConfiguredDataSource(env),
    activeSource: getActiveRuntimeSource(env),
    apiRuntimeEnabled: true,
    isMock: false,
    isApi: true,
  }
}

export { assertServiceContract }
