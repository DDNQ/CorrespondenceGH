import { createApiError } from './errors.js'
import { createUnsupportedApiOperationError } from './unsupported.js'

export const API_CAPABILITIES = Object.freeze({
  AUTH_LOGIN: 'auth.login',
  AUTH_REFRESH: 'auth.refresh',
  AUTH_CURRENT_USER: 'auth.currentUser',

  OFFICE_LIST: 'offices.list',
  OFFICE_CREATE: 'offices.create',

  USER_LIST: 'users.list',
  USER_CREATE: 'users.create',
  USER_REGENERATE_PASSWORD: 'users.regeneratePassword',

  CORRESPONDENCE_CREATE: 'correspondence.create',
  CORRESPONDENCE_LIST: 'correspondence.list',
  CORRESPONDENCE_DETAIL: 'correspondence.detail',
  CORRESPONDENCE_FORWARD: 'correspondence.forward',
  CORRESPONDENCE_UPDATE_STAGE: 'correspondence.updateStage',
  CORRESPONDENCE_COMPLETE: 'correspondence.complete',
  CORRESPONDENCE_FILE: 'correspondence.file',
  CORRESPONDENCE_MOVEMENTS: 'correspondence.movements',

  ATTACHMENT_UPLOAD: 'attachments.upload',
  ATTACHMENT_LIST: 'attachments.list',

  NOTE_CREATE: 'notes.create',
  NOTE_LIST: 'notes.list',

  DASHBOARD_OFFICE_SUMMARY: 'dashboard.officeSummary',
  DASHBOARD_ADMIN_SUMMARY: 'dashboard.adminSummary',

  REPORT_OFFICE_SUMMARY: 'reports.officeSummary',
  REPORT_STAFF_CONTRIBUTION: 'reports.staffContribution',
  REPORT_BACKLOG: 'reports.backlog',
  REPORT_TRENDS: 'reports.trends',
  REPORT_FORMAL_OFFICE_PERFORMANCE_PREVIEW: 'reports.formal.officePerformancePreview',
  REPORT_FORMAL_OVERDUE_PREVIEW: 'reports.formal.overduePreview',
  REPORT_FORMAL_PENDING_AGEING_PREVIEW: 'reports.formal.pendingAgeingPreview',
  REPORT_FORMAL_STAFF_CONTRIBUTION_PREVIEW: 'reports.formal.staffContributionPreview',
  REPORT_FORMAL_GENERATE: 'reports.formal.generate',
  REPORT_FORMAL_HISTORY: 'reports.formal.history',
  REPORT_FORMAL_DETAIL: 'reports.formal.detail',
})

const availableCapabilityStatuses = Object.freeze({
  [API_CAPABILITIES.AUTH_LOGIN]: {
    available: true,
    endpoint: 'auth/login/',
    method: 'POST',
    reason: null,
  },
  [API_CAPABILITIES.AUTH_REFRESH]: {
    available: true,
    endpoint: 'auth/refresh/',
    method: 'POST',
    reason: null,
  },
  [API_CAPABILITIES.AUTH_CURRENT_USER]: {
    available: true,
    endpoint: 'me/',
    method: 'GET',
    reason: null,
  },
  [API_CAPABILITIES.OFFICE_LIST]: {
    available: true,
    endpoint: 'offices/',
    method: 'GET',
    reason: null,
  },
  [API_CAPABILITIES.OFFICE_CREATE]: {
    available: true,
    endpoint: 'offices/',
    method: 'POST',
    reason: null,
  },
  [API_CAPABILITIES.USER_LIST]: {
    available: true,
    endpoint: 'users/',
    method: 'GET',
    reason: null,
  },
  [API_CAPABILITIES.USER_CREATE]: {
    available: true,
    endpoint: 'users/',
    method: 'POST',
    reason: null,
  },
  [API_CAPABILITIES.USER_REGENERATE_PASSWORD]: {
    available: true,
    endpoint: 'users/{id}/regenerate-password/',
    method: 'POST',
    reason: null,
  },
  [API_CAPABILITIES.CORRESPONDENCE_CREATE]: {
    available: true,
    endpoint: 'correspondence/',
    method: 'POST',
    reason: null,
  },
  [API_CAPABILITIES.CORRESPONDENCE_LIST]: {
    available: true,
    endpoint: 'correspondence/',
    method: 'GET',
    reason: null,
  },
  [API_CAPABILITIES.CORRESPONDENCE_DETAIL]: {
    available: true,
    endpoint: 'correspondence/{id}/',
    method: 'GET',
    reason: null,
  },
  [API_CAPABILITIES.CORRESPONDENCE_FORWARD]: {
    available: true,
    endpoint: 'correspondence/{id}/forward/',
    method: 'POST',
    reason: null,
  },
  [API_CAPABILITIES.CORRESPONDENCE_UPDATE_STAGE]: {
    available: true,
    endpoint: 'correspondence/{id}/update-stage/',
    method: 'POST',
    reason: null,
  },
  [API_CAPABILITIES.CORRESPONDENCE_COMPLETE]: {
    available: true,
    endpoint: 'correspondence/{id}/complete/',
    method: 'POST',
    reason: null,
  },
  [API_CAPABILITIES.CORRESPONDENCE_FILE]: {
    available: true,
    endpoint: 'correspondence/{id}/file/',
    method: 'POST',
    reason: null,
  },
  [API_CAPABILITIES.CORRESPONDENCE_MOVEMENTS]: {
    available: true,
    endpoint: 'correspondence/{id}/movements/',
    method: 'GET',
    reason: null,
  },
  [API_CAPABILITIES.ATTACHMENT_UPLOAD]: {
    available: true,
    endpoint: 'correspondence/{id}/attachments/',
    method: 'POST',
    reason: null,
  },
  [API_CAPABILITIES.ATTACHMENT_LIST]: {
    available: true,
    endpoint: 'correspondence/{id}/attachments/',
    method: 'GET',
    reason: null,
  },
  [API_CAPABILITIES.NOTE_CREATE]: {
    available: true,
    endpoint: 'correspondence/{id}/notes/',
    method: 'POST',
    reason: null,
  },
  [API_CAPABILITIES.NOTE_LIST]: {
    available: true,
    endpoint: 'correspondence/{id}/notes/',
    method: 'GET',
    reason: null,
  },
  [API_CAPABILITIES.DASHBOARD_OFFICE_SUMMARY]: {
    available: true,
    endpoint: 'dashboard/office-summary/',
    method: 'GET',
    reason: null,
  },
  [API_CAPABILITIES.DASHBOARD_ADMIN_SUMMARY]: {
    available: true,
    endpoint: 'dashboard/admin-summary/',
    method: 'GET',
    reason: null,
  },
  [API_CAPABILITIES.REPORT_OFFICE_SUMMARY]: {
    available: true,
    endpoint: 'reports/offices/{id}/summary/',
    method: 'GET',
    reason: null,
  },
  [API_CAPABILITIES.REPORT_STAFF_CONTRIBUTION]: {
    available: true,
    endpoint: 'reports/offices/{id}/staff-contribution/',
    method: 'GET',
    reason: null,
  },
  [API_CAPABILITIES.REPORT_BACKLOG]: {
    available: true,
    endpoint: 'reports/offices/{id}/backlog/',
    method: 'GET',
    reason: null,
  },
  [API_CAPABILITIES.REPORT_TRENDS]: {
    available: true,
    endpoint: 'reports/offices/{id}/trends/',
    method: 'GET',
    reason: null,
  },
  [API_CAPABILITIES.REPORT_FORMAL_OFFICE_PERFORMANCE_PREVIEW]: {
    available: true,
    endpoint: 'reports/formal/office-performance/',
    method: 'GET',
    reason: null,
  },
  [API_CAPABILITIES.REPORT_FORMAL_OVERDUE_PREVIEW]: {
    available: true,
    endpoint: 'reports/formal/overdue/',
    method: 'GET',
    reason: null,
  },
  [API_CAPABILITIES.REPORT_FORMAL_PENDING_AGEING_PREVIEW]: {
    available: true,
    endpoint: 'reports/formal/pending-ageing/',
    method: 'GET',
    reason: null,
  },
  [API_CAPABILITIES.REPORT_FORMAL_STAFF_CONTRIBUTION_PREVIEW]: {
    available: true,
    endpoint: 'reports/formal/staff-contribution/',
    method: 'GET',
    reason: null,
  },
  [API_CAPABILITIES.REPORT_FORMAL_GENERATE]: {
    available: true,
    endpoint: 'reports/formal/generate/',
    method: 'POST',
    reason: null,
  },
  [API_CAPABILITIES.REPORT_FORMAL_HISTORY]: {
    available: true,
    endpoint: 'reports/formal/history/',
    method: 'GET',
    reason: null,
  },
  [API_CAPABILITIES.REPORT_FORMAL_DETAIL]: {
    available: true,
    endpoint: 'reports/formal/{report_id}/',
    method: 'GET',
    reason: null,
  },
})

function assertKnownCapability(capability) {
  if (!Object.values(API_CAPABILITIES).includes(capability)) {
    throw createApiError(`Unknown API capability: ${capability}`, {
      code: 'UNKNOWN_API_CAPABILITY',
    })
  }
}

export function getApiCapabilityStatus(capability) {
  assertKnownCapability(capability)
  return availableCapabilityStatuses[capability]
}

export function isApiCapabilityAvailable(capability) {
  return getApiCapabilityStatus(capability).available
}

export function assertApiCapability(capability) {
  const status = getApiCapabilityStatus(capability)

  if (!status.available) {
    throw createUnsupportedApiOperationError(capability, status.reason ?? undefined)
  }

  return status
}

export function listApiCapabilityStatuses() {
  return Object.entries(availableCapabilityStatuses).map(([capability, status]) => ({
    capability,
    ...status,
  }))
}
