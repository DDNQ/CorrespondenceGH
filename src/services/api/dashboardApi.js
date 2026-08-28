import { apiRequest } from '../apiClient.js'
import { assertApiCapability, API_CAPABILITIES } from './capabilities.js'
import {
  normalizeAdminDashboardResponse as normalizeAdminDashboardSummaryResponse,
  normalizeOfficeDashboardResponse as normalizeOfficeDashboardSummaryResponse,
} from './validators/dashboardSummaryValidators.js'

export function normalizeOfficeDashboardResponse(rawResponse = {}) {
  return normalizeOfficeDashboardSummaryResponse(rawResponse)
}

export function normalizeAdminDashboardResponse(rawResponse = {}) {
  return normalizeAdminDashboardSummaryResponse(rawResponse)
}

export async function getOfficeDashboardSummary(options = {}) {
  assertApiCapability(API_CAPABILITIES.DASHBOARD_OFFICE_SUMMARY)
  const response = await apiRequest('dashboard/office-summary/', {
    method: 'GET',
    authenticated: true,
    signal: options.signal,
  })

  return normalizeOfficeDashboardResponse(response)
}

export async function getAdminDashboardSummary(options = {}) {
  assertApiCapability(API_CAPABILITIES.DASHBOARD_ADMIN_SUMMARY)
  const response = await apiRequest('dashboard/admin-summary/', {
    method: 'GET',
    authenticated: true,
    signal: options.signal,
  })

  return normalizeAdminDashboardResponse(response)
}

export const dashboardApiService = Object.freeze({
  getOfficeDashboardSummary,
  getAdminDashboardSummary,
})
